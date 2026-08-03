/// <reference types="@cloudflare/workers-types" />
import { badRequest, json } from "../../_utils/responses";
import {
  AdminAuthEnv,
  getAdminByEmail,
  getJwtSecret,
  hashPassword,
  updateAdminPassword,
} from "../../_utils/adminAuth";
import {
  closeResetRequests,
  constantTimeEquals,
  getChallenge,
  hmacHex,
  markUsed,
} from "../../_utils/passwordOtp";

/** Piso de tamanho da senha nova. O fluxo antigo não tinha nenhum. */
const MIN_PASSWORD_LENGTH = 8;

/**
 * Consome a autorização emitida por verify-otp e grava a senha escolhida pela
 * própria pessoa. Nenhuma senha utilizável trafega por e-mail ou WhatsApp em
 * momento algum deste fluxo — foi esse o ponto da mudança.
 */
export const onRequestPost: PagesFunction<AdminAuthEnv> = async context => {
  let body: { challengeId?: string; resetToken?: string; newPassword?: string } = {};
  try {
    body = (await context.request.json()) as {
      challengeId?: string;
      resetToken?: string;
      newPassword?: string;
    };
  } catch {
    return badRequest("invalid_json");
  }

  const challengeId = body.challengeId?.trim() || "";
  const resetToken = body.resetToken?.trim() || "";
  const newPassword = body.newPassword || "";

  if (!challengeId || !resetToken || !newPassword) {
    return badRequest("missing_fields");
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return badRequest("password_too_short");
  }

  const secret = getJwtSecret(context.env);
  if (!secret) {
    console.error("reset-password: ADMIN_JWT_SECRET ausente.");
    return json(500, { error: "admin_jwt_secret_missing" });
  }

  const now = Date.now();
  const challenge = await getChallenge(context.env.DB, challengeId);

  if (
    !challenge ||
    challenge.used_at ||
    !challenge.reset_token_hash ||
    !challenge.reset_expires_at ||
    challenge.reset_expires_at <= now
  ) {
    return badRequest("invalid_or_expired_token");
  }

  const candidate = await hmacHex(resetToken, secret);
  if (!constantTimeEquals(candidate, challenge.reset_token_hash)) {
    return badRequest("invalid_or_expired_token");
  }

  // A conta pode ter sido removida entre o pedido e a troca.
  const admin = await getAdminByEmail(context.env.DB, challenge.email);
  if (!admin) {
    await markUsed(context.env.DB, challengeId, now);
    return badRequest("invalid_or_expired_token");
  }

  const passwordHash = await hashPassword(newPassword, context.env.ADMIN_PASSWORD_PEPPER);
  // updateAdminPassword também zera must_change_password: quem chegou aqui
  // escolheu a própria senha, então não há troca pendente a obrigar.
  await updateAdminPassword(context.env.DB, challenge.email, passwordHash);

  // Queimar o desafio é o que garante o uso único.
  await markUsed(context.env.DB, challengeId, now);
  await closeResetRequests(context.env.DB, challenge.email, now);

  // LIMITAÇÃO CONHECIDA: o JWT é HS256 sem identificador nem versão, então não
  // existe como revogar tokens já emitidos. Se alguém tinha a senha antiga e
  // estava logado, a sessão dele sobrevive até expirar (ADMIN_JWT_TTL_SECONDS,
  // hoje 12h). Resolver exige uma coluna de versão de token em admin_users,
  // conferida em authorizeAdminRequest — fora do escopo desta mudança.
  return json(200, { success: true });
};
