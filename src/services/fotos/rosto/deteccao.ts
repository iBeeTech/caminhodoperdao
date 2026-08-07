/**
 * Acha os rostos na selfie a partir da saída crua do YuNet.
 *
 * É a segunda peça que o OpenCV faz sozinho no Python (`FaceDetectorYN.detect`)
 * e que precisa existir aqui pelo mesmo motivo do alinhamento: nenhum build
 * pronto de opencv.js traz o módulo de rosto. O modelo roda pelo onnxruntime-web
 * e devolve 12 tensores crus; transformar isso em "um rosto aqui, com os olhos
 * nestes pontos" é o que este arquivo faz.
 *
 * A conta é a mesma do `postProcess` do OpenCV, linha por linha. Não há liberdade
 * criativa aqui: mudar a fórmula gera caixas plausíveis nos lugares errados, e o
 * alinhamento seguinte recorta o vizinho em vez da pessoa.
 */

/** Reduções de escala em que o YuNet procura rosto: 1/8, 1/16 e 1/32 da entrada. */
export const PASSOS = [8, 16, 32] as const;

/**
 * Lado da entrada do detector.
 *
 * 640 não é escolha: o `yunet.onnx` do OpenCV Zoo vem com a entrada FIXA em
 * 1x3x640x640. No Python isso não aparece porque o OpenCV reconstrói o grafo a
 * cada `setInputSize`; o onnxruntime não reconstrói nada e recusa qualquer outro
 * tamanho. Por isso a selfie entra em quadrado, com tarja preta na sobra.
 */
export const LADO_ENTRADA_DETECTOR = 640;

/** Mesmo corte do scripts/fotos_faces.py. Abaixo disso costuma ser cartaz ou folhagem. */
export const MIN_SCORE_DETECCAO = 0.6;

/** Mesmo valor que o Python passa ao FaceDetectorYN.create. */
export const MAX_SOBREPOSICAO = 0.3;

export interface RostoDetectado {
  x: number;
  y: number;
  largura: number;
  altura: number;
  score: number;
  /** Olho dir., olho esq., nariz, canto dir. e canto esq. da boca — nesta ordem. */
  pontos: Array<readonly [number, number]>;
}

/** As 12 saídas do modelo, pelo nome: cls_8, obj_8, bbox_8, kps_8, cls_16... */
export type SaidasYuNet = Readonly<Record<string, Float32Array>>;

/**
 * Traduz os tensores em rostos, um candidato por célula da grade.
 *
 * Devolve TODOS os candidatos acima do score, inclusive os repetidos: células
 * vizinhas costumam achar o mesmo rosto. Quem descarta a repetição é o
 * `suprimirSobreposicoes`.
 */
export function decodificarYuNet(
  saidas: SaidasYuNet,
  lado: number = LADO_ENTRADA_DETECTOR,
  minScore: number = MIN_SCORE_DETECCAO
): RostoDetectado[] {
  const rostos: RostoDetectado[] = [];

  for (const passo of PASSOS) {
    const cls = saidas[`cls_${passo}`];
    const obj = saidas[`obj_${passo}`];
    const bbox = saidas[`bbox_${passo}`];
    const kps = saidas[`kps_${passo}`];

    if (!cls || !obj || !bbox || !kps) {
      throw new Error(`deteccao: faltou a saida do passo ${passo} no modelo`);
    }

    const colunas = Math.floor(lado / passo);
    const linhas = Math.floor(lado / passo);

    for (let linha = 0; linha < linhas; linha += 1) {
      for (let coluna = 0; coluna < colunas; coluna += 1) {
        const celula = linha * colunas + coluna;

        // Duas notas: "tem objeto aqui" e "esse objeto é rosto". A média
        // geométrica das duas é o que o OpenCV chama de score do rosto — e é o
        // número que o índice gravou em `s`, então tem de sair igual.
        const notaRosto = Math.min(1, Math.max(0, cls[celula]));
        const notaObjeto = Math.min(1, Math.max(0, obj[celula]));
        const score = Math.sqrt(notaRosto * notaObjeto);

        if (score < minScore) continue;

        // A rede não prevê a caixa em pixels: prevê o deslocamento dentro da
        // célula (centro) e o logaritmo do tamanho. Daí o exp.
        const centroX = (coluna + bbox[celula * 4]) * passo;
        const centroY = (linha + bbox[celula * 4 + 1]) * passo;
        const largura = Math.exp(bbox[celula * 4 + 2]) * passo;
        const altura = Math.exp(bbox[celula * 4 + 3]) * passo;

        const pontos: Array<readonly [number, number]> = [];
        for (let ponto = 0; ponto < 5; ponto += 1) {
          pontos.push([
            (coluna + kps[celula * 10 + ponto * 2]) * passo,
            (linha + kps[celula * 10 + ponto * 2 + 1]) * passo,
          ]);
        }

        rostos.push({
          x: centroX - largura / 2,
          y: centroY - altura / 2,
          largura,
          altura,
          score,
          pontos,
        });
      }
    }
  }

  return rostos;
}

/** Quanto duas caixas se sobrepõem, de 0 (separadas) a 1 (idênticas). */
function sobreposicao(a: RostoDetectado, b: RostoDetectado): number {
  const esquerda = Math.max(a.x, b.x);
  const topo = Math.max(a.y, b.y);
  const direita = Math.min(a.x + a.largura, b.x + b.largura);
  const base = Math.min(a.y + a.altura, b.y + b.altura);

  const larguraComum = direita - esquerda;
  const alturaComum = base - topo;
  if (larguraComum <= 0 || alturaComum <= 0) return 0;

  const comum = larguraComum * alturaComum;
  return comum / (a.largura * a.altura + b.largura * b.altura - comum);
}

/**
 * Fica com um candidato por rosto: o de maior nota, descartando os que caem
 * quase em cima dele.
 *
 * É o mesmo "non-maximum suppression" que o OpenCV aplica no fim do detect. Sem
 * isto, uma selfie devolveria de 5 a 20 "rostos" que são o mesmo — e a regra de
 * "usa o maior" passaria a sortear entre cópias do mesmo rosto.
 */
export function suprimirSobreposicoes(
  rostos: readonly RostoDetectado[],
  maxSobreposicao: number = MAX_SOBREPOSICAO
): RostoDetectado[] {
  const porNota = [...rostos].sort((a, b) => b.score - a.score);
  const mantidos: RostoDetectado[] = [];

  for (const candidato of porNota) {
    if (mantidos.every(mantido => sobreposicao(candidato, mantido) <= maxSobreposicao)) {
      mantidos.push(candidato);
    }
  }

  return mantidos;
}

/**
 * Saída crua do modelo -> lista de rostos limpa, do MAIOR para o menor.
 *
 * Ordena por área, e não por nota, porque quem chama quer "o rosto de quem tirou
 * a selfie" — que é o maior, não necessariamente o mais bem pontuado. É a mesma
 * escolha do fotos_faces_buscar.py: selfie com o grupo ao fundo não pode acabar
 * buscando o rosto de quem passou atrás.
 */
export function detectarRostos(
  saidas: SaidasYuNet,
  lado: number = LADO_ENTRADA_DETECTOR,
  minScore: number = MIN_SCORE_DETECCAO
): RostoDetectado[] {
  return suprimirSobreposicoes(decodificarYuNet(saidas, lado, minScore)).sort(
    (a, b) => b.largura * b.altura - a.largura * a.altura
  );
}

/**
 * Traz o rosto de volta às coordenadas da imagem antes da tarja preta.
 *
 * A selfie entra no detector encaixada num quadrado de 640: encolhida por
 * `escala` e colada no canto superior esquerdo. Tudo que sai do modelo está
 * nessa régua — desfazer é dividir. Esquecer este passo dá um recorte deslocado
 * que ainda parece rosto, só que do ombro da pessoa.
 */
export function desfazerEncaixe(rosto: RostoDetectado, escala: number): RostoDetectado {
  return {
    x: rosto.x / escala,
    y: rosto.y / escala,
    largura: rosto.largura / escala,
    altura: rosto.altura / escala,
    score: rosto.score,
    pontos: rosto.pontos.map(([x, y]) => [x / escala, y / escala] as const),
  };
}
