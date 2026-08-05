// Sessão de admin expirada derruba para o login, venha o clique de onde vier.
//
// Antes, cada uma das 15 telas de /admin tratava o 401 por conta própria: ligava
// um `authError` local e mostrava o AuthNotice, com um botão que o admin ainda
// precisava clicar. Como era código repetido tela a tela, qualquer tela nova
// nascia sem o tratamento — e o pedido é que a sessão morta leve ao login
// "independente de onde eu clique ou o que eu faça".
//
// Por isso isto embrulha o window.fetch UMA vez, em vez de virar um helper que
// cada tela precisa lembrar de usar: um helper opcional não cobre a tela que
// alguém escrever amanhã.
//
// O que ele faz é só apagar o token. Quem navega é o AdminLayout, que assina a
// sessão (useSyncExternalStore) e manda para /admin assim que ela some — assim
// existe UM caminho de redirecionamento, dentro do React, sem recarregar a
// página inteira.

import { clearAdminToken, getAdminToken } from "./adminSession";

const ADMIN_API_PREFIX = "/api/admin/";

// ⚠️ Os únicos códigos que significam "a sessão acabou". A checagem é pelo
// CORPO, e não pelo status 401 sozinho, porque no back o 401 tem outros usos:
//
//   invalid_credentials -> senha errada no login e na troca de senha
//   not_allowed         -> admin/create, ação exclusiva do admin geral
//   forbidden           -> admin/reconcile-pix, idem
//
// Derrubar a sessão nesses casos seria deslogar um admin legítimo por ter
// clicado em algo que não é dele, ou por ter errado a senha uma vez.
const SESSION_DEAD_CODES = new Set(["missing_token", "invalid_token"]);

let isInstalled = false;

/** A URL pedida ao fetch pode vir como string, URL ou Request. */
function pathnameOf(input: RequestInfo | URL): string | null {
  try {
    const href =
      typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    return new URL(href, window.location.origin).pathname;
  } catch {
    return null;
  }
}

async function isSessionDead(response: Response): Promise<boolean> {
  if (response.status !== 401) return false;
  try {
    // clone() porque o corpo só pode ser lido uma vez: sem isso, a tela que
    // fez a chamada receberia uma resposta já consumida.
    const body = (await response.clone().json()) as { error?: unknown };
    return typeof body.error === "string" && SESSION_DEAD_CODES.has(body.error);
  } catch {
    // Corpo ilegível: não derruba. Entre deslogar um admin no meio do trabalho
    // e deixar a tela mostrar o próprio aviso (que tem botão para o login),
    // o segundo erro é o mais barato.
    return false;
  }
}

/**
 * Instala o guarda. Idempotente e chamado no arranque do app (src/index.tsx),
 * e não dentro de um useEffect: efeito de filho roda ANTES do efeito do pai,
 * então uma tela que busca dados ao montar já teria disparado o fetch antes de
 * um guarda instalado pelo AdminLayout existir — justo o caso mais comum, que é
 * abrir a página com a sessão já vencida.
 */
export function installAdminSessionGuard(): void {
  if (isInstalled || typeof window === "undefined") return;
  isInstalled = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const response = await originalFetch(input as RequestInfo, init);

    const path = pathnameOf(input);
    if (!path || !path.startsWith(ADMIN_API_PREFIX)) return response;
    // Sem token guardado não há sessão para expirar: é a própria tela de login
    // tentando entrar, ou uma chamada solta. Deixa a tela responder.
    if (!getAdminToken()) return response;

    if (await isSessionDead(response)) {
      clearAdminToken();
    }
    return response;
  };
}
