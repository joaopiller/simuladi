/* =============================================================
   SimuLADI — CONFIGURAÇÃO
   Este é o ÚNICO arquivo que a organização precisa editar.
   ============================================================= */

const Config = {

  /* ---------------------------------------------------------
     1. IDENTIDADE
     --------------------------------------------------------- */
  nome: 'SimuLADI',
  subtitulo: 'Pedido de fala',
  organizacao: 'Ligas Acadêmicas de Direito Internacional da UFF e da UNIRIO',

  /* ---------------------------------------------------------
     2. SALA / COMITÊ
     Cada comitê tem sua própria fila, independente das outras.
     Pode ser trocado pela URL:  index.html?sala=conselho
     --------------------------------------------------------- */
  salaPadrao: 'assembleia-geral',

  /* ---------------------------------------------------------
     3. SENHA DA MESA DIRETORA
     Libera os controles na tela de projeção (encerrar fala,
     remover pedido, limpar fila).

     senhaMesa -> senha em texto simples, fácil para começar,
                  mas VISÍVEL para quem abrir o código-fonte.
     hashMesa  -> alternativa: SHA-256 da senha, gerado em
                  senhas.html. Se preenchido, senhaMesa é ignorada.
     Deixe os dois em branco para não exigir senha nenhuma.
     --------------------------------------------------------- */
  senhaMesa: '',
  hashMesa: 'cbf2754f6456587977ff29e732bec773fe4d409257f5f25995f8a9a32b7279ba',

  /* ---------------------------------------------------------
     4. TIPOS DE PEDIDO
     --------------------------------------------------------- */
  categorias: [
    {
      id: 'questao',
      titulo: 'Questão',
      opcoes: [
        'Questão de Privilégio Pessoal',
        'Questão de Informação',
        'Questão de Ordem'
      ]
    },
    {
      id: 'mocao',
      titulo: 'Moção',
      opcoes: [
        'Moção para Reconhecimento de Delegação',
        'Moção para Alteração de Tempo de Discurso',
        'Moção para Adiamento da Sessão',
        'Moção para Debate Moderado',
        'Moção para Discurso Livre',
        'Moção para Debate Não-Moderado',
        'Moção para Fechamento da Lista de Oradores',
        'Moção para Encerramento da Lista de Oradores'
      ]
    }
  ],

  /* ---------------------------------------------------------
     5. DELEGAÇÕES E SENHAS
     iso   -> código de 2 letras, usado só para mostrar a bandeira
     senha -> senha em texto simples (fácil de começar)
     hash  -> alternativa segura: SHA-256 da senha.
              Gere em senhas.html e cole aqui no lugar de "senha".
              Se existir "hash", o campo "senha" é ignorado.
     --------------------------------------------------------- */
    delegacoes: [
    { nome: 'África do Sul', iso: 'ZA', hash: '632ec91b23fd18f96ecb293ca4f0db434b13149be04368810b29e9d7d64dcf67' },
    { nome: 'Alemanha', iso: 'DE', hash: '6f1d341d95537fb2fff2c5f88da236c076683164bf0ee8fa08156efe456c71fa' },
    { nome: 'Arábia Saudita', iso: 'SA', hash: 'fb424427f1ed19d345839179f660471df3f9708d1edb4e47a3641132e6f09b24' },
    { nome: 'Argentina', iso: 'AR', hash: '84439d8c4691a981364585c08d23cea22c56a9083cd5f7646be0bb12b05d7c7b' },
    { nome: 'Austrália', iso: 'AU', hash: 'fd98fdc4120f5e07d4426787311d46e1ba36f9e9333ab1f7f43af4f0dd29e4f7' },
    { nome: 'Bélgica', iso: 'BE', hash: 'ec70d8b9db30df3475dc99e037885227098b1378e656575297931c07aa6d4213' },
    { nome: 'Bolívia', iso: 'BO', hash: 'cd73efae611f73c314df2bbd5b81dc6166d3654b4d03c10f3f572853bb418aae' },
    { nome: 'Brasil', iso: 'BR', hash: 'e8d3b4c342398ab05dc3289597e41230374a00782efe555c65168fcfe3ca9c48' },
    { nome: 'Canadá', iso: 'CA', hash: 'dbf8855e3aaea0ab5440472c13bcdb1ea42ff6b369040735dbdfa18d23338415' },
    { nome: 'Catar', iso: 'QA', hash: 'ea33d18ae5a36bcc4ea65e8994e7d0ac1bb8c8e79afed39a1ae79d19262fc7e4' },
    { nome: 'Chile', iso: 'CL', hash: 'ba44d74947de5729419ae69f2f817ccdcf6ccf65b989f9f72630b2a875e4a614' },
    { nome: 'China', iso: 'CN', hash: '110622fbc53ad0901981ddfc763e0782f9ac51fa25df2800bf4704dc9ec20ede' },
    { nome: 'Colômbia', iso: 'CO', hash: '6bb6eb42bd73293fa68843c67221027cc18d7189a345ec381eed3299463e6f8f' },
    { nome: 'Coreia do Sul', iso: 'KR', hash: 'd98ed5f253fa799f03324799e61a9f6260e791b66643077387a224aaf320a944' },
    { nome: 'Cuba', iso: 'CU', hash: '0189c8ffc735a9427cfa0a3dd75a125fa65189c35868362fcc80fd1a9d5031fd' },
    { nome: 'Egito', iso: 'EG', hash: 'fdb34f47935491d185274fa0ae26a618617342eacbbe20f10b43ea5fe54d4cec' },
    { nome: 'Emirados Árabes Unidos', iso: 'AE', hash: '0d1de667edebd9d51f921908ab51214d7a74114b307e34392c95e473bf2d2568' },
    { nome: 'Equador', iso: 'EC', hash: 'cdc48c527384c7b65cbd04c0c77e802715f6986c5ddd86fccf6baa1c53562bd0' },
    { nome: 'Espanha', iso: 'ES', hash: '4a403113d65940043694a689f58f4e899b95a64381a4091f719dcfebec79dac1' },
    { nome: 'Estados Unidos', iso: 'US', hash: 'debcc51747a029e89aa939e65f34b5b63b46a18d976c40faf4e889a5c0fcd431' },
    { nome: 'Etiópia', iso: 'ET', hash: '4394adcd1050d8cc4f910213e6dc9e84cbfc7521e67c1109fe1fd6b546b4e592' },
    { nome: 'França', iso: 'FR', hash: '1189b86a9facfed7e76d80d8014702c54e4c95fc8f238e529ba8286cc5639723' },
    { nome: 'Gana', iso: 'GH', hash: 'cfe01b1b001a61568df90b366e5f30d874e6eecef7b7f1aac692bd9af99f51c2' },
    { nome: 'Índia', iso: 'IN', hash: 'a7daf4cd3429552cb1e0a7e910a56e43f4d8094deb0da3c9c1b3a8ba0b332a22' },
    { nome: 'Indonésia', iso: 'ID', hash: '434ca3a9c79d0c717be90b32d4f64f548fc3fc80386ef2c2f02a1fe51f402ec9' },
    { nome: 'Irã', iso: 'IR', hash: 'b6bf598e6025be364e0b30bdb8ec4494905c129912688b327e9b7b5d0625acd6' },
    { nome: 'Iraque', iso: 'IQ', hash: '7a20e624fe7543c3be17ff3b85b0cca1853c971b688d625cae80d3cc1179f6b7' },
    { nome: 'Israel', iso: 'IL', hash: 'cbfda0c614a14cbdd97881beed4cb33c91cc9b0c6f9e6ba2be6ce7db97506251' },
    { nome: 'Itália', iso: 'IT', hash: 'e75e278b28e7dbaa007de72c4646397a7231efb7e6a2e5b482f45b4cb3cd655b' },
    { nome: 'Japão', iso: 'JP', hash: 'b5596e638a903f4f59048964d50a1006cec57b25c98650d45183936f8c399c65' },
    { nome: 'Quênia', iso: 'KE', hash: '3b0f3d434eeac23435b15cbe8ee71197a644f6cd8fdd3c8b2ecd8ddf62d3153f' },
    { nome: 'Líbano', iso: 'LB', hash: '497c4bfa16665d41c76bfaabd9b039a5c9384fc1abb196cd155f47c8fcb3b07a' },
    { nome: 'México', iso: 'MX', hash: '57ce824d4f62a03519d49bec019be5551743e94ded5597df60a9dafec2d3861b' },
    { nome: 'Nigéria', iso: 'NG', hash: 'dca4239b2a6b1b54f017c42ae056e6f12651e79e061de717f3b6b69d7a66cf57' },
    { nome: 'Noruega', iso: 'NO', hash: '2bd840a10008726c9f090643ad2931c0b5c488c3fc13797fa264d9dc1b2e8d7c' },
    { nome: 'Países Baixos', iso: 'NL', hash: '11fe7041eac2e75a7f75213105a21bb25877fbd4831fc11f8b6268f9def65f24' },
    { nome: 'Paquistão', iso: 'PK', hash: '48d3ba6467cc56e642735164d581c96cdd5de6eff35b7a3609d6e599c2592626' },
    { nome: 'Peru', iso: 'PE', hash: 'b9f0000c533217b62c9b5ea750fef985e75de9656ab3be5e78086437e5d71008' },
    { nome: 'Polônia', iso: 'PL', hash: '7505e78dd8d2fbeff2b80cc46bb476a6e3bdd4bd63c7e4c19ac7a8327167db37' },
    { nome: 'Portugal', iso: 'PT', hash: 'a7596730c6ca1f6f2a658e7b2e361f361f1b71a2f63ec74226b569da2ade14b1' },
    { nome: 'Reino Unido', iso: 'GB', hash: '29612cbdd1a035ca9fed8cbfe7935a5dd0ac89c65eac233cc658063b8d06df58' },
    { nome: 'Rússia', iso: 'RU', hash: '98c492fea5617d2c4cc129fadd0e031f2fd2ba2a21fc1877408300b39d9aaee2' },
    { nome: 'Suíça', iso: 'CH', hash: '7928f45598b3591c06e82cc3e2bfdcfcc1018e07f8f58fefb863616f7094636c' },
    { nome: 'Turquia', iso: 'TR', hash: '6d3e5094803766d16e9ce4d62841fcd2d5ff7454c3c1312bb96a8a6d9563ca29' },
    { nome: 'Ucrânia', iso: 'UA', hash: '54ea57831c4e85e68d464cb4d627c445eaa1e74cc2dfbfa3f26d91912b235b2e' },
    { nome: 'Venezuela', iso: 'VE', hash: 'a6361dc599bac1ae7bfc633de0c35c99537c98792dc697a96f80f414806ad3ce' }
  ],

// Substitua o bloco "delegacoes" do arquivo assets/js/config.js por este.

  /* ---------------------------------------------------------
     6. ENDEREÇO PÚBLICO DO SITE  (opcional)
     O QR code da tela de projeção descobre o endereço sozinho,
     a partir de onde o site está sendo aberto. Preencha aqui só
     se quiser que o QR aponte para um endereço diferente —
     um link curto, por exemplo.
       enderecoPublico: 'https://simuladi.com.br'
     --------------------------------------------------------- */
  enderecoPublico: '',

  /* ---------------------------------------------------------
     7. FIREBASE  (para funcionar entre aparelhos diferentes)
     Enquanto "apiKey" estiver vazio, o site roda em MODO LOCAL:
     a fila é compartilhada só entre abas do MESMO aparelho —
     ótimo para testar, inútil no dia do evento.
     Instruções passo a passo no README.md.
     --------------------------------------------------------- */
  firebase: {
    apiKey: 'AIzaSyB8M4tJIBLO3363j74y7XNBPMZWQwMC0cA',
    authDomain: 'simuladi.firebaseapp.com',
    databaseURL: 'https://simuladi-default-rtdb.firebaseio.com',
    projectId: 'simuladi'
  },

  /* ---------------------------------------------------------
     UTILITÁRIOS (não precisa mexer)
     --------------------------------------------------------- */
  sala() {
    const p = new URLSearchParams(location.search).get('sala');
    return (p || this.salaPadrao).trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
  },
  usaFirebase() {
    return !!(this.firebase && this.firebase.apiKey && this.firebase.databaseURL);
  },
  acharDelegacao(nome) {
    return this.delegacoes.find(d => d.nome === nome) || null;
  }
};
