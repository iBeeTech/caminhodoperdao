/**
 * Tipos compartilhados para Landing Page
 */

import React from "react";

export type FieldRefsType = {
  name: React.RefObject<HTMLInputElement | null>;
  email: React.RefObject<HTMLInputElement | null>;
  cpf: React.RefObject<HTMLInputElement | null>;
  gender: React.RefObject<HTMLSelectElement | null>;
  dateOfBirth: React.RefObject<HTMLInputElement | null>;
  phone: React.RefObject<HTMLInputElement | null>;
  cep: React.RefObject<HTMLInputElement | null>;
  address: React.RefObject<HTMLInputElement | null>;
  number: React.RefObject<HTMLInputElement | null>;
  complement: React.RefObject<HTMLInputElement | null>;
  city: React.RefObject<HTMLInputElement | null>;
  state: React.RefObject<HTMLInputElement | null>;
  sleepAtMonastery: React.RefObject<HTMLSelectElement | null>;
  termsAccepted: React.RefObject<HTMLInputElement | null>;
  companionRef: React.RefObject<HTMLInputElement | null>;
  allergyMedicationYes: React.RefObject<HTMLInputElement | null>;
  allergyMedicationNo: React.RefObject<HTMLInputElement | null>;
  allergyMedication: React.RefObject<HTMLInputElement | null>;
  allergyMedicationDetails: React.RefObject<HTMLInputElement | null>;
  dietaryRestrictionYes: React.RefObject<HTMLInputElement | null>;
  dietaryRestrictionNo: React.RefObject<HTMLInputElement | null>;
  dietaryRestriction: React.RefObject<HTMLInputElement | null>;
  dietaryRestrictionDetails: React.RefObject<HTMLInputElement | null>;
  emergencyContactName: React.RefObject<HTMLInputElement | null>;
  emergencyContactPhone: React.RefObject<HTMLInputElement | null>;
};

export type ErrorMap = Record<string, string>;

export type ValidationResult = {
  isValid: boolean;
  errors: ErrorMap;
};

export interface RegistrationFormData {
  name: string;
  email: string;
  cpf: string;
  gender: string;
  dateOfBirth: string;
  phone: string;
  cep: string;
  address: string;
  number: string;
  complement: string;
  city: string;
  state: string;
  sleepAtMonastery: boolean;
  hasAllergyMedication: boolean;
  allergyMedicationDetails: string;
  hasDietaryRestriction: boolean;
  dietaryRestrictionDetails: string;
}

export type RegistrationStatusResponse = {
  exists?: boolean;
  status?: string;
  message?: string;
  qrCodeText?: string | null;
  qrCodeImageUrl?: string | null;
  expired?: boolean;
  name?: string;
  email?: string;
  phone?: string;
  cep?: string;
  address?: string;
  number?: string;
  complement?: string | null;
  city?: string;
  state?: string;
  date_of_birth?: string;
  sleep_at_monastery?: 0 | 1 | number;
  companion_name?: string | null;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  has_allergy_medication?: 0 | 1 | number;
  allergy_medication_details?: string | null;
  has_dietary_restriction?: 0 | 1 | number;
  dietary_restriction_details?: string | null;
};
