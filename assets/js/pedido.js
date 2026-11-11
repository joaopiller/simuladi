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
    if (btn.disabled) return;
    btn.disabled = true;
    btn.textContent = Sync.pronto ? 'Enviando…' : 'Conectando…';
    try {
      await Sync.quandoPronto();
      if (!Sync.online) throw { codigo: 'offline' };   // avisa já, sem esperar prazos

      // Um país aparece uma vez só na fila inteira, seja como orador, questão
      // ou moção. Se sobrou um pedido antigo desta delegação (outro aparelho,
      // navegador que fechou sem avisar), ele dá lugar ao novo em vez de bloquear.
      for (const velho of Sync.fila.filter(e => e.delegacao === delegacao.nome)) {
        await Sync.remover(velho.key).catch(() => {});
      }

      btn.textContent = 'Enviando…';
      const chave = await Sync.entrar({
        delegacao: delegacao.nome,
        bandeira: delegacao.bandeira,
        ...(selecao ? { categoria: selecao.categoria, titulo: selecao.titulo, opcao: selecao.opcao } : {})
      });
      minhaKey = chave;
      UI.fechar(sheet);
      mostrarFila();
      // desenha na hora, sem esperar o próximo ciclo de atualização
      $('#cartaoEstado').innerHTML =
        '<div class="wait card"><p class="wait__title">Registrando seu pedido…</p></div>';
      desenhar(Sync.fila);
      UI.aviso('Pedido registrado!');

      // rede de segurança: se o pedido não aparecer na fila, não deixa a
      // pessoa presa em "Registrando…" para sempre
      setTimeout(() => {
        if (minhaKey !== chave || vistoNaFila) return;
        mostrarEscolha();
        UI.dialogo(UI.mensagemDeErro({ codigo: 'tempo' }, 'Seu pedido não apareceu na fila.'));
      }, 10000);
    } catch (e) {
      console.error(e);
      UI.fechar(sheet);
      UI.dialogo(UI.mensagemDeErro(e));
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
    document.title = `SimuLADI | ${delegacao.nome}`;
    assinatura = null; vistoNaFila = false;
    $$('.opt').forEach(o => o.setAttribute('aria-pressed', 'false'));
    $$('.acc').forEach(a => { a.classList.remove('is-open'); $('[data-toggle]', a).setAttribute('aria-expanded', 'false'); });
    $('#btnEnviar').disabled = true;
  }

  /* ---------------------------------------------------------
     saídas
     --------------------------------------------------------- */
  /* A tela volta para a escolha ANTES de avisar o servidor. Na ordem
     inversa, a própria tela via o pedido sumir e achava que alguém o tinha
     removido, mostrando um aviso falso. */
  async function sairDaFila(mensagem) {
    mostrarEscolha();
    try {
      await Sync.sair();
      if (mensagem) UI.aviso(mensagem);
    } catch (e) {
      console.error(e);
      UI.dialogo({
        tipo: 'info',
        titulo: 'Sem conexão no momento',
        texto: 'Sua saída da fila fica guardada e é registrada sozinha assim que a internet voltar. Não é preciso fazer nada.',
      });
    }
  }

  $('#btnSair').addEventListener('click',     () => sairDaFila('Você saiu da fila.'));
  $('#btnTerminei').addEventListener('click', () => sairDaFila('Obrigado! Fala encerrada.'));

  $('#btnTrocar').addEventListener('click', async () => {
    await Sync.sair().catch(() => {});   // sem internet, sai sozinho quando ela voltar
    UI.sessao.limpar();
    location.href = UI.href();
  });

  /* ---------------------------------------------------------
     desenho da fila
     --------------------------------------------------------- */
  let assinatura  = null;
  let vistoNaFila = false;
  let alertaPendente = false;

  document.addEventListener('visibilitychange', () => {
    if (document.hidden || !alertaPendente) return;
    alertaPendente = false;
    if (eraMinhaVez) UI.alerta();
  });

  function desenhar(fila) {
    if (!minhaKey) return;

    const eu = fila.find(e => e.key === minhaKey);

    if (!eu) {
      // ainda não voltou do servidor: não é sumiço, é espera
      if (!vistoNaFila) return;
      Sync.sair().catch(() => {});
      mostrarEscolha();
      // se a delegação continua na fila, o pedido foi substituído por outro aparelho
      UI.dialogo(fila.some(e => e.delegacao === delegacao.nome)
        ? { tipo: 'info', titulo: 'Pedido feito em outro aparelho',
            texto: 'Sua delegação fez um novo pedido em outro aparelho, e ele substituiu o pedido deste. Acompanhe a fila por lá.' }
        : { tipo: 'info', titulo: 'Seu pedido saiu da fila',
            texto: 'A mesa diretora pode ter removido o pedido ou encerrado a fala, ou sua delegação pediu de novo em outro aparelho. Se ainda quiser falar, é só pedir de novo.' });
      return;
    }
    vistoNaFila = true;

    // Dois aparelhos da mesma delegação podem confirmar no mesmo instante,
    // sem um ver o pedido do outro a tempo, e o país ficaria duas vezes na
    // fila. Regra para convergir: fica só o pedido mais recente. Como os dois
    // aparelhos enxergam os mesmos dados (já confirmados pelo servidor — esta
    // função só roda depois que a gravação foi aceita), os dois chegam à
    // mesma conclusão e só um sai.
    const substituido = fila.some((e, i) => e.delegacao === delegacao.nome && i > fila.indexOf(eu));
    if (substituido) {
      const minha = minhaKey;
      mostrarEscolha();
      Sync.remover(minha).catch(() => {});
      Sync.sair().catch(() => {});
      UI.dialogo({
        tipo: 'info',
        titulo: 'Pedido feito em outro aparelho',
        texto: 'Sua delegação acabou de fazer um pedido em outro aparelho, e ele substituiu o pedido deste. Acompanhe a fila por lá.',
      });
      return;
    }

    const nova = fila.map(e => e.key).join('|') + '#' + minhaKey;
    if (nova === assinatura) return;
    assinatura = nova;

    const naFrente = fila.indexOf(eu);
    const minhaVez = naFrente === 0;

    $('#cartaoEstado').innerHTML = minhaVez
      ? `<div class="turn">
           <p class="turn__kicker">Você é a primeira da fila</p>
           <p class="turn__title">Sua vez de falar!</p>
           ${eu.opcao ? `<p class="turn__what">${UI.esc(eu.opcao)}</p>` : ''}
         </div>`
      : `<div class="wait card${naFrente === 1 ? ' wait--proximo' : ''}">
           <p class="wait__pos">${naFrente}</p>
           <p class="wait__label">${naFrente === 1 ? 'delegação na sua frente' : 'delegações na sua frente'}</p>
           <p class="wait__title">${naFrente === 1 ? 'Você é a próxima a falar' : 'Aguarde sua vez de falar'}</p>
           <p class="wait__what">${UI.esc(eu.opcao || 'Inscrição na Lista de Oradores')}</p>
           <p class="wait__agora">Com a palavra agora: <b>${UI.esc(fila[0].delegacao)}</b></p>
         </div>`;

    // quem está falando tem só "Terminei de falar"; quem espera, só "Remover meu pedido"
    $('#btnTerminei').hidden = !minhaVez;
    $('#btnSair').hidden     = minhaVez;

    if (minhaVez && !eraMinhaVez) {
      UI.alerta();
      // com a tela apagada o celular não toca nem vibra: repete ao desbloquear
      alertaPendente = document.hidden;
    }
    eraMinhaVez = minhaVez;
    // o título da aba também avisa, para quem estiver com outra aba aberta
    document.title = minhaVez ? `🔔 Sua vez de falar | SimuLADI` : `SimuLADI | ${delegacao.nome}`;
  }

  /* ---------------------------------------------------------
     início
     --------------------------------------------------------- */
  Sync.iniciar().then(s => {
    s.aoMudar(desenhar);
    s.aoStatus(UI.monitorarConexao($('#avisoConexao')));
  }).catch(UI.semConexaoNaAbertura);

})();
