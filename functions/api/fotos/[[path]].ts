/// <reference types="@cloudflare/workers-types" />
import { notFound } from "../../_utils/responses";
import {
  GalleryEnv,
  isGalleryPrefix,
  isSafePhotoName,
  isValidYear,
  mediasLiberadas,
} from "../../_utils/photoGallery";

/**
 * GET /api/fotos/<thumbs|previews|medias>/<ano>/<arquivo.jpg>
 *
 * Serve as versões PÚBLICAS direto do R2. Existe porque o balde é privado: sem
 * esta rota seria preciso abrir o balde inteiro para a internet, e aí
 * `originais/` — o arquivo que se vende — sairia junto.
 *
 * `originais/` é 404 aqui, sempre: tem porta própria (com pagamento e link
 * assinado). `medias/` (2048px) é 404 ENQUANTO AQUELE ANO VENDE — liberá-lo
 * durante a venda entregaria de graça o que está no carrinho.
 *
 * Cache de 1 ano, porque o conteúdo de cada chave praticamente nunca muda.
 * Quando ele PRECISA mudar — trocar a marca d'água de um álbum já publicado — o
 * arquivo é regravado por cima e a tela pede a foto com um `?v=` novo
 * (VERSAO_DAS_FOTOS, em src/services/fotos/fotos.service.ts). A query entra na
 * chave do cache: sem ela, o navegador de quem já visitou ficaria meses com a
 * versão antiga.
 */
export const onRequestGet: PagesFunction<GalleryEnv> = async context => {
  const partes = (context.params.path as string[] | undefined) ?? [];
  if (partes.length !== 3) return notFound("not_found");

  const [prefixo, ano, arquivo] = partes;

  if (!isGalleryPrefix(prefixo) || !isValidYear(ano) || !isSafePhotoName(arquivo)) {
    return notFound("not_found");
  }

  if (prefixo === "medias" && !(await mediasLiberadas(context.env, Number(ano)))) {
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
  // Não há motivo para deixar outro site embutir a galeria inteira usando nossa
  // banda e nosso nome.
  headers.set("X-Content-Type-Options", "nosniff");

  return new Response(objeto.body, { headers });
};
