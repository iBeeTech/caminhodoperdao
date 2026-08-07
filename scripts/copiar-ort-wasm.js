/**
 * Copia o motor WebAssembly do onnxruntime para public/ort/.
 *
 * O onnxruntime-web não busca o .wasm sozinho no node_modules: em tempo de
 * execução ele pede o arquivo por URL, e essa URL é a `ort.env.wasm.wasmPaths`
 * definida em src/services/fotos/rosto/modelos.ts. Como o webpack do CRA não
 * empacota .wasm de dependência, o arquivo precisa estar em public/ ANTES do
 * build — é o que este script faz.
 *
 * Está pendurado em TRÊS ganchos (postinstall, prestart, prebuild) de propósito.
 * O prebuild só dispara em `npm run build`; se a esteira do Cloudflare Pages
 * chamar `react-scripts build` direto, o /ort/ não vai para o site e a busca por
 * rosto quebra em produção com um 404 de wasm — enquanto o resto do site sobe
 * normalmente, o que faria o erro passar despercebido. O postinstall roda em
 * qualquer esteira, porque instalar dependência ninguém pula.
 *
 * Por que não versionar direto em public/: são 13 MB de binário que já vêm no
 * node_modules e mudam a cada atualização do pacote. Versionar seria manter duas
 * cópias que envelhecem em ritmos diferentes — e a que o navegador usa seria
 * justamente a desatualizada, com uma incompatibilidade que aparece só em
 * produção. Por isso public/ort/ está no .gitignore.
 *
 * ⚠️ A variante é a só-CPU (`ort-wasm-simd-threaded.wasm`, 13 MB), e não a com
 * WebGPU (`.jsep.wasm`, 26 MB). Tem de casar com o `import ... from
 * "onnxruntime-web/wasm"` do modelos.ts: se um lado trocar de variante e o outro
 * não, o runtime baixa o binário errado e falha ao criar a sessão.
 */
const fs = require("node:fs");
const path = require("node:path");

const RAIZ = path.resolve(__dirname, "..");
const ORIGEM = path.join(RAIZ, "node_modules", "onnxruntime-web", "dist");
const DESTINO = path.join(RAIZ, "public", "ort");

// O .mjs é a cola JavaScript do wasm. A variante "bundle" que importamos já a
// traz embutida, mas o runtime ainda pode pedi-la em alguns navegadores — copiar
// 200 KB a mais é mais barato que descobrir isso num celular alheio.
const ARQUIVOS = ["ort-wasm-simd-threaded.wasm", "ort-wasm-simd-threaded.mjs"];

if (!fs.existsSync(ORIGEM)) {
  console.error(`[ort] nao achei ${ORIGEM}. Rode "npm install" antes do build.`);
  process.exit(1);
}

fs.mkdirSync(DESTINO, { recursive: true });

for (const arquivo of ARQUIVOS) {
  const de = path.join(ORIGEM, arquivo);
  const para = path.join(DESTINO, arquivo);

  if (!fs.existsSync(de)) {
    console.error(`[ort] ${arquivo} nao existe no pacote instalado.`);
    process.exit(1);
  }

  // Recopia só quando o tamanho difere: em `npm start` este script roda a cada
  // reinício, e copiar 13 MB à toa atrasa o servidor de desenvolvimento.
  const atual = fs.existsSync(para) ? fs.statSync(para).size : -1;
  if (atual === fs.statSync(de).size) continue;

  fs.copyFileSync(de, para);
  console.log(`[ort] ${arquivo} -> public/ort/`);
}
