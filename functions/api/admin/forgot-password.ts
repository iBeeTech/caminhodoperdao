/// <reference types="@cloudflare/workers-types" />
import { badRequest, json } from "../../_utils/responses";
import { isValidEmail } from "../../_utils/validation";
import { AdminAuthEnv } from "../../_utils/adminAuth";

/** Janela para não encher a fila com cliques repetidos do mesmo e-mail. */
const DEDUPE_WINDOW_MS = 15 * 60 * 1000;

/**
 * Endpoint PÚBLICO de "Esqueci minha senha". Só registra o pedido: não
 * redefine senha nem envia nada. Quem redefine é o super admin, autenticado,
 * gerando uma senha temporária aleatória (reset-requests.ts).
 *
 * Redefinir a senha aqui — mesmo para um valor "padrão" — daria a qualquer
 * pessoa da internet o acesso de qualquer admin, bastando saber o e-mail.
 *
 * A resposta é sempre a mesma, exista o e-mail ou não: caso contrário o
 * formulário viraria um detector de quais e-mails são admins.
 */
export const onRequestPost: PagesFunction<AdminAuthEnv> = async context => {
  let body: { email?: string } = {};
  try {
    body = (await context.request.json()) as { email?: string };
  } catch {
    return badRequest("invalid_json");
  }

  const email = body.email?.trim().toLowerCase() || "";
  if (!email || !isValidEmail(email)) {
    return badRequest("invalid_email");
  }

  const now = Date.now();
  const recent = await context.env.DB.prepare(
    "SELECT id FROM password_reset_requests WHERE email = ?1 AND handled_at IS NULL AND requested_at > ?2"
  )
    .bind(email, now - DEDUPE_WINDOW_MS)
    .first<{ id: number }>();

  if (!recent) {
    await context.env.DB.prepare(
      "INSERT INTO password_reset_requests (email, requested_at) VALUES (?1, ?2)"
    )
      .bind(email, now)
      .run();
  }

  // Sempre 200 e sempre igual — nada aqui depende de o e-mail existir.
  return json(200, { received: true });
};
