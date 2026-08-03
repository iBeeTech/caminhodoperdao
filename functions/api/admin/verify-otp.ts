/// <reference types="@cloudflare/workers-types" />
import { badRequest, json } from "../../_utils/responses";
import { AdminAuthEnv, getJwtSecret } from "../../_utils/adminAuth";
import {
  MAX_OTP_ATTEMPTS,
  RESET_TTL_MS,
  constantTimeEquals,
  generateResetToken,
  getChallenge,
  hmacHex,
  markVerified,
  registerAttempt,
} from "../../_utils/passwordOtp";

/**
 * Valida o código de 6 dígitos e devolve uma autorização de curta duração para
 * trocar a senha.
 *
 * O código NÃO é credencial: sozinho ele não entra em lugar nenhum. Trocá-lo
 * por um `resetToken` separado evita que ele valha como chave permanente caso
 * fique parado na caixa de entrada da pessoa.
 *
 * Todos os modos de falha respondem `invalid_or_expired_code`. Distinguir
 * "desafio inexistente" de "código errado" diria a quem tenta se o challengeId
 * era real — e é justamente o que o id descartável de forgot-password disfarça.
 */
export const onRequestPost: PagesFunction<AdminAuthEnv> = async context => {
  let body: { challengeId?: string; code?: string } = {};
  try {
    body = (await context.request.json()) as { challengeId?: string; code?: string };
  } catch {
    return badRequest("invalid_json");
  }

  const challengeId = body.challengeId?.trim() || "";
  const code = body.code?.trim() || "";

  if (!challengeId || !code) {
    return badRequest("missing_fields");
  }

  const secret = getJwtSecret(context.env);
  if (!secret) {
    console.error("verify-otp: ADMIN_JWT_SECRET ausente.");
    return json(500, { error: "admin_jwt_secret_missing" });
  }

  const now = Date.now();
  const challenge = await getChallenge(context.env.DB, challengeId);

  if (!challenge || challenge.used_at || challenge.expires_at <= now) {
    return badRequest("invalid_or_expired_code");
  }

  if (challenge.attempts >= MAX_OTP_ATTEMPTS) {
    return json(429, { error: "too_many_attempts" });
  }

  // Conta a tentativa ANTES de comparar. Se a contagem viesse depois, uma
  // requisição interrompida no meio não seria contabilizada, e repetir isso em
  // volume devolveria as tentativas ilimitadas que o teto existe para impedir.
  await registerAttempt(context.env.DB, challengeId);

  const candidate = await hmacHex(code, secret);
  if (!constantTimeEquals(candidate, challenge.code_hash)) {
    return badRequest("invalid_or_expired_code");
  }

  const resetToken = generateResetToken();
  const resetTokenHash = await hmacHex(resetToken, secret);
  await markVerified(context.env.DB, { id: challengeId, resetTokenHash, now });

  return json(200, {
    resetToken,
    expiresInSeconds: Math.floor(RESET_TTL_MS / 1000),
  });
};
