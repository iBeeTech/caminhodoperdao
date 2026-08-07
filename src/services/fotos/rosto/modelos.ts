/**
 * Baixa e mantém em pé os dois modelos de rosto dentro do navegador.
 *
 * ⚠️ Isto é o que custa caro na funcionalidade inteira: o SFace cheio tem 39 MB.
 * Por isso NADA aqui é chamado ao abrir o álbum — só quando a pessoa toca em
 * "achar minhas fotos". Quem decide se a busca existe naquele ano é um GET
 * de 200 bytes (ver disponibilidadeDaBusca em fotos.service.ts).
 *
 * De onde vêm os arquivos: do R2, servidos por /api/fotos/modelo/<nome>. Não
 * ficam no repositório (são binários grandes, e o repositório é público) nem no
 * build do site.
 *
 * ⚠️ O NOME DO ARQUIVO É CONTRATO. Vetor gerado por um modelo só se compara com
 * vetor do MESMO arquivo — a versão comprimida do SFace dá números levemente
 * diferentes da cheia. Por isso quem manda no nome é o índice (o `modelo` que
 * vem no GET), nunca uma constante escrita aqui.
 */

import * as ort from "onnxruntime-web/wasm";

/**
 * A variante "/wasm" do onnxruntime, e não a padrão.
 *
 * A entrada padrão do pacote carrega o binário com WebGPU embutido, que tem
 * 26 MB. A variante só-CPU tem 13 MB e roda os dois modelos em menos de um
 * segundo — a diferença de velocidade não se nota, a de download se nota muito
 * no 3G da estrada de Assis.
 */
const PASTA_DO_RUNTIME = "/ort/";

/** URL de onde o navegador puxa cada modelo. Ver functions/api/fotos/modelo/[nome].ts. */
export function urlDoModelo(nome: string): string {
  return `/api/fotos/modelo/${encodeURIComponent(nome)}`;
}

export interface Progresso {
  /** O que está sendo baixado agora, para a tela ter o que dizer. */
  arquivo: string;
  baixados: number;
  /** Zero quando o servidor não informou o tamanho — a tela mostra só os MB. */
  total: number;
}

export type AoProgredir = (progresso: Progresso) => void;

export interface ModelosDeRosto {
  detector: ort.InferenceSession;
  reconhecedor: ort.InferenceSession;
}

/**
 * Sessões já criadas, por nome de arquivo.
 *
 * Guarda a PROMESSA, e não a sessão pronta: dois toques rápidos no botão
 * chegariam aqui antes de o primeiro download terminar e baixariam 39 MB duas
 * vezes. Guardando a promessa, o segundo espera o primeiro.
 */
const SESSOES = new Map<string, Promise<ort.InferenceSession>>();

let runtimeConfigurado = false;

function configurarRuntime(): void {
  if (runtimeConfigurado) return;

  ort.env.wasm.wasmPaths = PASTA_DO_RUNTIME;

  // Uma thread só, de propósito. Multi-thread no wasm exige SharedArrayBuffer, e
  // SharedArrayBuffer exige os cabeçalhos COOP/COEP no site inteiro — que
  // quebrariam o iframe do PIX e as imagens do R2. Sem eles o runtime tentaria
  // criar as threads, falharia e cairia para uma thread do mesmo jeito, só que
  // depois de um erro no console que ninguém saberia interpretar.
  ort.env.wasm.numThreads = 1;

  // O padrão é "warning" e o YuNet cospe dezenas de avisos de otimização de
  // grafo que não dizem nada a quem for depurar a tela.
  ort.env.logLevel = "error";

  runtimeConfigurado = true;
}

/**
 * Baixa o arquivo relatando o andamento.
 *
 * `fetch` sozinho não conta progresso, e 39 MB sem barra numa conexão de estrada
 * parece travamento. Lê em pedaços pelo corpo em stream; se o navegador não
 * expuser o stream, cai para o download inteiro de uma vez (a tela mostra o
 * indeterminado).
 */
async function baixar(nome: string, aoProgredir?: AoProgredir): Promise<ArrayBuffer> {
  const resposta = await fetch(urlDoModelo(nome));
  if (!resposta.ok) throw new Error(`modelo_indisponivel:${nome}`);

  const total = Number(resposta.headers.get("content-length") ?? 0);

  if (!resposta.body || !aoProgredir) return resposta.arrayBuffer();

  const leitor = resposta.body.getReader();
  const pedacos: Uint8Array[] = [];
  let baixados = 0;

  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    pedacos.push(value);
    baixados += value.length;
    aoProgredir({ arquivo: nome, baixados, total });
  }

  const inteiro = new Uint8Array(baixados);
  let posicao = 0;
  for (const pedaco of pedacos) {
    inteiro.set(pedaco, posicao);
    posicao += pedaco.length;
  }

  return inteiro.buffer;
}

async function sessao(nome: string, aoProgredir?: AoProgredir): Promise<ort.InferenceSession> {
  const guardada = SESSOES.get(nome);
  if (guardada) return guardada;

  configurarRuntime();

  const criacao = baixar(nome, aoProgredir).then(bytes =>
    ort.InferenceSession.create(bytes, { executionProviders: ["wasm"] })
  );

  SESSOES.set(nome, criacao);

  try {
    return await criacao;
  } catch (erro: unknown) {
    // Sem isto, uma queda de rede deixaria a promessa rejeitada no cache e todo
    // "tentar de novo" falharia na hora, sem nem tocar a rede.
    SESSOES.delete(nome);
    throw erro;
  }
}

/**
 * Deixa os dois modelos prontos para uso.
 *
 * O detector (230 KB) vem primeiro de propósito: se o nome do reconhecedor
 * estiver errado no índice, o erro aparece depois de 230 KB e não depois de
 * 39 MB baixados à toa.
 */
export async function carregarModelos(
  nomes: { detector: string; reconhecedor: string },
  aoProgredir?: AoProgredir
): Promise<ModelosDeRosto> {
  const detector = await sessao(nomes.detector, aoProgredir);
  const reconhecedor = await sessao(nomes.reconhecedor, aoProgredir);
  return { detector, reconhecedor };
}

/** Já está tudo em memória? A tela usa para não prometer espera que não existe. */
export function modelosProntos(nomes: { detector: string; reconhecedor: string }): boolean {
  return SESSOES.has(nomes.detector) && SESSOES.has(nomes.reconhecedor);
}

export { ort };
