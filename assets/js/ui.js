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
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
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

  /* logo: usa assets/img/logo.png; se não existir, desenha um emblema simples */
  logoFallback(img) {
    img.outerHTML = `
      <svg viewBox="0 0 100 100" role="img" aria-label="Ligas Acadêmicas de Direito Internacional da UFF e da UNIRIO">
        <circle cx="50" cy="50" r="47" fill="#1e5aa8"/>
        <circle cx="50" cy="50" r="47" fill="none" stroke="#fff" stroke-width="2.5"/>
        <circle cx="50" cy="50" r="38" fill="none" stroke="#fff" stroke-width="1.2" opacity=".75"/>
        <circle cx="50" cy="50" r="27" fill="#2f7fd4"/>
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
