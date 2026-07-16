// Fonte única do token de admin no localStorage, observável.
//
// Existe porque o login acontece dentro do Controller (filho) e a barra lateral
// vive no AdminLayout (pai): sem uma notificação explícita, gravar no
// localStorage não re-renderiza o pai e o menu só apareceria depois de um
// reload. Quem grava o token deve usar setAdminToken/clearAdminToken.
const STORAGE_KEY = "admin_jwt";
const SESSION_EVENT = "admin-session-change";

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

function notify(): void {
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function setAdminToken(token: string): void {
  localStorage.setItem(STORAGE_KEY, token);
  notify();
}

export function clearAdminToken(): void {
  localStorage.removeItem(STORAGE_KEY);
  notify();
}

/** Reage ao login/logout desta aba (SESSION_EVENT) e das outras ("storage"). */
export function subscribeAdminSession(onChange: () => void): () => void {
  window.addEventListener(SESSION_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(SESSION_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}
