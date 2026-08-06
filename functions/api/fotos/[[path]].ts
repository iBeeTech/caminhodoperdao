/// <reference types="@cloudflare/workers-types" />
import { notFound } from "../../_utils/responses";
import { isGalleryPrefix, isSafePhotoName, isValidYear } from "../../_utils/photoGallery";

interface Env {
  PHOTOS: R2Bucket;
}

/**
 * GET /api/fotos/<thumbs|previews>/<ano>/<arquivo.jpg>
 *
 * Serve as versões PÚBLICAS (com a marca gravada) direto do R2. Existe porque o
 * balde é privado: sem esta rota seria preciso abrir o balde inteiro para a
 * internet, e aí `originais/` — o arquivo que se vende — sairia junto.
 *
 * Só `thumbs/` e `previews/` passam. Qualquer outro prefixo é 404, inclusive
 * `originais/`, que tem porta própria (com pagamento e link assinado).
 *
 * Cache de 1 ano: o conteúdo de cada chave nunca muda. Se a marca d'água mudar,
 * o certo é gravar em outro prefixo, não reescrever por cima.
 */
export const onRequestGet: PagesFunction<Env> = async context => {
  const partes = (context.params.path as string[] | undefined) ?? [];
  if (partes.length !== 3) return notFound("not_found");

  const [prefixo, ano, arquivo] = partes;

  if (!isGalleryPrefix(prefixo) || !isValidYear(ano) || !isSafePhotoName(arquivo)) {
    return notFound("not_found");
  }

  const chave = `${prefixo}/${ano}/${arquivo}`;
  const objeto = await context.env.PHOTOS.get(chave);
  if (!objeto) return notFound("not_found");

  const headers = new Headers();
  objeto.writeHttpMetadata(headers);
  headers.set("Content-Type", objeto.httpMetadata?.contentType || "image/jpeg");
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("ETag", objeto.httpEtag);
  // A foto pública já vai marcada, mas não há motivo para deixar outro site
  // embutir a galeria inteira usando nossa banda e nosso nome.
  headers.set("X-Content-Type-Options", "nosniff");

  return new Response(objeto.body, { headers });
};
