/// <reference types="@cloudflare/workers-types" />
import { AdminAuthEnv, authorizeAdminRequest } from "../../_utils/adminAuth";
import {
  createInviteCodes,
  listInviteCodes,
  revokeInviteCode,
} from "../../_utils/inviteCodes";

type Env = AdminAuthEnv & { DB: D1Database };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

// GET /api/admin/invite-codes -> lista todos os códigos com status (disponível/pendente/
// usado/revogado) e o nome de quem usou.
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const auth = await authorizeAdminRequest(context.request, context.env);
  if (auth instanceof Response) return auth;

  const codes = await listInviteCodes(context.env.DB);
  return json({ codes });
};

// POST /api/admin/invite-codes -> cria ou revoga.
//   { action: "create", count?: number, note?: string }  -> gera N códigos.
//   { action: "revoke", code: string }                    -> revoga um código não usado.
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const auth = await authorizeAdminRequest(context.request, context.env);
  if (auth instanceof Response) return auth;

  let body: { action?: unknown; count?: unknown; note?: unknown; code?: unknown };
  try {
    body = await context.request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  if (body.action === "create") {
    const count = typeof body.count === "number" ? body.count : 1;
    const note = typeof body.note === "string" ? body.note : null;
    const created = await createInviteCodes(context.env.DB, count, note);
    return json({ created });
  }

  if (body.action === "revoke") {
    if (typeof body.code !== "string" || !body.code.trim()) {
      return json({ error: "invalid_input" }, 400);
    }
    const revoked = await revokeInviteCode(context.env.DB, body.code);
    if (!revoked) {
      return json({ error: "cannot_revoke" }, 409);
    }
    return json({ ok: true });
  }

  return json({ error: "invalid_action" }, 400);
};

export const onRequestOptions: PagesFunction<Env> = async () =>
  new Response("OK", { status: 200, headers: CORS });
