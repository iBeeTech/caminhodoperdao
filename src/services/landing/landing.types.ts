export interface AvailabilityResponse {
  totalFull: boolean;
  monasteryFull: boolean;
}

export interface RegistrationStatusResponse {
  exists: boolean;
  email?: string;
  name?: string;
  status?: string;
  expired?: boolean;
  qrCodeText?: string | null;
  qrCodeImageUrl?: string | null;
  payment_ref?: string | null;
  sleep_at_monastery?: number;
  phone?: string;
  cep?: string;
  address?: string;
  number?: string;
  complement?: string | null;
  city?: string;
  state?: string;
  date_of_birth?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  has_allergy_medication?: number;
  allergy_medication_details?: string;
  has_dietary_restriction?: number;
  dietary_restriction_details?: string;
  message?: string;
}

export interface RegistrationPayload {
  name: string;
  email: string;
  cpf: string;
  dateOfBirth: string;
  phone: string;
  cep: string;
  address: string;
  number: string;
  complement?: string;
  city: string;
  state: string;
  sleepAtMonastery: boolean;
  companionName?: string;
  termsAccepted: boolean;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  hasAllergyMedication: boolean;
  allergyMedicationDetails?: string;
  hasDietaryRestriction: boolean;
  dietaryRestrictionDetails?: string;
}

export interface RegistrationResponse {
  status?: string;
  registration_id?: string;
  qrCodeText?: string | null;
  qrCodeImageUrl?: string | null;
  message?: string;
}
