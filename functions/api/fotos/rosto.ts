/// <reference types="@cloudflare/workers-types" />
import { badRequest, json, notFound, serverError } from "../../_utils/responses";
import { isValidYear } from "../../_utils/photoGallery";
import {
  DETECTOR_PADRAO,
  FaceIndex,
  FaceIndexMeta,
  MIN_LADO_ROSTO_SELFIE,
  buscarRostos,
  faceIndexKey,
  indiceConsistente,
  limiarDeBusca,
  modelKey,
  normalizarVetorDaBusca,
  selfieAceitavel,
} from "../../_utils/photoFaces";

interface Env {
  PHOTOS: R2Bucket;
  PHOTO_FACE_THRESHOLD?: string;
}

/**
 * Guarda o indice ja lido, entre requisicoes do mesmo isolate.
 *
 * Sao ~6 MB por ano. Puxar isso do R2 a cada busca poria um segundo em toda
 * consulta, e o peregrino vai buscar varias vezes ate acertar a selfie. O
 * primeiro pedido paga o download; os seguintes respondem da memoria.
 *
 * Cloudflare pode derrubar o isolate quando quiser — o Map e otimizacao, nunca
 * fonte da verdade. Se sumir, o proximo pedido le do R2 de novo.
 */
const INDICES = new Map<number, FaceIndex>();

async function carregarIndice(env: Env, ano: number): Promise<FaceIndex | null> {
  const guardado = INDICES.get(ano);
  if (guardado) return guardado;

  const [objetoJson, objetoBin] = await Promise.all([
    env.PHOTOS.get(faceIndexKey(ano, "json")),
    env.PHOTOS.get(faceIndexKey(ano, "bin")),
  ]);

  if (!objetoJson || !objetoBin) return null;

  const meta = await objetoJson.json<FaceIndexMeta>();
  const vetores = new Int8Array(await objetoBin.arrayBuffer());

  if (!indiceConsistente(meta, vetores.length)) {
    console.error(
      `Indice de rostos ${ano} inconsistente: ${vetores.length} bytes para ` +
        `${meta.rostos?.length} rostos de ${meta.dim} dimensoes.`
    );
    return null;
  }

  const indice = { meta, vetores };
  INDICES.set(ano, indice);
  return indice;
}

/**
 * POST /api/fotos/rosto — "em quais fotos eu apareco?"
 *
 * Corpo: { ano, vetor: number[], rosto_px: number }
 *
 * Recebe a impressao digital da selfie (gerada NO NAVEGADOR, com o mesmo modelo
 * que indexou o album) e devolve as fotos em que aquele rosto aparece.
 *
 * A selfie em si nunca chega aqui. O que trafega e uma lista de numeros da qual
 * nao se remonta a imagem - por isso `rosto_px` vem junto: sem a imagem, o
 * servidor nao teria como saber que a foto estava ruim.
 */
export const onRequestPost: PagesFunction<Env> = async context => {
  let corpo: Record<string, unknown>;
  try {
    corpo = await context.request.json();
  } catch {
    return badRequest("invalid_json");
  }

  const ano = String(corpo.ano ?? "");
  if (!isValidYear(ano)) return badRequest("invalid_year");

  // Conferido ANTES de carregar o indice: recusar cedo evita puxar 2,4 MB do R2
  // para uma busca que ja se sabe que vai devolver estranhos.
  if (!selfieAceitavel(corpo.rosto_px)) {
    return json(422, {
      error: "face_too_small",
      minimo_px: MIN_LADO_ROSTO_SELFIE,
      message: "O rosto ficou pequeno demais na foto. Chegue mais perto e tente de novo.",
    });
  }

  let indice: FaceIndex | null;
  try {
    indice = await carregarIndice(context.env, Number(ano));
  } catch (erro: unknown) {
    console.error("Falha ao carregar o indice de rostos:", erro);
    return serverError("face_index_unavailable");
  }

  // Album sem indice nao e erro do peregrino: e ano que ainda nao foi indexado.
  // A tela usa isto para nao oferecer a busca por rosto naquele album.
  if (!indice) return notFound("face_index_not_found");

  const selfie = normalizarVetorDaBusca(corpo.vetor, indice.meta.dim);
  if (!selfie) return badRequest("invalid_vector");

  const limiar = limiarDeBusca(context.env);
  const encontradas = buscarRostos(indice, selfie, limiar);

  return json(200, {
    ano: Number(ano),
    limiar,
    modelo: indice.meta.modelo,
    total: encontradas.length,
    fotos: encontradas.map(item => ({
      nome: item.n,
      score: item.score,
      previa: `/api/fotos/thumbs/${ano}/${item.n}`,
    })),
  });
};

/**
 * GET /api/fotos/rosto?ano=2026 — o album tem busca por rosto, e com quais modelos?
 *
 * A tela pergunta antes de mostrar o botao e antes de baixar os 39 MB de modelo.
 * Oferecer a busca num album sem indice faria a pessoa esperar o download para
 * receber "nao encontrei nada".
 *
 * A resposta traz os NOMES DOS MODELOS que indexaram este ano, e a tela baixa
 * exatamente esses. E a trava do erro mais caro desta funcionalidade: comparar
 * vetor de um modelo com indice de outro nao da erro nenhum, so faz a busca achar
 * quase ninguem. Com o nome vindo do proprio indice, os dois lados nao tem como
 * divergir — reindexar com outro modelo passa a mudar a tela sozinho.
 */
export const onRequestGet: PagesFunction<Env> = async context => {
  const ano = new URL(context.request.url).searchParams.get("ano") ?? "";
  if (!isValidYear(ano)) return badRequest("invalid_year");

  let indice: FaceIndex | null;
  try {
    indice = await carregarIndice(context.env, Number(ano));
  } catch (erro: unknown) {
    console.error("Falha ao carregar o indice de rostos:", erro);
    return json(200, { ano: Number(ano), disponivel: false });
  }

  if (!indice) return json(200, { ano: Number(ano), disponivel: false });

  // O tamanho do reconhecedor vai junto para a tela poder avisar "isto vai
  // baixar X MB" ANTES de comecar. O numero sai do arquivo que esta la, e nao de
  // uma constante na tela: trocar o modelo cheio pelo comprimido muda o aviso
  // sozinho, sem ninguem lembrar de mexer no texto.
  const arquivoDoModelo = await context.env.PHOTOS.head(modelKey(indice.meta.modelo));

  return json(200, {
    ano: Number(ano),
    disponivel: true,
    modelo: indice.meta.modelo,
    modelo_bytes: arquivoDoModelo?.size ?? 0,
    detector: indice.meta.detector ?? DETECTOR_PADRAO,
    dim: indice.meta.dim,
    limiar: limiarDeBusca(context.env),
    min_rosto_px: MIN_LADO_ROSTO_SELFIE,
    total_rostos: indice.meta.total_rostos,
    total_fotos: indice.meta.total_fotos,
  });
};
