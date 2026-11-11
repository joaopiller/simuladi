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
    // a mesa só aplica o fechamento/encerramento quando a moção correspondente
    // está sendo apresentada: o botão aparece no cartão, ao lado de "Encerrar fala"
    const acaoLista = primeiro && primeiro.categoria ? mocaoDeLista(primeiro.opcao) : null;
    const kicker = pedeTema ? `${UI.esc(primeiro.titulo)} solicitada` : 'Orador com a palavra';

    $('#agora').innerHTML = primeiro
      ? `<div class="now">
           <p class="now__kicker">${kicker}</p>
           <div class="now__miolo">
             <h2 class="now__name${escala}">${UI.esc(primeiro.delegacao)}</h2>
             ${pedeTema ? `<p class="now__tema">${UI.esc(primeiro.opcao)}</p>` : ''}
           </div>
           <div class="now__base">
             <p class="now__timer" id="cron">${UI.cronometro(Sync.falandoDesde ?? desde)}</p>
             <button class="now__x" type="button" data-remover="${UI.esc(primeiro.key)}">Encerrar fala</button>
             ${acaoLista ? `<button class="now__acao" type="button" data-lista="${acaoLista}">${acaoLista === 'fechada' ? 'Fechar lista de oradores' : 'Encerrar lista de oradores'}</button>` : ''}
           </div>
         </div>`
      : `<div class="now now--empty">
           <h2 class="now__name">Nenhum pedido de fala no momento</h2>
         </div>`;

    // A fila é uma só; a projeção apenas separa a exibição em duas listas.
    // Cada item leva a posição GLOBAL na espera, para a sala ver que uma
    // questão em 1º fala antes de um orador em 3º, mesmo em listas diferentes.
    // Começa do 1: quem está com a palavra não está mais esperando, e assim o
    // número do telão é o mesmo que o celular mostra em "na sua frente".
    const resto    = fila.slice(1).map((e, i) => ({ ...e, pos: i + 1 }));
    const oradores = resto.filter(e => !e.categoria);
    const pedidos  = resto.filter(e => e.categoria);

    // O próximo a falar pode estar em qualquer das duas listas; destacá-lo
    // poupa a sala de procurar o número 1 nas duas.
    const proximo = e => e.pos === 1 ? ' is-proximo' : '';
    const tagProximo = e => e.pos === 1 ? ' <span class="proximo-tag">próximo</span>' : '';

    $('#proximos').innerHTML = oradores.length
      ? oradores.map(e => `
          <li class="fila__item${proximo(e)}">
            <span class="fila__n">${e.pos}</span>
            <span class="flag" style="font-size:20px">${UI.bandeira(e.bandeira)}</span>
            <span class="fila__nome">${UI.esc(e.delegacao)}${tagProximo(e)}</span>
            <button class="fila__x" data-remover="${UI.esc(e.key)}" title="Remover da fila" aria-label="Remover ${UI.esc(e.delegacao)}">×</button>
          </li>`).join('')
      : `<li class="empty">Nenhum orador aguardando.</li>`;

    $('#listaPedidos').innerHTML = pedidos.length
      ? pedidos.map(e => `
          <li class="pedido${proximo(e)}">
            <span class="pedido__n">${e.pos}</span>
            <span class="pedido__pais">${UI.esc(e.delegacao)}${tagProximo(e)}</span>
            <span class="pedido__tema">${UI.esc(e.opcao)}</span>
            <button class="pedido__x" data-remover="${UI.esc(e.key)}" title="Remover da fila"
                    aria-label="Remover ${UI.esc(e.delegacao)}">×</button>
          </li>`).join('')
      : `<li class="empty">Nenhuma questão ou moção na fila.</li>`;
  }

  // O início da fala vem do servidor: recarregar o painel não zera mais o
  // cronômetro, e todas as telas mostram o mesmo tempo. Enquanto a reserva da
  // palavra não chega, conta a partir de quando esta tela viu a troca.
  const tick = () => { const c = $('#cron'); if (c) c.textContent = UI.cronometro(Sync.falandoDesde ?? desde); };
  setInterval(tick, 1000);

  /* ---------------------------------------------------------
     modo mesa
     --------------------------------------------------------- */
  const sheet = $('#sheetMesa');

  function ligarMesa() {
    mesa = true;
    document.body.classList.add('mesa-on');
    aplicarLista();
    $('#btnMesa').textContent = 'Sair da mesa';
    UI.fechar(sheet);
    UI.aviso('Modo mesa liberado.');
  }

  /* Sair devolve a tela ao estado de projeção. Como "mesa" volta a ser falso,
     o próximo clique cai de novo na folha de senha — reentrar exige digitá-la. */
  function desligarMesa() {
    mesa = false;
    document.body.classList.remove('mesa-on');
    aplicarLista();
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

  /* ---------------------------------------------------------
     situação da lista de oradores
     --------------------------------------------------------- */
  // reconhece a moção pelo texto, sem depender de maiúsculas e acentos,
  // para continuar funcionando se a redação mudar no config.js
  const normal = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  function mocaoDeLista(opcao) {
    const t = normal(opcao);
    if (!t.includes('lista de oradores')) return null;
    if (t.includes('encerramento')) return 'encerrada';
    if (t.includes('fechamento')) return 'fechada';
    return null;
  }
  // o telão mostra a situação para todos; os botões só aparecem para a mesa
  function aplicarLista() {
    const l = Sync.lista;
    const chip = $('#chipLista');
    chip.hidden = l === 'aberta';
    chip.textContent = l === 'encerrada' ? 'encerrada' : 'fechada';
    chip.classList.toggle('chip-lista--encerrada', l === 'encerrada');
    // rodapé: sempre à mão, mesmo sem a moção no sistema (feita de viva voz,
    // delegação que saiu da fila, decisão da própria mesa)
    $('#btnFecharLista').hidden   = !mesa || l !== 'aberta';
    $('#btnEncerrarLista').hidden = !mesa || l === 'encerrada';
    $('#btnReabrirLista').hidden  = !mesa || l === 'aberta';
    // o botão do cartão some se a lista já estiver nesse estado (ou mais restrita)
    $$('[data-lista]').forEach(b => {
      b.hidden = b.dataset.lista === 'fechada' ? l !== 'aberta' : l === 'encerrada';
    });
  }

  const confirmar = (titulo, texto, botao) =>
    UI.dialogo({ tipo: 'info', titulo, texto, botao, secundario: 'Cancelar' });

  async function fecharLista() {
    if (!await confirmar('Fechar a lista de oradores?',
      'Ninguém novo entra como orador. Quem já está inscrito continua e fala normalmente. Questões e moções seguem liberadas.',
      'Fechar lista')) return;
    Sync.definirLista('fechada').then(() => UI.aviso('Lista de oradores fechada.')).catch(falhaDaMesa);
  }

  async function encerrarLista() {
    // quem está com a palavra termina a fala, mesmo sendo orador
    const esperando = () => Sync.fila.slice(1).filter(e => !e.categoria).map(e => e.key);
    const n = esperando().length;
    if (!await confirmar('Encerrar a lista de oradores?',
      `${n ? `${n} ${n === 1 ? 'orador que espera sai' : 'oradores que esperam saem'} da fila. ` : ''}Quem está com a palavra termina a fala. Ninguém mais consegue fazer pedidos até a lista ser reaberta.`,
      'Encerrar lista')) return;
    try {
      await Sync.definirLista('encerrada');      // primeiro bloqueia, depois esvazia
      await Sync.removerVarios(esperando());
      UI.aviso('Lista de oradores encerrada.');
    } catch (e) { falhaDaMesa(e); }
  }

  $('#btnFecharLista').addEventListener('click', fecharLista);
  $('#btnEncerrarLista').addEventListener('click', encerrarLista);

  // atalho no cartão, quando a moção de fechamento ou encerramento está na vez
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-lista]');
    if (!b || !mesa) return;
    if (b.dataset.lista === 'fechada') fecharLista(); else encerrarLista();
  });

  $('#btnReabrirLista').addEventListener('click', async () => {
    if (!await confirmar('Reabrir a lista de oradores?',
      'Os pedidos voltam a ser liberados. Quem saiu da fila no encerramento precisa pedir de novo.',
      'Reabrir lista')) return;
    Sync.definirLista('aberta').then(() => UI.aviso('Lista de oradores reaberta.')).catch(falhaDaMesa);
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
    s.aoMudar(fila => { desenhar(fila); aplicarLista(); });
    s.aoStatus(UI.monitorarConexao($('#avisoConexao')));
  }).catch(UI.semConexaoNaAbertura);

})();
