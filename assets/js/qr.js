/* =============================================================
   SimuLADI — gerador de QR Code (modo byte, correção nível M)

   Feito localmente, sem depender de nenhum serviço externo: no dia
   do evento o telão não pode ficar sem o QR porque uma API de
   terceiros saiu do ar.

   Cobre as versões 1 a 10, o que dá até 213 caracteres — muito mais
   do que qualquer endereço do site precisa.

   Uso:  QR.gerar('https://simuladi.com.br')  ->  { tamanho, modulos }
   ============================================================= */

const QR = (() => {

  /* ---------- tabelas do padrão (nível de correção M) ---------- */

  // versão: [códigos de correção por bloco, [[qtd. de blocos, dados por bloco], ...]]
  const BLOCOS = {
    1:  [10, [[1, 16]]],
    2:  [16, [[1, 28]]],
    3:  [26, [[1, 44]]],
    4:  [18, [[2, 32]]],
    5:  [24, [[2, 43]]],
    6:  [16, [[4, 27]]],
    7:  [18, [[4, 31]]],
    8:  [22, [[2, 38], [2, 39]]],
    9:  [22, [[3, 36], [2, 37]]],
    10: [26, [[4, 43], [1, 44]]]
  };

  const ALINHAMENTO = {
    1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
    6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50]
  };

  // bits sobrando depois dos códigos, que ficam em zero
  const RESTO = { 1: 0, 2: 7, 3: 7, 4: 7, 5: 7, 6: 7, 7: 0, 8: 0, 9: 0, 10: 0 };

  /* ---------- aritmética no corpo de Galois GF(256) ---------- */

  const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  (() => {
    let x = 1;
    for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; }
    for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  })();

  const mult = (a, b) => (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]];

  function polinomioGerador(grau) {
    let p = [1];
    for (let i = 0; i < grau; i++) {
      const novo = new Array(p.length + 1).fill(0);
      for (let j = 0; j < p.length; j++) {
        novo[j]     ^= p[j];
        novo[j + 1] ^= mult(p[j], EXP[i]);
      }
      p = novo;
    }
    return p;
  }

  function correcao(dados, quantos) {
    const g = polinomioGerador(quantos);
    const r = dados.concat(new Array(quantos).fill(0));
    for (let i = 0; i < dados.length; i++) {
      const c = r[i];
      if (c === 0) continue;
      for (let j = 0; j < g.length; j++) r[i + j] ^= mult(g[j], c);
    }
    return r.slice(dados.length);
  }

  /* ---------- BCH, usado nas informações de formato e versão ---------- */

  function bch(valor, gerador, bits) {
    let v = valor << bits;
    const grau = Math.floor(Math.log2(gerador));
    while (Math.floor(Math.log2(v)) >= grau) v ^= gerador << (Math.floor(Math.log2(v)) - grau);
    return (valor << bits) | v;
  }

  const bitsDeFormato = mascara => bch((0 << 3) | mascara, 0x537, 10) ^ 0x5412; // 00 = nível M
  const bitsDeVersao  = versao  => bch(versao, 0x1f25, 12);

  /* ---------- montagem da mensagem ---------- */

  function paraBytes(texto) {
    return Array.from(new TextEncoder().encode(texto));
  }

  function escolherVersao(qtdBytes) {
    for (let v = 1; v <= 10; v++) {
      const [ec, grupos] = BLOCOS[v];
      const dados = grupos.reduce((s, [n, t]) => s + n * t, 0);
      const cabecalho = 4 + (v < 10 ? 8 : 16);
      if (qtdBytes * 8 + cabecalho <= dados * 8) return v;
    }
    throw new Error('Texto longo demais para um QR até a versão 10.');
  }

  function codigos(bytes, versao) {
    const [ecPorBloco, grupos] = BLOCOS[versao];
    const totalDados = grupos.reduce((s, [n, t]) => s + n * t, 0);

    const bits = [];
    const escreve = (valor, n) => { for (let i = n - 1; i >= 0; i--) bits.push((valor >> i) & 1); };

    escreve(4, 4);                                   // modo byte
    escreve(bytes.length, versao < 10 ? 8 : 16);     // quantidade de caracteres
    bytes.forEach(b => escreve(b, 8));

    const capacidade = totalDados * 8;
    for (let i = 0; i < Math.min(4, capacidade - bits.length); i++) bits.push(0);
    while (bits.length % 8) bits.push(0);
    const enchimento = [0xEC, 0x11];
    for (let i = 0; bits.length < capacidade; i++) escreve(enchimento[i % 2], 8);

    const cw = [];
    for (let i = 0; i < bits.length; i += 8) {
      let b = 0;
      for (let j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
      cw.push(b);
    }

    // divide em blocos, calcula a correção de cada um e intercala
    const blocosDados = [], blocosEc = [];
    let pos = 0;
    for (const [n, tam] of grupos) {
      for (let i = 0; i < n; i++) {
        const d = cw.slice(pos, pos + tam); pos += tam;
        blocosDados.push(d);
        blocosEc.push(correcao(d, ecPorBloco));
      }
    }

    const saida = [];
    const maiorBloco = Math.max(...blocosDados.map(b => b.length));
    for (let i = 0; i < maiorBloco; i++)
      for (const b of blocosDados) if (i < b.length) saida.push(b[i]);
    for (let i = 0; i < ecPorBloco; i++)
      for (const b of blocosEc) saida.push(b[i]);

    return saida;
  }

  /* ---------- desenho da matriz ---------- */

  function matrizBase(versao) {
    const n = versao * 4 + 17;
    const m = Array.from({ length: n }, () => new Array(n).fill(null));
    const fixo = Array.from({ length: n }, () => new Array(n).fill(false));
    const por = (l, c, v) => { m[l][c] = v; fixo[l][c] = true; };

    // três marcadores de posição, com a faixa de separação
    for (const [l0, c0] of [[0, 0], [0, n - 7], [n - 7, 0]])
      for (let l = -1; l <= 7; l++)
        for (let c = -1; c <= 7; c++) {
          const L = l0 + l, C = c0 + c;
          if (L < 0 || L >= n || C < 0 || C >= n) continue;
          const borda  = (l === 0 || l === 6) && c >= 0 && c <= 6;
          const lateral = (c === 0 || c === 6) && l >= 0 && l <= 6;
          const miolo  = l >= 2 && l <= 4 && c >= 2 && c <= 4;
          por(L, C, (borda || lateral || miolo) ? 1 : 0);
        }

    // marcadores de alinhamento
    const eixos = ALINHAMENTO[versao];
    for (const l0 of eixos) for (const c0 of eixos) {
      const perto = (l0 <= 8 && c0 <= 8) || (l0 <= 8 && c0 >= n - 9) || (l0 >= n - 9 && c0 <= 8);
      if (perto) continue;
      for (let l = -2; l <= 2; l++)
        for (let c = -2; c <= 2; c++)
          por(l0 + l, c0 + c, (Math.max(Math.abs(l), Math.abs(c)) !== 1) ? 1 : 0);
    }

    // linhas de sincronismo
    for (let i = 8; i < n - 8; i++) { por(6, i, i % 2 === 0 ? 1 : 0); por(i, 6, i % 2 === 0 ? 1 : 0); }

    // módulo sempre escuro
    por(n - 8, 8, 1);

    // reserva o espaço das informações de formato
    for (let i = 0; i < 9; i++) {
      if (m[i][8] === null) { m[i][8] = 0; fixo[i][8] = true; }
      if (m[8][i] === null) { m[8][i] = 0; fixo[8][i] = true; }
    }
    for (let i = 0; i < 8; i++) {
      if (m[8][n - 1 - i] === null) { m[8][n - 1 - i] = 0; fixo[8][n - 1 - i] = true; }
      if (m[n - 1 - i][8] === null) { m[n - 1 - i][8] = 0; fixo[n - 1 - i][8] = true; }
    }

    // informações de versão (só a partir da versão 7)
    if (versao >= 7) {
      const v = bitsDeVersao(versao);
      for (let i = 0; i < 18; i++) {
        const bit = (v >> i) & 1;
        por(n - 11 + (i % 3), Math.floor(i / 3), bit);
        por(Math.floor(i / 3), n - 11 + (i % 3), bit);
      }
    }

    return { m, fixo, n };
  }

  function preencher(m, fixo, n, dados, versao) {
    const total = dados.length * 8 + RESTO[versao];
    let indice = 0, linha = n - 1, passo = -1;

    for (let coluna = n - 1; coluna > 0; coluna -= 2) {
      if (coluna === 6) coluna--;
      for (;;) {
        for (let d = 0; d < 2; d++) {
          const c = coluna - d;
          if (m[linha][c] !== null) continue;
          let escuro = 0;
          if (indice < dados.length * 8)
            escuro = (dados[indice >> 3] >> (7 - (indice & 7))) & 1;
          if (indice < total) indice++;
          m[linha][c] = escuro;
        }
        linha += passo;
        if (linha < 0 || linha >= n) { linha -= passo; passo = -passo; break; }
      }
    }
  }

  const MASCARAS = [
    (l, c) => (l + c) % 2 === 0,
    (l, c) => l % 2 === 0,
    (l, c) => c % 3 === 0,
    (l, c) => (l + c) % 3 === 0,
    (l, c) => (Math.floor(l / 2) + Math.floor(c / 3)) % 2 === 0,
    (l, c) => ((l * c) % 2) + ((l * c) % 3) === 0,
    (l, c) => ((((l * c) % 2) + ((l * c) % 3)) % 2) === 0,
    (l, c) => ((((l + c) % 2) + ((l * c) % 3)) % 2) === 0
  ];

  function aplicar(base, fixo, n, mascara) {
    const m = base.map(l => l.slice());
    for (let l = 0; l < n; l++)
      for (let c = 0; c < n; c++)
        if (!fixo[l][c] && MASCARAS[mascara](l, c)) m[l][c] ^= 1;

    const f = bitsDeFormato(mascara);
    for (let i = 0; i < 15; i++) {
      const bit = (f >> i) & 1;
      if (i < 6)      m[i][8] = bit;
      else if (i < 8) m[i + 1][8] = bit;
      else            m[n - 15 + i][8] = bit;

      if (i < 8)      m[8][n - 1 - i] = bit;
      else if (i < 9) m[8][15 - i - 1 + 1] = bit;
      else            m[8][15 - i - 1] = bit;
    }
    m[n - 8][8] = 1;
    return m;
  }

  /* ---------- escolha da máscara: a de menor penalidade ---------- */

  function penalidade(m, n) {
    let p = 0;

    // 1. sequências longas da mesma cor
    for (let i = 0; i < n; i++) {
      for (const linha of [true, false]) {
        let cor = -1, seq = 0;
        for (let j = 0; j < n; j++) {
          const v = linha ? m[i][j] : m[j][i];
          if (v === cor) { seq++; }
          else { if (seq >= 5) p += 3 + (seq - 5); cor = v; seq = 1; }
        }
        if (seq >= 5) p += 3 + (seq - 5);
      }
    }

    // 2. blocos 2x2 da mesma cor
    for (let l = 0; l < n - 1; l++)
      for (let c = 0; c < n - 1; c++) {
        const v = m[l][c];
        if (v === m[l][c + 1] && v === m[l + 1][c] && v === m[l + 1][c + 1]) p += 3;
      }

    // 3. padrão parecido com o marcador de posição
    const alvo1 = [1,0,1,1,1,0,1,0,0,0,0], alvo2 = [0,0,0,0,1,0,1,1,1,0,1];
    for (let i = 0; i < n; i++)
      for (let j = 0; j <= n - 11; j++)
        for (const linha of [true, false]) {
          let ok1 = true, ok2 = true;
          for (let k = 0; k < 11; k++) {
            const v = linha ? m[i][j + k] : m[j + k][i];
            if (v !== alvo1[k]) ok1 = false;
            if (v !== alvo2[k]) ok2 = false;
          }
          if (ok1) p += 40;
          if (ok2) p += 40;
        }

    // 4. desequilíbrio entre claro e escuro
    let escuros = 0;
    for (let l = 0; l < n; l++) for (let c = 0; c < n; c++) escuros += m[l][c];
    p += Math.floor(Math.abs(escuros * 100 / (n * n) - 50) / 5) * 10;

    return p;
  }

  /* ---------- interface pública ---------- */

  return {
    gerar(texto, mascaraForcada = null) {
      const bytes  = paraBytes(texto);
      const versao = escolherVersao(bytes.length);
      const dados  = codigos(bytes, versao);
      const { m, fixo, n } = matrizBase(versao);

      preencher(m, fixo, n, dados, versao);

      if (mascaraForcada !== null) {
        const mm = aplicar(m, fixo, n, mascaraForcada);
        return { tamanho: n, versao, mascara: mascaraForcada, modulos: mm, penalidade: penalidade(mm, n) };
      }

      let melhor = null, menor = Infinity, escolhida = 0;
      for (let k = 0; k < 8; k++) {
        const tentativa = aplicar(m, fixo, n, k);
        const p = penalidade(tentativa, n);
        if (p < menor) { menor = p; melhor = tentativa; escolhida = k; }
      }

      return { tamanho: n, versao, mascara: escolhida, modulos: melhor };
    },

    /* desenha num <canvas>, com a margem branca que o padrão exige */
    desenhar(canvas, texto, lado = 640) {
      const { tamanho, modulos } = this.gerar(texto);
      const margem = 4;
      const total = tamanho + margem * 2;
      const escala = Math.max(1, Math.floor(lado / total));
      const px = total * escala;

      canvas.width = px; canvas.height = px;
      canvas.style.width = '100%'; canvas.style.height = 'auto';

      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, px, px);
      ctx.fillStyle = '#000000';
      for (let l = 0; l < tamanho; l++)
        for (let c = 0; c < tamanho; c++)
          if (modulos[l][c]) ctx.fillRect((c + margem) * escala, (l + margem) * escala, escala, escala);

      return { tamanho, px };
    }
  };
})();
