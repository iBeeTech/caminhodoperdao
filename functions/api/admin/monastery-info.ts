/// <reference types="@cloudflare/workers-types" />
import { AdminAuthEnv, authorizeAdminRequest } from "../../_utils/adminAuth";
import {
  listMonasteryGuests,
  setMonasteryInfoSent,
  setMonasteryInfoFailed,
} from "../../_utils/monasteryInfo";

type MonasteryInfoEnv = AdminAuthEnv & { DB: D1Database };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// GET /api/admin/monastery-info -> inscritos pagos com pernoite (com telefone) e
// status do envio da mensagem de regras do mosteiro.
export const onRequestGet: PagesFunction<MonasteryInfoEnv> = async (context) => {
  const auth = await authorizeAdminRequest(context.request, context.env);
  if (auth instanceof Response) return auth;

  const registrations = await listMonasteryGuests(context.env.DB);

  return new Response(JSON.stringify({ registrations }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...CORS },
  });
};

// POST /api/admin/monastery-info -> marca/desmarca "informado" e/ou "não consegui informar".
// Body: { updates: [{ id, sent?: boolean, infoFailed?: boolean }] }
export const onRequestPost: PagesFunction<MonasteryInfoEnv> = async (context) => {
  const auth = await authorizeAdminRequest(context.request, context.env);
  if (auth instanceof Response) return auth;

  let body: {
    updates?: Array<{ id?: string; sent?: boolean; infoFailed?: boolean }>;
  };
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  const updates = (body.updates ?? []).filter(
    (u): u is { id: string; sent?: boolean; infoFailed?: boolean } =>
      typeof u?.id === "string" &&
      (typeof u?.sent === "boolean" || typeof u?.infoFailed === "boolean")
  );

  let updated = 0;
  for (const item of updates) {
    if (typeof item.sent === "boolean") {
      await setMonasteryInfoSent(context.env.DB, item.id, item.sent);
    }
    if (typeof item.infoFailed === "boolean") {
      await setMonasteryInfoFailed(context.env.DB, item.id, item.infoFailed);
    }
    updated += 1;
  }

  return new Response(JSON.stringify({ updated }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...CORS },
  });
};

export const onRequestOptions: PagesFunction<MonasteryInfoEnv> = async () => {
  return new Response("OK", { status: 200, headers: CORS });
};
