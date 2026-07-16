// Gating de UI para ações reservadas ao admin geral (ex.: Convites). A regra de
// verdade é no servidor (authorizeSuperAdminRequest); aqui é só para esconder o
// que o admin comum não pode usar.
const STORAGE_KEY = "admin_jwt";
const SUPER_ADMIN_EMAIL = "cassiotakarada7@gmail.com";

function base64UrlDecode(input: string): string {
  const padLength = (4 - (input.length % 4)) % 4;
  const padded = `${input}${"=".repeat(padLength)}`.replace(/-/g, "+").replace(/_/g, "/");
  return atob(padded);
}

// Lê o e-mail (sub) do JWT salvo no localStorage, sem validar a assinatura.
export function getAdminEmailFromToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(STORAGE_KEY);
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(parts[1])) as { sub?: unknown };
    return typeof payload.sub === "string" ? payload.sub.trim().toLowerCase() : null;
  } catch {
    return null;
  }
}

export function isSuperAdmin(): boolean {
  return getAdminEmailFromToken() === SUPER_ADMIN_EMAIL;
}

/**
 * true quando o token foi emitido só para trocar a senha (primeiro acesso ou
 * senha temporária). Serve para não exibir a navegação de um painel que o
 * servidor recusaria de todo jeito (authorizeAdminRequest devolve 403).
 */
export function isPasswordChangePending(): boolean {
  if (typeof window === "undefined") return false;
  const token = localStorage.getItem(STORAGE_KEY);
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(base64UrlDecode(parts[1])) as { mustChange?: unknown };
    return payload.mustChange === true;
  } catch {
    return false;
  }
}
