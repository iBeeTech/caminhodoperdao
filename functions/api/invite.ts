/// <reference types="@cloudflare/workers-types" />
import { json } from "../_utils/responses";
import { evaluateInvite, normalizeInviteCode } from "../_utils/inviteCodes";

interface Env {
  DB: D1Database;
}

// GET /api/invite?code=ABC123 -> valida um código de convite (portão da tela /convite).
// Resposta enxuta para não vazar o estado interno dos códigos.
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const code = normalizeInviteCode(url.searchParams.get("code"));
  if (!code) {
    return json(200, { valid: false });
  }
  const evaluation = await evaluateInvite(context.env.DB, code);
  return json(200, { valid: evaluation.openable });
};
