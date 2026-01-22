/// <reference types="@cloudflare/workers-types" />
import { json, badRequest, conflict, serverError } from "../_utils/responses";
import { isValidEmail } from "../_utils/validation";
import { getPaymentProvider } from "../_utils/payment";
import {
  countActive,
  countActiveSleep,
  expirePending,
  getByEmail,
  insertRegistration,
  updateRegistration,
} from "../_utils/registrations";

interface Env {
  DB: D1Database;
  GATEWAY_API_KEY?: string;
}

const MAX_TOTAL = 400;
const MAX_SLEEP = 100;

export async function handleRegister(env: Env, body: unknown): Promise<Response> {
  if (!body || typeof body !== "object") {
    return badRequest("invalid_body");
  }

  const {
    name,
    email,
    phone,
    cep,
    address,
    number,
    complement,
    city,
    state,
    sleepAtMonastery,
    companionName,
  } = body as {
    name?: string;
    email?: string;
    phone?: string;
    cep?: string;
    address?: string;
    number?: string;
    complement?: string;
    city?: string;
    state?: string;
    sleepAtMonastery?: boolean;
    companionName?: string;
  };

  if (!email || !isValidEmail(email)) {
    return badRequest("invalid_email");
  }

  const sleepFlag = sleepAtMonastery ? 1 : 0;

  await expirePending(env.DB);

  const existing = await getByEmail(env.DB, email);
  // Nova regra: email já usado por outro nome
  if (existing && existing.name && name && existing.name.trim().toLowerCase() !== name.trim().toLowerCase()) {
    return conflict("email_used_by_other_name", { email, name: existing.name });
  }

  let total = await countActive(env.DB);
  let sleepers = await countActiveSleep(env.DB);

  // If updating an existing pending registration, discount it from capacity checks
  if (existing && (existing.status === "PENDING" || existing.status === "CANCELED")) {
    if (existing.status === "PENDING") {
      total = Math.max(0, total - 1);
      if (existing.sleep_at_monastery === 1) {
        sleepers = Math.max(0, sleepers - 1);
      }
    }
  }

  if (total >= MAX_TOTAL) {
    return conflict("registrations_full");
  }
  if (sleepFlag) {
    if (sleepers >= MAX_SLEEP) {
      return conflict("monastery_full");
    }
  }

  let provider;
  try {
    provider = getPaymentProvider(env);
  } catch (error: any) {
    console.error(`Erro ao obter provider: ${error.message}`);
    return serverError('payment_provider_not_configured');
  }

  let charge;
  let correlationId;
  try {
    charge = await provider.createCharge({ 
      name: name?.trim() || email.split('@')[0], 
      email 
    });
    correlationId = charge.payment_ref;
    // Log para depuração do QR code
    console.log('[register] charge.qrCodeImageUrl:', charge.qrCodeImageUrl);
    // Salvar pagamento na tabela payments
    const { savePayment } = await import("../_utils/payments");
    const now = Date.now();
    await savePayment(env.DB, {
      email,
      correlation_id: correlationId,
      provider_charge_id: charge.payment_ref,
      amount_cents: 1000,
      status: 'pending',
      brcode: charge.qrCodeText,
      qr_code_image: charge.qrCodeImageUrl || null,
      qr_code_url: charge.qrCodeImageUrl || null,
      expires_at: now + 86400 * 1000,
      created_at: now,
      updated_at: now,
    });
  } catch (error: any) {
    console.error(`Erro ao criar cobrança PIX: ${error.message}`);
    const message = error.message.includes('not configured') 
      ? 'payment_provider_not_configured'
      : 'pix_creation_failed';
    return serverError(message);
  }
  
  const id = crypto.randomUUID();

  try {
    if (existing && existing.status !== "PAID") {
      await updateRegistration(env.DB, email, {
        name: name?.trim() ?? "",
        status: "PENDING",
        payment_provider: "woovi",
        payment_ref: charge.payment_ref,
        sleep_at_monastery: sleepFlag,
        companion_name: companionName?.trim() || null,
        phone: phone?.trim() ?? "",
        cep: cep?.trim() ?? "",
        address: address?.trim() ?? "",
        number: number?.trim() ?? "",
        complement: complement?.trim() || null,
        city: city?.trim() ?? "",
        state: state?.trim() ?? "",
      });
    } else if (existing && existing.status === "PAID") {
      return conflict("registration_exists", { status: existing.status });
    } else {
      await insertRegistration(env.DB, {
        id,
        email,
        name: name?.trim() ?? "",
        status: "PENDING",
        payment_provider: "woovi",
        payment_ref: charge.payment_ref,
        sleep_at_monastery: sleepFlag,
        companion_name: companionName?.trim() || null,
        phone: phone?.trim() ?? "",
        cep: cep?.trim() ?? "",
        address: address?.trim() ?? "",
        number: number?.trim() ?? "",
        complement: complement?.trim() || null,
        city: city?.trim() ?? "",
        state: state?.trim() ?? "",
      });
    }
  } catch (error) {
    const message = (error as Error).message || "unknown_error";
    if (message.includes("UNIQUE constraint failed")) {
      const current = await getByEmail(env.DB, email);
      return conflict("registration_exists", { status: current?.status });
    }
    return serverError();
  }

  return json(200, {
    status: "PENDING",
    registration_id: existing?.id ?? id,
    payment_ref: charge.payment_ref,
    qrCodeText: charge.qrCodeText,
    qrCodeImageUrl: charge.qrCodeImageUrl ?? null,
    expires_at: charge.expires_at ?? null,
  });
}

async function handleAvailability(env: Env): Promise<Response> {
  try {
    await expirePending(env.DB);
    const total = await countActive(env.DB);
    const sleepers = await countActiveSleep(env.DB);
    return json(200, {
      totalFull: total >= MAX_TOTAL,
      monasteryFull: sleepers >= MAX_SLEEP,
      total,
      sleepers,
      totalLimit: MAX_TOTAL,
      monasteryLimit: MAX_SLEEP,
    });
  } catch (error) {
    console.error("Error in handleAvailability:", error);
    return serverError("availability_error");
  }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: unknown;
  try {
    body = await context.request.json();
  } catch (error) {
    return badRequest("invalid_json");
  }

  return handleRegister(context.env, body);
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  return handleAvailability(context.env);
};
