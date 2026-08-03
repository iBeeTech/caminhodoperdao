/// <reference types="@cloudflare/workers-types" />
import { badRequest, json, serverError } from "../../_utils/responses";
import { isValidEmail } from "../../_utils/validation";
import {
  UserAuthEnv,
  createUserJwt,
  getUserByEmail,
  getUserJwtSecret,
  getUserJwtTtlSeconds,
} from "../../_utils/userAuth";
import { constantTimeEquals, hmacHex } from "../../_utils/passwordOtp";

const MAX_CONFIRM_ATTEMPTS = 5;

/**
 * Confirma o e-mail com o código de 6 dígitos e já devolve a sessão, para a
 * pessoa não ter de digitar a senha logo depois de tê-la criado.
 *
 * Todos os modos de falha respondem `invalid_or_expired_code`. Separar "conta
 * não existe" de "código errado" diria a quem tenta se aquele e-mail tem
 * cadastro, desfazendo o cuidado que o signup toma.
 */
export const onRequestPost: PagesFunction<UserAuthEnv> = async context => {
  let body: { email?: string; code?: string } = {};
  try {
    body = await context.request.json();
  } catch {
    return badRequest("invalid_json");
  }

  const email = body.email?.trim().toLowerCase() || "";
  const code = body.code?.trim() || "";
  if (!email || !isValidEmail(email) || !code) return badRequest("missing_fields");

  const secret = getUserJwtSecret(context.env);
  if (!secret) return serverError("user_jwt_secret_missing");

  try {
    const now = Date.now();
    const user = await getUserByEmail(context.env.DB, email);

    if (!user) return badRequest("invalid_or_expired_code");

    // Já confirmado: não é erro, e reenviar a sessão evita travar quem clicou
    // duas vezes ou voltou na tela.
    if (user.email_confirmed_at) {
      return json(200, { token: await issueToken(context.env, user.id, user.email, secret) });
    }

    if (!user.confirm_code_hash || !user.confirm_expires_at || user.confirm_expires_at <= now) {
      return badRequest("invalid_or_expired_code");
    }
    if (user.confirm_attempts >= MAX_CONFIRM_ATTEMPTS) {
      return json(429, { error: "too_many_attempts" });
    }

    // Conta a tentativa ANTES de comparar: contando depois, uma requisição
    // abortada no meio não seria contabilizada, e repetir isso em volume
    // devolveria as tentativas ilimitadas que o teto existe para impedir.
    await context.env.DB.prepare(
      "UPDATE users SET confirm_attempts = confirm_attempts + 1 WHERE id = ?1"
    )
      .bind(user.id)
      .run();

    if (!constantTimeEquals(await hmacHex(code, secret), user.confirm_code_hash)) {
      return badRequest("invalid_or_expired_code");
    }

    // Limpa o código ao confirmar: guardá-lo depois de usado só cria material
    // para vazar, e o uso único depende de ele sumir.
    await context.env.DB.prepare(
      `UPDATE users
          SET email_confirmed_at = ?2, confirm_code_hash = NULL,
              confirm_expires_at = NULL, confirm_attempts = 0, updated_at = ?2
        WHERE id = ?1`
    )
      .bind(user.id, now)
      .run();

    return json(200, { token: await issueToken(context.env, user.id, user.email, secret) });
  } catch (error) {
    console.error("confirm-email falhou:", error);
    return serverError();
  }
};

function issueToken(
  env: UserAuthEnv,
  id: string,
  email: string,
  secret: string
): Promise<string> {
  return createUserJwt(
    { sub: id, email, role: "peregrino" },
    secret,
    getUserJwtTtlSeconds(env)
  );
}
