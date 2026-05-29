/// <reference types="@cloudflare/workers-types" />
import { badRequest, json, notFound } from "../../_utils/responses";
import { canonicalizeCpf, isValidCpf } from "../../_utils/cpfValidation";
import { decryptCpf, encryptCpf } from "../../_utils/cpfCrypto";
import { getByCpfEncrypted } from "../../_utils/registrations";
import {
  StaffRegistrationEnv,
  StaffRegistrationRow,
  cancelStaffRegistration,
  getStaffRegistrationByCpfEncrypted,
  updateStaffRegistration,
} from "../../_utils/staffRegistration";

type ResolveResult =
  | { ok: false; response: Response }
  | { ok: true; registration: StaffRegistrationRow };

// Localiza a inscrição de staff pelo CPF informado (criptografando para buscar).
async function resolveByCpf(env: StaffRegistrationEnv, cpf: string): Promise<ResolveResult> {
  const key = env.CPF_ENCRYPTION_KEY;
  const iv = env.CPF_ENCRYPTION_IV;
  if (!key || !iv) return { ok: false, response: json(500, { error: "cpf_encryption_not_configured" }) };

  let cpfEncrypted: string;
  try {
    cpfEncrypted = await encryptCpf(canonicalizeCpf(cpf), key, iv);
  } catch {
    return { ok: false, response: json(500, { error: "cpf_encryption_failed" }) };
  }

  const registration = await getStaffRegistrationByCpfEncrypted(env.DB, cpfEncrypted);
  if (!registration) return { ok: false, response: notFound("registration_not_found") };
  return { ok: true, registration };
}

// GET /api/staff/registration?cpf=... -> dados da inscrição de staff para edição.
// Retorna { found: false } quando o CPF ainda não tem inscrição de staff.
export const onRequestGet: PagesFunction<StaffRegistrationEnv> = async context => {
  const url = new URL(context.request.url);
  const cpf = (url.searchParams.get("cpf") || "").trim();
  if (!cpf || !isValidCpf(cpf)) {
    return badRequest("invalid_cpf");
  }

  const resolved = await resolveByCpf(context.env, cpf);
  if (!resolved.ok) {
    // Sem inscrição de staff: verifica se o CPF já é peregrino ativo (validação cruzada).
    let peregrino = false;
    const key = context.env.CPF_ENCRYPTION_KEY;
    const iv = context.env.CPF_ENCRYPTION_IV;
    if (key && iv) {
      try {
        const enc = await encryptCpf(canonicalizeCpf(cpf), key, iv);
        const reg = await getByCpfEncrypted(context.env.DB, enc);
        if (reg && reg.is_staff === 0 && (reg.status === "PAID" || reg.status === "PENDING")) {
          peregrino = true;
        }
      } catch {
        /* ignora: trata como inscrição nova */
      }
    }
    return json(200, { found: false, peregrino });
  }
  const r = resolved.registration;

  let cpfPlain = "";
  const key = context.env.CPF_ENCRYPTION_KEY;
  const iv = context.env.CPF_ENCRYPTION_IV;
  if (r.cpf_encrypted && key && iv) {
    try {
      cpfPlain = await decryptCpf(r.cpf_encrypted, key, iv);
    } catch {
      cpfPlain = "";
    }
  }

  return json(200, {
    found: true,
    email: r.email,
    cpf: cpfPlain,
    registrationNumber: r.registration_number,
    name: r.name,
    phone: r.phone,
    dateOfBirth: r.date_of_birth,
    emergencyContactName: r.emergency_contact_name,
    emergencyContactPhone: r.emergency_contact_phone,
    city: r.city,
    state: r.state,
    sleepAtMonastery: r.sleep_at_monastery === 1,
    companionName: r.companion_name,
    cep: r.cep,
    address: r.address,
    number: r.number,
    complement: r.complement,
    hasAllergyMedication: r.has_allergy_medication === 1,
    allergyMedicationDetails: r.allergy_medication_details,
    hasDietaryRestriction: r.has_dietary_restriction === 1,
    dietaryRestrictionDetails: r.dietary_restriction_details,
  });
};

// PUT /api/staff/registration -> atualiza os campos editáveis (não altera email/CPF).
export const onRequestPut: PagesFunction<StaffRegistrationEnv> = async context => {
  let body: Record<string, unknown>;
  try {
    body = (await context.request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("invalid_json");
  }

  const cpf = (typeof body.cpf === "string" ? body.cpf : "").trim();
  if (!cpf || !isValidCpf(cpf)) {
    return badRequest("invalid_cpf");
  }

  const resolved = await resolveByCpf(context.env, cpf);
  if (!resolved.ok) return resolved.response;

  const result = await updateStaffRegistration(context.env, resolved.registration.id, {
    name: typeof body.name === "string" ? body.name : undefined,
    phone: typeof body.phone === "string" ? body.phone : undefined,
    dateOfBirth: typeof body.dateOfBirth === "string" ? body.dateOfBirth : undefined,
    termsAccepted: body.termsAccepted === true,
    emergencyContactName:
      typeof body.emergencyContactName === "string" ? body.emergencyContactName : undefined,
    emergencyContactPhone:
      typeof body.emergencyContactPhone === "string" ? body.emergencyContactPhone : undefined,
    city: typeof body.city === "string" ? body.city : undefined,
    state: typeof body.state === "string" ? body.state : undefined,
    sleepAtMonastery: body.sleepAtMonastery === true,
    companionName: typeof body.companionName === "string" ? body.companionName : undefined,
    cep: typeof body.cep === "string" ? body.cep : undefined,
    address: typeof body.address === "string" ? body.address : undefined,
    number: typeof body.number === "string" ? body.number : undefined,
    complement: typeof body.complement === "string" ? body.complement : undefined,
    hasAllergyMedication:
      typeof body.hasAllergyMedication === "boolean" ? body.hasAllergyMedication : undefined,
    allergyMedicationDetails:
      typeof body.allergyMedicationDetails === "string" ? body.allergyMedicationDetails : undefined,
    hasDietaryRestriction:
      typeof body.hasDietaryRestriction === "boolean" ? body.hasDietaryRestriction : undefined,
    dietaryRestrictionDetails:
      typeof body.dietaryRestrictionDetails === "string"
        ? body.dietaryRestrictionDetails
        : undefined,
  });

  if (!result.ok) {
    return json(result.status, { error: result.error });
  }

  return json(200, { status: "updated" });
};

// DELETE /api/staff/registration -> cancela a inscrição de staff (libera a vaga).
export const onRequestDelete: PagesFunction<StaffRegistrationEnv> = async context => {
  let body: Record<string, unknown>;
  try {
    body = (await context.request.json()) as Record<string, unknown>;
  } catch {
    return badRequest("invalid_json");
  }

  const cpf = (typeof body.cpf === "string" ? body.cpf : "").trim();
  if (!cpf || !isValidCpf(cpf)) {
    return badRequest("invalid_cpf");
  }

  const resolved = await resolveByCpf(context.env, cpf);
  if (!resolved.ok) return resolved.response;

  const result = await cancelStaffRegistration(context.env.DB, resolved.registration.id);
  if (!result.ok) {
    return json(result.status, { error: result.error });
  }

  return json(200, { status: "canceled" });
};
