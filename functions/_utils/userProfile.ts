/// <reference types="@cloudflare/workers-types" />
import { isValidEmail, isValidPhone, normalizePhone } from "./validation";
import { isValidCpf } from "./cpfValidation";

/**
 * Os dados pessoais que moram na CONTA do peregrino (migration 030).
 *
 * A lista de campos vive aqui, e só aqui, porque ela é usada em três lugares:
 * ler o perfil, gravar o perfil e (quando existir) pré-preencher a inscrição.
 * Repetida em três arquivos, ela divergiria no primeiro campo novo.
 */

export interface UserProfileRow {
  name: string | null;
  phone: string | null;
  cpf_encrypted: string | null;
  gender: string | null;
  date_of_birth: string | null;
  cep: string | null;
  address: string | null;
  number: string | null;
  complement: string | null;
  city: string | null;
  state: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  has_allergy_medication: number;
  allergy_medication_details: string | null;
  has_dietary_restriction: number;
  dietary_restriction_details: string | null;
  refund_pix_key: string | null;
  refund_pix_type: string | null;
  years_declared_at: number | null;
  profile_prompted_at: number | null;
  is_staff: number;
  is_admin: number;
  photo_updated_at: number | null;
}

/** O que a tela recebe. Sem `cpf_encrypted`: cifra não vai para o navegador. */
export interface UserProfileView {
  name: string;
  phone: string;
  gender: string;
  dateOfBirth: string;
  cep: string;
  address: string;
  number: string;
  complement: string;
  city: string;
  state: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  hasAllergyMedication: boolean;
  allergyMedicationDetails: string;
  hasDietaryRestriction: boolean;
  dietaryRestrictionDetails: string;
  refundPixKey: string;
  refundPixType: string;
}

export const USER_PROFILE_COLUMNS = `
  name, phone, cpf_encrypted, gender, date_of_birth, cep, address, number,
  complement, city, state, emergency_contact_name, emergency_contact_phone,
  has_allergy_medication, allergy_medication_details,
  has_dietary_restriction, dietary_restriction_details,
  refund_pix_key, refund_pix_type, years_declared_at,
  profile_prompted_at, is_staff, is_admin, photo_updated_at
`;

/** Tamanho máximo de campo de texto livre. Corta payload absurdo na entrada. */
const MAX_TEXT = 200;
const MAX_DETAILS = 500;

/** Os tipos de chave PIX que o banco entende. */
const PIX_TYPES = ["cpf", "celular", "email", "aleatoria"];

export function toProfileView(row: UserProfileRow): UserProfileView {
  return {
    name: row.name ?? "",
    phone: row.phone ?? "",
    gender: row.gender ?? "",
    dateOfBirth: row.date_of_birth ?? "",
    cep: row.cep ?? "",
    address: row.address ?? "",
    number: row.number ?? "",
    complement: row.complement ?? "",
    city: row.city ?? "",
    state: row.state ?? "",
    emergencyContactName: row.emergency_contact_name ?? "",
    emergencyContactPhone: row.emergency_contact_phone ?? "",
    hasAllergyMedication: row.has_allergy_medication === 1,
    allergyMedicationDetails: row.allergy_medication_details ?? "",
    hasDietaryRestriction: row.has_dietary_restriction === 1,
    dietaryRestrictionDetails: row.dietary_restriction_details ?? "",
    refundPixKey: row.refund_pix_key ?? "",
    refundPixType: row.refund_pix_type ?? "",
  };
}

export type ProfileValidation =
  | { ok: true; value: UserProfileView }
  | { ok: false; error: string };

/**
 * Valida o que veio da tela. Campo em branco é aceito de propósito: o perfil
 * nasce vazio e a pessoa preenche aos poucos. O que NÃO passa é dado
 * malformado — telefone que não é telefone, data que não é data —, porque é
 * isso que quebra a inscrição lá na frente, longe daqui.
 */
export function validateProfile(input: unknown): ProfileValidation {
  if (typeof input !== "object" || input === null) {
    return { ok: false, error: "invalid_profile" };
  }
  const raw = input as Record<string, unknown>;

  const text = (key: string, max = MAX_TEXT): string =>
    typeof raw[key] === "string" ? (raw[key] as string).trim().slice(0, max) : "";
  const flag = (key: string): boolean => raw[key] === true;

  const phone = normalizePhone(text("phone"));
  if (phone && !isValidPhone(phone)) return { ok: false, error: "invalid_phone" };

  const emergencyPhone = normalizePhone(text("emergencyContactPhone"));
  if (emergencyPhone && !isValidPhone(emergencyPhone)) {
    return { ok: false, error: "invalid_emergency_phone" };
  }

  const dateOfBirth = text("dateOfBirth", 10);
  if (dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
    return { ok: false, error: "invalid_date_of_birth" };
  }

  const gender = text("gender", 20);
  if (gender && !["masculino", "feminino", "outro"].includes(gender)) {
    return { ok: false, error: "invalid_gender" };
  }

  const state = text("state", 2).toUpperCase();
  if (state && !/^[A-Z]{2}$/.test(state)) return { ok: false, error: "invalid_state" };

  const cep = text("cep", 9).replace(/\D/g, "");
  if (cep && cep.length !== 8) return { ok: false, error: "invalid_cep" };

  const hasAllergyMedication = flag("hasAllergyMedication");
  const hasDietaryRestriction = flag("hasDietaryRestriction");

  const refundPixType = text("refundPixType", 20);
  if (refundPixType && !PIX_TYPES.includes(refundPixType)) {
    return { ok: false, error: "invalid_pix_type" };
  }

  // CPF e celular vão só com números, como o banco espera. E-mail e aleatória
  // ficam como vieram — a chave aleatória é um UUID e o e-mail tem ponto.
  const rawPixKey = text("refundPixKey", 100);
  const refundPixKey =
    refundPixType === "cpf" || refundPixType === "celular"
      ? rawPixKey.replace(/\D/g, "")
      : rawPixKey;

  // Chave sem tipo, ou tipo sem chave, é meio caminho — e meio caminho aqui
  // significa dinheiro parado esperando alguém adivinhar o resto.
  if (refundPixKey && !refundPixType) return { ok: false, error: "missing_pix_type" };
  if (refundPixType && !refundPixKey) return { ok: false, error: "missing_pix_key" };

  if (refundPixType === "cpf" && !isValidCpf(refundPixKey)) {
    return { ok: false, error: "invalid_pix_cpf" };
  }
  if (refundPixType === "celular" && !isValidPhone(refundPixKey)) {
    return { ok: false, error: "invalid_pix_phone" };
  }
  if (refundPixType === "email" && refundPixKey && !isValidEmail(refundPixKey)) {
    return { ok: false, error: "invalid_pix_email" };
  }

  return {
    ok: true,
    value: {
      name: text("name"),
      phone,
      gender,
      dateOfBirth,
      cep,
      address: text("address"),
      number: text("number", 20),
      complement: text("complement", 100),
      city: text("city"),
      state,
      emergencyContactName: text("emergencyContactName"),
      emergencyContactPhone: emergencyPhone,
      hasAllergyMedication,
      // Detalhe sem o "sim" marcado é lixo que confunde quem lê o relatório na
      // véspera do evento: some junto com a resposta.
      allergyMedicationDetails: hasAllergyMedication
        ? text("allergyMedicationDetails", MAX_DETAILS)
        : "",
      hasDietaryRestriction,
      dietaryRestrictionDetails: hasDietaryRestriction
        ? text("dietaryRestrictionDetails", MAX_DETAILS)
        : "",
      refundPixKey,
      refundPixType,
    },
  };
}

/** Vazio vira NULL: coluna com "" e coluna com NULL contando como o mesmo. */
function nullify(value: string): string | null {
  return value === "" ? null : value;
}

/** Os binds do UPDATE, na ordem em que o SQL de `PUT /api/me` os espera. */
export function profileBindings(profile: UserProfileView): (string | number | null)[] {
  return [
    nullify(profile.name),
    nullify(profile.phone),
    nullify(profile.gender),
    nullify(profile.dateOfBirth),
    nullify(profile.cep),
    nullify(profile.address),
    nullify(profile.number),
    nullify(profile.complement),
    nullify(profile.city),
    nullify(profile.state),
    nullify(profile.emergencyContactName),
    nullify(profile.emergencyContactPhone),
    profile.hasAllergyMedication ? 1 : 0,
    nullify(profile.allergyMedicationDetails),
    profile.hasDietaryRestriction ? 1 : 0,
    nullify(profile.dietaryRestrictionDetails),
    nullify(profile.refundPixKey),
    nullify(profile.refundPixType),
  ];
}
