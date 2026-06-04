/// <reference types="@cloudflare/workers-types" />
import { json, badRequest, notFound, serverError } from "../../_utils/responses";
import { encryptCpf } from "../../_utils/cpfCrypto";
import { canonicalizeCpf, isValidCpf } from "../../_utils/cpfValidation";
import { deleteWooviCharge } from "../../_utils/woovi";
import { createRefundRequest } from "../../_utils/refunds";

interface Env {
  DB: D1Database;
  WOOVI_APP_ID?: string;
  CPF_ENCRYPTION_KEY?: string;
  CPF_ENCRYPTION_IV?: string;
}

interface PurchaseRow {
  id: string;
  customer_name: string;
  email: string | null;
  phone: string | null;
  status: "PENDING" | "PAID" | "CANCELED";
  payment_ref: string | null;
  provider_charge_id: string | null;
  amount_cents: number;
}

/**
 * Cancela UMA compra de camiseta (identificada por id + CPF do comprador) PELO SITE.
 * - PENDENTE: invalida o PIX em aberto e marca CANCELED (sem estorno).
 * - PAGA: marca CANCELED e registra estorno (refund_requests) com o valor pago.
 */
export async function handleCancelTshirt(env: Env, body: unknown): Promise<Response> {
  if (!body || typeof body !== "object") {
    return badRequest("invalid_body");
  }
  const { cpf, purchaseId } = body as { cpf?: string; purchaseId?: string };
  if (!cpf || !isValidCpf(cpf)) {
    return badRequest("invalid_cpf");
  }
  if (!purchaseId || typeof purchaseId !== "string") {
    return badRequest("purchase_id_required");
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

  // A compra precisa pertencer ao CPF informado (evita cancelar pedido de terceiro).
  const purchase = await env.DB.prepare(
    `SELECT id, customer_name, email, phone, status, payment_ref, provider_charge_id, amount_cents
     FROM tshirt_purchase
     WHERE id = ? AND cpf_encrypted = ?`
  )
    .bind(purchaseId, cpfEncrypted)
    .first<PurchaseRow>();

  if (!purchase) {
    return notFound("purchase_not_found");
  }
  if (purchase.status === "CANCELED") {
    return json(200, { status: "CANCELED", refund: false });
  }

  // Pendente: invalida o PIX para não ser pago após o cancelamento.
  if (purchase.status === "PENDING" && env.WOOVI_APP_ID) {
    const chargeId = purchase.provider_charge_id || purchase.payment_ref;
    if (chargeId) {
      try {
        await deleteWooviCharge(env.WOOVI_APP_ID, chargeId);
      } catch (error) {
        console.warn("Falha ao invalidar PIX da camiseta no cancelamento:", error);
      }
    }
  }

  const wasPaid = purchase.status === "PAID";

  await env.DB.prepare(
    "UPDATE tshirt_purchase SET status = 'CANCELED', updated_at = ? WHERE id = ?"
  )
    .bind(new Date().toISOString(), purchase.id)
    .run();

  let refund = false;
  if (wasPaid) {
    await createRefundRequest(env.DB, {
      type: "camiseta",
      sourceId: purchase.id,
      name: purchase.customer_name,
      phone: purchase.phone,
      email: purchase.email,
      amountCents: purchase.amount_cents,
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
  return handleCancelTshirt(context.env, body);
};
