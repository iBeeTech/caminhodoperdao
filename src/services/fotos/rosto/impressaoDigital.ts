/**
 * Selfie -> 128 números. É a peça que fecha a busca por rosto.
 *
 * O caminho é o MESMO do scripts/fotos_faces.py, na mesma ordem e com os mesmos
 * modelos: reduzir a foto, achar o rosto, endireitar pelos 5 pontos, passar no
 * SFace, normalizar. Ele indexou o álbum assim; aqui a selfie percorre o mesmo
 * trajeto para que os dois vetores possam ser comparados.
 *
 * ⚠️ A FOTO NÃO SAI DO CELULAR. Tudo acima acontece dentro do navegador; o que
 * viaja para o servidor são só os 128 números, dos quais não se remonta imagem
 * nenhuma. É por isso que vale a pena baixar 39 MB de modelo em vez de mandar a
 * selfie e resolver tudo no servidor.
 */

import { matrizDeAlinhamento, recortarRostoAlinhado, recorteParaEntradaDoModelo } from "./alinhamento";
import { LADO_ENTRADA_DETECTOR, SaidasYuNet, desfazerEncaixe, detectarRostos } from "./deteccao";
import { encaixarNoQuadrado, lerSelfie } from "./imagem";
import { ModelosDeRosto, ort } from "./modelos";
import { normalizar } from "./vetores";

export { combinarImpressoes } from "./vetores";

/**
 * Lado mínimo do rosto na selfie, em pixels da imagem já reduzida a 1920.
 *
 * Cópia local do MIN_LADO_ROSTO_SELFIE de functions/_utils/photoFaces.ts, usada
 * só enquanto o servidor não disse o dele: o valor de verdade vem no GET
 * /api/fotos/rosto, para que apertar a regra não exija publicar a tela de novo.
 */
export const MIN_LADO_ROSTO_SELFIE = 100;

/** Erros que a tela sabe traduzir. Qualquer outro vira "não deu certo agora". */
export type FalhaDaSelfie = "nenhum_rosto" | "rosto_pequeno" | "arquivo_grande_demais";

export class SelfieRecusada extends Error {
  constructor(
    public readonly motivo: FalhaDaSelfie,
    /** Quanto media o rosto, quando havia um. Serve para a tela dizer o quanto faltou. */
    public readonly rostoPx = 0
  ) {
    super(motivo);
    this.name = "SelfieRecusada";
  }
}

export interface ImpressaoDigital {
  /** 128 números de comprimento 1, prontos para o endpoint. */
  vetor: number[];
  /** Lado maior do rosto usado, na régua de 1920 — a mesma do índice. */
  rostoPx: number;
  /** Quantos rostos havia na selfie. A tela avisa quando foi mais de um. */
  rostosNaFoto: number;
}

function saidasComoFloat32(resultado: ort.InferenceSession.OnnxValueMapType): SaidasYuNet {
  const saidas: Record<string, Float32Array> = {};
  for (const [nome, tensor] of Object.entries(resultado)) {
    saidas[nome] = tensor.data as Float32Array;
  }
  return saidas;
}

/**
 * Roda o SFace no recorte de 112x112 e devolve o vetor já com comprimento 1.
 *
 * A normalização acontece aqui e de novo no servidor, de propósito: é ela que
 * transforma a comparação em similaridade de cosseno, e um vetor fora de escala
 * faria toda foto do álbum passar do limiar.
 */
async function vetorDoRecorte(
  reconhecedor: ort.InferenceSession,
  recorte: Uint8ClampedArray
): Promise<number[]> {
  const entrada = new ort.Tensor("float32", recorteParaEntradaDoModelo(recorte), [1, 3, 112, 112]);
  const resultado = await reconhecedor.run({ [reconhecedor.inputNames[0]]: entrada });
  const bruto = Array.from(resultado[reconhecedor.outputNames[0]].data as Float32Array);

  const vetor = normalizar(bruto);
  if (!vetor) throw new SelfieRecusada("nenhum_rosto");

  return vetor;
}

/**
 * Gera a impressão digital de UMA selfie.
 *
 * Quando há mais de um rosto, fica com o MAIOR — que é quem tirou a foto. Sem
 * essa regra, uma selfie com gente ao fundo acabaria buscando o rosto de quem
 * passou atrás, e a pessoa receberia as fotos de um desconhecido.
 */
export async function gerarImpressaoDigital(
  arquivo: Blob,
  modelos: ModelosDeRosto,
  minRostoPx: number = MIN_LADO_ROSTO_SELFIE
): Promise<ImpressaoDigital> {
  const imagem = await lerSelfie(arquivo);
  const { entrada, escala } = encaixarNoQuadrado(imagem, LADO_ENTRADA_DETECTOR);

  const saidas = await modelos.detector.run({
    [modelos.detector.inputNames[0]]: new ort.Tensor("float32", entrada, [
      1,
      3,
      LADO_ENTRADA_DETECTOR,
      LADO_ENTRADA_DETECTOR,
    ]),
  });

  const encontrados = detectarRostos(saidasComoFloat32(saidas), LADO_ENTRADA_DETECTOR);
  if (encontrados.length === 0) throw new SelfieRecusada("nenhum_rosto");

  const rosto = desfazerEncaixe(encontrados[0], escala);
  const rostoPx = Math.round(Math.max(rosto.largura, rosto.altura));

  // Barrado ANTES de rodar o reconhecedor: rosto pequeno gera vetor instável,
  // que casa com qualquer rosto igualmente mal definido. No teste de 2026 uma
  // selfie de 46px devolveu 79 fotos e quase nenhuma era da pessoa.
  if (rostoPx < minRostoPx) throw new SelfieRecusada("rosto_pequeno", rostoPx);

  const recorte = recortarRostoAlinhado(imagem, matrizDeAlinhamento(rosto.pontos));

  return {
    vetor: await vetorDoRecorte(modelos.reconhecedor, recorte),
    rostoPx,
    rostosNaFoto: encontrados.length,
  };
}

