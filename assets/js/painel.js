/* =============================================================
   SimuLADI — tela de projeção
   ============================================================= */

(() => {

  let atual = null;      // chave de quem está falando
  let desde = 0;         // quando assumiu a palavra
  let mesa  = false;

  /* a marca leva de volta ao início, carregando a sala atual junto */
  $('#linkInicio').href = UI.href();


  /* ---------------------------------------------------------
     desenho
     --------------------------------------------------------- */
  let assinatura = null;

  function desenhar(fila) {
    const primeiro = fila[0] || null;
    const chave = primeiro ? primeiro.key : null;

    if (chave !== atual) { atual = chave; desde = Date.now(); }

    const nova = fila.map(e => e.key).join('|');
    if (nova === assinatura) return;
    assinatura = nova;

    // Sem a bandeira, o nome é o único elemento do cartão e pode crescer — mas um
    // nome longo em corpo grande invade o rótulo e o cronômetro. A escala segue o
    // comprimento: quase todas as delegações são curtas e ganham o corpo maior.
    const escala = !primeiro ? '' :
      String(primeiro.delegacao).length <= 14 ? ' now__name--g' :
      String(primeiro.delegacao).length <= 26 ? ' now__name--m' : ' now__name--p';

    // O rótulo diz o tipo de fala. Para questão e moção vem "Questão solicitada"
    // ou "Moção solicitada", montado a partir do título da categoria no config,
    // e o tema aparece logo abaixo do país, menor.
    const pedeTema = primeiro && primeiro.categoria;
    const kicker = pedeTema ? `${UI.esc(primeiro.titulo)} solicitada` : 'Orador com a palavra';

    $('#agora').innerHTML = primeiro
      ? `<div class="now">
           <p class="now__kicker">${kicker}</p>
           <div class="now__miolo">
             <h2 class="now__name${escala}">${UI.esc(primeiro.delegacao)}</h2>
             ${pedeTema ? `<p class="now__tema">${UI.esc(primeiro.opcao)}</p>` : ''}
           </div>
           <div class="now__base">
             <p class="now__timer" id="cron">00:00</p>
             <button class="now__x" type="button" data-remover="${UI.esc(primeiro.key)}">Encerrar fala</button>
           </div>
         </div>`
      : `<div class="now now--empty">
           <h2 class="now__name">Nenhum pedido de fala no momento</h2>
         </div>`;

    // A fila é uma só; a projeção apenas separa a exibição em duas listas.
    // Cada item leva a posição GLOBAL, para a sala ver que uma questão em 2º
    // fala antes de um orador em 4º, mesmo estando em listas diferentes.
    const resto    = fila.slice(1).map((e, i) => ({ ...e, pos: i + 2 }));
    const oradores = resto.filter(e => !e.categoria);
    const pedidos  = resto.filter(e => e.categoria);

    $('#proximos').innerHTML = oradores.length
      ? oradores.map(e => `
          <li class="fila__item">
            <span class="fila__n">${e.pos}</span>
            <span class="flag" style="font-size:20px">${UI.bandeira(e.bandeira)}</span>
            <span class="fila__nome">${UI.esc(e.delegacao)}</span>
            <button class="fila__x" data-remover="${UI.esc(e.key)}" title="Remover da fila" aria-label="Remover ${UI.esc(e.delegacao)}">×</button>
          </li>`).join('')
      : `<li class="empty">Nenhum orador aguardando.</li>`;

    $('#listaPedidos').innerHTML = pedidos.length
      ? pedidos.map(e => `
          <li class="pedido">
            <span class="pedido__n">${e.pos}</span>
            <span class="pedido__pais">${UI.esc(e.delegacao)}</span>
            <span class="pedido__tema">${UI.esc(e.opcao)}</span>
            <button class="pedido__x" data-remover="${UI.esc(e.key)}" title="Remover da fila"
                    aria-label="Remover ${UI.esc(e.delegacao)}">×</button>
          </li>`).join('')
      : `<li class="empty">Nenhuma questão ou moção na fila.</li>`;
  }

  setInterval(() => { const c = $('#cron'); if (c) c.textContent = UI.cronometro(desde); }, 1000);

  /* ---------------------------------------------------------
     modo mesa
     --------------------------------------------------------- */
  const sheet = $('#sheetMesa');

  function ligarMesa() {
    mesa = true;
    document.body.classList.add('mesa-on');
    $('#btnLimpar').hidden = false;
    $('#btnLimparPedidos').hidden = false;
    $('#btnMesa').textContent = 'Sair da mesa';
    UI.fechar(sheet);
    UI.aviso('Modo mesa liberado.');
  }

  /* Sair devolve a tela ao estado de projeção. Como "mesa" volta a ser falso,
     o próximo clique cai de novo na folha de senha — reentrar exige digitá-la. */
  function desligarMesa() {
    mesa = false;
    document.body.classList.remove('mesa-on');
    $('#btnLimpar').hidden = true;
    $('#btnLimparPedidos').hidden = true;
    $('#btnMesa').textContent = 'Modo mesa';
    UI.aviso('Modo mesa encerrado.');
  }

  $('#btnMesa').addEventListener('click', () => {
    if (mesa) { desligarMesa(); return; }
    if (!Config.senhaMesa && !Config.hashMesa) { ligarMesa(); return; }
    $('#senhaMesa').value = '';
    UI.abrir(sheet);
    setTimeout(() => $('#senhaMesa').focus(), 260);
  });

  $('#mesaOk').addEventListener('click', async () => {
    let ok = false;
    try {
      ok = await UI.conferirSenha(
        { senha: Config.senhaMesa, hash: Config.hashMesa }, $('#senhaMesa').value);
    } catch (e) {
      UI.dialogo({ titulo: 'Não foi possível verificar a senha',
                   texto: 'O navegador não conseguiu conferir a senha da mesa. Recarregue a página e tente de novo.' });
      return;
    }
    if (ok) ligarMesa();
    else { UI.aviso('Senha da mesa incorreta.', true); $('#senhaMesa').value = ''; }
  });
  $('#senhaMesa').addEventListener('keydown', e => { if (e.key === 'Enter') $('#mesaOk').click(); });

  $$('[data-fechar]').forEach(b => b.addEventListener('click', () => UI.fechar(sheet)));
  sheet.addEventListener('click', e => { if (e.target === sheet) UI.fechar(sheet); });

  // vale para as duas listas e também para quem está com a palavra
  const falhaDaMesa = e => {
    console.error(e);
    UI.dialogo(UI.mensagemDeErro(e, 'A alteração na fila não foi feita.'));
  };

  document.addEventListener('click', e => {
    if (!mesa) return;
    const alvo = e.target.closest('[data-remover]');
    if (!alvo || alvo.disabled) return;
    alvo.disabled = true;   // evita o segundo toque mandar a mesma remoção
    Sync.remover(alvo.dataset.remover).catch(falhaDaMesa).finally(() => { alvo.disabled = false; });
  });

  // Cada botão limpa só o seu tipo. Se quem está com a palavra for desse
  // tipo, sai também — e a palavra passa ao próximo da fila.
  const chavesDe = ehPedido => Sync.fila.filter(e => !!e.categoria === ehPedido).map(e => e.key);

  $('#btnLimpar').addEventListener('click', () => {
    const n = chavesDe(false).length;
    if (!n) { UI.aviso('Não há oradores na fila.'); return; }
    UI.dialogo({ tipo: 'info', titulo: `Remover ${n} ${n === 1 ? 'orador' : 'oradores'}?`,
                 texto: 'Todos os oradores saem da fila, inclusive quem estiver com a palavra. As questões e moções continuam.',
                 botao: 'Remover', secundario: 'Cancelar' })
      .then(ok => ok && Sync.removerVarios(chavesDe(false)).catch(falhaDaMesa));
  });

  $('#btnLimparPedidos').addEventListener('click', () => {
    const n = chavesDe(true).length;
    if (!n) { UI.aviso('Não há questões nem moções na fila.'); return; }
    UI.dialogo({ tipo: 'info', titulo: `Remover ${n} ${n === 1 ? 'questão ou moção' : 'questões e moções'}?`,
                 texto: 'Todos esses pedidos saem da fila, inclusive se for a vez de um deles. Os oradores continuam.',
                 botao: 'Remover', secundario: 'Cancelar' })
      .then(ok => ok && Sync.removerVarios(chavesDe(true)).catch(falhaDaMesa));
  });

  /* ---------------------------------------------------------
     QR code de acesso
     --------------------------------------------------------- */
  const janelaQR = $('#qr');
  // Descoberto sozinho a partir de onde a tela de projeção está aberta,
  // então acompanha a mudança de endereço quando o site for publicado.
  // Sem o "index.html" a URL fica mais curta e o QR, mais fácil de escanear.
  const enderecoDoSite = (() => {
    const sala = new URLSearchParams(location.search).get('sala');
    const url = new URL(Config.enderecoPublico || UI.raiz(), location.href);
    if (sala) url.searchParams.set('sala', sala);
    return url.href;
  })();

  // celular nenhum alcança "localhost": avisa antes que isso vire problema no evento
  const soFuncionaNesteComputador = (() => {
    const u = new URL(enderecoDoSite);
    return u.protocol === 'file:' || ['localhost', '127.0.0.1', '0.0.0.0', '[::1]'].includes(u.hostname);
  })();

  let qrDesenhado = false;
  function abrirQR() {
    if (!qrDesenhado) {
      try {
        QR.desenhar($('#qrCanvas'), enderecoDoSite, 900);
        $('#qrUrl').textContent = enderecoDoSite.replace(/^https?:\/\//, '').replace(/\/$/, '');
        $('#qrAviso').hidden = !soFuncionaNesteComputador;
        qrDesenhado = true;
      } catch (e) {
        console.error(e);
        UI.aviso('Não foi possível gerar o QR code.', true);
        return;
      }
    }
    janelaQR.classList.add('is-open');
  }
  const fecharQR = () => janelaQR.classList.remove('is-open');

  $('#btnQR').addEventListener('click', abrirQR);
  $('#qrFechar').addEventListener('click', fecharQR);
  janelaQR.addEventListener('click', e => { if (e.target === janelaQR) fecharQR(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') fecharQR(); });

  /* ---------------------------------------------------------
     tela cheia
     --------------------------------------------------------- */
  $('#btnTela').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => UI.aviso('Tela cheia indisponível.', true));
  });

  /* ---------------------------------------------------------
     início
     --------------------------------------------------------- */
  Sync.iniciar().then(s => {
    s.aoMudar(desenhar);
    s.aoStatus(UI.monitorarConexao($('#avisoConexao')));
  }).catch(UI.semConexaoNaAbertura);

})();
