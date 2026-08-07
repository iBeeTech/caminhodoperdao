/// <reference types="jest" />
/**
 * Cobre a soma de várias selfies numa impressão digital só.
 *
 * O que está em jogo: se o resultado sair sem comprimento 1, a similaridade de
 * cosseno vira outra conta. A pessoa mandaria MAIS fotos e receberia MENOS
 * resultados — o oposto do que a tela promete, e sem erro nenhum aparecer.
 */

import { combinarImpressoes, normalizar } from "../../../../src/services/fotos/rosto/vetores";

const comprimento = (vetor: readonly number[]) =>
  Math.sqrt(vetor.reduce((soma, valor) => soma + valor * valor, 0));

describe("normalizar", () => {
  it("deixa o vetor com comprimento 1", () => {
    expect(comprimento(normalizar([3, 4]) as number[])).toBeCloseTo(1);
  });

  it("devolve null para o vetor de zeros", () => {
    expect(normalizar([0, 0, 0])).toBeNull();
  });
});

describe("combinarImpressoes", () => {
  it("devolve a própria impressão quando só há uma", () => {
    expect(combinarImpressoes([[0.6, 0.8]])).toEqual([0.6, 0.8]);
  });

  it("a média de duas selfies continua com comprimento 1", () => {
    const media = combinarImpressoes([
      [1, 0, 0],
      [0, 1, 0],
    ]);

    expect(comprimento(media)).toBeCloseTo(1);
    expect(media[0]).toBeCloseTo(Math.SQRT1_2);
    expect(media[1]).toBeCloseTo(Math.SQRT1_2);
  });

  it("aproxima o resultado das duas selfies ao mesmo tempo", () => {
    const primeira = normalizar([1, 0.2, 0]) as number[];
    const segunda = normalizar([0.8, 0.6, 0]) as number[];
    const media = combinarImpressoes([primeira, segunda]);

    const parecidoCom = (a: readonly number[], b: readonly number[]) =>
      a.reduce((soma, valor, i) => soma + valor * b[i], 0);

    // A média fica mais perto de CADA uma do que elas estão entre si: é isso que
    // faz a segunda selfie derrubar o que era só efeito da primeira foto
    // (o boné, o óculos escuro, a luz daquele momento).
    expect(parecidoCom(media, primeira)).toBeGreaterThan(parecidoCom(primeira, segunda));
    expect(parecidoCom(media, segunda)).toBeGreaterThan(parecidoCom(primeira, segunda));
  });

  it("recusa lista vazia", () => {
    expect(() => combinarImpressoes([])).toThrow(/nenhum vetor/);
  });

  it("recusa vetores de tamanhos diferentes", () => {
    // Acontece de verdade quando o índice muda de modelo (128 números) e um
    // celular ainda tem o antigo em cache.
    expect(() => combinarImpressoes([[1, 0], [1, 0, 0]])).toThrow(/tamanhos diferentes/);
  });
});
