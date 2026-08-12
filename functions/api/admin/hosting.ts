/// <reference types="@cloudflare/workers-types" />
import { AdminAuthEnv, authorizeAdminRequest } from "../../_utils/adminAuth";
import { EventYearEnv, getEventYear } from "../../_utils/eventYear";
import { listHostingOffers, toHostingView } from "../../_utils/hosting";

type Env = AdminAuthEnv & EventYearEnv & { DB: D1Database };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/**
 * GET /api/admin/hosting — quem se ofereceu para acolher nesta edição.
 *
 * Só leitura. Quem cria, edita e cancela é a própria pessoa, no
 * `/api/me/hosting`: a oferta é um compromisso dela, e admin mexendo na oferta
 * alheia produziria exatamente o combinado que ninguém fez.
 *
 * `?year=` só para consultar edições passadas; sem ele, vale o ano corrente.
 */
export const onRequestGet: PagesFunction<Env> = async context => {
  const auth = await authorizeAdminRequest(context.request, context.env);
  if (auth instanceof Response) return auth;

  const requestedYear = Number(new URL(context.request.url).searchParams.get("year"));
  const eventYear = Number.isInteger(requestedYear) && requestedYear > 2000
    ? requestedYear
    : getEventYear(context.env);

  const rows = await listHostingOffers(context.env.DB, eventYear);

  const offers = rows.map(row => ({
    ...toHostingView(row),
    hostName: row.host_name ?? "",
    hostEmail: row.host_email ?? "",
    hostPhone: row.host_phone ?? "",
    createdAt: row.created_at,
  }));

  // Total de vagas ATIVAS — é o número que a organização precisa para saber
  // quantos peregrinos de fora ela consegue acolher.
  const activeSpots = offers
    .filter(offer => offer.status === "ATIVO")
    .reduce((total, offer) => total + offer.spots, 0);

  return new Response(JSON.stringify({ eventYear, offers, activeSpots }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...CORS },
  });
};

export const onRequestOptions: PagesFunction<Env> = async () =>
  new Response("OK", { status: 200, headers: CORS });
