/**
 * Quem vê o botão de entrar.
 *
 * A área do peregrino ainda está em testes, mas o site é público — e alguém de
 * fora criou conta só porque viu o botão. Enquanto o fluxo não estiver pronto
 * para o público, o botão fica escondido.
 *
 * ⚠️ ISTO NÃO É SEGURANÇA. `/entrar` continua respondendo para quem digitar o
 * endereço, e tem de continuar: esconder um botão não protege nada, e tratar
 * isso como proteção seria pior do que não ter. O que protege continua sendo
 * senha, confirmação de e-mail e sessão.
 *
 * A liberação vem por `?login=true` na URL e fica guardada no aparelho, para o
 * organizador não ter de repetir o parâmetro a cada página. `?login=false`
 * desfaz.
 */

const STORAGE_KEY = "login_visivel";

export function isLoginVisible(): boolean {
  if (typeof window === "undefined") return false;

  const param = new URLSearchParams(window.location.search).get("login");
  if (param === "true") {
    localStorage.setItem(STORAGE_KEY, "1");
    return true;
  }
  if (param === "false") {
    localStorage.removeItem(STORAGE_KEY);
    return false;
  }

  return localStorage.getItem(STORAGE_KEY) === "1";
}
