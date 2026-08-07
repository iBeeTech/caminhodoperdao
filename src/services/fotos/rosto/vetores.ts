/**
 * Contas com as impressões digitais de rosto.
 *
 * Fica separado do impressaoDigital.ts por um motivo prático: aquele arquivo
 * carrega o onnxruntime, que só existe dentro de um navegador. Estas funções são
 * aritmética pura e precisam rodar no teste unitário — se estivessem lá, testar
 * a média de dois vetores exigiria subir um motor de WebAssembly.
 */

/** Deixa o vetor com comprimento 1. Devolve null quando não há o que normalizar. */
export function normalizar(vetor: readonly number[]): number[] | null {
  const norma = Math.sqrt(vetor.reduce((soma, valor) => soma + valor * valor, 0));
  if (!Number.isFinite(norma) || norma === 0) return null;
  return vetor.map(valor => valor / norma);
}

/**
 * Junta as impressões de várias selfies numa só.
 *
 * É a alavanca que mais aumenta a precisão, segundo o teste de 2026: cada foto
 * traz um ângulo e uma luz, e a média cancela o que é da FOTO, deixando o que é
 * da PESSOA. Uma selfie de óculos escuro sozinha casa com qualquer um de óculos
 * escuro; a mesma pessoa somada a outra sem óculos deixa de casar.
 *
 * A média de vetores normalizados NÃO tem comprimento 1 — normalizar de novo no
 * fim é obrigatório, senão a similaridade sai menor só por causa da escala e a
 * pessoa receberia menos fotos quanto MAIS selfies mandasse.
 */
export function combinarImpressoes(vetores: ReadonlyArray<readonly number[]>): number[] {
  if (vetores.length === 0) throw new Error("combinarImpressoes: nenhum vetor");
  if (vetores.length === 1) return [...vetores[0]];

  const dim = vetores[0].length;
  const soma = new Array<number>(dim).fill(0);

  for (const vetor of vetores) {
    if (vetor.length !== dim) throw new Error("combinarImpressoes: vetores de tamanhos diferentes");
    for (let i = 0; i < dim; i += 1) soma[i] += vetor[i];
  }

  const media = normalizar(soma);
  // Só acontece com vetores exatamente opostos, o que na prática significa duas
  // pessoas radicalmente diferentes — média nenhuma representaria as duas.
  if (!media) throw new Error("combinarImpressoes: a soma deu zero");

  return media;
}
