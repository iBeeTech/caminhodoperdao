/// <reference types="@cloudflare/workers-types" />

/**
 * Ano da edição em andamento.
 *
 * `registrations.event_year` nasceu com `DEFAULT 2026` (migration 025) só para
 * preencher as 747 linhas existentes e impedir NULL — num índice único de
 * várias colunas o SQLite deixa de aplicar a unicidade na linha em que alguma
 * coluna é NULL, e o CPF escaparia da regra "1 inscrição por edição".
 *
 * Esse default é rede vencida: em 2027 ele marcaria as inscrições novas como
 * 2026 sem erro nenhum. Por isso quem grava inscrição define o ano
 * EXPLICITAMENTE por aqui, e a fonte da verdade é a env EVENT_YEAR.
 */

export interface EventYearEnv {
  /** Ano da edição, ex.: "2027". Definido em wrangler.toml. */
  EVENT_YEAR?: string;
}

/** Usado só se a env sumir. Igual ao default da coluna, para não divergir. */
const FALLBACK_EVENT_YEAR = 2026;

/** Faixa de sanidade: pega env trocada por engano (ex.: "20226" ou "26"). */
const MIN_EVENT_YEAR = 2020;
const MAX_EVENT_YEAR = 2100;

export function getEventYear(env: EventYearEnv): number {
  const raw = env.EVENT_YEAR?.trim();
  if (!raw) {
    console.warn(`EVENT_YEAR ausente — usando ${FALLBACK_EVENT_YEAR}.`);
    return FALLBACK_EVENT_YEAR;
  }

  const year = Number(raw);
  if (!Number.isInteger(year) || year < MIN_EVENT_YEAR || year > MAX_EVENT_YEAR) {
    console.warn(`EVENT_YEAR inválido ("${raw}") — usando ${FALLBACK_EVENT_YEAR}.`);
    return FALLBACK_EVENT_YEAR;
  }

  return year;
}
