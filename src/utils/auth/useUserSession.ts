import { useEffect, useState } from "react";
import { getUserToken, subscribeUserSession } from "./userSession";

/**
 * Quem está logado, do ponto de vista da tela.
 *
 * Lê o e-mail do próprio token em vez de chamar a API: o cabeçalho aparece em
 * TODAS as páginas, e uma chamada de rede por página só para escrever uma
 * inicial no avatar é caro e ainda pisca. A validade do token continua sendo
 * decidida no servidor — aqui é só o que mostrar.
 */

export interface UserSession {
  isLoggedIn: boolean;
  email: string | null;
}

function decodeEmail(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const padded = `${payload}${"=".repeat((4 - (payload.length % 4)) % 4)}`
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const parsed = JSON.parse(atob(padded)) as { email?: string; exp?: number };
    // Token vencido não é sessão: mostrar o avatar levaria a pessoa a clicar em
    // "Perfil" e cair na tela de entrar sem entender por quê.
    if (parsed.exp && Math.floor(Date.now() / 1000) >= parsed.exp) return null;
    return parsed.email ?? null;
  } catch {
    return null;
  }
}

function readSession(): UserSession {
  const token = getUserToken();
  const email = token ? decodeEmail(token) : null;
  return { isLoggedIn: email !== null, email };
}

export function useUserSession(): UserSession {
  const [session, setSession] = useState<UserSession>(readSession);

  useEffect(() => subscribeUserSession(() => setSession(readSession())), []);

  return session;
}
