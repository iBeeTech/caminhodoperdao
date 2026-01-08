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
  payment_ref?: string | null;
  sleep_at_monastery?: number;
  phone?: string;
  cep?: string;
  address?: string;
  number?: string;
  complement?: string | null;
  city?: string;
  state?: string;
  message?: string;
}

export interface RegistrationPayload {
  name: string;
  email: string;
  phone: string;
  cep: string;
  address: string;
  number: string;
  complement?: string;
  city: string;
  state: string;
  sleepAtMonastery: boolean;
  companionName?: string;
}

export interface RegistrationResponse {
  status?: string;
  registration_id?: string;
  qrCodeText?: string | null;
  message?: string;
}
