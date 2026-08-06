/// <reference types="@cloudflare/workers-types" />
import { badRequest, forbidden, notFound } from "../../_utils/responses";
import { isSafePhotoName, originalKey } from "../../_utils/photoGallery";
import { PhotoOrderEnv, pedidoPorToken, podeBaixar } from "../../_utils/photoOrders";

/**
 * GET /api/fotos/download?t=<token do pedido>&f=<arquivo.jpg>
 *
 * Entrega o arquivo EM ALTA, sem marca d'água. É a única porta para o prefixo
 * `originais/`, e ela exige três coisas ao mesmo tempo:
 *
 *   1. o segredo do pedido (que só quem comprou recebeu);
 *   2. pedido PAGO e dentro do prazo;
 *   3. a foto pedida estar NAQUELE pedido.
 *
 * ⚠️ A terceira importa tanto quanto as outras: sem ela, quem comprasse uma
 * foto teria em mãos um token válido e baixaria as 2882 trocando o nome do
 * arquivo na URL.
 */
export const onRequestGet: PagesFunction<PhotoOrderEnv> = async context => {
  const url = new URL(context.request.url);
  const token = url.searchParams.get("t") ?? "";
  const arquivo = (url.searchParams.get("f") ?? "").trim();

  if (!isSafePhotoName(arquivo)) return badRequest("invalid_photo");

  const pedido = await pedidoPorToken(context.env.DB, token);
  if (!pedido) return notFound("order_not_found");

  if (!podeBaixar(pedido)) {
    // Mesma resposta para "ainda não pagou" e "prazo venceu": a tela do pedido
    // já mostra qual dos dois é, e aqui a diferença não ajuda ninguém.
    return forbidden("download_not_available");
  }

  const pertence = await context.env.DB.prepare(
    "SELECT 1 FROM photo_order_item WHERE order_id = ?1 AND photo_name = ?2"
  )
    .bind(pedido.id, arquivo)
    .first();

  if (!pertence) return forbidden("photo_not_in_order");

  const objeto = await context.env.PHOTOS.get(originalKey(pedido.event_year, arquivo));
  if (!objeto) return notFound("photo_not_found");

  const headers = new Headers();
  headers.set("Content-Type", objeto.httpMetadata?.contentType || "image/jpeg");
  // attachment: o navegador salva o arquivo em vez de abrir a foto numa aba, que
  // é o que a pessoa espera de algo que ela acabou de comprar.
  headers.set("Content-Disposition", `attachment; filename="${arquivo}"`);
  headers.set("Content-Length", String(objeto.size));
  // Nada de cache compartilhado: este endereço carrega um segredo na URL.
  headers.set("Cache-Control", "private, no-store");

  return new Response(objeto.body, { headers });
};
