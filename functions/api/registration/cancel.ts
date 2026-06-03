/// <reference types="@cloudflare/workers-types" />
import { json, badRequest, notFound, serverError } from "../../_utils/responses";
import { parseRegistrationCostCents } from "../../_utils/payment";
import { encryptCpf } from "../../_utils/cpfCrypto";
import { canonicalizeCpf, isValidCpf } from "../../_utils/cpfValidation";
import { deleteWooviCharge } from "../../_utils/woovi";
import { getByCpfEncrypted } from "../../_utils/registrations";
import { createRefundRequest } from "../../_utils/refunds";

interface Env {
  DB: D1Database;
  WOOVI_APP_ID?: string;
  REGISTRATION_COST?: string;
  REGISTRATION_COST_MONASTERY?: string;
  CPF_ENCRYPTION_KEY?: string;
  CPF_ENCRYPTION_IV?: string;
}

/**
 * Cancela a inscrição (identificada por CPF) PELO SITE. Usa POST porque corpo em DELETE
 * é descartado por alguns proxies — era a causa do cancelamento "não pegar".
 *
 * - PENDENTE: invalida o PIX em aberto e marca CANCELED (não pagou nada -> sem estorno).
 * - PAGA (peregrino): marca CANCELED e registra um estorno (refund_requests) com o valor pago.
 * - Cortesia/staff (pagou nada): marca CANCELED, sem estorno.
 */
export async function handleCancelRegistration(env: Env, body: unknown): Promise<Response> {
  if (!body || typeof body !== "object") {
    return badRequest("invalid_body");
  }
  const { cpf } = body as { cpf?: string };
  if (!cpf || !isValidCpf(cpf)) {
    return badRequest("invalid_cpf");
  }

  const key = env.CPF_ENCRYPTION_KEY;
  const iv = env.CPF_ENCRYPTION_IV;
  if (!key || !iv) {
    return serverError("cpf_encryption_not_configured");
  }

  let cpfEncrypted: string;
  try {
    cpfEncrypted = await encryptCpf(canonicalizeCpf(cpf), key, iv);
  } catch {
    return serverError("cpf_encryption_failed");
  }

  const registration = await getByCpfEncrypted(env.DB, cpfEncrypted);
  if (!registration) {
    return notFound("registration_not_found");
  }
  if (registration.status === "CANCELED") {
    return json(200, { status: "CANCELED", refund: false });
  }

  const wasPaid = registration.status === "PAID";
  const isCourtesy = registration.payment_provider === "cortesia";

  // Pendente: invalida o PIX para não ser pago após o cancelamento.
  if (registration.status === "PENDING" && env.WOOVI_APP_ID && registration.payment_ref) {
    try {
      await deleteWooviCharge(env.WOOVI_APP_ID, registration.payment_ref);
    } catch (error) {
      console.warn("Falha ao invalidar PIX no cancelamento (pendente):", error);
    }
  }

  await env.DB.prepare("UPDATE registrations SET status = 'CANCELED' WHERE id = ?")
    .bind(registration.id)
    .run();

  // Estorno só quando havia dinheiro pago (peregrino pago, não cortesia).
  let refund = false;
  if (wasPaid && !isCourtesy) {
    const generalCents = parseRegistrationCostCents(env.REGISTRATION_COST) ?? 1000;
    const monasteryCents = parseRegistrationCostCents(env.REGISTRATION_COST_MONASTERY) ?? generalCents;
    const amountCents = registration.sleep_at_monastery === 1 ? monasteryCents : generalCents;

    await createRefundRequest(env.DB, {
      type: "inscricao",
      sourceId: registration.id,
      name: registration.name,
      phone: registration.phone,
      email: registration.email,
      amountCents,
    });
    refund = true;
  }

  return json(200, { status: "CANCELED", refund });
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return badRequest("invalid_json");
  }
  return handleCancelRegistration(context.env, body);
};
