/**
 * A entrada "onnxruntime-web/wasm" existe no package.json do pacote (campo
 * `exports`), mas só é enxergada por resolvedores modernos. O react-scripts
 * compila com TypeScript 4.9 e pode reescrever o `moduleResolution` do projeto
 * para "node", que ignora `exports` — e aí o build quebraria por tipo faltando,
 * mesmo com o webpack resolvendo o arquivo certo.
 *
 * Os tipos são idênticos aos da entrada principal: o que muda entre as duas é o
 * BINÁRIO, não a API. Ver src/services/fotos/rosto/modelos.ts para o porquê de
 * usarmos a variante /wasm.
 */
declare module "onnxruntime-web/wasm" {
  export * from "onnxruntime-web";
}
