/// <reference types="@cloudflare/workers-types" />
import { notFound } from "../../../_utils/responses";
import { isModelName, modelKey } from "../../../_utils/photoFaces";

interface Env {
  PHOTOS: R2Bucket;
}

/**
 * GET /api/fotos/modelo/<arquivo.onnx>
 *
 * Entrega ao navegador do peregrino os modelos que geram a impressao digital da
 * selfie. Sao os MESMOS arquivos que indexaram o album (ver scripts/fotos_faces.py):
 * o vetor da selfie so se compara com o indice se sair do mesmo modelo.
 *
 * Por que passar pelo R2 e nao pelo build do site:
 *
 *   - sao 39 MB. Publicar no repositorio, que e publico, incharia todo clone.
 *   - o Cloudflare Pages tem teto de 25 MB por arquivo no build.
 *   - trocar de modelo passa a ser subir um arquivo, sem publicar o site de novo.
 *
 * NAO ha segredo aqui: YuNet e MIT, SFace e Apache 2.0, os dois sao publicos no
 * OpenCV Zoo. O que e privado no balde e o INDICE (faces/<ano>.bin), que e o
 * banco de rostos de quem apareceu no evento — esse nunca sai por rota nenhuma.
 *
 * ⚠️ Cache de um ano, imutavel. O nome do arquivo E a versao: modelo novo entra
 * com nome novo. Regravar o mesmo nome com outro conteudo deixaria metade dos
 * celulares com o antigo em cache, gerando vetores que nao casam com o indice —
 * sem erro nenhum aparecer.
 */
export const onRequestGet: PagesFunction<Env> = async context => {
  const nome = String(context.params.nome ?? "");
  if (!isModelName(nome)) return notFound("not_found");

  const objeto = await context.env.PHOTOS.get(modelKey(nome));
  if (!objeto) return notFound("model_not_found");

  const headers = new Headers();
  headers.set("Content-Type", "application/octet-stream");
  headers.set("Content-Length", String(objeto.size));
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("ETag", objeto.httpEtag);
  headers.set("X-Content-Type-Options", "nosniff");

  return new Response(objeto.body, { headers });
};
