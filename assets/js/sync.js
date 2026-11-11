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
  let online    = true;
  let minhaRef  = null;   // firebase
  let minhaKey  = null;
  let pulso     = null;
  let jaDespediu = false;   // evita mandar o DELETE duas vezes (pagehide + beforeunload)

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
    removerVarios(keys) {
      const fora = new Set(keys);
      gravarFila((ler(K_FILA) || []).filter(e => !fora.has(e.key)));
      return Promise.resolve();
    }
  };

  /* ============================ MODO FIREBASE ============================ */

  function carregarScript(src) {
    return new Promise((ok, erro) => {
      const s = document.createElement('script');
      s.src = src; s.onload = ok; s.onerror = () => erro(new Error('falha ao carregar ' + src));
      document.head.appendChild(s);
    });
  }

  let refFila = null;

  const fbAPI = {
    async iniciar() {
      const base = 'https://www.gstatic.com/firebasejs/10.12.2/';
      await carregarScript(base + 'firebase-app-compat.js');
      await carregarScript(base + 'firebase-database-compat.js');

      firebase.initializeApp(Config.firebase);
      const db = firebase.database();
      refFila = db.ref(`salas/${SALA}/fila`);

      db.ref('.info/connected').on('value', s => {
        status(!!s.val(), s.val() ? 'Conectado' : 'Reconectando…');
      });

      refFila.on('value', snap => {
        const arr = [];
        // ATENÇÃO: o forEach do Firebase PARA a iteração se o callback devolver
        // algo verdadeiro — e arr.push() devolve o tamanho do array. Por isso o
        // corpo precisa ficar entre chaves, sem retornar valor, senão a fila
        // inteira vira só o primeiro país.
        snap.forEach(filho => { arr.push({ key: filho.key, ...filho.val() }); });
        fila = arr;                   // as chaves do push() já vêm em ordem cronológica
        aviseFila();
      });
    },

    async entrar(item) {
      minhaRef = refFila.push();
      minhaKey = minhaRef.key;
      /* NÃO registramos onDisconnect aqui, de propósito.
         Ele manda o servidor apagar a inscrição sempre que a conexão cai —
         inclusive quando o celular só APAGA A TELA e o sistema suspende o
         navegador. A pessoa perderia o lugar na fila sem ter feito nada, e
         sem como perceber. Sair da fila é sempre explícito: os botões, a
         troca de delegação, ou despedirAgora() ao descartar a página.
         O preço disso: se o navegador morrer sem avisar (pane, bateria
         acabando), a inscrição fica na fila até a mesa remover pelo ×. */
      await minhaRef.set({ ...item, ordem: firebase.database.ServerValue.TIMESTAMP });
      return minhaKey;
    },

    async sair() {
      if (!minhaRef) return;
      await minhaRef.remove();
      minhaRef = null; minhaKey = null;
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
      const base = String(Config.firebase.databaseURL || '').replace(/\/+$/, '');
      if (!base) return;
      try {
        fetch(`${base}/salas/${SALA}/fila/${minhaKey}.json`,
              { method: 'DELETE', keepalive: true });
      } catch (e) {}
    },

    remover(key) { return refFila.child(key).remove(); },
    /* um update com null em cada chave apaga todas numa única gravação */
    removerVarios(keys) {
      if (!keys.length) return Promise.resolve();
      return refFila.update(Object.fromEntries(keys.map(k => [k, null])));
    }
  };

  /* ============================ INTERFACE PÚBLICA ============================ */

  let api = localAPI;

  return {
    sala: SALA,
    get modo()     { return modo; },
    get online()   { return online; },
    get fila()     { return fila.slice(); },
    get minhaKey() { return minhaKey; },

    async iniciar() {
      if (Config.usaFirebase()) {
        modo = 'firebase'; api = fbAPI;
        try { await fbAPI.iniciar(); }
        catch (e) {
          console.error('Firebase indisponível, caindo para modo local:', e);
          modo = 'local'; api = localAPI;
          await localAPI.iniciar();
          status(false, 'Sem conexão — modo local');
        }
      } else {
        await localAPI.iniciar();
      }

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
      // a página pode voltar do cache do navegador: rearma para a próxima saída
      window.addEventListener('pageshow', () => { jaDespediu = false; });
      return this;
    },

    aoMudar(fn)  { ouvintes.push(fn); fn(fila.slice()); return this; },
    aoStatus(fn) { statusCbs.push(fn); fn(online, ''); return this; },

    entrar(item)        { return api.entrar(item); },
    sair()              { return api.sair(); },
    remover(key)        { return api.remover(key); },
    removerVarios(keys) { return api.removerVarios(keys); },

    posicao(key) { return fila.findIndex(e => e.key === key) + 1; }
  };
})();
