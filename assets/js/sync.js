/* =============================================================
   SimuLADI — sincronização

   Uma fila só, por ordem de chegada. Cada entrada é um pedido de fala de
   um país, de um destes tipos:

   • orador  — inscrição na lista de oradores (sem "categoria")
   • questão — categoria "questao", com o tema em "opcao"
   • moção   — categoria "mocao", com o tema em "opcao"

   Quem está em primeiro tem a palavra, seja qual for o tipo. A tela de
   projeção só separa a exibição em duas listas; a ordem é uma só.

   Dois modos, mesma interface:
     • local    -> localStorage + BroadcastChannel (mesmo aparelho)
     • firebase -> Realtime Database (aparelhos diferentes)
   ============================================================= */

const Sync = (() => {

  const SALA  = Config.sala();
  const TTL   = 15000;   // modo local: pedido "morre" sem sinal por 15s
  const PULSO = 4000;    // modo local: intervalo do sinal de vida

  let modo      = 'local';
  let fila      = [];
  let ouvintes  = [];
  let statusCbs = [];
  let online    = false;  // só vira true quando o servidor confirma a conexão
  let minhaRef  = null;   // firebase
  let minhaKey  = null;
  let pulso     = null;
  let jaDespediu = false;   // evita mandar o DELETE duas vezes (pagehide + beforeunload)

  /* Erros carregam um código que a interface traduz em mensagem para a pessoa:
       offline      — sem conexão no momento do pedido
       tempo        — o servidor não respondeu a tempo
       indisponivel — o Firebase nem chegou a carregar
       permissao    — as regras do banco recusaram a gravação */
  class ErroSync extends Error {
    constructor(codigo, msg) { super(msg || codigo); this.codigo = codigo; }
  }
  const traduzir = e => e instanceof ErroSync ? e
    : new ErroSync(String(e && e.message || e).includes('PERMISSION_DENIED') ? 'permissao' : 'desconhecido', e && e.message);
  const prazo = (promessa, ms, codigo = 'tempo') => Promise.race([
    promessa, new Promise((_, nao) => setTimeout(() => nao(new ErroSync(codigo)), ms))
  ]);

  /* As gravações esperam a conexão ficar pronta. Sem isso, quem tocava em
     "Confirmar" antes de o SDK terminar de carregar via um erro — o que, num
     Wi-Fi de evento, acontece com facilidade. */
  let marcarPronto, falharPronto;
  const pronto = new Promise((ok, nao) => { marcarPronto = ok; falharPronto = nao; });
  pronto.catch(() => {});

  const aviseFila = () => ouvintes.forEach(fn => { try { fn(fila.slice()); } catch (e) { console.error(e); } });
  const status    = (ok, txt) => { online = ok; statusCbs.forEach(fn => fn(ok, txt)); };

  /* ============================ MODO LOCAL ============================ */

  const K_FILA = `simuladi:${SALA}:fila`;
  const canal = ('BroadcastChannel' in window) ? new BroadcastChannel(`simuladi:${SALA}`) : null;

  const ler = chave => { try { return JSON.parse(localStorage.getItem(chave) || 'null'); } catch (e) { return null; } };

  function gravarFila(arr, avisar = true) {
    localStorage.setItem(K_FILA, JSON.stringify(arr));
    if (avisar && canal) canal.postMessage('att');
    recarregarLocal();
  }

  function recarregarLocal() {
    const agora = Date.now();
    const bruto = ler(K_FILA) || [];
    const vivos = bruto.filter(e => agora - (e.pulso || 0) < TTL);
    if (vivos.length !== bruto.length) {          // limpa quem fechou a aba
      localStorage.setItem(K_FILA, JSON.stringify(vivos));
      if (canal) canal.postMessage('att');
    }
    fila = vivos.sort((a, b) => a.ordem - b.ordem);
    aviseFila();
  }

  const localAPI = {
    iniciar() {
      if (canal) canal.onmessage = recarregarLocal;
      window.addEventListener('storage', e => { if (e.key === K_FILA) recarregarLocal(); });
      setInterval(recarregarLocal, 3000);
      recarregarLocal();
      status(true, 'Modo local');
      return Promise.resolve();
    },

    entrar(item) {
      clearInterval(pulso);                       // encerra o sinal de vida anterior
      const registro = { ...item, key: 'l' + Date.now() + Math.random().toString(36).slice(2, 7),
                         ordem: Date.now(), pulso: Date.now() };
      minhaKey = registro.key;
      gravarFila([...(ler(K_FILA) || []), registro]);
      pulso = setInterval(() => {
        const arr = ler(K_FILA) || [];
        const eu = arr.find(e => e.key === minhaKey);
        if (!eu) return;
        eu.pulso = Date.now();
        gravarFila(arr, false);
      }, PULSO);
      return Promise.resolve(registro.key);
    },

    sair() {
      clearInterval(pulso); pulso = null;
      if (!minhaKey) return Promise.resolve();
      gravarFila((ler(K_FILA) || []).filter(e => e.key !== minhaKey));
      minhaKey = null;
      return Promise.resolve();
    },

    remover(key) { gravarFila((ler(K_FILA) || []).filter(e => e.key !== key)); return Promise.resolve(); },
    reconectar() { recarregarLocal(); },
    removerVarios(keys) {
      const fora = new Set(keys);
      gravarFila((ler(K_FILA) || []).filter(e => !fora.has(e.key)));
      return Promise.resolve();
    }
  };

  /* ============================ MODO FIREBASE ============================ */

  /* Os dois arquivos do SDK baixam em paralelo e executam na ordem
     (async = false). Antes eram buscados um depois do outro. */
  function carregarScripts(srcs, ms = 20000) {
    return prazo(Promise.all(srcs.map(src => new Promise((ok, erro) => {
      const s = document.createElement('script');
      s.src = src; s.async = false;
      s.onload = ok; s.onerror = () => erro(new ErroSync('indisponivel', 'falha ao carregar ' + src));
      document.head.appendChild(s);
    }))), ms, 'indisponivel');
  }

  let refFila = null;

  const fbAPI = {
    async iniciar() {
      const base = 'https://www.gstatic.com/firebasejs/10.12.2/';
      await carregarScripts([base + 'firebase-app-compat.js', base + 'firebase-database-compat.js']);

      firebase.initializeApp(Config.firebase);
      const db = firebase.database();
      refFila = db.ref(`salas/${SALA}/fila`);

      db.ref('.info/connected').on('value', s => {
        status(!!s.val(), s.val() ? 'Conectado' : 'Reconectando…');
      });

      // espera o primeiro retrato da fila: até lá, "fila vazia" seria mentira
      let primeira;
      const chegou = new Promise(ok => { primeira = ok; });

      refFila.on('value', snap => {
        const arr = [];
        // ATENÇÃO: o forEach do Firebase PARA a iteração se o callback devolver
        // algo verdadeiro — e arr.push() devolve o tamanho do array. Por isso o
        // corpo precisa ficar entre chaves, sem retornar valor, senão a fila
        // inteira vira só o primeiro país.
        snap.forEach(filho => { arr.push({ key: filho.key, ...filho.val() }); });
        // Ordem pelo horário do SERVIDOR, e não pela chave: a chave é gerada
        // no aparelho e podia ser forjada para passar na frente de todos.
        // As regras do banco exigem ordem === now, então o horário não se falsifica.
        arr.sort((a, b) => (a.ordem || 0) - (b.ordem || 0) || (a.key < b.key ? -1 : 1));
        fila = arr;
        aviseFila();
        primeira();
      });
      await prazo(chegou, 20000, 'indisponivel');
    },

    /* Uma conexão nova na hora. Usado quando a tela do celular acorda: a
       conexão antiga pode ter morrido em silêncio enquanto o aparelho
       dormia, e a tela continuaria mostrando a fila de antes. */
    reconectar() {
      if (!window.firebase || !firebase.apps.length) return;
      const db = firebase.database();
      db.goOffline(); db.goOnline();
    },

    async entrar(item) {
      if (!online) throw new ErroSync('offline');
      const ref = refFila.push();
      minhaRef = ref; minhaKey = ref.key;
      /* NÃO registramos onDisconnect aqui, de propósito.
         Ele manda o servidor apagar a inscrição sempre que a conexão cai —
         inclusive quando o celular só APAGA A TELA e o sistema suspende o
         navegador. A pessoa perderia o lugar na fila sem ter feito nada, e
         sem como perceber. Sair da fila é sempre explícito: os botões, a
         troca de delegação, ou despedirAgora() ao descartar a página.
         O preço disso: se o navegador morrer sem avisar (pane, bateria
         acabando), a inscrição fica na fila até a mesa remover pelo ×. */
      try {
        await prazo(ref.set({ ...item, ordem: firebase.database.ServerValue.TIMESTAMP }), 12000);
      } catch (e) {
        // O SDK guarda a gravação e tenta de novo sozinho quando a conexão
        // volta. Como a pessoa já recebeu um aviso de erro, entrar na fila
        // "atrasado" seria pior: o remove() entra na mesma fila e anula.
        ref.remove().catch(() => {});
        minhaRef = null; minhaKey = null;
        throw traduzir(e);
      }
      return minhaKey;
    },

    async sair() {
      if (!minhaRef) return;
      const ref = minhaRef;
      minhaRef = null; minhaKey = null;
      // sem internet, o remove() fica guardado e sai sozinho quando a conexão voltar
      await prazo(ref.remove(), 6000).catch(e => { throw traduzir(e); });
    },

    /* Saída usada quando a página está sendo descartada (voltar, fechar a aba).
       O SDK não consegue mais concluir um envio nesse ponto, então vai um
       DELETE pela API REST com keepalive — o navegador se compromete a
       entregá-lo mesmo com a página morrendo.
       É a ÚNICA remoção automática que existe — não há onDisconnect
       registrado (veja entrar()). */
    despedirAgora() {
      if (!minhaKey || jaDespediu) return;
      jaDespediu = true;
      try {
        // monta pelo objeto URL para preservar parâmetros do endereço do banco
        const u = new URL(Config.firebase.databaseURL);
        u.pathname = u.pathname.replace(/\/+$/, '') + `/salas/${SALA}/fila/${encodeURIComponent(minhaKey)}.json`;
        fetch(u.href, { method: 'DELETE', keepalive: true });
      } catch (e) {}
    },

    remover(key) { return prazo(refFila.child(key).remove(), 8000).catch(e => { throw traduzir(e); }); },
    /* um update com null em cada chave apaga todas numa única gravação */
    removerVarios(keys) {
      if (!keys.length) return Promise.resolve();
      return prazo(refFila.update(Object.fromEntries(keys.map(k => [k, null]))), 8000).catch(e => { throw traduzir(e); });
    }
  };

  /* ============================ INTERFACE PÚBLICA ============================ */

  let api = localAPI;
  let estaPronto = false;

  return {
    sala: SALA,
    get modo()     { return modo; },
    get online()   { return online; },
    get fila()     { return fila.slice(); },
    get minhaKey() { return minhaKey; },
    get pronto()   { return estaPronto; },
    quandoPronto() { return pronto; },

    async iniciar() {
      try {
        if (Config.usaFirebase()) { modo = 'firebase'; api = fbAPI; await fbAPI.iniciar(); }
        else await localAPI.iniciar();
      } catch (e) {
        // NÃO cai para o modo local. Antes caía: o pedido ia só para este
        // aparelho e a pessoa via "Sua vez de falar!" sem estar na fila real.
        const erro = traduzir(e);
        console.error('Sem conexão com a fila:', e);
        status(false, 'Sem conexão');
        falharPronto(erro);
        throw erro;
      }
      estaPronto = true;
      marcarPronto();

      // Saída da fila ao deixar a página.
      //
      // Estes dois eventos só disparam quando a página está mesmo sendo
      // descartada: navegar para fora, voltar, recarregar, fechar a aba.
      // Apagar a tela do celular dispara apenas visibilitychange — medido —
      // então quem está na fila ou com a palavra NÃO perde o lugar.
      //
      // No modo local não há servidor, então a limpeza tem que ser feita aqui
      // mesmo; localStorage é síncrono e dá tempo de gravar.
      const despedir = () => {
        if (modo === 'firebase') { fbAPI.despedirAgora(); return; }
        try { localAPI.sair(); } catch (e) {}
      };
      window.addEventListener('pagehide', despedir);
      window.addEventListener('beforeunload', despedir);
      // a página pode voltar do cache do navegador: rearma a saída e busca a fila de novo
      window.addEventListener('pageshow', e => { jaDespediu = false; if (e.persisted) api.reconectar(); });

      // Tela do celular acordando: força uma conexão nova se ficou escondida
      // por mais que alguns segundos. "resume" cobre a aba que o sistema congelou.
      let escondidaDesde = null;
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) { escondidaDesde = Date.now(); return; }
        if (escondidaDesde && Date.now() - escondidaDesde > 5000) api.reconectar();
        escondidaDesde = null;
      });
      document.addEventListener('resume', () => api.reconectar());
      window.addEventListener('online', () => api.reconectar());
      return this;
    },

    aoMudar(fn)  { ouvintes.push(fn); fn(fila.slice()); return this; },
    aoStatus(fn) { statusCbs.push(fn); fn(online, ''); return this; },

    async entrar(item)        { await pronto; return api.entrar(item); },
    async sair()              { await pronto; return api.sair(); },
    async remover(key)        { await pronto; return api.remover(key); },
    async removerVarios(keys) { await pronto; return api.removerVarios(keys); },

    posicao(key) { return fila.findIndex(e => e.key === key) + 1; }
  };
})();
