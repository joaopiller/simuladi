/* =============================================================
   SimuLADI — tela da delegação (escolher pedido / esperar a vez)
   ============================================================= */

(() => {

  const delegacao = UI.sessao.ler();
  if (!delegacao) { location.replace(UI.href()); return; }

  let selecao   = null;   // { categoria, titulo, opcao }
  let minhaKey  = null;
  let eraMinhaVez = false;

  const vEscolha = $('#viewEscolha');
  const vFila    = $('#viewFila');

  /* ---------------------------------------------------------
     cabeçalho
     --------------------------------------------------------- */
  $('#oiDelegacao').textContent = delegacao.nome;
  document.title = `SimuLADI | ${delegacao.nome}`;

  /* ---------------------------------------------------------
     acordeões de Questão / Moção
     --------------------------------------------------------- */
  $('#categorias').innerHTML = Config.categorias.map(cat => `
    <div class="acc" data-cat="${cat.id}">
      <button type="button" class="pill" data-toggle aria-expanded="false">
        <span class="pill__grow pill__ph">${cat.titulo}</span>
        <span class="pill__caret"></span>
      </button>
      <div class="acc__panel"><div class="acc__inner">
        <div class="acc__list">
          ${cat.opcoes.map((o, i) => `
            <button type="button" class="opt" data-opcao="${o}" data-cat="${cat.id}"
                    aria-pressed="false" style="animation-delay:${i * 32}ms">
              <span>${o}</span><span class="opt__tick" aria-hidden="true">✓</span>
            </button>`).join('')}
        </div>
      </div></div>
    </div>`).join('');

  $$('[data-toggle]').forEach(btn => btn.addEventListener('click', () => {
    const acc = btn.closest('.acc');
    const abrindo = !acc.classList.contains('is-open');
    $$('.acc').forEach(a => { a.classList.remove('is-open'); $('[data-toggle]', a).setAttribute('aria-expanded', 'false'); });
    if (abrindo) { acc.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); }
  }));

  $$('.opt').forEach(op => op.addEventListener('click', () => {
    const jaEra = op.getAttribute('aria-pressed') === 'true';
    $$('.opt').forEach(o => o.setAttribute('aria-pressed', 'false'));
    if (jaEra) { selecao = null; }
    else {
      op.setAttribute('aria-pressed', 'true');
      const cat = Config.categorias.find(c => c.id === op.dataset.cat);
      selecao = { categoria: cat.id, titulo: cat.titulo, opcao: op.dataset.opcao };
    }
    $('#btnEnviar').disabled = !selecao;
  }));

  /* ---------------------------------------------------------
     confirmação
     --------------------------------------------------------- */
  const sheet = $('#sheetConf');

  function abrirConfirmacao() {
    $('#confFlag').textContent = UI.bandeira(delegacao.bandeira);
    if (selecao) {
      $('#confTitulo').textContent = 'Confirmar pedido de fala';
      $('#confDesc').textContent   = `Você entra na fila e, quando chegar a sua vez, terá a palavra para a ${selecao.titulo.toLowerCase()}.`;
      $('#confTipo').textContent   = selecao.titulo;
      $('#confOpcao').textContent  = selecao.opcao;
    } else {
      $('#confTitulo').textContent = 'Inscrição na Lista de Oradores';
      $('#confDesc').textContent   = 'Você entra na fila para discursar como orador.';
      $('#confTipo').textContent   = delegacao.nome;
      $('#confOpcao').textContent  = 'Inscrição na Lista de Oradores';
    }
    UI.abrir(sheet);
  }

  $('#btnEnviar').addEventListener('click', () => { if (selecao) abrirConfirmacao(); });

  $('#btnSemPedido').addEventListener('click', () => {
    selecao = null;
    $$('.opt').forEach(o => o.setAttribute('aria-pressed', 'false'));
    $('#btnEnviar').disabled = true;
    abrirConfirmacao();
  });

  $$('[data-fechar]').forEach(b => b.addEventListener('click', () => UI.fechar(sheet)));
  sheet.addEventListener('click', e => { if (e.target === sheet) UI.fechar(sheet); });

  $('#confOk').addEventListener('click', async () => {
    const btn = $('#confOk');
    btn.disabled = true; btn.textContent = 'Enviando…';
    try {
      // Um país aparece uma vez só na fila inteira, seja como orador, questão
      // ou moção. Se sobrou um pedido antigo desta delegação (outro aparelho,
      // navegador que fechou sem avisar), ele dá lugar ao novo em vez de bloquear.
      for (const velho of Sync.fila.filter(e => e.delegacao === delegacao.nome)) {
        await Sync.remover(velho.key).catch(() => {});
      }

      minhaKey = await Sync.entrar({
        delegacao: delegacao.nome,
        bandeira: delegacao.bandeira,
        ...(selecao ? { categoria: selecao.categoria, titulo: selecao.titulo, opcao: selecao.opcao } : {})
      });
      UI.fechar(sheet);
      mostrarFila();
      // desenha na hora, sem esperar o próximo ciclo de atualização
      $('#cartaoEstado').innerHTML =
        '<div class="wait card"><p class="wait__title">Registrando seu pedido…</p></div>';
      desenhar(Sync.fila);
      UI.aviso('Pedido registrado!');
    } catch (e) {
      console.error(e);
      const semPermissao = String(e && e.message).includes('PERMISSION_DENIED');
      UI.aviso(semPermissao
        ? 'O Firebase recusou a gravação: as regras do banco precisam ser atualizadas.'
        : 'Não foi possível enviar. Tente novamente.', true);
    } finally {
      btn.disabled = false; btn.textContent = 'Confirmar';
    }
  });

  /* ---------------------------------------------------------
     troca de telas
     --------------------------------------------------------- */
  function mostrarFila()   { vEscolha.hidden = true;  vFila.hidden = false; }
  function mostrarEscolha() {
    vFila.hidden = true; vEscolha.hidden = false;
    minhaKey = null; selecao = null; eraMinhaVez = false;
    assinatura = null; vistoNaFila = false;
    $$('.opt').forEach(o => o.setAttribute('aria-pressed', 'false'));
    $$('.acc').forEach(a => { a.classList.remove('is-open'); $('[data-toggle]', a).setAttribute('aria-expanded', 'false'); });
    $('#btnEnviar').disabled = true;
  }

  /* ---------------------------------------------------------
     saídas
     --------------------------------------------------------- */
  async function sairDaFila(mensagem) {
    try { await Sync.sair(); } catch (e) { console.error(e); }
    mostrarEscolha();
    if (mensagem) UI.aviso(mensagem);
  }

  $('#btnSair').addEventListener('click',     () => sairDaFila('Você saiu da fila.'));
  $('#btnTerminei').addEventListener('click', () => sairDaFila('Obrigado! Fala encerrada.'));

  $('#btnTrocar').addEventListener('click', async () => {
    await Sync.sair().catch(() => {});
    UI.sessao.limpar();
    location.href = UI.href();
  });

  /* ---------------------------------------------------------
     desenho da fila
     --------------------------------------------------------- */
  let assinatura  = null;
  let vistoNaFila = false;

  function desenhar(fila) {
    if (!minhaKey) return;

    const eu = fila.find(e => e.key === minhaKey);

    if (!eu) {
      // ainda não voltou do servidor: não é sumiço, é espera
      if (!vistoNaFila) return;
      Sync.sair().catch(() => {});
      mostrarEscolha();
      UI.aviso('Seu pedido não está mais na fila.', true);
      return;
    }
    vistoNaFila = true;

    const nova = fila.map(e => e.key).join('|') + '#' + minhaKey;
    if (nova === assinatura) return;
    assinatura = nova;

    const naFrente = fila.indexOf(eu);
    const minhaVez = naFrente === 0;

    $('#cartaoEstado').innerHTML = minhaVez
      ? `<div class="turn">
           <p class="turn__kicker">Você é a primeira da fila</p>
           <p class="turn__title">Sua vez de falar!</p>
           ${eu.opcao ? `<p class="turn__what">${eu.opcao}</p>` : ''}
         </div>`
      : `<div class="wait card">
           <p class="wait__pos">${naFrente}</p>
           <p class="wait__label">${naFrente === 1 ? 'delegação na sua frente' : 'delegações na sua frente'}</p>
           <p class="wait__title">Aguarde sua vez de falar</p>
           <p class="wait__what">${eu.opcao || 'Inscrição na Lista de Oradores'}</p>
         </div>`;

    // quem está falando tem só "Terminei de falar"; quem espera, só "Remover meu pedido"
    $('#btnTerminei').hidden = !minhaVez;
    $('#btnSair').hidden     = minhaVez;

    if (minhaVez && !eraMinhaVez) UI.alerta();
    eraMinhaVez = minhaVez;
  }

  /* ---------------------------------------------------------
     início
     --------------------------------------------------------- */
  Sync.iniciar().then(s => {
    s.aoMudar(desenhar);
    s.aoStatus(UI.monitorarConexao($('#avisoConexao')));
  });

})();
