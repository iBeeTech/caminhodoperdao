/// <reference types="@cloudflare/workers-types" />
import { json } from "./responses";

/**
 * A porta da inscrição: a flag `enrollment` (migration 002) e a lista de
 * exceção (migration 039).
 *
 * A flag já existia e mandava na jornada de inscrição do site. Ela continua
 * sendo a MESMA — nada de flag nova —, só que agora manda também em criar
 * conta e entrar. O motivo é que a inscrição saiu do site público e passou a
 * acontecer dentro da conta: fechar a inscrição sem fechar o login seria
 * pendurar a placa "fechado" numa porta destrancada.
 *
 * ⚠️ **A polaridade é a da flag, não a do botão.** `enabled = 1` significa
 * INSCRIÇÕES ABERTAS — é o que a migration 002 escreveu e o que o site já
 * fazia. "Encerradas" é `enabled = 0`. A tela do admin fala em "abertas" e
 * "encerradas" justamente para ninguém precisar lembrar disso.
 *
 * ⚠️ **Falha de leitura deixa a porta ABERTA.** Se o banco não responder, a
 * escolha é entre trancar todo mundo do lado de fora e deixar entrar quem não
 * devia por alguns minutos. O primeiro é um incidente; o segundo, um
 * inconveniente. É a mesma decisão que o `useFeatureFlags` da tela já tomava.
 */

export const ENROLLMENT_FLAG = "enrollment";

/** Erro que a tela reconhece para mostrar "As inscrições estão encerradas". */
export const ENROLLMENT_CLOSED_ERROR = "enrollment_closed";

export interface EnrollmentGateEnv {
  DB: D1Database;
}

export interface BypassEntry {
  email: string;
  note: string | null;
  created_at: number;
  created_by: string | null;
}

/** A flag está ligada (inscrições abertas)? Linha ausente = aberta. */
export async function isEnrollmentOpen(DB: D1Database): Promise<boolean> {
  try {
    const row = await DB.prepare("SELECT enabled FROM feature_flags WHERE name = ?1")
      .bind(ENROLLMENT_FLAG)
      .first<{ enabled: number | boolean }>();
    if (!row) return true;
    return typeof row.enabled === "number" ? row.enabled === 1 : Boolean(row.enabled);
  } catch (error) {
    console.error("leitura da flag de inscrição falhou — porta segue aberta:", error);
    return true;
  }
}

export async function setEnrollmentOpen(DB: D1Database, open: boolean): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  // A linha nasceu na migration 002, mas um banco recriado do zero (preview,
  // teste) pode não tê-la. O INSERT ... ON CONFLICT cobre os dois casos.
  await DB.prepare(
    `INSERT INTO feature_flags (id, name, enabled, description, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?5)
     ON CONFLICT(name) DO UPDATE SET enabled = excluded.enabled, updated_at = excluded.updated_at`
  )
    .bind(
      `${ENROLLMENT_FLAG}-${now}`,
      ENROLLMENT_FLAG,
      open ? 1 : 0,
      "Controls whether enrollment journey is available (true: active journey, false: coming soon message)",
      now
    )
    .run();
}

/** Este e-mail entra mesmo com as inscrições encerradas? */
export async function isBypassed(DB: D1Database, email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  try {
    const row = await DB.prepare("SELECT email FROM enrollment_bypass WHERE email = ?1")
      .bind(normalized)
      .first<{ email: string }>();
    return row !== null;
  } catch (error) {
    // Mesma escolha da flag: na dúvida, não trancar ninguém do lado de fora.
    console.error("leitura da lista de exceção falhou:", error);
    return true;
  }
}

/**
 * A guarda que login e criação de conta usam.
 *
 * Devolve a resposta de recusa quando a porta está fechada para este e-mail, e
 * `null` quando pode passar — o mesmo formato de `authorizeUserRequest`, para
 * quem lê o endpoint reconhecer o padrão de imediato.
 */
export async function blockWhenEnrollmentClosed(
  DB: D1Database,
  email: string
): Promise<Response | null> {
  if (await isEnrollmentOpen(DB)) return null;
  if (await isBypassed(DB, email)) return null;
  return json(403, { error: ENROLLMENT_CLOSED_ERROR });
}

export async function listBypass(DB: D1Database): Promise<BypassEntry[]> {
  const result = await DB.prepare(
    "SELECT email, note, created_at, created_by FROM enrollment_bypass ORDER BY created_at DESC"
  ).all<BypassEntry>();
  return result.results ?? [];
}

export async function addBypass(
  DB: D1Database,
  input: { email: string; note: string; createdBy: string }
): Promise<void> {
  await DB.prepare(
    `INSERT INTO enrollment_bypass (email, note, created_at, created_by)
     VALUES (?1, ?2, ?3, ?4)
     ON CONFLICT(email) DO UPDATE SET note = excluded.note, created_by = excluded.created_by`
  )
    .bind(input.email.trim().toLowerCase(), input.note.trim().slice(0, 200) || null, Date.now(), input.createdBy)
    .run();
}

export async function removeBypass(DB: D1Database, email: string): Promise<void> {
  await DB.prepare("DELETE FROM enrollment_bypass WHERE email = ?1")
    .bind(email.trim().toLowerCase())
    .run();
}
