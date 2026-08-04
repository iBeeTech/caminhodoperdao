/// <reference types="@cloudflare/workers-types" />

/**
 * Quando a inscrição abre.
 *
 * Duas coisas separadas de propósito:
 *
 * - `REGISTRATION_OPEN_AT` é a DATA de abertura, que a tela usa para a contagem
 *   regressiva. Muda todo ano e por isso é configuração, não texto em código.
 * - `REGISTRATION_FORCE_OPEN` é uma chave de teste que abre a inscrição antes
 *   da data. Existe porque testar o fluxo inteiro só em 01/06/2027 não é
 *   opção — o primeiro teste de verdade não pode ser o dia da abertura.
 *
 * ⚠️ Hoje a chave está LIGADA (`"true"` no wrangler.toml), a pedido do
 * organizador. **Desligar antes de 2027**, senão a inscrição fica aberta o ano
 * inteiro e a contagem regressiva vira enfeite.
 */

export interface RegistrationWindowEnv {
  /** ISO 8601, ex.: "2027-06-01T00:00:00-03:00". */
  REGISTRATION_OPEN_AT?: string;
  /** "true" abre a inscrição antes da data. Só para teste. */
  REGISTRATION_FORCE_OPEN?: string;
}

/** Usada se a env sumir. 01/06/2027, meia-noite no horário de Brasília. */
const FALLBACK_OPEN_AT = "2027-06-01T00:00:00-03:00";

export interface RegistrationWindow {
  /** Epoch ms da abertura. A tela conta o tempo a partir daqui. */
  opensAt: number;
  isOpen: boolean;
  /** true quando está aberta só por causa da chave de teste. */
  isForced: boolean;
}

export function getRegistrationWindow(env: RegistrationWindowEnv): RegistrationWindow {
  const raw = env.REGISTRATION_OPEN_AT?.trim() || FALLBACK_OPEN_AT;
  const parsed = Date.parse(raw);
  const opensAt = Number.isNaN(parsed) ? Date.parse(FALLBACK_OPEN_AT) : parsed;

  if (Number.isNaN(parsed)) {
    console.warn(`REGISTRATION_OPEN_AT inválido ("${raw}") — usando ${FALLBACK_OPEN_AT}.`);
  }

  const isForced = env.REGISTRATION_FORCE_OPEN?.trim().toLowerCase() === "true";
  return { opensAt, isOpen: isForced || Date.now() >= opensAt, isForced };
}
