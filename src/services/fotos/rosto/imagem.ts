/**
 * Leva a selfie do celular até o formato que os dois modelos esperam.
 *
 * Parece encanamento, mas é onde mora a metade dos erros silenciosos desta
 * funcionalidade: um canal trocado, uma redução a mais ou a menos, e o vetor sai
 * plausível sem casar com nada. Cada escolha aqui existe para IMITAR o que o
 * scripts/fotos_faces.py fez ao indexar o álbum.
 */

import { ImagemRgba } from "./alinhamento";

/**
 * Lado maior a que a selfie é reduzida ANTES de qualquer coisa.
 *
 * Igual ao LADO_DETECCAO do scripts/fotos_faces.py, e não por simetria estética:
 * o recorte de 112x112 é tirado desta imagem, e reduzir uma foto de 4000px para
 * 112 não dá o mesmo resultado que reduzir uma de 1920. O índice foi feito a
 * partir de imagens de 1920 — a selfie tem de percorrer o mesmo caminho.
 */
export const LADO_BASE = 1920;

/** Tamanho máximo de arquivo aceito. Acima disso é imagem de câmera profissional. */
export const MAX_BYTES_SELFIE = 25 * 1024 * 1024;

function contexto2d(largura: number, altura: number): CanvasRenderingContext2D {
  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;

  // `willReadFrequently` evita que o navegador jogue o canvas para a GPU: tudo
  // que fazemos com ele é getImageData, e ir buscar na GPU custa mais que
  // desenhar na CPU desde o começo.
  const contexto = canvas.getContext("2d", { willReadFrequently: true });
  if (!contexto) throw new Error("imagem: o navegador nao deu um canvas 2d");
  return contexto;
}

/**
 * Decodifica o arquivo respeitando a orientação gravada pela câmera.
 *
 * ⚠️ `imageOrientation: "from-image"` não é enfeite. Celular guarda a foto
 * sempre na horizontal e anota "gire 90°" no EXIF. Sem isso, metade das selfies
 * chega deitada, o detector não acha rosto nenhum e a tela culpa a luz.
 */
async function decodificar(arquivo: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(arquivo, { imageOrientation: "from-image" });
    } catch {
      // Safari antigo não aceita a opção. Cai no <img>, que aplica o EXIF sozinho.
    }
  }

  const url = URL.createObjectURL(arquivo);
  try {
    return await new Promise<HTMLImageElement>((resolver, rejeitar) => {
      const elemento = new Image();
      elemento.onload = () => resolver(elemento);
      elemento.onerror = () => rejeitar(new Error("imagem: nao consegui abrir o arquivo"));
      elemento.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Arquivo escolhido pela pessoa -> pixels prontos, já reduzidos a LADO_BASE.
 *
 * Só REDUZ, nunca amplia: o indexador também só reduzia, e ampliar inventaria
 * detalhe que o modelo leria como textura de pele.
 */
export async function lerSelfie(arquivo: Blob): Promise<ImagemRgba> {
  if (arquivo.size > MAX_BYTES_SELFIE) {
    throw new Error("arquivo_grande_demais");
  }

  const origem = await decodificar(arquivo);
  const larguraOriginal = "naturalWidth" in origem ? origem.naturalWidth : origem.width;
  const alturaOriginal = "naturalHeight" in origem ? origem.naturalHeight : origem.height;

  if (!larguraOriginal || !alturaOriginal) throw new Error("imagem: arquivo sem dimensoes");

  const escala = Math.min(1, LADO_BASE / Math.max(larguraOriginal, alturaOriginal));
  const largura = Math.max(1, Math.round(larguraOriginal * escala));
  const altura = Math.max(1, Math.round(alturaOriginal * escala));

  const contexto = contexto2d(largura, altura);
  contexto.imageSmoothingEnabled = true;
  contexto.imageSmoothingQuality = "high";
  contexto.drawImage(origem, 0, 0, largura, altura);

  if ("close" in origem) origem.close();

  return { largura, altura, dados: contexto.getImageData(0, 0, largura, altura).data };
}

export interface Encaixe {
  /** Pixels da entrada do detector, em BGR planar (NCHW), 0 a 255. */
  entrada: Float32Array;
  /** Por quanto a imagem foi multiplicada para caber no quadrado. */
  escala: number;
}

/**
 * Encaixa a imagem num quadrado preto de `lado` x `lado` e monta a entrada do
 * detector.
 *
 * ⚠️ BGR, e ao contrário do SFace. O `FaceDetectorYN` do OpenCV chama
 * `blobFromImage` SEM `swapRB`, então o YuNet foi treinado vendo a ordem de
 * canais do OpenCV — azul primeiro. O SFace, no mesmo repositório, recebe RGB
 * (ver recorteParaEntradaDoModelo). Parece incoerência do OpenCV e é: cada
 * modelo herdou o costume de quem o treinou. Trocar aqui não gera erro nenhum,
 * só faz o detector achar menos rosto.
 *
 * A sobra fica PRETA e a imagem colada no canto (0,0), nunca centralizada: assim
 * desfazer o encaixe é uma divisão, sem deslocamento para errar o sinal.
 */
export function encaixarNoQuadrado(imagem: ImagemRgba, lado: number): Encaixe {
  const escala = lado / Math.max(imagem.largura, imagem.altura);
  const largura = Math.max(1, Math.round(imagem.largura * escala));
  const altura = Math.max(1, Math.round(imagem.altura * escala));

  const origem = contexto2d(imagem.largura, imagem.altura);
  origem.putImageData(new ImageData(imagem.dados, imagem.largura, imagem.altura), 0, 0);

  const quadrado = contexto2d(lado, lado);
  quadrado.fillStyle = "#000";
  quadrado.fillRect(0, 0, lado, lado);
  quadrado.imageSmoothingEnabled = true;
  quadrado.imageSmoothingQuality = "high";
  quadrado.drawImage(origem.canvas, 0, 0, largura, altura);

  const pixels = quadrado.getImageData(0, 0, lado, lado).data;
  const total = lado * lado;
  const entrada = new Float32Array(total * 3);

  for (let i = 0; i < total; i += 1) {
    entrada[i] = pixels[i * 4 + 2];
    entrada[total + i] = pixels[i * 4 + 1];
    entrada[total * 2 + i] = pixels[i * 4];
  }

  return { entrada, escala };
}
