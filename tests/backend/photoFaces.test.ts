/// <reference types="@cloudflare/workers-types" />
import { describe, it, expect } from "vitest";

import {
  FaceIndex,
  LIMIAR_PADRAO,
  MIN_LADO_ROSTO_SELFIE,
  buscarRostos,
  faceIndexKey,
  indiceConsistente,
  isModelName,
  limiarDeBusca,
  modelKey,
  normalizarVetorDaBusca,
  selfieAceitavel,
} from "../../functions/_utils/photoFaces";

/**
 * O que se protege aqui: a busca por rosto erra em SILENCIO. Ela sempre devolve
 * uma lista bonita e ordenada — trocar o fator de quantizacao, aceitar vetor de
 * tamanho errado ou casar o .bin com o .json de outra rodada nao gera erro
 * nenhum, so entrega ao peregrino as fotos de outra pessoa.
 */

const DIM = 4;

/** Monta um indice pequeno com vetores ja no formato do arquivo (int8). */
function indiceFake(rostos: Array<{ n: string; v: number[] }>): FaceIndex {
  const vetores = new Int8Array(rostos.length * DIM);
  rostos.forEach((rosto, posicao) => {
    rosto.v.forEach((valor, i) => {
      vetores[posicao * DIM + i] = Math.round(valor * 127);
    });
  });

  return {
    meta: {
      ano: 2026,
      modelo: "buffalo_s",
      dim: DIM,
      total_fotos: rostos.length,
      total_rostos: rostos.length,
      rostos: rostos.map(rosto => ({ n: rosto.n, box: [0, 0, 50, 50], s: 0.9 })),
    },
    vetores,
  };
}

const SELFIE = new Float32Array([1, 0, 0, 0]);

describe("normalizarVetorDaBusca", () => {
  it("deixa o vetor com comprimento 1", () => {
    const vetor = normalizarVetorDaBusca([3, 4, 0, 0], DIM);
    expect(vetor).not.toBeNull();
    const comprimento = Math.hypot(...Array.from(vetor!));
    expect(comprimento).toBeCloseTo(1, 5);
  });

  it("normaliza mesmo o que ja veio normalizado, sem estragar", () => {
    const vetor = normalizarVetorDaBusca([1, 0, 0, 0], DIM);
    expect(Array.from(vetor!)).toEqual([1, 0, 0, 0]);
  });

  it("recusa vetor do tamanho errado", () => {
    // Modelo trocado na tela sem reindexar o album: os numeros chegam, mas
    // comparar 128 dimensoes com um indice de 512 nao significa nada.
    expect(normalizarVetorDaBusca([1, 0, 0], DIM)).toBeNull();
    expect(normalizarVetorDaBusca([1, 0, 0, 0, 0], DIM)).toBeNull();
  });

  it("recusa lixo no lugar de numero", () => {
    expect(normalizarVetorDaBusca(["1", 0, 0, 0], DIM)).toBeNull();
    expect(normalizarVetorDaBusca([NaN, 0, 0, 0], DIM)).toBeNull();
    expect(normalizarVetorDaBusca([Infinity, 0, 0, 0], DIM)).toBeNull();
    expect(normalizarVetorDaBusca("nao e lista", DIM)).toBeNull();
    expect(normalizarVetorDaBusca(null, DIM)).toBeNull();
  });

  it("recusa vetor de zeros", () => {
    // Nao veio de rosto nenhum. Sem esta guarda a divisao pela norma faria NaN
    // e toda comparacao viraria falsa em vez de a busca recusar o pedido.
    expect(normalizarVetorDaBusca([0, 0, 0, 0], DIM)).toBeNull();
  });
});

describe("buscarRostos", () => {
  it("devolve so o que passa do limiar, do mais parecido para o menos", () => {
    const indice = indiceFake([
      { n: "a.jpg", v: [1, 0, 0, 0] },
      { n: "b.jpg", v: [0.7, 0.7, 0, 0] },
      { n: "c.jpg", v: [0, 1, 0, 0] },
    ]);

    const achadas = buscarRostos(indice, SELFIE, 0.38);

    expect(achadas.map(f => f.n)).toEqual(["a.jpg", "b.jpg"]);
    expect(achadas[0].score).toBeGreaterThan(achadas[1].score);
  });

  it("nao repete a foto quando a pessoa aparece duas vezes nela", () => {
    // Ela e ela ao fundo. Sem juntar por nome, a grade mostraria o mesmo
    // arquivo duas vezes e o peregrino acharia que sao fotos diferentes.
    const indice = indiceFake([
      { n: "a.jpg", v: [0.6, 0.8, 0, 0] },
      { n: "a.jpg", v: [1, 0, 0, 0] },
    ]);

    const achadas = buscarRostos(indice, SELFIE, 0.38);

    expect(achadas).toHaveLength(1);
    // Fica a MELHOR das duas, nao a ultima lida.
    expect(achadas[0].score).toBeGreaterThan(0.9);
  });

  it("devolve lista vazia quando ninguem se parece", () => {
    const indice = indiceFake([{ n: "a.jpg", v: [0, 1, 0, 0] }]);
    expect(buscarRostos(indice, SELFIE, 0.38)).toEqual([]);
  });

  it("respeita o teto de resultados", () => {
    const indice = indiceFake(
      Array.from({ length: 10 }, (_, i) => ({ n: `${i}.jpg`, v: [1, 0, 0, 0] }))
    );
    expect(buscarRostos(indice, SELFIE, 0.38, 3)).toHaveLength(3);
  });

  it("reproduz a conta do Python: int8 dividido por 127", () => {
    // Se este fator mudar de um lado so, o limiar calibrado na Fase 2 para de
    // valer — e nada quebra, os numeros so ficam errados.
    const indice = indiceFake([{ n: "a.jpg", v: [1, 0, 0, 0] }]);
    const [achada] = buscarRostos(indice, SELFIE, 0);
    expect(achada.score).toBeCloseTo(1, 2);
  });
});

describe("indiceConsistente", () => {
  const meta = {
    ano: 2026,
    modelo: "buffalo_s",
    dim: 512,
    total_fotos: 2,
    total_rostos: 2,
    rostos: [
      { n: "a.jpg", box: [0, 0, 1, 1], s: 0.9 },
      { n: "b.jpg", box: [0, 0, 1, 1], s: 0.9 },
    ],
  };

  it("aceita o par que veio da mesma rodada", () => {
    expect(indiceConsistente(meta, 2 * 512)).toBe(true);
  });

  it("recusa .bin e .json de rodadas diferentes", () => {
    // O caso perigoso: cada vetor passaria a casar com o nome de outra foto e a
    // busca entregaria as fotos de um estranho, sem erro nenhum no log.
    expect(indiceConsistente(meta, 3 * 512)).toBe(false);
    expect(indiceConsistente(meta, 2 * 128)).toBe(false);
  });

  it("recusa indice vazio", () => {
    expect(indiceConsistente({ ...meta, rostos: [] }, 0)).toBe(false);
  });
});

describe("limiarDeBusca", () => {
  it("usa o padrao quando nao esta configurado", () => {
    expect(limiarDeBusca({})).toBe(LIMIAR_PADRAO);
    expect(limiarDeBusca({ PHOTO_FACE_THRESHOLD: "  " })).toBe(LIMIAR_PADRAO);
  });

  it("aceita virgula, que e como se digita numero por aqui", () => {
    expect(limiarDeBusca({ PHOTO_FACE_THRESHOLD: "0,45" })).toBeCloseTo(0.45);
  });

  it("ignora valor fora da faixa do cosseno", () => {
    // "38" em vez de "0.38" nao devolveria foto nenhuma, e ninguem entenderia
    // por que a busca parou de achar gente.
    expect(limiarDeBusca({ PHOTO_FACE_THRESHOLD: "38" })).toBe(LIMIAR_PADRAO);
    expect(limiarDeBusca({ PHOTO_FACE_THRESHOLD: "-2" })).toBe(LIMIAR_PADRAO);
    expect(limiarDeBusca({ PHOTO_FACE_THRESHOLD: "abc" })).toBe(LIMIAR_PADRAO);
  });
});

describe("selfieAceitavel", () => {
  it("recusa o rosto pequeno que produziu 79 estranhos no teste de 2026", () => {
    // Este numero nao e teorico: a selfie de 46px devolveu 79 fotos, quase todas
    // de outras pessoas, todas de oculos escuro e bone. Foi o pior resultado
    // entre as 15 pessoas testadas.
    expect(selfieAceitavel(46)).toBe(false);
  });

  it("aceita os tamanhos que deram resultado limpo", () => {
    // 130px foi a menor selfie boa medida; 312px produziu 105 fotos corretas.
    expect(selfieAceitavel(130)).toBe(true);
    expect(selfieAceitavel(312)).toBe(true);
    expect(selfieAceitavel(MIN_LADO_ROSTO_SELFIE)).toBe(true);
  });

  it("recusa quando a tela nao manda o tamanho", () => {
    // Sem o campo nao da para saber se a selfie presta: o servidor recebe so os
    // numeros do rosto, nunca a imagem. Na duvida, recusa.
    expect(selfieAceitavel(undefined)).toBe(false);
    expect(selfieAceitavel(null)).toBe(false);
    expect(selfieAceitavel("200")).toBe(false);
    expect(selfieAceitavel(NaN)).toBe(false);
  });

  it("recusa valor sem sentido", () => {
    expect(selfieAceitavel(0)).toBe(false);
    expect(selfieAceitavel(-100)).toBe(false);
  });
});

describe("faceIndexKey", () => {
  it("monta as chaves do balde", () => {
    expect(faceIndexKey(2026, "bin")).toBe("faces/2026.bin");
    expect(faceIndexKey(2026, "json")).toBe("faces/2026.json");
  });
});

describe("isModelName", () => {
  it("aceita os modelos que a tela precisa baixar", () => {
    expect(isModelName("yunet.onnx")).toBe(true);
    expect(isModelName("sface.onnx")).toBe(true);
    expect(isModelName("sface_int8.onnx")).toBe(true);
    expect(isModelName("face_recognition_sface_2021dec.onnx")).toBe(true);
  });

  it("nao deixa a URL passear pelo balde", () => {
    // A rota /api/fotos/modelo monta a chave do R2 com o que veio na URL. Sem
    // esta trava, "../faces/2026.bin" serviria o INDICE DE ROSTOS de todo mundo
    // que apareceu no evento — o unico arquivo desta funcionalidade que e
    // mesmo privado. Os modelos, esses sao publicos no OpenCV Zoo.
    expect(isModelName("../faces/2026.bin")).toBe(false);
    expect(isModelName("..%2Ffaces%2F2026.bin")).toBe(false);
    expect(isModelName("modelos/../faces/2026.json")).toBe(false);
    expect(isModelName("/etc/passwd")).toBe(false);
  });

  it("recusa o que nao e modelo", () => {
    expect(isModelName("2026.bin")).toBe(false);
    expect(isModelName("sface.onnx.txt")).toBe(false);
    expect(isModelName("")).toBe(false);
    expect(isModelName(".onnx")).toBe(false);
    expect(isModelName(`${"a".repeat(200)}.onnx`)).toBe(false);
  });
});

describe("modelKey", () => {
  it("monta a chave do modelo no balde", () => {
    expect(modelKey("sface.onnx")).toBe("modelos/sface.onnx");
  });
});
