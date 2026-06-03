/// <reference types="@cloudflare/workers-types" />
import { json, badRequest, conflict, notFound, serverError } from "../_utils/responses";
import { getPaymentProvider, parseRegistrationCostCents } from "../_utils/payment";
import { getCapacityLimits, CapacityEnv } from "../_utils/capacity";
import { encryptCpf } from "../_utils/cpfCrypto";
import { canonicalizeCpf, isValidCpf } from "../_utils/cpfValidation";
import { deleteWooviCharge } from "../_utils/woovi";
import { enforceCapacity } from "../_utils/enforceCapacity";
import {
  countPaidSleepNonStaff,
  expirePending,
  getByCpfEncrypted,
  switchPendingToMonastery,
  switchPendingToGeneral,
  demoteToGeneral,
  setMonasteryUpgradeRef,
  promoteToMonastery,
} from "../_utils/registrations";
import { createRefundRequest } from "../_utils/refunds";

interface Env extends CapacityEnv {
  DB: D1Database;
  WOOVI_APP_ID?: string;
  REGISTRATION_COST?: string;
  REGISTRATION_COST_MONASTERY?: string;
  CPF_ENCRYPTION_KEY?: string;
  CPF_ENCRYPTION_IV?: string;
}

/**
 * Troca "geral -> pernoite" (self-service e admin reaproveitam este handler).
 *
 * - Inscrição PENDENTE (ainda não paga): reemite o PIX no valor cheio do mosteiro e já
 *   marca sleep_at_monastery = 1. O webhook normal confirma como PAID.
 * - Inscrição JÁ PAGA (geral): cobra apenas a DIFERENÇA (pernoite - geral). A promoção
 *   para pernoite acontece quando o webhook confirma essa cobrança de diferença. Se a
 *   diferença for <= 0 (mesmo preço), promove na hora, sem novo PIX.
 *
 * Em qualquer caso, exige vaga no mosteiro (PAGAS de pernoite < teto) no momento do pedido.
 */
export async function handleUpgradeMonastery(env: Env, body: unknown): Promise<Response> {
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

  await expirePending(env.DB);

  const registration = await getByCpfEncrypted(env.DB, cpfEncrypted);
  if (!registration) {
    return notFound("registration_not_found");
  }
  if (registration.is_staff === 1) {
    return conflict("not_eligible_staff");
  }
  if (registration.status === "CANCELED") {
    return conflict("not_eligible_canceled");
  }

  // Direção da troca: "monastery" (geral -> pernoite, padrão) ou "general" (downgrade).
  const target = (body as { target?: string }).target === "general" ? "general" : "monastery";

  const generalCents = parseRegistrationCostCents(env.REGISTRATION_COST) ?? 1000;
  const monasteryCents = parseRegistrationCostCents(env.REGISTRATION_COST_MONASTERY) ?? generalCents;

  let provider;
  try {
    provider = getPaymentProvider(env);
  } catch (error: any) {
    console.error(`Erro ao obter provider: ${error.message}`);
    return serverError("payment_provider_not_configured");
  }

  const { savePayment } = await import("../_utils/payments");
  const appId = env.WOOVI_APP_ID;

  // ===================== DOWNGRADE: pernoite -> geral =====================
  if (target === "general") {
    if (registration.sleep_at_monastery === 0) {
      return json(200, { status: "ALREADY_GENERAL" });
    }
    const diffCents = monasteryCents - generalCents;

    // Pendente: ainda não pagou -> reemite o PIX no valor de geral.
    if (registration.status === "PENDING") {
      if (appId && registration.payment_ref) {
        try {
          await deleteWooviCharge(appId, registration.payment_ref);
        } catch (error) {
          console.warn("Falha ao invalidar PIX antigo na troca (pendente -> geral):", error);
        }
      }

      let charge;
      try {
        charge = await provider.createCharge({
          name: registration.name || registration.email.split("@")[0],
          email: registration.email,
          amountCents: generalCents,
          comment: "Inscrição sem pernoite - Caminho do Perdão",
        });
        const now = Date.now();
        await savePayment(env.DB, {
          email: registration.email,
          correlation_id: charge.payment_ref,
          provider_charge_id: charge.payment_ref,
          amount_cents: generalCents,
          status: "pending",
          brcode: charge.qrCodeText,
          qr_code_image: charge.qrCodeImageUrl || null,
          qr_code_url: charge.qrCodeImageUrl || null,
          expires_at: now + 86400 * 1000,
          created_at: now,
          updated_at: now,
        });
      } catch (error: any) {
        console.error(`Erro ao criar cobrança PIX (troca pendente -> geral): ${error.message}`);
        return serverError("pix_creation_failed");
      }

      await switchPendingToGeneral(env.DB, registration.id, charge.payment_ref);

      return json(200, {
        status: "PENDING",
        needsPayment: true,
        kind: "full",
        amount_cents: generalCents,
        payment_ref: charge.payment_ref,
        qrCodeText: charge.qrCodeText,
        qrCodeImageUrl: charge.qrCodeImageUrl ?? null,
        expires_at: charge.expires_at ?? null,
      });
    }

    // Já PAGA: sai do mosteiro na hora e registra estorno da diferença paga a mais.
    await demoteToGeneral(env.DB, registration.id);
    let refundCents = 0;
    if (diffCents > 0) {
      await createRefundRequest(env.DB, {
        type: "downgrade",
        sourceId: registration.id,
        name: registration.name,
        phone: registration.phone,
        email: registration.email,
        amountCents: diffCents,
      });
      refundCents = diffCents;
    }
    return json(200, { status: "DOWNGRADED", needsPayment: false, refund_cents: refundCents });
  }

  // ===================== UPGRADE: geral -> pernoite =====================
  if (registration.sleep_at_monastery === 1) {
    return json(200, { status: "ALREADY_MONASTERY" });
  }

  // Precisa haver cama disponível (vagas pagas de pernoite abaixo do teto).
  const { maxRegistrationsSleep } = getCapacityLimits(env);
  const paidSleepers = await countPaidSleepNonStaff(env.DB);
  if (paidSleepers >= maxRegistrationsSleep) {
    return conflict("monastery_full");
  }

  // ---- Caso 1: inscrição ainda PENDENTE (não paga) -> reemite no valor cheio do mosteiro.
  if (registration.status === "PENDING") {
    // Invalida o PIX antigo (valor de geral) para não ficar pagável em paralelo.
    if (appId && registration.payment_ref) {
      try {
        await deleteWooviCharge(appId, registration.payment_ref);
      } catch (error) {
        console.warn("Falha ao invalidar PIX antigo na troca (pendente):", error);
      }
    }

    let charge;
    try {
      charge = await provider.createCharge({
        name: registration.name || registration.email.split("@")[0],
        email: registration.email,
        amountCents: monasteryCents,
        comment: "Inscrição com pernoite - Caminho do Perdão",
      });
      const now = Date.now();
      await savePayment(env.DB, {
        email: registration.email,
        correlation_id: charge.payment_ref,
        provider_charge_id: charge.payment_ref,
        amount_cents: monasteryCents,
        status: "pending",
        brcode: charge.qrCodeText,
        qr_code_image: charge.qrCodeImageUrl || null,
        qr_code_url: charge.qrCodeImageUrl || null,
        expires_at: now + 86400 * 1000,
        created_at: now,
        updated_at: now,
      });
    } catch (error: any) {
      console.error(`Erro ao criar cobrança PIX (troca pendente): ${error.message}`);
      return serverError("pix_creation_failed");
    }

    await switchPendingToMonastery(env.DB, registration.id, charge.payment_ref);

    return json(200, {
      status: "PENDING",
      needsPayment: true,
      kind: "full",
      amount_cents: monasteryCents,
      payment_ref: charge.payment_ref,
      qrCodeText: charge.qrCodeText,
      qrCodeImageUrl: charge.qrCodeImageUrl ?? null,
      expires_at: charge.expires_at ?? null,
    });
  }

  // ---- Caso 2: inscrição JÁ PAGA (geral) -> cobra a diferença.
  const diffCents = monasteryCents - generalCents;

  if (diffCents <= 0) {
    // Mesmo preço (ou pernoite mais barato): promove na hora, sem novo PIX.
    await promoteToMonastery(env.DB, registration.id);
    await enforceCapacity(env);
    return json(200, { status: "UPGRADED", needsPayment: false });
  }

  // Invalida uma eventual cobrança de diferença anterior ainda pendente.
  if (appId && registration.monastery_upgrade_ref) {
    try {
      await deleteWooviCharge(appId, registration.monastery_upgrade_ref);
    } catch (error) {
      console.warn("Falha ao invalidar PIX de upgrade anterior:", error);
    }
  }

  let charge;
  try {
    charge = await provider.createCharge({
      name: registration.name || registration.email.split("@")[0],
      email: registration.email,
      amountCents: diffCents,
      comment: "Diferença para pernoite - Caminho do Perdão",
    });
    const now = Date.now();
    await savePayment(env.DB, {
      email: registration.email,
      correlation_id: charge.payment_ref,
      provider_charge_id: charge.payment_ref,
      amount_cents: diffCents,
      status: "pending",
      brcode: charge.qrCodeText,
      qr_code_image: charge.qrCodeImageUrl || null,
      qr_code_url: charge.qrCodeImageUrl || null,
      expires_at: now + 86400 * 1000,
      created_at: now,
      updated_at: now,
    });
  } catch (error: any) {
    console.error(`Erro ao criar cobrança PIX (diferença): ${error.message}`);
    return serverError("pix_creation_failed");
  }

  await setMonasteryUpgradeRef(env.DB, registration.id, charge.payment_ref);

  return json(200, {
    status: "PENDING",
    needsPayment: true,
    kind: "difference",
    amount_cents: diffCents,
    payment_ref: charge.payment_ref,
    qrCodeText: charge.qrCodeText,
    qrCodeImageUrl: charge.qrCodeImageUrl ?? null,
    expires_at: charge.expires_at ?? null,
  });
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: unknown;
  try {
    body = await context.request.json();
  } catch (error) {
    return badRequest("invalid_json");
  }
  return handleUpgradeMonastery(context.env, body);
};
