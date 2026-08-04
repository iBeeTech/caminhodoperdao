import { clearUserToken, getUserToken } from "../../utils/auth/userSession";

/**
 * Conversa da área do peregrino com a API.
 *
 * Fica fora das telas porque `/dashboard` e `/perfil` leem e gravam as MESMAS
 * coisas. Com o fetch solto dentro de cada página, o dia em que o formato da
 * resposta mudasse só uma das duas seria corrigida.
 */

export type BadgeTier = "bronze" | "prata" | "ouro";

export interface Badge {
  id: string;
  label: string;
  description: string;
  tier: BadgeTier;
  year?: number;
}

export interface NextBadge {
  years: number;
  label: string;
  description: string;
  tier: BadgeTier;
}

export interface PilgrimProfile {
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
}

export interface Me {
  email: string;
  currentYear: number;
  firstEditionYear: number;
  years: number[];
  badges: Badge[];
  nextBadge: NextBadge | null;
  hasDeclaredYears: boolean;
  hasSeenProfilePrompt: boolean;
  isStaff: boolean;
  isAdmin: boolean;
  profile: PilgrimProfile;
  hasCpf: boolean;
  cpfMasked: string | null;
}

export const EMPTY_PROFILE: PilgrimProfile = {
  name: "",
  phone: "",
  gender: "",
  dateOfBirth: "",
  cep: "",
  address: "",
  number: "",
  complement: "",
  city: "",
  state: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  hasAllergyMedication: false,
  allergyMedicationDetails: "",
  hasDietaryRestriction: false,
  dietaryRestrictionDetails: "",
};

/** Sessão expirada. Quem pegar isto deve mandar a pessoa para `/entrar`. */
export class SessionExpiredError extends Error {
  constructor() {
    super("session_expired");
    this.name = "SessionExpiredError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getUserToken();
  if (!token) throw new SessionExpiredError();

  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  // 401 (token vencido) e 403 (e-mail não confirmado) levam ao mesmo lugar: a
  // sessão guardada não abre mais nada, então apagá-la evita o laço de tela
  // vazia que ninguém entende.
  if (response.status === 401 || response.status === 403) {
    clearUserToken();
    throw new SessionExpiredError();
  }
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || "request_failed");
  }
  return (await response.json()) as T;
}

export function fetchMe(): Promise<Me> {
  return request<Me>("/api/me");
}

export function fetchAvailableYears(): Promise<{ available: number[] }> {
  return request<{ available: number[] }>("/api/me/years");
}

export function saveYears(
  years: number[]
): Promise<{ years: number[]; badges: Badge[]; nextBadge: NextBadge | null }> {
  return request("/api/me/years", { method: "POST", body: JSON.stringify({ years }) });
}

/**
 * "Preencher depois" do primeiro acesso. Endpoint próprio, e não um PUT com o
 * perfil vazio: perfil vazio APAGA o que já existe, e pular não pode limpar
 * nada.
 */
export function skipProfilePrompt(): Promise<{ hasSeenProfilePrompt: boolean }> {
  return request("/api/me/profile-prompt", { method: "POST", body: "{}" });
}

export function saveProfile(
  profile: PilgrimProfile,
  cpf?: string
): Promise<{ profile: PilgrimProfile; hasCpf: boolean; cpfMasked: string | null }> {
  return request("/api/me", {
    method: "PUT",
    body: JSON.stringify({ profile, ...(cpf ? { cpf } : {}) }),
  });
}

/**
 * Link de WhatsApp da organização, com rodízio entre os voluntários
 * (`/api/whatsapp/next`). Buscado ANTES do clique de propósito: resolver a URL
 * depois do clique faz o navegador tratar a janela como pop-up e bloquear.
 */
export async function fetchWhatsappUrl(message: string): Promise<string | null> {
  try {
    const response = await fetch(`/api/whatsapp/next?message=${encodeURIComponent(message)}`);
    if (!response.ok) return null;
    return ((await response.json()) as { waUrl?: string }).waUrl ?? null;
  } catch {
    return null;
  }
}

/** Mensagem para o humano a partir do código de erro da API. */
export function messageForError(error: unknown): string {
  if (!(error instanceof Error)) return "Algo deu errado. Tente de novo.";
  const map: Record<string, string> = {
    invalid_phone: "Telefone inválido. Use DDD + número.",
    invalid_emergency_phone: "Telefone do contato de emergência inválido.",
    invalid_date_of_birth: "Data de nascimento inválida.",
    invalid_cep: "CEP inválido. Precisa ter 8 números.",
    invalid_state: "Estado inválido. Use a sigla, como MG.",
    invalid_gender: "Selecione uma opção de sexo.",
    invalid_cpf: "CPF inválido. Confira os números.",
    cpf_already_used: "Este CPF já está em outra conta. Fale com a organização.",
    cpf_encryption_not_configured: "Não foi possível salvar o CPF agora. Fale com a organização.",
  };
  return map[error.message] || "Não foi possível salvar. Tente de novo.";
}
