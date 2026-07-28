/// <reference types="@cloudflare/workers-types" />

export interface CheckinRow {
  id: string;
  name: string;
  status: string;
  checked_in_at: string | null;
  checked_in_by: string | null;
}

export type CheckinFailure =
  /** Id não existe na tabela. */
  | "not_found"
  /** Existe, mas não está PAID — não se credencia quem não confirmou pagamento. */
  | "not_paid"
  /** Alguém já deu a baixa antes (a linha devolvida diz quem e quando). */
  | "already_checked_in"
  /** Desfazer em quem nunca foi credenciado. */
  | "not_checked_in";

export type CheckinResult =
  | { ok: true; row: CheckinRow }
  | { ok: false; reason: CheckinFailure; row: CheckinRow | null };

const SELECT_ROW =
  "SELECT id, name, status, checked_in_at, checked_in_by FROM registrations WHERE id = ?";

export async function getRegistrationCheckin(
  DB: D1Database,
  id: string
): Promise<CheckinRow | null> {
  const row = await DB.prepare(SELECT_ROW).bind(id).first<CheckinRow>();
  return row ?? null;
}

/**
 * Dá a baixa do credenciamento.
 *
 * O UPDATE é condicional (`checked_in_at IS NULL`): no dia do evento vários
 * voluntários credenciam ao mesmo tempo, e é o próprio banco que garante que só
 * a primeira baixa vale. Quando nada muda, relemos a linha para dizer o motivo —
 * em especial "já credenciado por fulano às tal hora", que é a informação que o
 * segundo voluntário precisa ver em vez de um sucesso falso.
 */
export async function checkInRegistration(
  DB: D1Database,
  id: string,
  by: string
): Promise<CheckinResult> {
  const result = await DB.prepare(
    `UPDATE registrations
     SET checked_in_at = datetime('now'), checked_in_by = ?1
     WHERE id = ?2 AND status = 'PAID' AND checked_in_at IS NULL`
  )
    .bind(by, id)
    .run();

  const row = await getRegistrationCheckin(DB, id);
  if ((result.meta?.changes ?? 0) > 0) {
    // Acabamos de atualizar esta linha, então ela existe.
    return { ok: true, row: row as CheckinRow };
  }
  if (!row) return { ok: false, reason: "not_found", row: null };
  if (row.checked_in_at) return { ok: false, reason: "already_checked_in", row };
  return { ok: false, reason: "not_paid", row };
}

/**
 * Desfaz a baixa (clique errado é o erro mais provável às 6h da manhã).
 * Não exige PAID: se a inscrição mudar de status depois da baixa, ainda assim
 * tem de ser possível corrigir o engano.
 */
export async function undoCheckIn(DB: D1Database, id: string): Promise<CheckinResult> {
  const result = await DB.prepare(
    `UPDATE registrations
     SET checked_in_at = NULL, checked_in_by = NULL
     WHERE id = ?1 AND checked_in_at IS NOT NULL`
  )
    .bind(id)
    .run();

  const row = await getRegistrationCheckin(DB, id);
  if ((result.meta?.changes ?? 0) > 0) {
    return { ok: true, row: row as CheckinRow };
  }
  if (!row) return { ok: false, reason: "not_found", row: null };
  return { ok: false, reason: "not_checked_in", row };
}
