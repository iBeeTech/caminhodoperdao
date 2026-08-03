/// <reference types="@cloudflare/workers-types" />
import { json, badRequest, conflict, serverError } from "../_utils/responses";
import { isValidEmail, isValidPhone } from "../_utils/validation";
import { getPaymentProvider, parseRegistrationCostCents } from "../_utils/payment";
import { getCapacityLimits } from "../_utils/capacity";
import { encryptCpf } from "../_utils/cpfCrypto";
import { canonicalizeCpf, isValidCpf } from "../_utils/cpfValidation";
import {
  countActive,
  countPaidNonStaff,
  countPaidSleepNonStaff,
  countActiveStaff,
  expirePending,
  getByCpfEncrypted,
  insertRegistration,
  isValidGender,
  updateRegistration,
  setRegistrationInviteCode,
} from "../_utils/registrations";
import {
  getInviteCode,
  bindInviteCode,
  normalizeInviteCode,
} from "../_utils/inviteCodes";
import type { CapacityEnv } from "../_utils/capacity";
import { getEventYear } from "../_utils/eventYear";
import type { EventYearEnv } from "../_utils/eventYear";

interface Env extends CapacityEnv, EventYearEnv {
  DB: D1Database;
  GATEWAY_API_KEY?: string;
  // Custos da inscrição em reais (ex: "100" para R$100,00). Configuráveis na Cloudflare.
  REGISTRATION_COST?: string;
  REGISTRATION_COST_MONASTERY?: string;
  CPF_ENCRYPTION_KEY?: string;
  CPF_ENCRYPTION_IV?: string;
}

export async function handleRegister(env: Env, body: unknown): Promise<Response> {
  if (!body || typeof body !== "object") {
    return badRequest("invalid_body");
  }

  const { maxRegistrationsNonStaff, maxRegistrationsSleep } = getCapacityLimits(env);

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
    inviteCode,
    gender,
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
    inviteCode?: string;
    gender?: string;
  };

  // Convite (override do teto de 500): quando presente, a inscrição é sempre SEM
  // pernoite e fura o teto geral, desde que o código seja válido (checado adiante).
  const normalizedInviteCode = normalizeInviteCode(inviteCode);
  const hasInvite = normalizedInviteCode.length > 0;

  // O SQLite não valida CHECK adicionado por ALTER, então a lista fechada de
  // valores é garantida aqui.
  if (!isValidGender(gender)) {
    return badRequest("invalid_gender");
  }

  if (!email || !isValidEmail(email)) {
    return badRequest("invalid_email");
  }

  if (!phone || !isValidPhone(phone)) {
    return badRequest("invalid_phone");
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
  const phoneDigits = (phone ?? "").replace(/\D/g, "");
  const emergencyPhoneDigits = (emergencyContactPhone ?? "").replace(/\D/g, "");
  if (emergencyPhoneDigits.length !== 11) {
    return badRequest("emergency_contact_phone_invalid");
  }
  if (phoneDigits === emergencyPhoneDigits) {
    return badRequest("emergency_contact_phone_same_as_registration_phone");
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

  // Convite é válido só para inscrição geral (sem pernoite): ignora o pedido de pernoite.
  const sleepFlag = sleepAtMonastery && !hasInvite ? 1 : 0;

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

  const existing = await getByCpfEncrypted(env.DB, cpfEncrypted);

  if (existing) {
    const isActive = existing.status === "PAID" || existing.status === "PENDING";
    // Validação cruzada: um CPF com inscrição ativa de staff não pode se inscrever
    // como peregrino sem antes cancelar a inscrição de staff.
    if (isActive && existing.is_staff === 1) {
      return conflict("registered_as_staff");
    }

    const hasDifferentName = Boolean(
      existing.name &&
        name &&
        existing.name.trim().toLowerCase() !== name.trim().toLowerCase()
    );

    if (hasDifferentName) {
      return conflict("cpf_already_registered");
    }

    if (existing.status === "PAID") {
      return conflict("registration_exists", { status: existing.status });
    }
  }

  // Pool do mosteiro: conta só PAGAS (pendentes não reservam vaga).
  const sleepers = await countPaidSleepNonStaff(env.DB);
  // Peregrinos (não-staff) têm teto próprio (MAX_REGISTRATIONS), independente do staff.
  // Conta só PAGAS — pendentes não reservam vaga (alinhado ao mosteiro e ao enforceCapacity).
  const nonStaff = await countPaidNonStaff(env.DB);

  // Convite: valida o código antes de liberar a vaga extra. Uso único — bloqueia se
  // o código não existe, foi revogado, ou já foi consumido por OUTRA inscrição (a
  // mesma pessoa pode reabrir/retentar pelo próprio CPF, pois o vínculo aponta para ela).
  if (hasInvite) {
    const inviteRow = await getInviteCode(env.DB, normalizedInviteCode);
    if (!inviteRow || inviteRow.revoked_at) {
      return conflict("invalid_invite");
    }
    if (
      inviteRow.used_by_registration_id &&
      inviteRow.used_by_registration_id !== existing?.id
    ) {
      return conflict("invite_already_used");
    }
  }

  // Teto de peregrinos (não-staff) tranca a inscrição por completo — exceto com convite
  // válido, que autoriza a vaga extra além do teto.
  if (!hasInvite && nonStaff >= maxRegistrationsNonStaff) {
    return conflict("registrations_full");
  }
  // Pool do mosteiro dos peregrinos (não-staff), por ordem de chegada. Convite é só geral
  // (sleepFlag já forçado a 0), então este teto não se aplica a ele.
  if (sleepFlag && sleepers >= maxRegistrationsSleep) {
    return conflict("monastery_full");
  }

  // Guard before charge creation: avoid leaking a PIX charge for already-paid registrations.
  if (existing && existing.status === "PAID") {
    return conflict("registration_exists", { status: existing.status });
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
      await updateRegistration(env.DB, existing.id, {
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
        gender,
      });
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
        gender,
        // Explícito de propósito: o DEFAULT 2026 da coluna (migration 025) é só
        // rede para não existir NULL, e marcaria 2027 como 2026 em silêncio.
        event_year: getEventYear(env),
      });
    }
  } catch (error) {
    const message = (error as Error).message || "unknown_error";
    if (message.includes("UNIQUE constraint failed")) {
      if (message.includes("registrations.cpf_encrypted")) {
        return conflict("cpf_already_registered");
      }
      return conflict("registration_exists", {});
    }
    return serverError();
  }

  // Inscrição por convite: marca a inscrição (blinda da varredura de lotação) e consome
  // o código (uso único, amarrado a esta inscrição). Idempotente em retentativas do mesmo CPF.
  if (hasInvite) {
    const registrationId = existing && existing.status !== "PAID" ? existing.id : id;
    try {
      await setRegistrationInviteCode(env.DB, registrationId, normalizedInviteCode);
      await bindInviteCode(env.DB, normalizedInviteCode, registrationId);
    } catch (error) {
      console.error("Erro ao vincular convite à inscrição:", error);
    }
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
    const {
      maxRegistrations,
      maxRegistrationsSleep,
      maxRegistrationsStaff,
      maxRegistrationsNonStaff,
    } = getCapacityLimits(env);
    await expirePending(env.DB);
    const total = await countActive(env.DB);
    // monasteryFull reflete só os peregrinos (não-staff) JÁ PAGOS; o staff dorme à parte.
    const sleepers = await countPaidSleepNonStaff(env.DB);
    const staff = await countActiveStaff(env.DB);
    // Lotação geral conta só PAGAS — pendentes não reservam vaga. `total` segue informando o ativo.
    const nonStaff = await countPaidNonStaff(env.DB);
    // Ótica do peregrino: vagas de não-staff esgotadas trancam a inscrição.
    const nonStaffFull = nonStaff >= maxRegistrationsNonStaff;
    const monasteryFull = sleepers >= maxRegistrationsSleep;
    return json(200, {
      totalFull: nonStaffFull,
      monasteryFull,
      total,
      sleepers,
      staff,
      nonStaff,
      totalLimit: maxRegistrations,
      monasteryLimit: maxRegistrationsSleep,
      staffLimit: maxRegistrationsStaff,
      nonStaffLimit: maxRegistrationsNonStaff,
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
