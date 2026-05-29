/// <reference types="@cloudflare/workers-types" />
import { badRequest, json } from "../_utils/responses";
import { isValidPhone } from "../_utils/validation";
import { expirePending, getByPhone, getByCpfEncrypted } from "../_utils/registrations";
import { getPaymentByRef } from "../_utils/payments";
import { getWooviChargeStatus } from "../_utils/woovi";
import { encryptCpf } from "../_utils/cpfCrypto";
import { canonicalizeCpf, isValidCpf } from "../_utils/cpfValidation";

interface Env {
  DB: D1Database;
  WOOVI_APP_ID?: string;
  CPF_ENCRYPTION_KEY?: string;
  CPF_ENCRYPTION_IV?: string;
}

export async function handleStatus(
  env: Env,
  phone: string | null,
  name: string | null,
  cpf: string | null
): Promise<Response> {
  let registration = null;

  if (cpf && cpf.trim()) {
    if (!isValidCpf(cpf)) return badRequest("invalid_cpf");
    const key = env.CPF_ENCRYPTION_KEY;
    const iv = env.CPF_ENCRYPTION_IV;
    if (!key || !iv) return badRequest("cpf_lookup_not_configured");
    let cpfEncrypted: string;
    try {
      cpfEncrypted = await encryptCpf(canonicalizeCpf(cpf), key, iv);
    } catch {
      return badRequest("cpf_lookup_failed");
    }
    await expirePending(env.DB);
    registration = await getByCpfEncrypted(env.DB, cpfEncrypted);
  } else if (phone && phone.trim()) {
    if (!isValidPhone(phone)) return badRequest("invalid_phone");
    await expirePending(env.DB);
    registration = await getByPhone(env.DB, phone);
  } else {
    return badRequest("cpf_or_phone_required");
  }

  if (!registration) {
    return json(200, { exists: false });
  }

  const phoneForReg = registration.phone;
  if (name && registration.name && registration.name.trim().toLowerCase() !== name.trim().toLowerCase()) {
    return json(409, {
      error: "phone_used_by_other_name",
      phone: phoneForReg,
      name: registration.name
    });
  }

  // Se o status já é PAID, não precisa consultar Woovi
  if (registration.status !== "PAID" && registration.payment_ref) {
    // Tentar consultar status na Woovi
    try {
      const appId = env.WOOVI_APP_ID;
      if (appId) {
        const wooviResponse = await getWooviChargeStatus(appId, registration.payment_ref);

        // Se a Woovi diz que foi pago, atualizar o D1
        if (["COMPLETED", "RECEIVED"].includes(wooviResponse.charge?.status)) {
          await env.DB
            .prepare("UPDATE registrations SET status = 'PAID', paid_at = ? WHERE phone = ?")
            .bind(Date.now(), phoneForReg.replace(/\D/g, ""))
            .run();
          
          registration.status = "PAID";
          registration.paid_at = new Date(Date.now()).toISOString();
          
          console.log(`Status atualizado via Woovi: ${phoneForReg} -> PAID`);
        }
      }
    } catch (error) {
      console.error(`Erro ao consultar status na Woovi: ${error}`);
      // Continuar com o status do D1 mesmo com erro
    }
  }

  const expired = registration.status === "CANCELED" && !registration.paid_at;
  const message = registration.status === "PAID" ? "Inscrição confirmada" : null;

  let qrCodeText = null;
  let qrCodeImage = null;
  if (registration.status === "PENDING" && registration.payment_ref) {
    const payment = await getPaymentByRef(env.DB, registration.payment_ref);
    if (payment) {
      qrCodeText = payment.brcode;
      qrCodeImage = payment.qr_code_image;
    }
  } else if (registration.payment_ref) {
    qrCodeText = `PIX|REF=${registration.payment_ref}`;
  }

  return json(200, {
    exists: true,
    status: registration.status,
    is_staff: registration.is_staff,
    message,
    expired,
    name: registration.name,
    email: registration.email,
    payment_ref: registration.payment_ref,
    qrCodeText,
    qrCodeImageUrl: qrCodeImage,
    sleep_at_monastery: registration.sleep_at_monastery,
    phone: registration.phone,
    cep: registration.cep,
    address: registration.address,
    number: registration.number,
    complement: registration.complement,
    city: registration.city,
    state: registration.state,
    date_of_birth: registration.date_of_birth ?? undefined,
    emergency_contact_name: registration.emergency_contact_name ?? undefined,
    emergency_contact_phone: registration.emergency_contact_phone ?? undefined,
    has_allergy_medication: registration.has_allergy_medication,
    allergy_medication_details: registration.allergy_medication_details ?? undefined,
    has_dietary_restriction: registration.has_dietary_restriction,
    dietary_restriction_details: registration.dietary_restriction_details ?? undefined,
    created_at: registration.created_at,
    paid_at: registration.paid_at,
  });
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const cpf = url.searchParams.get("cpf");
  const phone = url.searchParams.get("phone");
  const name = url.searchParams.get("name");
  return handleStatus(context.env, phone, name, cpf);
};

// DELETE /api/status -> cancela a inscrição (status CANCELED) identificada pelo CPF.
// Como a capacidade conta apenas PENDING/PAID, cancelar libera a vaga.
export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { env } = context;
  let body: { cpf?: string };
  try {
    body = (await context.request.json()) as { cpf?: string };
  } catch {
    return badRequest("invalid_json");
  }

  const cpf = (body.cpf || "").trim();
  if (!cpf || !isValidCpf(cpf)) {
    return badRequest("invalid_cpf");
  }

  const key = env.CPF_ENCRYPTION_KEY;
  const iv = env.CPF_ENCRYPTION_IV;
  if (!key || !iv) return badRequest("cpf_lookup_not_configured");

  let cpfEncrypted: string;
  try {
    cpfEncrypted = await encryptCpf(canonicalizeCpf(cpf), key, iv);
  } catch {
    return badRequest("cpf_lookup_failed");
  }

  const registration = await getByCpfEncrypted(env.DB, cpfEncrypted);
  if (!registration) {
    return json(404, { error: "registration_not_found" });
  }

  await env.DB.prepare("UPDATE registrations SET status = 'CANCELED' WHERE id = ?")
    .bind(registration.id)
    .run();

  return json(200, { status: "canceled" });
};
