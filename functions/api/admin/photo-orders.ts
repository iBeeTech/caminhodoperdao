/// <reference types="@cloudflare/workers-types" />
import { AdminAuthEnv, authorizeAdminRequest } from "../../_utils/adminAuth";
import { badRequest, json, notFound, serverError } from "../../_utils/responses";
import {
  diasDeDownload,
  gerarTokenDoPedido,
  hashTokenDoPedido,
} from "../../_utils/photoOrders";

type Env = AdminAuthEnv & { DB: D1Database; SITE_URL?: string; PHOTO_DOWNLOAD_DAYS?: string };

/** Quantos pedidos a tela lista de uma vez. */
const LIMITE_PADRAO = 200;

interface PedidoRow {
  id: string;
  customer_name: string;
  email: string;
  event_year: number;
  photo_count: number;
  amount_cents: number;
  status: string;
  created_at: string;
  paid_at: string | null;
  downloads_expire_at: string | null;
  token: string | null;
  link_created_at: string | null;
  link_created_by: string | null;
}

function siteBase(env: { SITE_URL?: string }, request: Request): string {
  return (env.SITE_URL || new URL(request.url).origin).replace(/\/$/, "");
}

function urlDoPedido(base: string, token: string): string {
  return `${base}/gallery/pedido?t=${encodeURIComponent(token)}`;
}

/**
 * GET /api/admin/photo-orders — pedidos de fotos e os links já reemitidos.
 *
 * `?q=` filtra por e-mail ou nome, que é como a organização chega aqui: alguém
 * escreve no WhatsApp dizendo que não consegue abrir o link.
 */
export const onRequestGet: PagesFunction<Env> = async context => {
  const auth = await authorizeAdminRequest(context.request, context.env);
  if (auth instanceof Response) return auth;

  const busca = (new URL(context.request.url).searchParams.get("q") ?? "").trim().toLowerCase();
  const filtro = busca ? `%${busca}%` : null;

  const { results } = await context.env.DB.prepare(
    `SELECT o.id, o.customer_name, o.email, o.event_year, o.photo_count, o.amount_cents,
            o.status, o.created_at, o.paid_at, o.downloads_expire_at,
            l.token AS token, l.created_at AS link_created_at, l.created_by AS link_created_by
       FROM photo_order o
       LEFT JOIN photo_order_link l ON l.order_id = o.id
      WHERE ?1 IS NULL
         OR lower(o.email) LIKE ?1
         OR lower(o.customer_name) LIKE ?1
      ORDER BY datetime(o.created_at) DESC
      LIMIT ?2`
  )
    .bind(filtro, LIMITE_PADRAO)
    .all<PedidoRow>();

  const base = siteBase(context.env, context.request);

  return json(200, {
    pedidos: (results ?? []).map(linha => ({
      id: linha.id,
      nome: linha.customer_name,
      email: linha.email,
      ano: linha.event_year,
      quantidade: linha.photo_count,
      valor_total_centavos: linha.amount_cents,
      status: linha.status,
      criado_em: linha.created_at,
      pago_em: linha.paid_at,
      downloads_expiram_em: linha.downloads_expire_at,
      // Só existe para pedido que já passou por reemissão: o token do e-mail
      // original nunca foi guardado em texto.
      url: linha.token ? urlDoPedido(base, linha.token) : null,
      url_gerada_em: linha.link_created_at,
      url_gerada_por: linha.link_created_by,
    })),
    limite: LIMITE_PADRAO,
  });
};

/**
 * POST /api/admin/photo-orders — reemite o link de um pedido.
 *
 * Troca o segredo do pedido por um novo e guarda a URL para a organização poder
 * reenviar. ⚠️ O link antigo para de funcionar na hora (access_token_hash é
 * único e é ele que autentica): é reemissão, não uma segunda chave.
 *
 * Em pedido pago, o prazo de download volta a contar a partir de agora — quem
 * pede o link de novo normalmente pede porque o prazo passou.
 */
export const onRequestPost: PagesFunction<Env> = async context => {
  const auth = await authorizeAdminRequest(context.request, context.env);
  if (auth instanceof Response) return auth;

  let corpo: { order_id?: unknown };
  try {
    corpo = await context.request.json();
  } catch {
    return badRequest("invalid_json");
  }

  const orderId = String(corpo.order_id ?? "").trim();
  if (!orderId) return badRequest("order_id_required");

  const pedido = await context.env.DB.prepare(
    "SELECT id, status FROM photo_order WHERE id = ?1"
  )
    .bind(orderId)
    .first<{ id: string; status: string }>();

  if (!pedido) return notFound("order_not_found");

  const token = gerarTokenDoPedido();
  const agora = new Date();
  // Prazo novo só para pedido pago: em PENDING o prazo nem começou, e em
  // CANCELED não há nada para baixar.
  const vencimento =
    pedido.status === "PAID"
      ? new Date(agora.getTime() + diasDeDownload(context.env) * 24 * 60 * 60 * 1000).toISOString()
      : null;

  try {
    await context.env.DB.batch([
      context.env.DB.prepare(
        `UPDATE photo_order
            SET access_token_hash = ?1,
                updated_at = ?2,
                downloads_expire_at = COALESCE(?3, downloads_expire_at)
          WHERE id = ?4`
      ).bind(await hashTokenDoPedido(token), agora.toISOString(), vencimento, orderId),
      // O pedido pode já ter um link reemitido antes; o novo substitui, porque o
      // anterior deixou de abrir no UPDATE acima.
      context.env.DB.prepare(
        `INSERT INTO photo_order_link (order_id, token, created_at, created_by)
         VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT(order_id) DO UPDATE
            SET token = excluded.token,
                created_at = excluded.created_at,
                created_by = excluded.created_by`
      ).bind(orderId, token, agora.toISOString(), auth.sub),
    ]);
  } catch (erro: unknown) {
    console.error("Falha ao reemitir link do pedido de fotos:", erro);
    return serverError("link_reissue_failed");
  }

  return json(200, {
    order_id: orderId,
    url: urlDoPedido(siteBase(context.env, context.request), token),
    downloads_expiram_em: vencimento,
  });
};
