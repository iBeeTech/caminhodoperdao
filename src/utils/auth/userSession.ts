// Fonte única do token do peregrino no localStorage.
//
// Espelha adminSession.ts, mas com chave PRÓPRIA: o admin e o peregrino são
// sessões distintas, com papéis distintos no token, e o servidor recusa um no
// lugar do outro. Guardar os dois na mesma chave faria o login de um derrubar a
// sessão do outro em quem usa as duas coisas — o caso do próprio organizador.
const STORAGE_KEY = "peregrino_jwt";
const SESSION_EVENT = "peregrino-session-change";

export function getUserToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

function notify(): void {
  window.dispatchEvent(new Event(SESSION_EVENT));
}

export function setUserToken(token: string): void {
  localStorage.setItem(STORAGE_KEY, token);
  notify();
}

export function clearUserToken(): void {
  localStorage.removeItem(STORAGE_KEY);
  notify();
}

/** Reage ao login/logout desta aba (SESSION_EVENT) e das outras ("storage"). */
export function subscribeUserSession(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onChange();
  };
  window.addEventListener(SESSION_EVENT, onChange);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(SESSION_EVENT, onChange);
    window.removeEventListener("storage", handleStorage);
  };
}
