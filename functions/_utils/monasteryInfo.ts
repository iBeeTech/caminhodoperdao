/// <reference types="@cloudflare/workers-types" />

// Informar as regras do Mosteiro para quem vai dormir lá (sleep_at_monastery = 1).
// Espelha a lógica do convite ao grupo (group_invited_at/group_invite_failed_at),
// mas sobre as colunas monastery_info_sent_at (informado) e
// monastery_info_failed_at (não consegui). Ambos NULL = aguardando.
// Estados mutuamente exclusivos.

export interface MonasteryInfoRow {
  id: string;
  name: string;
  phone: string;
  monastery_info_sent_at: string | null;
  monastery_info_failed_at: string | null;
}

// Inscritos PAGOS com telefone que vão DORMIR no mosteiro, em ordem alfabética.
export async function listMonasteryGuests(DB: D1Database): Promise<MonasteryInfoRow[]> {
  const result = await DB.prepare(
    `SELECT id, name, phone, monastery_info_sent_at, monastery_info_failed_at
     FROM registrations
     WHERE status = 'PAID' AND phone <> '' AND sleep_at_monastery = 1
     ORDER BY name COLLATE NOCASE`
  ).all<MonasteryInfoRow>();
  return result.results ?? [];
}

// Marca/desmarca "informado". Informar limpa a marca de "não consegui".
export async function setMonasteryInfoSent(
  DB: D1Database,
  id: string,
  sent: boolean
): Promise<void> {
  const sql = sent
    ? "UPDATE registrations SET monastery_info_sent_at = datetime('now'), monastery_info_failed_at = NULL WHERE id = ?"
    : "UPDATE registrations SET monastery_info_sent_at = NULL WHERE id = ?";
  await DB.prepare(sql).bind(id).run();
}

// Marca/desmarca "não consegui informar". Falhar limpa o "informado"
// (ou informou, ou não conseguiu, ou aguarda — nunca dois ao mesmo tempo).
export async function setMonasteryInfoFailed(
  DB: D1Database,
  id: string,
  failed: boolean
): Promise<void> {
  const sql = failed
    ? "UPDATE registrations SET monastery_info_failed_at = datetime('now'), monastery_info_sent_at = NULL WHERE id = ?"
    : "UPDATE registrations SET monastery_info_failed_at = NULL WHERE id = ?";
  await DB.prepare(sql).bind(id).run();
}
