/// <reference types="@cloudflare/workers-types" />
import { isValidEmail, isValidPhone } from "./validation";
import { canonicalizeCpf, isValidCpf } from "./cpfValidation";
import { encryptCpf } from "./cpfCrypto";
import {
  countActive,
  countActiveSleep,
  expirePending,
  getByCpfEncrypted,
} from "./registrations";
import { getCapacityLimits, CapacityEnv } from "./capacity";

export interface StaffRegistrationEnv extends CapacityEnv {
  DB: D1Database;
  CPF_ENCRYPTION_KEY?: string;
  CPF_ENCRYPTION_IV?: string;
}

export interface StaffRegistrationInput {
  email: string;
  name?: string;
  phone?: string;
  cpf?: string;
  dateOfBirth?: string;
  termsAccepted?: boolean;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  city?: string;
  state?: string;
  sleepAtMonastery?: boolean;
  companionName?: string;
  cep?: string;
  address?: string;
  number?: string;
  complement?: string;
  hasAllergyMedication?: boolean;
  allergyMedicationDetails?: string;
  hasDietaryRestriction?: boolean;
  dietaryRestrictionDetails?: string;
}

// Campos da inscrição que o staff pode editar (tudo menos email e CPF).
export interface EditableStaffInput {
  name?: string;
  phone?: string;
  dateOfBirth?: string;
  termsAccepted?: boolean;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  city?: string;
  state?: string;
  sleepAtMonastery?: boolean;
  companionName?: string;
  cep?: string;
  address?: string;
  number?: string;
  complement?: string;
  hasAllergyMedication?: boolean;
  allergyMedicationDetails?: string;
  hasDietaryRestriction?: boolean;
  dietaryRestrictionDetails?: string;
}

interface NormalizedEditable {
  name: string;
  phoneDigits: string;
  dateOfBirthNormalized: string;
  emergencyName: string;
  emergencyPhoneDigits: string;
  sleepFlag: 0 | 1;
  companionName: string | null;
  cep: string;
  address: string;
  number: string;
  complement: string | null;
  city: string;
  state: string;
  hasAllergy: 0 | 1;
  allergyDetails: string | null;
  hasDietary: 0 | 1;
  dietaryDetails: string | null;
}

export type StaffRegistrationResult =
  | { ok: true; registrationId: string; registrationNumber: string }
  | { ok: false; status: number; error: string };

export type StaffUpdateResult = { ok: true } | { ok: false; status: number; error: string };

function fail(status: number, error: string): { ok: false; status: number; error: string } {
  return { ok: false, status, error };
}

// Valida e normaliza os campos editáveis (comuns à criação e à edição).
function validateEditable(
  input: EditableStaffInput
): { error: string } | { value: NormalizedEditable } {
  const name = input.name?.trim();
  if (!name) return { error: "name_required" };

  if (!input.phone || !isValidPhone(input.phone)) return { error: "invalid_phone" };

  const rawDate = input.dateOfBirth?.trim();
  if (!rawDate) return { error: "date_of_birth_required" };
  const dateMatch = rawDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateMatch) return { error: "invalid_date_of_birth" };
  const [, y, m, d] = dateMatch;
  const dob = new Date(parseInt(y!, 10), parseInt(m!, 10) - 1, parseInt(d!, 10));
  const now = new Date();
  if (dob.getTime() > now.getTime()) return { error: "date_of_birth_future" };
  const age = (now.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  if (age < 1 || age > 120) return { error: "date_of_birth_invalid_range" };
  const dateOfBirthNormalized = `${y}-${m}-${d}`;

  if (input.termsAccepted !== true) return { error: "terms_required" };

  const emergencyName = input.emergencyContactName?.trim();
  if (!emergencyName) return { error: "emergency_contact_name_required" };
  const phoneDigits = (input.phone ?? "").replace(/\D/g, "");
  const emergencyPhoneDigits = (input.emergencyContactPhone ?? "").replace(/\D/g, "");
  if (emergencyPhoneDigits.length !== 11) return { error: "emergency_contact_phone_invalid" };
  if (phoneDigits === emergencyPhoneDigits) {
    return { error: "emergency_contact_phone_same_as_registration_phone" };
  }

  if (typeof input.hasAllergyMedication !== "boolean") {
    return { error: "allergy_medication_required" };
  }
  const allergyDetails = input.allergyMedicationDetails?.trim() || null;
  if (input.hasAllergyMedication && !allergyDetails) {
    return { error: "allergy_medication_details_required" };
  }

  if (typeof input.hasDietaryRestriction !== "boolean") {
    return { error: "dietary_restriction_required" };
  }
  const dietaryDetails = input.dietaryRestrictionDetails?.trim() || null;
  if (input.hasDietaryRestriction && !dietaryDetails) {
    return { error: "dietary_restriction_details_required" };
  }

  return {
    value: {
      name,
      phoneDigits,
      dateOfBirthNormalized,
      emergencyName,
      emergencyPhoneDigits,
      sleepFlag: input.sleepAtMonastery ? 1 : 0,
      companionName: input.companionName?.trim() || null,
      cep: input.cep?.trim() ?? "",
      address: input.address?.trim() ?? "",
      number: input.number?.trim() ?? "",
      complement: input.complement?.trim() || null,
      city: input.city?.trim() ?? "",
      state: input.state?.trim() ?? "",
      hasAllergy: input.hasAllergyMedication ? 1 : 0,
      allergyDetails: input.hasAllergyMedication ? allergyDetails : null,
      hasDietary: input.hasDietaryRestriction ? 1 : 0,
      dietaryDetails: input.hasDietaryRestriction ? dietaryDetails : null,
    },
  };
}

// Gera um número de inscrição sequencial exclusivo para staff (S-001-2026),
// contando apenas inscrições de staff já confirmadas do ano.
async function generateStaffRegistrationNumber(DB: D1Database): Promise<string> {
  const year = new Date().getFullYear();
  const result = await DB.prepare(
    "SELECT COUNT(*) as count FROM registrations WHERE registration_number LIKE ? AND status = 'PAID'"
  )
    .bind(`S-%-${year}`)
    .first<{ count: number }>();
  const next = (result?.count ?? 0) + 1;
  return `S-${String(next).padStart(3, "0")}-${year}`;
}

// Cria (ou converte uma inscrição pendente do mesmo CPF em) uma inscrição de staff
// gratuita, já confirmada como PAID. Respeita a capacidade do grupo correto
// (mosteiro x geral) conforme o staff dorme ou não no mosteiro.
export async function createStaffRegistration(
  env: StaffRegistrationEnv,
  input: StaffRegistrationInput
): Promise<StaffRegistrationResult> {
  const email = input.email?.trim().toLowerCase();
  if (!email || !isValidEmail(email)) return fail(400, "invalid_email");

  if (!input.cpf || !isValidCpf(input.cpf)) return fail(400, "invalid_cpf");

  const validated = validateEditable(input);
  if ("error" in validated) return fail(400, validated.error);
  const v = validated.value;

  let cpfEncrypted: string;
  try {
    const key = env.CPF_ENCRYPTION_KEY;
    const iv = env.CPF_ENCRYPTION_IV;
    if (!key || !iv) return fail(500, "cpf_encryption_not_configured");
    cpfEncrypted = await encryptCpf(canonicalizeCpf(input.cpf), key, iv);
  } catch (error: any) {
    console.error("Erro ao criptografar CPF (staff):", error?.message || error);
    return fail(500, "cpf_encryption_failed");
  }

  await expirePending(env.DB);

  const existing = await getByCpfEncrypted(env.DB, cpfEncrypted);
  if (existing) {
    const isActive = existing.status === "PAID" || existing.status === "PENDING";
    // Validação cruzada: um CPF com inscrição ativa de peregrino não pode se
    // inscrever como staff sem antes cancelar a inscrição de peregrino.
    if (isActive && existing.is_staff === 0) {
      return fail(409, "registered_as_peregrino");
    }
    const hasDifferentName = Boolean(
      existing.name && existing.name.trim().toLowerCase() !== v.name.toLowerCase()
    );
    if (hasDifferentName) return fail(409, "cpf_already_registered");
    if (isActive) return fail(409, "registration_exists");
  }

  // Capacidade: staff conta no total. Desconta a inscrição pendente do próprio
  // CPF, caso exista, e checa o balde correto (mosteiro x geral).
  const { maxRegistrationsWithoutSleep, maxRegistrationsWithSleep } = getCapacityLimits(env);
  let total = await countActive(env.DB);
  let sleepers = await countActiveSleep(env.DB);
  if (existing && existing.status === "PENDING") {
    total = Math.max(0, total - 1);
    if (existing.sleep_at_monastery === 1) {
      sleepers = Math.max(0, sleepers - 1);
    }
  }
  const nonSleepers = Math.max(0, total - sleepers);

  if (v.sleepFlag) {
    if (sleepers >= maxRegistrationsWithSleep) return fail(409, "monastery_full");
  } else if (nonSleepers >= maxRegistrationsWithoutSleep) {
    return fail(409, "registrations_full");
  }

  const nowIso = new Date().toISOString();
  const registrationNumber = await generateStaffRegistrationNumber(env.DB);

  try {
    if (existing) {
      await env.DB.prepare(
        `UPDATE registrations SET
           name = ?1, email = ?2, status = 'PAID', payment_provider = 'cortesia',
           payment_ref = NULL, sleep_at_monastery = ?3, companion_name = ?4, phone = ?5,
           cep = ?6, address = ?7, number = ?8, complement = ?9, city = ?10, state = ?11,
           date_of_birth = ?12, terms_accepted_at = ?13, emergency_contact_name = ?14,
           emergency_contact_phone = ?15, has_allergy_medication = ?16,
           allergy_medication_details = ?17, has_dietary_restriction = ?18,
           dietary_restriction_details = ?19, is_staff = 1, registration_number = ?20,
           paid_at = ?21
         WHERE id = ?22`
      )
        .bind(
          v.name,
          email,
          v.sleepFlag,
          v.companionName,
          v.phoneDigits,
          v.cep,
          v.address,
          v.number,
          v.complement,
          v.city,
          v.state,
          v.dateOfBirthNormalized,
          nowIso,
          v.emergencyName,
          v.emergencyPhoneDigits,
          v.hasAllergy,
          v.allergyDetails,
          v.hasDietary,
          v.dietaryDetails,
          registrationNumber,
          nowIso,
          existing.id
        )
        .run();

      return { ok: true, registrationId: existing.id, registrationNumber };
    }

    const id = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO registrations (
         id, email, name, status, payment_provider, payment_ref, sleep_at_monastery,
         companion_name, phone, cep, address, number, complement, city, state,
         cpf_encrypted, date_of_birth, terms_accepted_at, emergency_contact_name,
         emergency_contact_phone, has_allergy_medication, allergy_medication_details,
         has_dietary_restriction, dietary_restriction_details, is_staff,
         registration_number, created_at, paid_at
       ) VALUES (?1, ?2, ?3, 'PAID', 'cortesia', NULL, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11,
         ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, 1, ?22, datetime('now'), ?23)`
    )
      .bind(
        id,
        email,
        v.name,
        v.sleepFlag,
        v.companionName,
        v.phoneDigits,
        v.cep,
        v.address,
        v.number,
        v.complement,
        v.city,
        v.state,
        cpfEncrypted,
        v.dateOfBirthNormalized,
        nowIso,
        v.emergencyName,
        v.emergencyPhoneDigits,
        v.hasAllergy,
        v.allergyDetails,
        v.hasDietary,
        v.dietaryDetails,
        registrationNumber,
        nowIso
      )
      .run();

    return { ok: true, registrationId: id, registrationNumber };
  } catch (error) {
    const message = (error as Error).message || "unknown_error";
    if (message.includes("UNIQUE constraint failed")) {
      if (message.includes("registrations.cpf_encrypted")) {
        return fail(409, "cpf_already_registered");
      }
      if (message.includes("registration_number")) {
        return fail(500, "registration_number_conflict");
      }
      return fail(409, "registration_exists");
    }
    console.error("Erro ao salvar inscrição de staff:", message);
    return fail(500, "staff_registration_failed");
  }
}

// Cancela uma inscrição de staff (status CANCELED). Como a capacidade conta apenas
// PENDING/PAID, cancelar libera a vaga automaticamente para outra pessoa.
export async function cancelStaffRegistration(
  DB: D1Database,
  registrationId: string
): Promise<StaffUpdateResult> {
  try {
    await DB.prepare(
      "UPDATE registrations SET status = 'CANCELED' WHERE id = ? AND is_staff = 1"
    )
      .bind(registrationId)
      .run();
    return { ok: true };
  } catch (error) {
    console.error("Erro ao cancelar inscrição de staff:", (error as Error).message);
    return fail(500, "staff_cancel_failed");
  }
}

export interface StaffRegistrationRow {
  id: string;
  email: string;
  name: string;
  phone: string;
  sleep_at_monastery: number;
  companion_name: string | null;
  cep: string;
  address: string;
  number: string;
  complement: string | null;
  city: string;
  state: string;
  cpf_encrypted: string | null;
  date_of_birth: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  has_allergy_medication: number;
  allergy_medication_details: string | null;
  has_dietary_restriction: number;
  dietary_restriction_details: string | null;
  registration_number: string | null;
  is_staff: number;
}

const STAFF_REGISTRATION_COLUMNS = `id, email, name, phone, sleep_at_monastery, companion_name,
  cep, address, number, complement, city, state, cpf_encrypted, date_of_birth,
  emergency_contact_name, emergency_contact_phone, has_allergy_medication,
  allergy_medication_details, has_dietary_restriction, dietary_restriction_details,
  registration_number, is_staff`;

export async function getStaffRegistrationById(
  DB: D1Database,
  id: string
): Promise<StaffRegistrationRow | null> {
  const row = await DB.prepare(
    `SELECT ${STAFF_REGISTRATION_COLUMNS} FROM registrations WHERE id = ? AND is_staff = 1`
  )
    .bind(id)
    .first<StaffRegistrationRow>();
  return row ?? null;
}

export async function getStaffRegistrationByCpfEncrypted(
  DB: D1Database,
  cpfEncrypted: string
): Promise<StaffRegistrationRow | null> {
  const row = await DB.prepare(
    `SELECT ${STAFF_REGISTRATION_COLUMNS} FROM registrations WHERE cpf_encrypted = ? AND is_staff = 1`
  )
    .bind(cpfEncrypted)
    .first<StaffRegistrationRow>();
  return row ?? null;
}

// Atualiza os campos editáveis de uma inscrição de staff já existente. Não altera
// email nem CPF. Se o staff trocar de grupo (mosteiro x geral), revalida a
// capacidade do grupo de destino antes de salvar.
export async function updateStaffRegistration(
  env: StaffRegistrationEnv,
  registrationId: string,
  input: EditableStaffInput
): Promise<StaffUpdateResult> {
  const current = await getStaffRegistrationById(env.DB, registrationId);
  if (!current) return fail(404, "registration_not_found");

  const validated = validateEditable(input);
  if ("error" in validated) return fail(400, validated.error);
  const v = validated.value;

  // Se mudou de grupo, garante que o grupo de destino tem vaga (excluindo o próprio).
  if (v.sleepFlag !== current.sleep_at_monastery) {
    const { maxRegistrationsWithoutSleep, maxRegistrationsWithSleep } = getCapacityLimits(env);
    const total = await countActive(env.DB);
    const sleepers = await countActiveSleep(env.DB);
    if (v.sleepFlag === 1) {
      // Passa a dormir no mosteiro: sleepers ainda não conta este registro.
      if (sleepers >= maxRegistrationsWithSleep) return fail(409, "monastery_full");
    } else {
      // Deixa de dormir: nonSleepers ainda não conta este registro.
      const nonSleepers = Math.max(0, total - sleepers);
      if (nonSleepers >= maxRegistrationsWithoutSleep) return fail(409, "registrations_full");
    }
  }

  try {
    await env.DB.prepare(
      `UPDATE registrations SET
         name = ?1, phone = ?2, sleep_at_monastery = ?3, companion_name = ?4, cep = ?5,
         address = ?6, number = ?7, complement = ?8, city = ?9, state = ?10,
         date_of_birth = ?11, emergency_contact_name = ?12, emergency_contact_phone = ?13,
         has_allergy_medication = ?14, allergy_medication_details = ?15,
         has_dietary_restriction = ?16, dietary_restriction_details = ?17
       WHERE id = ?18 AND is_staff = 1`
    )
      .bind(
        v.name,
        v.phoneDigits,
        v.sleepFlag,
        v.companionName,
        v.cep,
        v.address,
        v.number,
        v.complement,
        v.city,
        v.state,
        v.dateOfBirthNormalized,
        v.emergencyName,
        v.emergencyPhoneDigits,
        v.hasAllergy,
        v.allergyDetails,
        v.hasDietary,
        v.dietaryDetails,
        registrationId
      )
      .run();
    return { ok: true };
  } catch (error) {
    console.error("Erro ao atualizar inscrição de staff:", (error as Error).message);
    return fail(500, "staff_update_failed");
  }
}
