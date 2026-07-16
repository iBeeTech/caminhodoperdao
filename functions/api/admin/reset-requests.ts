/// <reference types="@cloudflare/workers-types" />
import { badRequest, json, notFound } from "../../_utils/responses";
import { isValidEmail } from "../../_utils/validation";
import {
  AdminAuthEnv,
  authorizeSuperAdminRequest,
  generateTempPassword,
  getAdminByEmail,
  hashPassword,
  setTempPassword,
} from "../../_utils/adminAuth";

interface ResetRequestRow {
  id: number;
  email: string;
  requested_at: number;
}

/** GET: fila de pedidos em aberto. Só o super admin enxerga. */
export const onRequestGet: PagesFunction<AdminAuthEnv> = async context => {
  const authResult = await authorizeSuperAdminRequest(context.request, context.env);
  if (authResult instanceof Response) {
    return authResult;
  }

  const { results } = await context.env.DB.prepare(
    "SELECT id, email, requested_at FROM password_reset_requests WHERE handled_at IS NULL ORDER BY requested_at ASC"
  ).all<ResetRequestRow>();

  // isAdmin distingue pedido legítimo de e-mail digitado errado (ou sondagem).
  // Só o super admin autenticado vê isso — a tela pública nunca revela.
  const rows = results ?? [];
  const requests = await Promise.all(
    rows.map(async row => ({
      id: row.id,
      email: row.email,
      requestedAt: row.requested_at,
      isAdmin: Boolean(await getAdminByEmail(context.env.DB, row.email)),
    }))
  );

  return json(200, { requests });
};

/**
 * POST: o super admin redefine a senha de um admin para uma temporária
 * aleatória, devolvida UMA vez para ser repassada por fora (WhatsApp).
 * Quem entrar com ela é obrigado a trocar antes de acessar qualquer coisa.
 */
export const onRequestPost: PagesFunction<AdminAuthEnv> = async context => {
  const authResult = await authorizeSuperAdminRequest(context.request, context.env);
  if (authResult instanceof Response) {
    return authResult;
  }

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

  const admin = await getAdminByEmail(context.env.DB, email);
  if (!admin) {
    return notFound("admin_not_found");
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword, context.env.ADMIN_PASSWORD_PEPPER);
  await setTempPassword(context.env.DB, email, passwordHash);

  // Fecha os pedidos em aberto desse e-mail, não só o clicado: dois pedidos
  // do mesmo admin são resolvidos pelo mesmo reset.
  await context.env.DB.prepare(
    "UPDATE password_reset_requests SET handled_at = ?1, handled_by = ?2 WHERE email = ?3 AND handled_at IS NULL"
  )
    .bind(Date.now(), authResult.sub, email)
    .run();

  return json(200, { email, tempPassword });
};
