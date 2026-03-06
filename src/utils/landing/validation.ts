/**
 * Validações para formulários da Landing
 * 
 * Funções puras que retornam ValidationResult
 */

import { isEmailValid } from "../validators/email";
import { isValidCpf } from "../validators/cpf";
import { getFieldValue } from "../dom/forms";
import type { FieldRefsType, ValidationResult, ErrorMap } from "./types";

/**
 * Valida o formulário de "Check Status" (por CPF e nome)
 */
export function validateCheckForm(
  t: (key: string) => string,
  refs: Pick<FieldRefsType, "name" | "cpf">
): ValidationResult {
  const errors: ErrorMap = {};
  
  const name = getFieldValue(refs.name.current);
  const cpf = getFieldValue(refs.cpf.current);

  if (!name) {
    errors.name = t("signup.errors.required");
  }
  
  if (!cpf) {
    errors.cpf = t("signup.errors.required");
  } else if (!isValidCpf(cpf)) {
    errors.cpf = t("signup.errors.cpfInvalid");
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Valida o formulário de "Registro Completo"
 * 
 * @param t - Função de tradução i18n
 * @param refs - Referências aos campos
 * @param options - Opções adicionais (ex: monasteryFull, alreadySleeper)
 * @returns ValidationResult com status de validação e erros
 */
export function validateRegistrationForm(
  t: (key: string) => string,
  refs: FieldRefsType,
  options?: {
    isMonasterySlotUnavailable?: boolean;
    monasteryFull?: boolean;
    alreadySleeper?: boolean;
  }
): ValidationResult {
  const errors: ErrorMap = {};
  const phoneDigits = getFieldValue(refs.phone.current).replace(/\D/g, "");
  const cepDigits = getFieldValue(refs.cep.current).replace(/\D/g, "");

  const requiredFields: Array<{
    key: keyof FieldRefsType;
    value: string;
    message: string;
    validator?: (value: string) => boolean;
  }> = [
    {
      key: "name",
      value: getFieldValue(refs.name.current),
      message: t("signup.errors.required"),
    },
    {
      key: "email",
      value: getFieldValue(refs.email.current),
      message: t("signup.errors.emailInvalid"),
      validator: isEmailValid,
    },
    {
      key: "cpf",
      value: getFieldValue(refs.cpf.current),
      message: t("signup.errors.cpfInvalid"),
      validator: (v) => isValidCpf(v),
    },
    {
      key: "dateOfBirth",
      value: getFieldValue(refs.dateOfBirth.current),
      message: t("signup.errors.dateOfBirthInvalid"),
      validator: (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(new Date(v).getTime()),
    },
    {
      key: "phone",
      value: phoneDigits,
      message: t("signup.errors.phoneInvalid"),
      validator: (v) => v.length === 11,
    },
    {
      key: "cep",
      value: cepDigits,
      message: t("signup.errors.cepInvalid"),
      validator: (v) => v.length === 8,
    },
    {
      key: "address",
      value: getFieldValue(refs.address.current),
      message: t("signup.errors.required"),
    },
    {
      key: "number",
      value: getFieldValue(refs.number.current),
      message: t("signup.errors.required"),
    },
    {
      key: "city",
      value: getFieldValue(refs.city.current),
      message: t("signup.errors.required"),
    },
    {
      key: "state",
      value: getFieldValue(refs.state.current),
      message: t("signup.errors.required"),
    },
    {
      key: "emergencyContactName",
      value: getFieldValue(refs.emergencyContactName?.current ?? null),
      message: t("signup.errors.emergencyContactNameRequired"),
    },
    {
      key: "emergencyContactPhone",
      value: (getFieldValue(refs.emergencyContactPhone?.current ?? null) || "").replace(/\D/g, ""),
      message: t("signup.errors.emergencyContactPhoneInvalid"),
      validator: (v) => v.length === 11,
    },
  ];

  requiredFields.forEach((field) => {
    const isValid = field.validator ? field.validator(field.value) : !!field.value;
    if (!isValid) {
      errors[field.key] = field.message;
    }
  });

  // Validar sleep at monastery
  const isMonasteryUnavailable = options?.isMonasterySlotUnavailable ?? false;
  const sleepSelection = isMonasteryUnavailable
    ? "no"
    : getFieldValue(refs.sleepAtMonastery.current);

  if (!sleepSelection) {
    errors.sleepAtMonastery = t("signup.errors.sleepRequired");
  } else   if (
    sleepSelection === "yes" &&
    options?.monasteryFull &&
    !options?.alreadySleeper
  ) {
    errors.sleepAtMonastery = t("signup.errors.sleepFull");
  }

  // Termos de Responsabilidade
  const termsChecked = refs.termsAccepted?.current?.checked === true;
  if (!termsChecked) {
    errors.termsAccepted = t("signup.errors.termsRequired");
  }

  const hasAllergyMedicationYes = refs.allergyMedicationYes?.current?.checked === true;
  const hasAllergyMedicationNo = refs.allergyMedicationNo?.current?.checked === true;
  if (!hasAllergyMedicationYes && !hasAllergyMedicationNo) {
    errors.allergyMedication = t("signup.errors.allergyMedicationRequired");
  }
  if (hasAllergyMedicationYes) {
    const allergyDetails = getFieldValue(refs.allergyMedicationDetails?.current ?? null);
    if (!allergyDetails) {
      errors.allergyMedicationDetails = t("signup.errors.allergyMedicationDetailsRequired");
    }
  }

  const hasDietaryRestrictionYes = refs.dietaryRestrictionYes?.current?.checked === true;
  const hasDietaryRestrictionNo = refs.dietaryRestrictionNo?.current?.checked === true;
  if (!hasDietaryRestrictionYes && !hasDietaryRestrictionNo) {
    errors.dietaryRestriction = t("signup.errors.dietaryRestrictionRequired");
  }
  if (hasDietaryRestrictionYes) {
    const dietaryDetails = getFieldValue(refs.dietaryRestrictionDetails?.current ?? null);
    if (!dietaryDetails) {
      errors.dietaryRestrictionDetails = t("signup.errors.dietaryRestrictionDetailsRequired");
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

const validationUtils = {
  validateCheckForm,
  validateRegistrationForm,
};
export default validationUtils;
