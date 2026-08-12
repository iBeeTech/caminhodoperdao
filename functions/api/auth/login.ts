/// <reference types="@cloudflare/workers-types" />
import { badRequest, json, serverError, unauthorized } from "../../_utils/responses";
import { isValidEmail } from "../../_utils/validation";
import { verifyPassword } from "../../_utils/passwordHash";
import { blockWhenEnrollmentClosed } from "../../_utils/enrollmentGate";
import {
  UserAuthEnv,
  createUserJwt,
  getUserByEmail,
  getUserJwtSecret,
  getUserJwtTtlSeconds,
} from "../../_utils/userAuth";

/**
 * Entrada do peregrino: e-mail + senha (decidido em 03/08/2026 — o código por
 * e-mail serve só para recuperar senha e confirmar cadastro, não para entrar).
 */
export const onRequestPost: PagesFunction<UserAuthEnv> = async context => {
  let body: { email?: string; password?: string } = {};
  try {
    body = await context.request.json();
  } catch {
    return badRequest("invalid_json");
  }

  const email = body.email?.trim().toLowerCase() || "";
  const password = body.password || "";
  if (!email || !isValidEmail(email) || !password) return badRequest("missing_fields");

  const secret = getUserJwtSecret(context.env);
  if (!secret) return serverError("user_jwt_secret_missing");

  // Inscrições encerradas fecham também a porta: a inscrição inteira acontece
  // dentro da conta, então login aberto seria "fechado" só na fachada. Quem
  // está na lista de exceção passa. Ver `_utils/enrollmentGate.ts`.
  //
  // Vem ANTES de conferir a senha de propósito: quem não pode entrar não tem
  // por que ter a senha testada, e a recusa fica igual para todo mundo.
  const closed = await blockWhenEnrollmentClosed(context.env.DB, email);
  if (closed) return closed;

  try {
    const user = await getUserByEmail(context.env.DB, email);

    // Mesma resposta para conta inexistente e senha errada. Distinguir as duas
    // faria a tela de entrada virar um verificador de quem tem cadastro.
    if (!user || !(await verifyPassword(user.password_hash, password))) {
      return unauthorized("invalid_credentials");
    }

    // Cadastro começado e nunca confirmado. Erro próprio de propósito: aqui a
    // pessoa JÁ PROVOU a senha, então dizer que falta confirmar não entrega
    // nada a quem está sondando de fora — e sem isso ela ficaria presa numa
    // credencial correta que não abre nada, sem entender o motivo.
    if (!user.email_confirmed_at) {
      return json(403, { error: "email_not_confirmed", email: user.email });
    }

    return json(200, {
      token: await createUserJwt(
        { sub: user.id, email: user.email, role: "peregrino" },
        secret,
        getUserJwtTtlSeconds(context.env)
      ),
      email: user.email,
    });
  } catch (error) {
    console.error("login do peregrino falhou:", error);
    return serverError();
  }
};
