/**
 * Endireita o rosto antes de gerar a impressao digital.
 *
 * É a peça que o OpenCV faz sozinho no Python (`FaceRecognizerSF.alignCrop`) e
 * que precisa existir aqui porque NENHUM build pronto de opencv.js traz o módulo
 * de reconhecimento facial — conferido no build oficial (11 MB) e no
 * @techstark/opencv-js (13 MB): as classes simplesmente não estão lá.
 *
 * ⚠️ ESTA É A PEÇA QUE FALHA EM SILÊNCIO. Se o Python endireitar de um jeito e
 * este arquivo de outro, nada dá erro: os números saem, a busca roda, e nenhuma
 * foto casa nunca. Por isso existe o `scripts/fotos_faces_validar_js.mjs`, que
 * compara o recorte gerado aqui com o do Python pixel a pixel. Mexeu aqui, roda
 * ele antes de acreditar em qualquer resultado.
 */

/** Lado do recorte que o SFace espera na entrada. */
export const LADO_RECORTE = 112;

/**
 * Para onde os 5 pontos do rosto (olho esq., olho dir., nariz, canto esq. e
 * canto dir. da boca) devem ir dentro do quadrado de 112x112.
 *
 * São os mesmos valores do OpenCV, e não uma escolha nossa: o SFace foi treinado
 * com rostos posicionados exatamente assim. Mudar um decimal aqui desalinha
 * este lado do índice inteiro.
 */
const GABARITO: ReadonlyArray<readonly [number, number]> = [
  [38.2946, 51.6963],
  [73.5318, 51.5014],
  [56.0252, 71.7366],
  [41.5493, 92.3655],
  [70.7299, 92.2041],
];

export interface ImagemRgba {
  largura: number;
  altura: number;
  /** Quatro bytes por pixel (R, G, B, A), como sai de um canvas. */
  dados: Uint8ClampedArray;
}

/** Matriz 2x3: [a, -b, tx, b, a, ty]. Gira, redimensiona e desloca — sem torcer. */
export type MatrizAfim = readonly [number, number, number, number, number, number];

/**
 * Acha a rotação, a escala e o deslocamento que levam os 5 pontos do rosto ao
 * gabarito.
 *
 * Resolvido por mínimos quadrados fechado, e não por SVD: com a transformação
 * limitada a girar/escalar/deslocar, o melhor encaixe de 5 pontos tem fórmula
 * direta. Menos código para errar, e sem depender de biblioteca de matriz.
 */
export function matrizDeAlinhamento(pontos: ReadonlyArray<readonly [number, number]>): MatrizAfim {
  if (pontos.length !== GABARITO.length) {
    throw new Error(`alinhamento: esperado ${GABARITO.length} pontos, veio ${pontos.length}`);
  }

  const total = pontos.length;
  let mediaOrigemX = 0;
  let mediaOrigemY = 0;
  let mediaDestinoX = 0;
  let mediaDestinoY = 0;

  for (let i = 0; i < total; i += 1) {
    mediaOrigemX += pontos[i][0];
    mediaOrigemY += pontos[i][1];
    mediaDestinoX += GABARITO[i][0];
    mediaDestinoY += GABARITO[i][1];
  }
  mediaOrigemX /= total;
  mediaOrigemY /= total;
  mediaDestinoX /= total;
  mediaDestinoY /= total;

  // Com tudo centralizado, a parte que gira e a que escala saem de duas somas.
  let somaAlinhada = 0;
  let somaCruzada = 0;
  let somaQuadrados = 0;

  for (let i = 0; i < total; i += 1) {
    const origemX = pontos[i][0] - mediaOrigemX;
    const origemY = pontos[i][1] - mediaOrigemY;
    const destinoX = GABARITO[i][0] - mediaDestinoX;
    const destinoY = GABARITO[i][1] - mediaDestinoY;

    somaAlinhada += origemX * destinoX + origemY * destinoY;
    somaCruzada += origemX * destinoY - origemY * destinoX;
    somaQuadrados += origemX * origemX + origemY * origemY;
  }

  // Cinco pontos no mesmo lugar: rosto sem tamanho, não dá para alinhar nada.
  if (somaQuadrados === 0) {
    throw new Error("alinhamento: os 5 pontos do rosto estão todos no mesmo lugar");
  }

  const a = somaAlinhada / somaQuadrados;
  const b = somaCruzada / somaQuadrados;

  return [
    a,
    -b,
    mediaDestinoX - (a * mediaOrigemX - b * mediaOrigemY),
    b,
    a,
    mediaDestinoY - (b * mediaOrigemX + a * mediaOrigemY),
  ];
}

/** Desfaz a matriz, para saber de qual pixel da foto veio cada pixel do recorte. */
function inverter(m: MatrizAfim): MatrizAfim {
  const determinante = m[0] * m[4] - m[1] * m[3];
  if (determinante === 0) throw new Error("alinhamento: matriz sem inversa");

  const i0 = m[4] / determinante;
  const i1 = -m[1] / determinante;
  const i3 = -m[3] / determinante;
  const i4 = m[0] / determinante;

  return [i0, i1, -(i0 * m[2] + i1 * m[5]), i3, i4, -(i3 * m[2] + i4 * m[5])];
}

/**
 * Recorta o rosto já endireitado, em 112x112.
 *
 * Vai de trás para frente — para cada pixel do recorte, busca de onde ele veio
 * na foto — porque o caminho contrário deixaria buracos: ao girar e encolher,
 * vários pixels da foto caem no mesmo lugar e outros lugares não recebem nenhum.
 *
 * A cor sai da média dos quatro vizinhos (interpolação bilinear), que é o mesmo
 * que o `warpAffine` do OpenCV faz por padrão. Vizinho mais próximo seria mais
 * simples e geraria um recorte serrilhado — vetor diferente do que o índice tem.
 */
export function recortarRostoAlinhado(imagem: ImagemRgba, matriz: MatrizAfim): Uint8ClampedArray {
  const inversa = inverter(matriz);
  const recorte = new Uint8ClampedArray(LADO_RECORTE * LADO_RECORTE * 3);
  const { largura, altura, dados } = imagem;

  for (let y = 0; y < LADO_RECORTE; y += 1) {
    for (let x = 0; x < LADO_RECORTE; x += 1) {
      // Coordenada do pixel direto, SEM ajuste de meio pixel: o warpAffine do
      // OpenCV trata (0,0) como o centro do primeiro pixel. Tentar "corrigir"
      // com +0.5 desloca o recorte inteiro e derruba a paridade com o Python
      // (medido: diferença máxima de 203 em 255 quando o ajuste está lá).
      const origemX = inversa[0] * x + inversa[1] * y + inversa[2];
      const origemY = inversa[3] * x + inversa[4] * y + inversa[5];

      const esquerda = Math.floor(origemX);
      const topo = Math.floor(origemY);
      const pesoX = origemX - esquerda;
      const pesoY = origemY - topo;

      for (let canal = 0; canal < 3; canal += 1) {
        const superiorEsq = amostrar(dados, largura, altura, esquerda, topo, canal);
        const superiorDir = amostrar(dados, largura, altura, esquerda + 1, topo, canal);
        const inferiorEsq = amostrar(dados, largura, altura, esquerda, topo + 1, canal);
        const inferiorDir = amostrar(dados, largura, altura, esquerda + 1, topo + 1, canal);

        const superior = superiorEsq + (superiorDir - superiorEsq) * pesoX;
        const inferior = inferiorEsq + (inferiorDir - inferiorEsq) * pesoX;

        recorte[(y * LADO_RECORTE + x) * 3 + canal] = superior + (inferior - superior) * pesoY;
      }
    }
  }

  return recorte;
}

/**
 * Lê um pixel, devolvendo PRETO quando a conta cai fora da foto.
 *
 * Cair fora é comum: rosto perto da borda faz o quadrado do recorte passar da
 * imagem. Preto é o que o `warpAffine` do OpenCV faz por padrão
 * (BORDER_CONSTANT com zero) — repetir a borda parece mais natural e foi o que
 * tentei primeiro, mas gera uma faixa clara onde o Python tem uma escura, e o
 * vetor sai diferente (medido: 15 pixels da borda divergindo até 23 de 255).
 */
function amostrar(
  dados: Uint8ClampedArray,
  largura: number,
  altura: number,
  x: number,
  y: number,
  canal: number
): number {
  if (x < 0 || y < 0 || x >= largura || y >= altura) return 0;
  return dados[(y * largura + x) * 4 + canal];
}

/**
 * Converte o recorte para o formato que o SFace espera na entrada: um plano
 * inteiro por canal (NCHW) em vez de R,G,B intercalados por pixel, e os canais
 * na ordem R, G, B.
 *
 * ⚠️ RGB, e não BGR — apesar de o modelo ter nascido no OpenCV, que trabalha em
 * BGR. O `FaceRecognizerSF` do OpenCV inverte os canais por dentro antes da
 * inferência (o `swapRB` do `blobFromImage`), então quem entra no modelo é RGB.
 * Passar BGR aqui não gera erro nenhum: gera um vetor plausível, com semelhança
 * de 0,93 contra o mesmo rosto — perto o bastante para parecer certo, longe o
 * bastante para nenhuma foto casar.
 *
 * Como o recorte já vem de um canvas (RGBA), a ordem se mantém: nada a inverter.
 */
export function recorteParaEntradaDoModelo(recorte: Uint8ClampedArray): Float32Array {
  const pixels = LADO_RECORTE * LADO_RECORTE;
  const entrada = new Float32Array(pixels * 3);

  for (let i = 0; i < pixels; i += 1) {
    entrada[i] = recorte[i * 3];
    entrada[pixels + i] = recorte[i * 3 + 1];
    entrada[pixels * 2 + i] = recorte[i * 3 + 2];
  }

  return entrada;
}
