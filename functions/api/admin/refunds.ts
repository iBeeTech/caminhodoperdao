/// <reference types="@cloudflare/workers-types" />
import { AdminAuthEnv, authorizeAdminRequest } from "../../_utils/adminAuth";
import { listRefundRequests, updateRefundStatuses, RefundStatus } from "../../_utils/refunds";

type RefundsEnv = AdminAuthEnv & { DB: D1Database };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// GET /api/admin/refunds -> lista os estornos a tratar (acesso a qualquer admin logado).
export const onRequestGet: PagesFunction<RefundsEnv> = async (context) => {
  const auth = await authorizeAdminRequest(context.request, context.env);
  if (auth instanceof Response) return auth;

  const refunds = await listRefundRequests(context.env.DB);
  return new Response(JSON.stringify({ refunds }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...CORS },
  });
};

// POST /api/admin/refunds -> salva os status escolhidos no dropdown.
// Body: { updates: [{ id, refund_status: "PENDENTE" | "FEITO" | "CANCELADO" }] }
export const onRequestPost: PagesFunction<RefundsEnv> = async (context) => {
  const auth = await authorizeAdminRequest(context.request, context.env);
  if (auth instanceof Response) return auth;

  let body: { updates?: Array<{ id?: string; refund_status?: string }> };
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  const updates = (body.updates ?? [])
    .filter((u): u is { id: string; refund_status: RefundStatus } =>
      typeof u?.id === "string" &&
      (u.refund_status === "PENDENTE" || u.refund_status === "FEITO" || u.refund_status === "CANCELADO")
    )
    .map((u) => ({ id: u.id, refund_status: u.refund_status }));

  const updated = await updateRefundStatuses(context.env.DB, updates);
  return new Response(JSON.stringify({ updated }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...CORS },
  });
};

export const onRequestOptions: PagesFunction<RefundsEnv> = async () => {
  return new Response("OK", { status: 200, headers: CORS });
};
