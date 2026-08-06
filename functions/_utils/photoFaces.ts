/// <reference types="@cloudflare/workers-types" />

/**
 * Busca de fotos por rosto (Fase 3 do filtro de face).
 *
 * O indice vem do scripts/fotos_faces.py e sao dois arquivos no R2 PRIVADO:
 *
 *   faces/<ano>.bin    N * dim bytes, um vetor int8 normalizado por rosto
 *   faces/<ano>.json   metadados na MESMA ordem dos vetores
 *
 * ⚠️ O bin fica em bucket privado e NUNCA e servido ao navegador. Publicar o
 * arquivo tornaria a busca mais simples (o celular baixava e comparava sozinho),
 * mas seria abrir na internet o banco de impressoes faciais de todo mundo que
 * apareceu no evento. O que trafega e so o vetor da selfie de quem esta pedindo.
 *
 * A conta aqui e a MESMA do fotos_faces_buscar.py de proposito: se a tela achar
 * fotos diferentes do que voce calibrou no Python, o limiar calibrado nao vale
 * mais nada.
 */

export interface FaceIndexMeta {
  ano: number;
  modelo: string;
  dim: number;
  total_fotos: number;
  total_rostos: number;
  rostos: Array<{ n: string; box: number[]; s: number }>;
}

export interface FaceIndex {
  meta: FaceIndexMeta;
  /** Vetores crus, dim bytes por rosto, na ordem de meta.rostos. */
  vetores: Int8Array;
}

export interface FaceMatch {
  n: string;
  score: number;
}

/** Corte padrao entre "e a pessoa" e "e outra parecida". Calibrado na Fase 2. */
export const LIMIAR_PADRAO = 0.38;

/**
 * Lado minimo, em pixels, do rosto NA SELFIE.
 *
 * Medido no album de 2026 (18.824 rostos, 15 pessoas). Uma unica selfie tinha o
 * rosto pequeno, 46px, e sozinha produziu o pior resultado de todos:
 *
 *   selfie de 312px -> 105 fotos, todas a pessoa certa
 *   selfie de  46px ->  79 fotos, quase todas de estranhos
 *
 * O que aquelas 79 tinham em comum nao era a pessoa: era oculos escuro e bone.
 * Rosto pequeno gera um vetor instavel, que casa com qualquer rosto igualmente
 * mal definido - e numa caminhada ao sol isso e meio evento.
 *
 * ⚠️ A confianca do detector NAO serve para pegar esse caso: a selfie de 46px
 * marcou 0,91, tao alto quanto as boas. So o tamanho separa.
 *
 * O valor e conservador. As selfies boas medidas comecam em 130px e a ruim tinha
 * 46px; entre os dois nao ha medida, entao 100 fica com folga dos dois lados.
 */
export const MIN_LADO_ROSTO_SELFIE = 100;

/**
 * A selfie tem rosto grande o bastante para valer a busca?
 *
 * Quem de fato barra e a tela, que pede outra foto ANTES de mandar qualquer
 * coisa - so ela tem a imagem para reenquadrar. Isto aqui e a segunda tranca:
 * uma versao antiga da tela guardada no cache do celular continuaria mandando
 * selfie ruim, e o peregrino receberia 79 estranhos sem entender por que.
 */
export function selfieAceitavel(ladoDoRosto: unknown): boolean {
  return typeof ladoDoRosto === "number" && Number.isFinite(ladoDoRosto) && ladoDoRosto >= MIN_LADO_ROSTO_SELFIE;
}

/** Teto de fotos devolvidas: acima disso ninguem olha, e a resposta incha. */
export const MAX_RESULTADOS = 120;

export function faceIndexKey(ano: number, extensao: "bin" | "json"): string {
  return `faces/${ano}.${extensao}`;
}

export function limiarDeBusca(env: { PHOTO_FACE_THRESHOLD?: string }): number {
  const bruto = env.PHOTO_FACE_THRESHOLD?.trim();
  const valor = bruto ? Number(bruto.replace(",", ".")) : NaN;
  // Fora de -1..1 nao e limiar de cosseno, e engano de digitacao. Um valor
  // absurdo passaria despercebido devolvendo tudo ou nada.
  if (!Number.isFinite(valor) || valor <= -1 || valor >= 1) return LIMIAR_PADRAO;
  return valor;
}

/**
 * Confere e normaliza o vetor que veio da tela.
 *
 * Normaliza AQUI mesmo que o navegador ja tenha normalizado: a comparacao so e
 * similaridade de cosseno se os dois lados tiverem comprimento 1, e um vetor
 * fora de escala (bug na tela, versao antiga em cache) faria toda foto passar do
 * limiar. Devolve null quando o corpo nao serve.
 */
export function normalizarVetorDaBusca(bruto: unknown, dim: number): Float32Array | null {
  if (!Array.isArray(bruto) || bruto.length !== dim) return null;

  const vetor = new Float32Array(dim);
  let soma = 0;

  for (let i = 0; i < dim; i += 1) {
    const valor = bruto[i];
    if (typeof valor !== "number" || !Number.isFinite(valor)) return null;
    vetor[i] = valor;
    soma += valor * valor;
  }

  const norma = Math.sqrt(soma);
  // Vetor de zeros nao veio de rosto nenhum.
  if (norma === 0) return null;

  for (let i = 0; i < dim; i += 1) vetor[i] /= norma;
  return vetor;
}

/**
 * Compara a selfie com todos os rostos do album.
 *
 * Devolve UMA linha por foto, com a melhor pontuacao dela: a mesma pessoa
 * costuma aparecer duas vezes no mesmo arquivo (ela e ela ao fundo), e sem isso
 * a grade da tela repetiria a foto.
 */
export function buscarRostos(
  indice: FaceIndex,
  selfie: Float32Array,
  limiar: number,
  maximo: number = MAX_RESULTADOS
): FaceMatch[] {
  const { meta, vetores } = indice;
  const dim = meta.dim;
  const melhorPorFoto = new Map<string, number>();

  for (let rosto = 0; rosto < meta.rostos.length; rosto += 1) {
    const inicio = rosto * dim;
    let produto = 0;
    // int8 volta a float dividindo por 127 — o mesmo fator que o Python usou
    // para quantizar. Trocar este numero desalinha os dois lados em silencio.
    for (let i = 0; i < dim; i += 1) produto += (vetores[inicio + i] / 127) * selfie[i];

    if (produto < limiar) continue;

    const nome = meta.rostos[rosto].n;
    const atual = melhorPorFoto.get(nome);
    if (atual === undefined || produto > atual) melhorPorFoto.set(nome, produto);
  }

  return Array.from(melhorPorFoto, ([n, score]) => ({ n, score: Math.round(score * 1000) / 1000 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, maximo);
}

/**
 * Confere se o .bin e o .json vieram da mesma rodada do indexador.
 *
 * Se divergirem, cada vetor casa com o NOME ERRADO: a busca continua rodando,
 * responde rapido e entrega ao peregrino as fotos de outra pessoa. Barato de
 * checar, caro de descobrir depois.
 */
export function indiceConsistente(meta: FaceIndexMeta, bytes: number): boolean {
  return meta.dim > 0 && meta.rostos.length > 0 && bytes === meta.rostos.length * meta.dim;
}
