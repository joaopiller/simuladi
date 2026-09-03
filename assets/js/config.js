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
     bandeira -> código de 2 letras do país (vira a bandeira automaticamente)
              OU um emoji direto, para delegações históricas que não têm
              bandeira no padrão Unicode (URSS, Iugoslávia)
     senha -> senha em texto simples (fácil de começar)
     hash  -> alternativa segura: SHA-256 da senha.
              Gere em senhas.html e cole aqui no lugar de "senha".
              Se existir "hash", o campo "senha" é ignorado.
     --------------------------------------------------------- */
  delegacoes: [
    { nome: 'Bielorrússia', bandeira: 'BY', hash: 'bcf42d62b516ca25113190f01f1f4c509db599446394c9fbb71a6b0ace0f21d4' },
    { nome: 'Brasil', bandeira: 'BR', hash: '8e4fe24e4b7b24a1d617e881190e7edda0754d77e2be0f056ad07534d6576c2b' },
    { nome: 'Bulgária', bandeira: 'BG', hash: '79dd1182cb5fd27d976336da31a9c3f16ddfb48c2fc52017d718bf10c52deadb' },
    { nome: 'Canadá', bandeira: 'CA', hash: 'fa262306962301823e2cc466ba0074ffc29903b9450f72c773e304b5a69d769f' },
    { nome: 'Colômbia', bandeira: 'CO', hash: '1547453937b0a9703fc5be4cf6e260bc8bd50a674d6db8f2abc3c6b37fbc1f60' },
    { nome: 'Cuba', bandeira: 'CU', hash: '8f9f86b322559cf4cc2b339837212a18957d43f6c079be3bb021a19711e2ee70' },
    { nome: 'Egito', bandeira: 'EG', hash: '75db8ff4d44605581a866951d8395c1b96b49a8053d901cae2f69834c0cf514b' },
    { nome: 'Equador', bandeira: 'EC', hash: '46157d984c19d79c99cea25dafb2eecfee8e32302be17be2efa75924ee00d0c7' },
    { nome: 'Estados Unidos', bandeira: 'US', hash: 'd62b95bb5bf6f786341fbcfd281fb2b967ac080a0b5bb1413ad31c1fce925de5' },
    { nome: 'Filipinas', bandeira: 'PH', hash: 'bfd1559e6b58de2331e0513d75ff81763c4c57bd08d66d11a0190cd7d1b32531' },
    { nome: 'França', bandeira: 'FR', hash: '6ccef04f0db0753cc404dc56b867be79f9c8fa753e277b6c34e5288287b3c4e5' },
    { nome: 'Índia', bandeira: 'IN', hash: '70301c402e1ebe3d33b77c6e1c0da9c6ccc34542bff85efd02a6d4ec4f78814c' },
    { nome: 'Iugoslávia', bandeira: '⭐', hash: '0397bb8e65f02070e1afae4059fe014a914dd298a71759908d0cb2340cb34940' },
    { nome: 'México', bandeira: 'MX', hash: '3a69fb4a29285371f1684ec60e410e20beec05ce16442d95bdb81cd1274835b5' },
    { nome: 'Noruega', bandeira: 'NO', hash: '1994e279e593b703db8f7fea8cd3cd03ea23bfa77354d2f67caee484a4d0c18c' },
    { nome: 'Polônia', bandeira: 'PL', hash: '2083b67bf4ebd731631573ab10bdcdba26dd374de1b184be975b4fd4b5ab0f45' },
    { nome: 'Reino Unido', bandeira: 'GB', hash: '669e01af0cad3dedd0b5b4d4a76a19d541529baff7bde16dbc7563f6e19a9338' },
    { nome: 'Romênia', bandeira: 'RO', hash: '56b7f480042b06c64dfde37ab79a2b82b24e1c4375204c5a330ee705106b7c01' },
    { nome: 'Síria', bandeira: 'SY', hash: '6b53ddf83c7dadfc59f3e54bbaf3ce84a9c964efd814e30f606e34d90b969bf7' },
    { nome: 'Suécia', bandeira: 'SE', hash: '28f6448e0faa074dc94b18ca32cc5132f1c20c9a4358c2d5337f09daf9443171' },
    { nome: 'Taiwan', bandeira: 'TW', hash: '3a7ba2b8a056438a60e67b271258972af9c91e54bb2a80756953f2159e788afb' },
    { nome: 'Tchecoslováquia', bandeira: 'CZ', hash: '08ed6474ff38fb1e7bf9554f5aa3f8f2d6c27602baac966ac75c9b2e5aa15fea' },
    { nome: 'Turquia', bandeira: 'TR', hash: 'eb921766e948ef163dc2ac4319520544c5b633f3ee477d25f5d5b593d1542060' },
    { nome: 'Ucrânia', bandeira: 'UA', hash: '2351f01ec78be433d6d037ecd0ee9f09abfdf6e5ab501980494d5e97558d6170' },
    { nome: 'URSS', bandeira: '🔴', hash: '42728de59be409c87b3260927ae7c8abbd6b03545a48c626007c695f3de4757a' }
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
