/* =============================================================
   SimuLADI — sincronização

   São DUAS listas independentes:

   • fila     — os países que pediram a palavra, por ordem de chegada.
                Sai sozinha quando o navegador fecha.
   • pedidos  — as questões e moções solicitadas. NÃO saem quando o país
                sai da fila: só a mesa diretora remove. Uma mesma questão
                pedida por vários países aparece uma vez só, guardando
                quem solicitou.

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
  let pedidos   = [];
  let ouvintes  = { fila: [], pedidos: [] };
  let statusCbs = [];
  let online    = true;
  let minhaRef  = null;   // firebase
  let minhaKey  = null;
  let pulso     = null;

  /* chave estável a partir do texto, para a mesma questão não duplicar */
  const chaveDe = txt => txt.normalize('NFD').replace(/[̀-ͯ]/g, '')
                            .toLowerCase().replace(/[^a-z0-9]+/g, '-')
                            .replace(/^-+|-+$/g, '').slice(0, 60);

  const aviseFila    = () => ouvintes.fila.forEach(fn => { try { fn(fila.slice()); } catch (e) { console.error(e); } });
  const avisePedidos = () => ouvintes.pedidos.forEach(fn => { try { fn(pedidos.slice()); } catch (e) { console.error(e); } });
  const status       = (ok, txt) => { online = ok; statusCbs.forEach(fn => fn(ok, txt)); };

  /* objeto guardado -> lista ordenada pela primeira solicitação */
  function ordenarPedidos(obj) {
    return Object.entries(obj || {})
      .map(([chave, v]) => ({
        chave,
        categoria: v.categoria,
        titulo: v.titulo,
        opcao: v.opcao,
        ordem: v.ordem || 0,
        solicitantes: Object.values(v.solicitantes || {})
      }))
      .sort((a, b) => a.ordem - b.ordem);
  }

  /* ============================ MODO LOCAL ============================ */

  const K_FILA    = `simuladi:${SALA}:fila`;
  const K_PEDIDOS = `simuladi:${SALA}:pedidos`;
  const canal = ('BroadcastChannel' in window) ? new BroadcastChannel(`simuladi:${SALA}`) : null;

  const ler = chave => { try { return JSON.parse(localStorage.getItem(chave) || 'null'); } catch (e) { return null; } };

  function gravarFila(arr, avisar = true) {
    localStorage.setItem(K_FILA, JSON.stringify(arr));
    if (avisar && canal) canal.postMessage('att');
    recarregarLocal();
  }

  function gravarPedidos(obj) {
    localStorage.setItem(K_PEDIDOS, JSON.stringify(obj));
    if (canal) canal.postMessage('att');
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
    pedidos = ordenarPedidos(ler(K_PEDIDOS) || {});
    aviseFila();
    avisePedidos();
  }

  const localAPI = {
    iniciar() {
      if (canal) canal.onmessage = recarregarLocal;
      window.addEventListener('storage', e => { if (e.key === K_FILA || e.key === K_PEDIDOS) recarregarLocal(); });
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
    limpar()     { gravarFila([]); return Promise.resolve(); },

    registrarPedido({ categoria, titulo, opcao, delegacao, iso }) {
      const chave = chaveDe(opcao);
      const tudo = ler(K_PEDIDOS) || {};
      const atual = tudo[chave] || { categoria, titulo, opcao, ordem: Date.now(), solicitantes: {} };
      atual.categoria = categoria; atual.titulo = titulo; atual.opcao = opcao;
      atual.solicitantes[chaveDe(delegacao)] = { nome: delegacao, iso };
      tudo[chave] = atual;
      gravarPedidos(tudo);
      return Promise.resolve(chave);
    },

    removerPedido(chave) {
      const tudo = ler(K_PEDIDOS) || {};
      delete tudo[chave];
      gravarPedidos(tudo);
      return Promise.resolve();
    },

    limparPedidos() { gravarPedidos({}); return Promise.resolve(); }
  };

  /* ============================ MODO FIREBASE ============================ */

  function carregarScript(src) {
    return new Promise((ok, erro) => {
      const s = document.createElement('script');
      s.src = src; s.onload = ok; s.onerror = () => erro(new Error('falha ao carregar ' + src));
      document.head.appendChild(s);
    });
  }

  let refFila = null, refPedidos = null;

  const fbAPI = {
    async iniciar() {
      const base = 'https://www.gstatic.com/firebasejs/10.12.2/';
      await carregarScript(base + 'firebase-app-compat.js');
      await carregarScript(base + 'firebase-database-compat.js');

      firebase.initializeApp(Config.firebase);
      const db = firebase.database();
      refFila    = db.ref(`salas/${SALA}/fila`);
      refPedidos = db.ref(`salas/${SALA}/pedidos`);

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

      refPedidos.on('value', snap => { pedidos = ordenarPedidos(snap.val()); avisePedidos(); });
    },

    async entrar(item) {
      minhaRef = refFila.push();
      minhaKey = minhaRef.key;
      // o servidor apaga sozinho se o navegador fechar / cair a conexão
      await minhaRef.onDisconnect().remove();
      await minhaRef.set({ ...item, ordem: firebase.database.ServerValue.TIMESTAMP });
      return minhaKey;
    },

    async sair() {
      if (!minhaRef) return;
      await minhaRef.onDisconnect().cancel();
      await minhaRef.remove();
      minhaRef = null; minhaKey = null;
    },

    remover(key) { return refFila.child(key).remove(); },
    limpar()     { return refFila.remove(); },

    async registrarPedido({ categoria, titulo, opcao, delegacao, iso }) {
      const chave = chaveDe(opcao);
      const ref = refPedidos.child(chave);
      // "ordem" só na criação, para a lista manter a ordem da 1ª solicitação
      const jaExiste = (await ref.child('ordem').once('value')).exists();
      const dados = { categoria, titulo, opcao };
      if (!jaExiste) dados.ordem = firebase.database.ServerValue.TIMESTAMP;
      dados[`solicitantes/${chaveDe(delegacao)}`] = { nome: delegacao, iso };
      await ref.update(dados);
      return chave;
    },

    removerPedido(chave) { return refPedidos.child(chave).remove(); },
    limparPedidos()      { return refPedidos.remove(); }
  };

  /* ============================ INTERFACE PÚBLICA ============================ */

  let api = localAPI;

  return {
    sala: SALA,
    get modo()     { return modo; },
    get online()   { return online; },
    get fila()     { return fila.slice(); },
    get pedidos()  { return pedidos.slice(); },
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

      // Rede de segurança ao fechar a aba.
      //
      // No modo Firebase quem remove é o SERVIDOR, pelo onDisconnect registrado
      // em entrar(). Chamar sair() aqui seria um tiro no pé: ele começa
      // cancelando esse gatilho e só depois tenta o remove() — que quase nunca
      // chega a ser enviado, porque a página já está sendo destruída, deixando
      // o pedido preso na fila para sempre.
      //
      // No modo local não há servidor, então a limpeza tem que ser feita aqui
      // mesmo; localStorage é síncrono e dá tempo de gravar.
      const despedir = () => {
        if (modo === 'firebase') return;
        try { localAPI.sair(); } catch (e) {}
      };
      window.addEventListener('pagehide', despedir);
      window.addEventListener('beforeunload', despedir);
      return this;
    },

    aoMudar(fn)        { ouvintes.fila.push(fn); fn(fila.slice()); return this; },
    aoMudarPedidos(fn) { ouvintes.pedidos.push(fn); fn(pedidos.slice()); return this; },
    aoStatus(fn)       { statusCbs.push(fn); fn(online, ''); return this; },

    entrar(item) { return api.entrar(item); },
    sair()       { return api.sair(); },
    remover(key) { return api.remover(key); },
    limpar()     { return api.limpar(); },

    registrarPedido(p)   { return api.registrarPedido(p); },
    removerPedido(chave) { return api.removerPedido(chave); },
    limparPedidos()      { return api.limparPedidos(); },

    posicao(key) { return fila.findIndex(e => e.key === key) + 1; }
  };
})();
