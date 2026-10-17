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
      primeiro.delegacao.length <= 14 ? ' now__name--g' :
      primeiro.delegacao.length <= 26 ? ' now__name--m' : ' now__name--p';

    $('#agora').innerHTML = primeiro
      ? `<div class="now">
           <p class="now__kicker">Com a palavra</p>
           <div class="now__miolo">
             <h2 class="now__name${escala}">${primeiro.delegacao}</h2>
           </div>
           <div class="now__base">
             <p class="now__timer" id="cron">00:00</p>
             <button class="now__x" type="button" data-remover="${primeiro.key}">Encerrar fala</button>
           </div>
         </div>`
      : `<div class="now now--empty">
           <h2 class="now__name">Nenhum pedido de fala no momento</h2>
         </div>`;

    const resto = fila.slice(1);
    $('#proximos').innerHTML = resto.length
      ? resto.map((e, i) => `
          <li class="fila__item">
            <span class="fila__n">${i + 2}</span>
            <span class="flag" style="font-size:20px">${UI.bandeira(e.bandeira)}</span>
            <span class="fila__nome">${e.delegacao}</span>
            <button class="fila__x" data-remover="${e.key}" title="Remover da fila" aria-label="Remover ${e.delegacao}">×</button>
          </li>`).join('')
      : `<li class="empty">Nenhum país aguardando.</li>`;
  }

  /* ---------------------------------------------------------
     lista de questões e moções (independente da fila)
     --------------------------------------------------------- */
  let assinaturaPedidos = null;

  function desenharPedidos(lista) {
    const nova = lista.map(p => p.chave + ':' + p.solicitantes.length).join('|');
    if (nova === assinaturaPedidos) return;
    assinaturaPedidos = nova;

    $('#listaPedidos').innerHTML = lista.length
      ? lista.map(p => `
          <li class="pedido">
            <span class="pedido__texto">${p.opcao}</span>
            <span class="pedido__quem">${p.solicitantes
                .map(s => `<span class="pedido__pais">${s.nome}</span>`)
                .join('<span class="pedido__sep" aria-hidden="true">,</span>')}</span>
            <button class="pedido__x" data-remover-pedido="${p.chave}" title="Remover questão"
                    aria-label="Remover ${p.opcao}">×</button>
          </li>`).join('')
      : `<li class="empty">Nenhuma questão ou moção solicitada.</li>`;
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
      UI.aviso('Não foi possível verificar a senha. Recarregue a página e tente de novo.', true);
      return;
    }
    if (ok) ligarMesa();
    else { UI.aviso('Senha da mesa incorreta.', true); $('#senhaMesa').value = ''; }
  });
  $('#senhaMesa').addEventListener('keydown', e => { if (e.key === 'Enter') $('#mesaOk').click(); });

  $$('[data-fechar]').forEach(b => b.addEventListener('click', () => UI.fechar(sheet)));
  sheet.addEventListener('click', e => { if (e.target === sheet) UI.fechar(sheet); });

  // vale para a fila e também para quem está com a palavra
  document.addEventListener('click', e => {
    if (!mesa) return;
    const naFila = e.target.closest('[data-remover]');
    if (naFila) { Sync.remover(naFila.dataset.remover); return; }
    const pedido = e.target.closest('[data-remover-pedido]');
    if (pedido) Sync.removerPedido(pedido.dataset.removerPedido);
  });

  $('#btnLimpar').addEventListener('click', () => {
    if (confirm('Remover todos os países da fila? As questões e moções continuam na lista.')) Sync.limpar();
  });

  $('#btnLimparPedidos').addEventListener('click', () => {
    if (confirm('Remover todas as questões e moções solicitadas? A fila de países continua.')) Sync.limparPedidos();
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
    s.aoMudarPedidos(desenharPedidos);
    s.aoStatus(UI.monitorarConexao($('#avisoConexao')));
  });

})();
