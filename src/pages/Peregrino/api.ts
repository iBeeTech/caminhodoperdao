import { clearUserToken, getUserToken } from "../../utils/auth/userSession";

/**
 * Conversa da área do peregrino com a API.
 *
 * Fica fora das telas porque `/dashboard` e `/perfil` leem e gravam as MESMAS
 * coisas. Com o fetch solto dentro de cada página, o dia em que o formato da
 * resposta mudasse só uma das duas seria corrigida.
 */

export type BadgeTier =
  | "bronze"
  | "prata"
  | "ouro"
  | "primeira"
  | "veterano"
  | "fundador"
  | "servo"
  | "jubileu";

export interface Badge {
  id: string;
  label: string;
  description: string;
  tier: BadgeTier;
  year?: number;
  /** O que vai no centro do medalhão quando não é um ano. */
  symbol?: string;
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
  refundPixKey: string;
  refundPixType: string;
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
  /** Carimbo da última troca de foto. Nulo = sem foto. */
  photoUpdatedAt: number | null;
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
  refundPixKey: "",
  refundPixType: "",
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

export function uploadPhoto(dataUrl: string): Promise<{ photoUpdatedAt: number }> {
  return request("/api/me/photo", { method: "POST", body: JSON.stringify({ dataUrl }) });
}

export function deletePhoto(): Promise<{ hasPhoto: boolean }> {
  return request("/api/me/photo", { method: "DELETE" });
}

/**
 * A foto exige token, então não dá para usá-la num `<img src>` direto: é
 * buscada com fetch e convertida em data URL.
 */
export async function fetchPhoto(): Promise<string | null> {
  const token = getUserToken();
  if (!token) return null;
  try {
    const response = await fetch("/api/me/photo", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string | null>(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export interface MyRegistration {
  eventYear: number;
  /** Epoch ms da abertura das inscrições. */
  opensAt: number;
  isOpen: boolean;
  /** true = aberta antes da data por chave de teste. */
  isForced: boolean;
  capacity: { taken: number; limit: number };
  needsInviteCode: boolean;
  /** Campos do cadastro que faltam para a inscrição existir. */
  missingProfileFields: string[];
  registration: {
    id: string;
    status: "PENDING" | "PAID" | "CANCELED";
    sleepAtMonastery: boolean;
    companionName: string | null;
    usedInviteCode: boolean;
    createdAt: string;
    paidAt: string | null;
  } | null;
}

export function fetchMyRegistration(): Promise<MyRegistration> {
  return request<MyRegistration>("/api/me/registration");
}

export function createRegistration(input: {
  sleepAtMonastery: boolean;
  companionName: string;
  acceptsTerms: boolean;
  inviteCode?: string;
}): Promise<{ id: string; status: string; paymentPending: boolean }> {
  return request("/api/me/registration", { method: "POST", body: JSON.stringify(input) });
}

export interface MyTransfer {
  id: string;
  toName: string;
  status: "PENDENTE" | "LIBERADA";
  isDonation: boolean;
  code: string | null;
}

export function fetchMyTransfer(): Promise<{ transfer: MyTransfer | null }> {
  return request("/api/me/registration/transfer");
}

export function transferAction(input: {
  action: "create" | "release" | "cancel" | "accept";
  toName?: string;
  isDonation?: boolean;
  code?: string;
  acceptsTerms?: boolean;
}): Promise<{ status?: string; code?: string | null; accepted?: boolean }> {
  return request("/api/me/registration/transfer", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

/** Diz se o código que a pessoa tem é de convite ou de transferência. */
export function checkCode(
  code: string
): Promise<{ kind: "transfer" | "invite" | "unusable"; fromName?: string; reason?: string }> {
  return request(`/api/me/registration/code?code=${encodeURIComponent(code)}`);
}

export function cancelRegistration(): Promise<{ canceled: boolean; refundRequested: boolean }> {
  return request("/api/me/registration/cancel", { method: "POST", body: "{}" });
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
    emergency_phone_is_own: "O contato de emergência não pode ser o seu próprio número.",
    invalid_date_of_birth: "Data de nascimento inválida.",
    invalid_cep: "CEP inválido. Precisa ter 8 números.",
    invalid_state: "Estado inválido. Use a sigla, como MG.",
    invalid_gender: "Selecione uma opção de sexo.",
    invalid_cpf: "CPF inválido. Confira os números.",
    invalid_pix_type: "Escolha um tipo de chave PIX válido.",
    missing_pix_type: "Diga qual é o tipo da sua chave PIX.",
    missing_pix_key: "Preencha a chave PIX ou deixe o tipo em branco.",
    invalid_pix_cpf: "A chave PIX de CPF está inválida.",
    invalid_pix_phone: "A chave PIX de celular está inválida. Use DDD + número.",
    invalid_pix_email: "A chave PIX de e-mail está inválida.",
    cpf_already_used: "Este CPF já está em outra conta. Fale com a organização.",
    registration_not_open: "As inscrições ainda não abriram.",
    already_registered: "Você já tem inscrição nesta edição.",
    cpf_already_registered: "Já existe inscrição com este CPF nesta edição.",
    cpf_belongs_to_another_account:
      "Existe uma inscrição cancelada com este CPF em outra conta. Fale com a organização.",
    own_canceled_registration:
      "Você tem uma inscrição cancelada nesta edição. Fale com a organização para receber a vaga transferida.",
    incomplete_profile: "Complete seu cadastro antes de se inscrever.",
    terms_not_accepted: "É preciso aceitar o termo de responsabilidade.",
    sold_out: "As vagas acabaram. Só com código de convite.",
    invite_not_found: "Código de convite não encontrado.",
    invite_revoked: "Este código de convite foi cancelado.",
    invite_used: "Este código de convite já foi usado.",
    no_active_registration: "Você não tem inscrição ativa nesta edição.",
    transfer_in_progress: "Existe uma transferência em andamento. Cancele-a antes.",
    transfer_already_open: "Você já tem uma transferência aberta.",
    no_open_transfer: "Nenhuma transferência aberta.",
    transfer_not_found: "Código de transferência inválido ou já usado.",
    cannot_accept_own: "Você não pode receber a sua própria inscrição.",
    invalid_to_name: "Escreva o nome de quem vai receber a inscrição.",
    missing_code: "Informe o código da transferência.",
    cpf_encryption_not_configured: "Não foi possível salvar o CPF agora. Fale com a organização.",
  };
  return map[error.message] || "Não foi possível salvar. Tente de novo.";
}
