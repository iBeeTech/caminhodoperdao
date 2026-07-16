/// <reference types="@cloudflare/workers-types" />
import { json, serverError, unauthorized } from "../../_utils/responses";
import { AdminAuthEnv, getJwtSecret, verifyJwt } from "../../_utils/adminAuth";

/**
 * Valida a sessão. Diferente dos demais endpoints, NÃO usa
 * authorizeAdminRequest: aquele recusa o token de quem deve trocar a senha, e
 * aqui isso expulsaria o usuário da própria tela de troca ao recarregar.
 * Este endpoint só diz quem é e se a troca está pendente — não entrega dado.
 */
export const onRequestGet: PagesFunction<AdminAuthEnv> = async context => {
  const secret = getJwtSecret(context.env);
  if (!secret) {
    return serverError("admin_jwt_secret_missing");
  }

  const authHeader = context.request.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return unauthorized("missing_token");
  }

  const payload = await verifyJwt(token, secret);
  if (!payload) {
    return unauthorized("invalid_token");
  }

  return json(200, {
    valid: true,
    email: payload.sub,
    exp: payload.exp,
    mustChangePassword: payload.mustChange === true,
  });
};
