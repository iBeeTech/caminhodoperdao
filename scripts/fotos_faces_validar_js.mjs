/**
 * Confere se o alinhamento em JavaScript faz a MESMA coisa que o do Python.
 *
 * É o teste que decide se a busca por rosto pode existir na tela. O vetor da
 * selfie vai ser gerado no navegador e comparado com um índice gerado pelo
 * Python — e vetor só se compara com vetor do mesmo processo. Se o recorte de
 * 112x112 sair diferente aqui, tudo continua "funcionando": o navegador gera
 * números, o Worker responde rápido, e nenhuma foto casa. Nunca.
 *
 * Não é teste unitário porque depende de fixtures grandes (uma foto de 2,9 MB)
 * que não fazem sentido no repositório. Gere as fixtures e rode:
 *
 *   .venv-faces/bin/python scripts/fotos_faces_referencia.py --selfie <foto>
 *   node scripts/fotos_faces_validar_js.mjs
 *
 * São três etapas, na ordem em que a tela as executa. Cada uma só faz sentido se
 * a anterior passou:
 *
 *   1. o recorte 112x112 sai igual ao do OpenCV?
 *   2. o recorte igual vira o mesmo vetor?
 *   3. a detecção em JS acha o rosto no mesmo lugar que o OpenCV?
 */
import { readFileSync, mkdtempSync } from "node:fs";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as ort from "onnxruntime-web";

const REF = "/tmp/ref";

// O alinhamento é TypeScript e este script é Node puro: compila na hora, para o
// que roda aqui ser exatamente o arquivo que vai para a tela — e não uma cópia
// que envelhece em silêncio.
const saida = mkdtempSync(join(tmpdir(), "alinhamento-"));
execSync(
  `npx tsc src/services/fotos/rosto/alinhamento.ts src/services/fotos/rosto/deteccao.ts` +
    ` --outDir ${saida} --module esnext --target es2022 --moduleResolution node --skipLibCheck`,
  { stdio: "inherit" }
);
const { matrizDeAlinhamento, recortarRostoAlinhado, LADO_RECORTE } = await import(
  join(saida, "alinhamento.js")
);

const referencia = JSON.parse(readFileSync(`${REF}/referencia.json`, "utf8"));
const entrada = {
  largura: referencia.largura,
  altura: referencia.altura,
  dados: new Uint8ClampedArray(readFileSync(`${REF}/entrada_rgba.bin`)),
};
const cropPython = new Uint8ClampedArray(readFileSync(`${REF}/crop_python_bgr.bin`));

const matriz = matrizDeAlinhamento(referencia.landmarks);
const recorteJs = recortarRostoAlinhado(entrada, matriz);

// O recorte do JS sai em RGB e o do Python em BGR (padrão do OpenCV): a
// comparação inverte os canais, senão acusaria diferença onde não há.
let iguais = 0;
let diferencaMaxima = 0;
let somaDiferencas = 0;
const total = LADO_RECORTE * LADO_RECORTE * 3;

for (let i = 0; i < LADO_RECORTE * LADO_RECORTE; i += 1) {
  for (let canal = 0; canal < 3; canal += 1) {
    const doJs = recorteJs[i * 3 + canal];
    const doPython = cropPython[i * 3 + (2 - canal)];
    const diferenca = Math.abs(doJs - doPython);

    if (diferenca === 0) iguais += 1;
    if (diferenca > diferencaMaxima) diferencaMaxima = diferenca;
    somaDiferencas += diferenca;
  }
}

console.log("");
console.log("matriz JS ....... ", matriz.map(v => v.toFixed(4)).join("  "));
console.log("");
console.log(`pixels idênticos  ${iguais}/${total}  (${((100 * iguais) / total).toFixed(1)}%)`);
console.log(`diferença média   ${(somaDiferencas / total).toFixed(2)} de 255`);
console.log(`diferença máxima  ${diferencaMaxima} de 255`);
console.log("");

// Um ou dois níveis de diferença vêm do arredondamento da interpolação e não
// mudam o vetor. Acima disso o alinhamento divergiu de verdade, e seguir para a
// tela seria construir sobre areia.
if (diferencaMaxima > 2) {
  console.log("FALHOU no recorte — o 112x112 do JS não bate com o do Python.");
  console.log("Suspeitos, nesta ordem: ajuste de meio pixel na coordenada, a ordem");
  console.log("dos canais, o tratamento da borda, ou a fórmula da matriz.");
  process.exit(1);
}

console.log("recorte OK — o navegador enxerga o mesmo rosto que o indexador.");

// Etapa 2: o recorte igual precisa virar o MESMO vetor. É aqui que se descobre
// se a entrada do modelo (ordem dos canais, plano por canal) está certa — errar
// isso dá um vetor plausível que não casa com nada.
const { recorteParaEntradaDoModelo } = await import(join(saida, "alinhamento.js"));
const sessao = await ort.InferenceSession.create("scripts/modelos/sface.onnx");
const resultado = await sessao.run({
  [sessao.inputNames[0]]: new ort.Tensor("float32", recorteParaEntradaDoModelo(recorteJs), [1, 3, 112, 112]),
});

const bruto = Array.from(resultado[sessao.outputNames[0]].data);
const norma = Math.sqrt(bruto.reduce((soma, x) => soma + x * x, 0));
const vetorJs = bruto.map(x => x / norma);
const semelhanca = vetorJs.reduce((soma, x, i) => soma + x * referencia.vetor[i], 0);

console.log("");
console.log(`semelhança entre os vetores  ${semelhanca.toFixed(6)}`);
console.log("");

// O mesmo rosto comparado consigo mesmo dá ~1,0. Qualquer coisa abaixo de 0,999
// significa que os dois lados estão gerando impressões digitais diferentes — e
// aí o limiar de 0,38 calibrado no Python não vale para a tela.
if (semelhanca <= 0.999) {
  console.log("FALHOU no vetor — o recorte bate, mas a entrada do modelo não.");
  console.log("Suspeitos: RGB no lugar de BGR, ou canais intercalados em vez de um");
  console.log("plano por canal.");
  process.exit(1);
}

console.log("OK — o navegador gera o MESMO vetor que o indexador.");

// Etapa 3: a detecção. Até aqui os 5 pontos vieram prontos do Python; na tela
// quem os produz é o decodificador em JS. Esta etapa roda o mesmo yunet.onnx
// sobre os MESMOS pixels de 640x640 que o OpenCV recebeu e compara o que os dois
// acharam. Isola o decodificador: o redimensionamento é o mesmo dos dois lados.
const { detectarRostos } = await import(join(saida, "deteccao.js"));

const lado = referencia.quadrado.lado;
const quadradoRgba = readFileSync(`${REF}/quadrado_rgba.bin`);
const pixels = lado * lado;

// BGR em plano por canal — é o que o FaceDetectorYN do OpenCV entrega ao modelo
// (blobFromImage SEM swapRB). Ao contrário do SFace, logo acima, que recebe RGB.
const entradaDetector = new Float32Array(pixels * 3);
for (let i = 0; i < pixels; i += 1) {
  entradaDetector[i] = quadradoRgba[i * 4 + 2];
  entradaDetector[pixels + i] = quadradoRgba[i * 4 + 1];
  entradaDetector[pixels * 2 + i] = quadradoRgba[i * 4];
}

const detectorOnnx = await ort.InferenceSession.create("scripts/modelos/yunet.onnx");
const saidasDetector = await detectorOnnx.run({
  [detectorOnnx.inputNames[0]]: new ort.Tensor("float32", entradaDetector, [1, 3, lado, lado]),
});

const cruas = {};
for (const nome of detectorOnnx.outputNames) cruas[nome] = saidasDetector[nome].data;

const doJs = detectarRostos(cruas, lado);
const doPython = referencia.quadrado.rostos;

console.log("");
console.log(`rostos no quadrado de ${lado}   python ${doPython.length}   js ${doJs.length}`);

if (doJs.length !== doPython.length) {
  console.log("");
  console.log("FALHOU na detecção — os dois lados acharam quantidades diferentes de rosto.");
  console.log("Suspeitos: o corte de confiança, a supressão de sobreposição, ou a ordem");
  console.log("das saídas do modelo (cls/obj/bbox/kps por passo).");
  process.exit(1);
}

// Ordena dos dois lados pelo mesmo critério antes de comparar: as listas saem em
// ordens diferentes (o OpenCV ordena por nota, o nosso por área) e comparar
// posição a posição sem isto acusaria erro onde não há.
const porArea = (a, b) => b[2] * b[3] - a[2] * a[3];
const pythonOrdenado = [...doPython].sort(porArea);

let maiorDesvio = 0;
for (let i = 0; i < doJs.length; i += 1) {
  const js = doJs[i];
  const py = pythonOrdenado[i];
  const comparar = [
    [js.x, py[0]],
    [js.y, py[1]],
    [js.largura, py[2]],
    [js.altura, py[3]],
    ...js.pontos.flatMap(([x, y], n) => [
      [x, py[4 + 2 * n]],
      [y, py[5 + 2 * n]],
    ]),
  ];

  for (const [nosso, deles] of comparar) {
    maiorDesvio = Math.max(maiorDesvio, Math.abs(nosso - deles));
  }
}

console.log(`maior desvio em pixels        ${maiorDesvio.toFixed(3)}`);
console.log("");

// Meio pixel é ruído de ponto flutuante entre dois runtimes diferentes. Acima
// disso o decodificador divergiu: a caixa erra o lugar, o recorte pega o ombro
// da pessoa e o vetor não casa com nada.
if (maiorDesvio > 0.5) {
  console.log("FALHOU na detecção — o rosto saiu em outro lugar.");
  console.log("Suspeitos: a fórmula do centro/tamanho (exp), o passo de cada escala,");
  console.log("ou linha e coluna trocadas ao percorrer a grade.");
  process.exit(1);
}

console.log("OK — o navegador acha o rosto onde o OpenCV acha.");
process.exit(0);
