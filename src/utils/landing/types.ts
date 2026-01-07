/**
 * Tipos compartilhados para Landing Page
 */

import React from "react";

export type FieldRefsType = {
  name: React.RefObject<HTMLInputElement | null>;
  email: React.RefObject<HTMLInputElement | null>;
  phone: React.RefObject<HTMLInputElement | null>;
  cep: React.RefObject<HTMLInputElement | null>;
  address: React.RefObject<HTMLInputElement | null>;
  number: React.RefObject<HTMLInputElement | null>;
  complement: React.RefObject<HTMLInputElement | null>;
  city: React.RefObject<HTMLInputElement | null>;
  state: React.RefObject<HTMLInputElement | null>;
  sleepAtMonastery: React.RefObject<HTMLSelectElement | null>;
};

export type ErrorMap = Record<string, string>;

export type ValidationResult = {
  isValid: boolean;
  errors: ErrorMap;
};

export interface RegistrationFormData {
  name: string;
  email: string;
  phone: string;
  cep: string;
  address: string;
  number: string;
  complement: string;
  city: string;
  state: string;
  sleepAtMonastery: boolean;
}

export type RegistrationStatusResponse = {
  exists?: boolean;
  status?: string;
  message?: string;
  qrCodeText?: string | null;
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
  sleep_at_monastery?: 0 | 1 | number;
};
