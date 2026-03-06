/// <reference types="@cloudflare/workers-types" />
import { json, badRequest, conflict, serverError } from "../_utils/responses";
import { isValidEmail } from "../_utils/validation";
import { getPaymentProvider, parseRegistrationCostCents } from "../_utils/payment";
import { encryptCpf } from "../_utils/cpfCrypto";
import { canonicalizeCpf, isValidCpf } from "../_utils/cpfValidation";
import {
  countActive,
  countActiveSleep,
  expirePending,
  getByEmail,
  getByCpfEncrypted,
  insertRegistration,
  updateRegistration,
} from "../_utils/registrations";

interface Env {
  DB: D1Database;
  GATEWAY_API_KEY?: string;
  REGISTRATION_COST?: string;
  REGISTRATION_COST_MONASTERY?: string;
  CPF_ENCRYPTION_KEY?: string;
  CPF_ENCRYPTION_IV?: string;
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
    cpf,
    dateOfBirth,
    termsAccepted,
    emergencyContactName,
    emergencyContactPhone,
    hasAllergyMedication,
    allergyMedicationDetails,
    hasDietaryRestriction,
    dietaryRestrictionDetails,
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
    cpf?: string;
    dateOfBirth?: string;
    termsAccepted?: boolean;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    hasAllergyMedication?: boolean;
    allergyMedicationDetails?: string;
    hasDietaryRestriction?: boolean;
    dietaryRestrictionDetails?: string;
  };

  if (!email || !isValidEmail(email)) {
    return badRequest("invalid_email");
  }

  if (!cpf || !isValidCpf(cpf)) {
    return badRequest("invalid_cpf");
  }

  const rawDate = dateOfBirth?.trim();
  if (!rawDate) {
    return badRequest("date_of_birth_required");
  }
  const dateMatch = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateMatch) {
    return badRequest("invalid_date_of_birth");
  }
  const [, y, m, d] = dateMatch;
  const dob = new Date(parseInt(y!, 10), parseInt(m!, 10) - 1, parseInt(d!, 10));
  const now = new Date();
  if (dob.getTime() > now.getTime()) {
    return badRequest("date_of_birth_future");
  }
  const age = (now.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  if (age < 1 || age > 120) {
    return badRequest("date_of_birth_invalid_range");
  }
  const dateOfBirthNormalized = `${y}-${m}-${d}`;

  if (termsAccepted !== true) {
    return badRequest("terms_required");
  }

  const emergencyName = emergencyContactName?.trim();
  if (!emergencyName) {
    return badRequest("emergency_contact_name_required");
  }
  const emergencyPhoneDigits = (emergencyContactPhone ?? "").replace(/\D/g, "");
  if (emergencyPhoneDigits.length !== 11) {
    return badRequest("emergency_contact_phone_invalid");
  }

  if (typeof hasAllergyMedication !== "boolean") {
    return badRequest("allergy_medication_required");
  }
  const allergyDetails = allergyMedicationDetails?.trim() || null;
  if (hasAllergyMedication && !allergyDetails) {
    return badRequest("allergy_medication_details_required");
  }

  if (typeof hasDietaryRestriction !== "boolean") {
    return badRequest("dietary_restriction_required");
  }
  const dietaryDetails = dietaryRestrictionDetails?.trim() || null;
  if (hasDietaryRestriction && !dietaryDetails) {
    return badRequest("dietary_restriction_details_required");
  }

  const termsAcceptedAt = new Date().toISOString();

  const sleepFlag = sleepAtMonastery ? 1 : 0;

  let cpfEncrypted: string;
  try {
    const key = env.CPF_ENCRYPTION_KEY;
    const iv = env.CPF_ENCRYPTION_IV;
    if (!key || !iv) {
      console.error("CPF_ENCRYPTION_KEY or CPF_ENCRYPTION_IV not set");
      return serverError("cpf_encryption_not_configured");
    }
    cpfEncrypted = await encryptCpf(canonicalizeCpf(cpf), key, iv);
  } catch (err: any) {
    console.error("CPF encryption error:", err?.message);
    return serverError("cpf_encryption_failed");
  }

  await expirePending(env.DB);

  const existing = await getByEmail(env.DB, email);
  // Nova regra: email já usado por outro nome
  if (existing && existing.name && name && existing.name.trim().toLowerCase() !== name.trim().toLowerCase()) {
    return conflict("email_used_by_other_name", { email, name: existing.name });
  }

  // Inserção nova: CPF já usado por outra inscrição?
  if (!existing) {
    const existingByCpf = await getByCpfEncrypted(env.DB, cpfEncrypted);
    if (existingByCpf) {
      return conflict("cpf_already_registered");
    }
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

  const defaultCostCents = parseRegistrationCostCents(env.REGISTRATION_COST) ?? 1000;
  const monasteryCostCents = parseRegistrationCostCents(env.REGISTRATION_COST_MONASTERY) ?? defaultCostCents;
  const registrationCostCents = sleepFlag ? monasteryCostCents : defaultCostCents;

  let charge;
  let correlationId;
  try {
    charge = await provider.createCharge({
      name: name?.trim() || email.split('@')[0],
      email,
      amountCents: registrationCostCents,
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
      amount_cents: registrationCostCents,
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
        cpf_encrypted: cpfEncrypted,
        date_of_birth: dateOfBirthNormalized,
        terms_accepted_at: termsAcceptedAt,
        emergency_contact_name: emergencyContactName?.trim() || null,
        emergency_contact_phone: emergencyContactPhone?.trim() || null,
        has_allergy_medication: hasAllergyMedication ? 1 : 0,
        allergy_medication_details: hasAllergyMedication ? allergyDetails : null,
        has_dietary_restriction: hasDietaryRestriction ? 1 : 0,
        dietary_restriction_details: hasDietaryRestriction ? dietaryDetails : null,
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
        cpf_encrypted: cpfEncrypted,
        date_of_birth: dateOfBirthNormalized,
        terms_accepted_at: termsAcceptedAt,
        emergency_contact_name: emergencyContactName?.trim() || null,
        emergency_contact_phone: emergencyContactPhone?.trim() || null,
        has_allergy_medication: hasAllergyMedication ? 1 : 0,
        allergy_medication_details: hasAllergyMedication ? allergyDetails : null,
        has_dietary_restriction: hasDietaryRestriction ? 1 : 0,
        dietary_restriction_details: hasDietaryRestriction ? dietaryDetails : null,
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

  // Buscar o pagamento salvo para garantir que usamos o campo do banco
  const { getPaymentByRef } = await import("../_utils/payments");
  const payment = await getPaymentByRef(env.DB, charge.payment_ref);
  return json(200, {
    status: "PENDING",
    registration_id: existing?.id ?? id,
    payment_ref: charge.payment_ref,
    qrCodeText: charge.qrCodeText,
    qrCodeImageUrl: payment?.qr_code_image ?? null,
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
