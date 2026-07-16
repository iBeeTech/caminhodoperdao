export interface AvailabilityResponse {
  totalFull: boolean;
  monasteryFull: boolean;
  // Camas pagas de pernoite ocupadas e teto — usados para calcular vagas livres.
  sleepers?: number;
  monasteryLimit?: number;
}

export interface RegistrationStatusResponse {
  exists: boolean;
  email?: string;
  name?: string;
  status?: string;
  is_staff?: number;
  expired?: boolean;
  qrCodeText?: string | null;
  qrCodeImageUrl?: string | null;
  payment_ref?: string | null;
  sleep_at_monastery?: number;
  companion_name?: string;
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

/** Valores aceitos pelo servidor (functions/_utils/registrations.ts). */
export type Gender = "MASCULINO" | "FEMININO" | "NAO_INFORMADO";

export interface RegistrationPayload {
  name: string;
  email: string;
  cpf: string;
  gender: Gender;
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
  // Código de convite (inscrição extra além do teto). Quando enviado e válido, o
  // servidor libera a vaga mesmo com as 500 esgotadas (sempre sem pernoite).
  inviteCode?: string;
}

export interface InviteValidateResponse {
  valid: boolean;
}

export interface RegistrationResponse {
  status?: string;
  registration_id?: string;
  qrCodeText?: string | null;
  qrCodeImageUrl?: string | null;
  message?: string;
}

// Resposta da troca geral -> pernoite.
// status: "PENDING" (precisa pagar; kind="full" para pendente ou "difference" para já pago),
//         "UPGRADED" (promovido na hora, sem cobrança), "ALREADY_MONASTERY" (nada a fazer).
export interface MonasteryUpgradeResponse {
  status?: "PENDING" | "UPGRADED" | "DOWNGRADED" | "ALREADY_MONASTERY" | "ALREADY_GENERAL";
  needsPayment?: boolean;
  kind?: "full" | "difference";
  amount_cents?: number;
  refund_cents?: number;
  payment_ref?: string | null;
  qrCodeText?: string | null;
  qrCodeImageUrl?: string | null;
  expires_at?: string | null;
  error?: string;
}

export interface WaitlistPayload {
  name: string;
  cpf: string;
  phone: string;
}

// status "ADDED" = entrou agora; "ALREADY_ON_WAITLIST" = já estava (posição mantida).
export interface WaitlistJoinResponse {
  status?: "ADDED" | "ALREADY_ON_WAITLIST";
  error?: string;
}

export interface TshirtSizes {
  P: number;
  M: number;
  G: number;
  GG: number;
}

export interface TshirtPurchasePayload {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  sizes: TshirtSizes;
}

export interface TshirtPendingPurchase {
  id: string;
  paymentRef: string | null;
  qrCodeText: string | null;
  qrCodeImageUrl: string | null;
  sizes: TshirtSizes;
  totalQuantity: number;
  amountCents: number;
  createdAt: string;
}

export interface TshirtCanceledPurchase {
  id: string;
  paymentRef: string | null;
  sizes: TshirtSizes;
  totalQuantity: number;
  amountCents: number;
  createdAt: string;
  canceledAt: string;
}

export interface TshirtPaidPurchase {
  id: string;
  paymentRef: string | null;
  sizes: TshirtSizes;
  totalQuantity: number;
  amountCents: number;
  createdAt: string;
  paidAt: string | null;
}

export interface TshirtPaidTotals {
  P: number;
  M: number;
  G: number;
  GG: number;
  totalQuantity: number;
  amountCents: number;
}

export interface TshirtPurchaseResponse {
  status?: string;
  purchase_id?: string;
  payment_ref?: string;
  qrCodeText?: string | null;
  qrCodeImageUrl?: string | null;
  amountCents?: number;
  totalQuantity?: number;
  pricePerUnitCents?: number;
  sizes?: TshirtSizes;
  message?: string;
  pendingPurchases?: TshirtPendingPurchase[];
  canceledPurchases?: TshirtCanceledPurchase[];
  paidPurchases?: TshirtPaidPurchase[];
  paidTotals?: TshirtPaidTotals;
}

export interface TshirtStatusResponse {
  exists: boolean;
  message?: string | null;
  pricePerUnitCents?: number;
  pendingPurchases?: TshirtPendingPurchase[];
  canceledPurchases?: TshirtCanceledPurchase[];
  paidPurchases?: TshirtPaidPurchase[];
  paidTotals?: TshirtPaidTotals;
}

export interface TshirtConfigResponse {
  pricePerUnitCents: number;
}
