/// <reference types="@cloudflare/workers-types" />

// Convite ao grupo do WhatsApp para os inscritos pagos.
// Espelha a lógica da lista de espera (notified/contact_failed), mas sobre a
// tabela registrations: group_invited_at (convidado) e group_invite_failed_at
// (não consegui). Ambos NULL = aguardando. Estados mutuamente exclusivos.

export interface GroupInviteRow {
  id: string;
  name: string;
  phone: string;
  group_invited_at: string | null;
  group_invite_failed_at: string | null;
}

// Inscritos PAGOS com telefone, em ordem alfabética — base do convite ao grupo.
export async function listPaidForGroupInvite(DB: D1Database): Promise<GroupInviteRow[]> {
  const result = await DB.prepare(
    `SELECT id, name, phone, group_invited_at, group_invite_failed_at
     FROM registrations
     WHERE status = 'PAID' AND phone <> ''
     ORDER BY name COLLATE NOCASE`
  ).all<GroupInviteRow>();
  return result.results ?? [];
}

// Marca/desmarca "convidado". Convidar limpa a marca de "não consegui".
export async function setGroupInvited(
  DB: D1Database,
  id: string,
  invited: boolean
): Promise<void> {
  const sql = invited
    ? "UPDATE registrations SET group_invited_at = datetime('now'), group_invite_failed_at = NULL WHERE id = ?"
    : "UPDATE registrations SET group_invited_at = NULL WHERE id = ?";
  await DB.prepare(sql).bind(id).run();
}

// Marca/desmarca "não consegui convidar". Falhar limpa o "convidado"
// (ou convidou, ou não conseguiu, ou aguarda — nunca dois ao mesmo tempo).
export async function setGroupInviteFailed(
  DB: D1Database,
  id: string,
  failed: boolean
): Promise<void> {
  const sql = failed
    ? "UPDATE registrations SET group_invite_failed_at = datetime('now'), group_invited_at = NULL WHERE id = ?"
    : "UPDATE registrations SET group_invite_failed_at = NULL WHERE id = ?";
  await DB.prepare(sql).bind(id).run();
}
