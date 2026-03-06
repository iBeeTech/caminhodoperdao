/**
 * Sincronizar dados de status com refs de formulário
 */

import { formatPhoneBR } from "../formatters/phone";
import { formatCepBR } from "../formatters/cep";
import type { FieldRefsType, RegistrationStatusResponse } from "./types";

/**
 * Mapeia dados de resposta do backend para os refs do formulário
 */
export function syncFormWithStatus(
  data: RegistrationStatusResponse,
  refs: FieldRefsType
): void {
  const assign = (ref: FieldRefsType[keyof FieldRefsType], value?: string | null) => {
    const element = ref.current as HTMLInputElement | HTMLSelectElement | null;
    if (element) {
      element.value = value ?? "";
    }
  };

  if (data.name) assign(refs.name, data.name);
  if (data.email) assign(refs.email, data.email);
  if (refs.dateOfBirth && data.date_of_birth) assign(refs.dateOfBirth, data.date_of_birth);
  assign(refs.phone, data.phone ? formatPhoneBR(data.phone) : "");
  assign(refs.cep, data.cep ? formatCepBR(data.cep) : "");
  assign(refs.address, data.address ?? "");
  assign(refs.number, data.number ?? "");
  assign(refs.complement, data.complement ?? "");
  assign(refs.city, data.city ?? "");
  assign(refs.state, data.state ?? "");

  if (refs.emergencyContactName && data.emergency_contact_name) assign(refs.emergencyContactName, data.emergency_contact_name);
  if (refs.emergencyContactPhone && data.emergency_contact_phone) assign(refs.emergencyContactPhone, data.emergency_contact_phone);

  const hasAllergyMedication = data.has_allergy_medication === 1;
  if (refs.allergyMedicationYes?.current) refs.allergyMedicationYes.current.checked = hasAllergyMedication;
  if (refs.allergyMedicationNo?.current) refs.allergyMedicationNo.current.checked = data.has_allergy_medication === 0;
  assign(refs.allergyMedicationDetails, data.allergy_medication_details ?? "");

  const hasDietaryRestriction = data.has_dietary_restriction === 1;
  if (refs.dietaryRestrictionYes?.current) refs.dietaryRestrictionYes.current.checked = hasDietaryRestriction;
  if (refs.dietaryRestrictionNo?.current) refs.dietaryRestrictionNo.current.checked = data.has_dietary_restriction === 0;
  assign(refs.dietaryRestrictionDetails, data.dietary_restriction_details ?? "");

  if (refs.sleepAtMonastery.current) {
    refs.sleepAtMonastery.current.value =
      data.sleep_at_monastery === 1 ? "yes" : data.sleep_at_monastery === 0 ? "no" : "";
  }
}

export default syncFormWithStatus;
