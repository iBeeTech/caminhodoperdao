/**
 * Validações para formulários da Landing
 * 
 * Funções puras que retornam ValidationResult
 */

import { isEmailValid } from "../validators/email";
import { getFieldValue } from "../dom/forms";
import type { FieldRefsType, ValidationResult, ErrorMap } from "./types";

/**
 * Valida o formulário de "Check Status"
 * 
 * @param t - Função de tradução i18n
 * @param refs - Referências aos campos
 * @returns ValidationResult com status de validação e erros
 */
export function validateCheckForm(
  t: (key: string) => string,
  refs: Pick<FieldRefsType, "name" | "email">
): ValidationResult {
  const errors: ErrorMap = {};
  
  const name = getFieldValue(refs.name.current);
  const email = getFieldValue(refs.email.current);

  if (!name) {
    errors.name = t("signup.errors.required");
  }
  
  if (!email) {
    errors.email = t("signup.errors.required");
  } else if (!isEmailValid(email)) {
    errors.email = t("signup.errors.emailInvalid");
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
  } else if (
    sleepSelection === "yes" &&
    options?.monasteryFull &&
    !options?.alreadySleeper
  ) {
    errors.sleepAtMonastery = t("signup.errors.sleepFull");
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

export default {
  validateCheckForm,
  validateRegistrationForm,
};
