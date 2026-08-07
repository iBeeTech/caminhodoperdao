/// <reference types="jest" />
/**
 * Cobre o decodificador do YuNet — a peça que transforma os 12 tensores crus do
 * modelo em "tem um rosto aqui, com os olhos nestes pontos".
 *
 * A paridade com o OpenCV de verdade é conferida pelo
 * `scripts/fotos_faces_validar_js.mjs`, que roda o modelo sobre uma foto real e
 * compara pixel a pixel. Ele depende de fixtures de megabytes e do Python, então
 * não cabe aqui. O que estes testes seguram é a aritmética: que a fórmula do
 * centro/tamanho não mude sem alguém notar, que linha e coluna não se invertam,
 * e que a supressão de sobreposição continue deixando UM rosto por pessoa.
 */

import {
  MIN_SCORE_DETECCAO,
  decodificarYuNet,
  desfazerEncaixe,
  detectarRostos,
  suprimirSobreposicoes,
} from "../../../../src/services/fotos/rosto/deteccao";

/**
 * Monta as 12 saídas de um YuNet que não viu rosto nenhum.
 *
 * Score zero em toda parte: cada teste "acende" só as células que lhe
 * interessam, e o resto some no corte de confiança.
 */
function saidasVazias(lado: number): Record<string, Float32Array> {
  const saidas: Record<string, Float32Array> = {};

  for (const passo of [8, 16, 32]) {
    const celulas = (lado / passo) * (lado / passo);
    saidas[`cls_${passo}`] = new Float32Array(celulas);
    saidas[`obj_${passo}`] = new Float32Array(celulas);
    saidas[`bbox_${passo}`] = new Float32Array(celulas * 4);
    saidas[`kps_${passo}`] = new Float32Array(celulas * 10);
  }

  return saidas;
}

/** Acende uma célula da grade com um rosto de tamanho conhecido. */
function acender(
  saidas: Record<string, Float32Array>,
  passo: number,
  lado: number,
  linha: number,
  coluna: number,
  nota = 1
): void {
  const colunas = lado / passo;
  const celula = linha * colunas + coluna;

  saidas[`cls_${passo}`][celula] = nota;
  saidas[`obj_${passo}`][celula] = nota;

  // Centro exatamente no canto da célula (deslocamento 0) e lado = 1 passo
  // (exp(0) = 1), para a conta esperada caber de cabeça.
  saidas[`bbox_${passo}`].set([0, 0, 0, 0], celula * 4);

  for (let ponto = 0; ponto < 5; ponto += 1) {
    saidas[`kps_${passo}`].set([0, 0], celula * 10 + ponto * 2);
  }
}

describe("decodificarYuNet", () => {
  it("põe o rosto na posição da célula que o achou", () => {
    const lado = 64;
    const saidas = saidasVazias(lado);
    acender(saidas, 8, lado, 3, 2);

    const rostos = decodificarYuNet(saidas, lado);

    expect(rostos).toHaveLength(1);
    // centro = (coluna + 0) * passo = 16 ; lado = exp(0) * passo = 8
    // canto = centro - lado/2 = 12
    expect(rostos[0].x).toBeCloseTo(12);
    expect(rostos[0].y).toBeCloseTo(20);
    expect(rostos[0].largura).toBeCloseTo(8);
    expect(rostos[0].altura).toBeCloseTo(8);
  });

  it("não confunde linha com coluna", () => {
    const lado = 64;
    const naLinha = saidasVazias(lado);
    acender(naLinha, 8, lado, 3, 0);

    const naColuna = saidasVazias(lado);
    acender(naColuna, 8, lado, 0, 3);

    // Trocar linha por coluna é o erro mais fácil de cometer e o mais difícil de
    // ver: o rosto continua aparecendo, só que espelhado na diagonal.
    expect(decodificarYuNet(naLinha, lado)[0].y).toBeGreaterThan(
      decodificarYuNet(naLinha, lado)[0].x
    );
    expect(decodificarYuNet(naColuna, lado)[0].x).toBeGreaterThan(
      decodificarYuNet(naColuna, lado)[0].y
    );
  });

  it("usa a média geométrica das duas notas como score", () => {
    const lado = 64;
    const saidas = saidasVazias(lado);
    acender(saidas, 8, lado, 1, 1);
    saidas.cls_8[1 * 8 + 1] = 1;
    saidas.obj_8[1 * 8 + 1] = 0.64;

    expect(decodificarYuNet(saidas, lado)[0].score).toBeCloseTo(0.8);
  });

  it("descarta o que está abaixo do corte de confiança", () => {
    const lado = 64;
    const saidas = saidasVazias(lado);
    acender(saidas, 8, lado, 1, 1, MIN_SCORE_DETECCAO - 0.05);

    expect(decodificarYuNet(saidas, lado)).toHaveLength(0);
  });

  it("procura nas três escalas", () => {
    const lado = 64;
    const saidas = saidasVazias(lado);
    acender(saidas, 8, lado, 0, 0);
    acender(saidas, 16, lado, 1, 1);
    acender(saidas, 32, lado, 1, 0);

    expect(decodificarYuNet(saidas, lado)).toHaveLength(3);
  });

  it("reclama quando falta uma saída do modelo", () => {
    const saidas = saidasVazias(64);
    delete saidas.kps_16;

    // Um modelo com nomes diferentes daria rosto nenhum em silêncio, e a tela
    // diria "não achei seu rosto" para toda selfie do mundo.
    expect(() => decodificarYuNet(saidas, 64)).toThrow(/passo 16/);
  });
});

describe("suprimirSobreposicoes", () => {
  const rosto = (x: number, y: number, lado: number, score: number) => ({
    x,
    y,
    largura: lado,
    altura: lado,
    score,
    pontos: [] as Array<readonly [number, number]>,
  });

  it("fica só com o de maior nota entre os que se sobrepõem", () => {
    const mantidos = suprimirSobreposicoes([
      rosto(0, 0, 100, 0.7),
      rosto(5, 5, 100, 0.9),
      rosto(10, 10, 100, 0.8),
    ]);

    expect(mantidos).toHaveLength(1);
    expect(mantidos[0].score).toBeCloseTo(0.9);
  });

  it("mantém rostos separados", () => {
    expect(suprimirSobreposicoes([rosto(0, 0, 50, 0.9), rosto(500, 500, 50, 0.8)])).toHaveLength(2);
  });
});

describe("detectarRostos", () => {
  it("devolve do maior para o menor, e não do mais bem pontuado", () => {
    const lado = 64;
    const saidas = saidasVazias(lado);
    // O pequeno tem nota melhor; o grande tem de vir primeiro mesmo assim, porque
    // quem chama quer o rosto de quem tirou a selfie, não o mais nítido do fundo.
    acender(saidas, 8, lado, 0, 0, 1);
    acender(saidas, 32, lado, 1, 1, 0.7);

    const rostos = detectarRostos(saidas, lado);

    expect(rostos).toHaveLength(2);
    expect(rostos[0].largura).toBe(32);
    expect(rostos[1].largura).toBe(8);
  });
});

describe("desfazerEncaixe", () => {
  it("devolve caixa e pontos à régua da imagem original", () => {
    const original = desfazerEncaixe(
      { x: 100, y: 50, largura: 40, altura: 60, score: 0.9, pontos: [[110, 60]] },
      0.5
    );

    expect(original.x).toBe(200);
    expect(original.y).toBe(100);
    expect(original.largura).toBe(80);
    expect(original.altura).toBe(120);
    expect(original.pontos[0]).toEqual([220, 120]);
    expect(original.score).toBe(0.9);
  });
});
