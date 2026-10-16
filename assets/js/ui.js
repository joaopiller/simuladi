/* =============================================================
   SimuLADI — utilidades de interface
   ============================================================= */

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

const UI = {

  /* Bandeira da delegação.
     Duas letras = código do país, convertido para o emoji da bandeira.
     Qualquer outra coisa é usada como está — serve para delegações que não
     têm bandeira no padrão Unicode (URSS, Iugoslávia). */
  bandeira(valor) {
    if (!valor) return '🏳️';
    if (/^[A-Za-z]{2}$/.test(valor))
      return String.fromCodePoint(...[...valor.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
    return valor;
  },

  /* aviso flutuante */
  aviso(texto, erro = false) {
    let t = $('#toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status');
      document.body.appendChild(t);
    }
    t.textContent = texto;
    t.classList.toggle('toast--err', erro);
    t.classList.add('is-open');
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove('is-open'), 3200);
  },

  /* abre/fecha uma folha (modal) */
  abrir(el)  { el.classList.add('is-open');    document.body.style.overflow = 'hidden'; },
  fechar(el) { el.classList.remove('is-open'); document.body.style.overflow = ''; },

  /* aviso sonoro + vibração ao chegar a vez */
  alerta() {
    try { navigator.vibrate && navigator.vibrate([180, 90, 180]); } catch (e) {}
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [0, .22].forEach((atraso, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = i ? 1046 : 784;
        g.gain.setValueAtTime(0, ctx.currentTime + atraso);
        g.gain.linearRampToValueAtTime(.16, ctx.currentTime + atraso + .02);
        g.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + atraso + .35);
        o.connect(g); g.connect(ctx.destination);
        o.start(ctx.currentTime + atraso); o.stop(ctx.currentTime + atraso + .4);
      });
      setTimeout(() => ctx.close(), 1200);
    } catch (e) {}
  },

  /* sessão da delegação (por aba) */
  sessao: {
    salvar(d) { sessionStorage.setItem('simuladi:delegacao', JSON.stringify(d)); },
    ler()     { try { return JSON.parse(sessionStorage.getItem('simuladi:delegacao')); } catch (e) { return null; } },
    limpar()  { sessionStorage.removeItem('simuladi:delegacao'); }
  },

  /* Caminho até a raiz do site. As páginas internas vivem em subpastas
     (pedido/, painel/, senhas/) para o endereço não terminar em .html, e
     declaram isso com data-raiz="../" no <body>. */
  raiz() { return (document.body && document.body.dataset.raiz) || './'; },

  /* monta um destino a partir da raiz, preservando o parâmetro ?sala= */
  href(destino = '') {
    const sala = new URLSearchParams(location.search).get('sala');
    const base = this.raiz() + destino;
    return sala ? `${base}?sala=${encodeURIComponent(sala)}` : base;
  },

  /* SHA-256 em hexadecimal (usado nas senhas com hash) */
  async sha256(txt) {
    /* O caminho rápido do navegador. ATENÇÃO: crypto.subtle só existe em
       contexto seguro (HTTPS ou localhost) — em HTTP simples ele é
       undefined, e sem o plano B abaixo todo login travaria. */
    if (globalThis.crypto && crypto.subtle) {
      try {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
        return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (e) { /* segue para o plano B */ }
    }
    return this.sha256Puro(txt);
  },

  /* Plano B: mesmo SHA-256, feito à mão, sem depender do navegador. */
  sha256Puro(txt) {
    const K = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
    let h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
             0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const rotr = (x, n) => (x >>> n) | (x << (32 - n));

    const msg = new TextEncoder().encode(txt);
    /* mensagem + byte 0x80 + zeros até sobrar espaço para o tamanho (8 bytes) */
    const total = ((msg.length + 9 + 63) >> 6) << 6;
    const b = new Uint8Array(total);
    b.set(msg);
    b[msg.length] = 0x80;
    /* tamanho em bits, big-endian; senhas são curtas, 32 bits bastam */
    new DataView(b.buffer).setUint32(total - 4, msg.length * 8);

    const w = new Uint32Array(64);
    for (let i = 0; i < total; i += 64) {
      for (let t = 0; t < 16; t++) {
        const p = i + t * 4;
        w[t] = (b[p] << 24) | (b[p + 1] << 16) | (b[p + 2] << 8) | b[p + 3];
      }
      for (let t = 16; t < 64; t++) {
        const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
        const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
        w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
      }
      let [a, b2, c, d, e, f, g, hh] = h;
      for (let t = 0; t < 64; t++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const t1 = (hh + S1 + ((e & f) ^ (~e & g)) + K[t] + w[t]) >>> 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const t2 = (S0 + ((a & b2) ^ (a & c) ^ (b2 & c))) >>> 0;
        hh = g; g = f; f = e; e = (d + t1) >>> 0;
        d = c; c = b2; b2 = a; a = (t1 + t2) >>> 0;
      }
      const soma = [a, b2, c, d, e, f, g, hh];
      h = h.map((x, j) => (x + soma[j]) >>> 0);
    }
    return h.map(x => x.toString(16).padStart(8, '0')).join('');
  },

  /* confere a senha de uma delegação (aceita hash ou texto simples) */
  async conferirSenha(delegacao, tentativa) {
    if (delegacao.hash) return (await this.sha256(tentativa)) === delegacao.hash.toLowerCase();
    return tentativa === delegacao.senha;
  },

  /* Mostra o aviso de conexão só se a queda durar mais que o combinado.
     O Firebase informa "desconectado" por um instante durante o handshake
     inicial; sem esta espera, o aviso pisca na tela logo depois do login. */
  monitorarConexao(el, atraso = 4000) {
    let tempo = null;
    return ok => {
      clearTimeout(tempo);
      if (ok) el.hidden = true;
      else tempo = setTimeout(() => { el.hidden = false; }, atraso);
    };
  },

  /* tempo decorrido em mm:ss */
  cronometro(desde) {
    const s = Math.max(0, Math.floor((Date.now() - desde) / 1000));
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  },

  /* logo: usa assets/img/logo.svg; se não existir, desenha um emblema simples */
  logoFallback(img) {
    img.outerHTML = `
      <svg viewBox="0 0 100 100" role="img" aria-label="Ligas Acadêmicas de Direito Internacional da UFF e da UNIRIO">
        <circle cx="50" cy="50" r="47" fill="var(--ladi-azul,#004AAD)"/>
        <circle cx="50" cy="50" r="47" fill="none" stroke="#fff" stroke-width="2.5"/>
        <circle cx="50" cy="50" r="38" fill="none" stroke="#fff" stroke-width="1.2" opacity=".75"/>
        <circle cx="50" cy="50" r="27" fill="var(--ladi-claro,#4C91D4)"/>
        <g fill="none" stroke="#fff" stroke-width="1.6" opacity=".95">
          <circle cx="50" cy="50" r="27"/>
          <path d="M23 50h54M50 23c9 8 9 46 0 54M50 23c-9 8-9 46 0 54"/>
          <path d="M28 38h44M28 62h44" opacity=".7"/>
        </g>
      </svg>`;
  }
};

/* fecha folhas com a tecla Esc */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') $$('.sheet.is-open').forEach(s => UI.fechar(s));
});
