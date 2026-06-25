/// <reference types="@cloudflare/workers-types" />
import { AdminAuthEnv, authorizeAdminRequest } from "../../_utils/adminAuth";
import {
  listPaidForGroupInvite,
  setGroupInvited,
  setGroupInviteFailed,
} from "../../_utils/groupInvite";

type GroupInviteEnv = AdminAuthEnv & { DB: D1Database };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// GET /api/admin/group-invite -> inscritos pagos (com telefone) e status do convite ao grupo.
export const onRequestGet: PagesFunction<GroupInviteEnv> = async (context) => {
  const auth = await authorizeAdminRequest(context.request, context.env);
  if (auth instanceof Response) return auth;

  const registrations = await listPaidForGroupInvite(context.env.DB);

  return new Response(JSON.stringify({ registrations }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...CORS },
  });
};

// POST /api/admin/group-invite -> marca/desmarca "convidado" e/ou "não consegui convidar".
// Body: { updates: [{ id, invited?: boolean, inviteFailed?: boolean }] }
export const onRequestPost: PagesFunction<GroupInviteEnv> = async (context) => {
  const auth = await authorizeAdminRequest(context.request, context.env);
  if (auth instanceof Response) return auth;

  let body: {
    updates?: Array<{ id?: string; invited?: boolean; inviteFailed?: boolean }>;
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
    (u): u is { id: string; invited?: boolean; inviteFailed?: boolean } =>
      typeof u?.id === "string" &&
      (typeof u?.invited === "boolean" || typeof u?.inviteFailed === "boolean")
  );

  let updated = 0;
  for (const item of updates) {
    if (typeof item.invited === "boolean") {
      await setGroupInvited(context.env.DB, item.id, item.invited);
    }
    if (typeof item.inviteFailed === "boolean") {
      await setGroupInviteFailed(context.env.DB, item.id, item.inviteFailed);
    }
    updated += 1;
  }

  return new Response(JSON.stringify({ updated }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...CORS },
  });
};

export const onRequestOptions: PagesFunction<GroupInviteEnv> = async () => {
  return new Response("OK", { status: 200, headers: CORS });
};
