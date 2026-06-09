/// <reference types="@cloudflare/workers-types" />

export interface WaitlistEntry {
  id: string;
  name: string;
  cpf_encrypted: string;
  phone: string;
  notified_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function getWaitlistByCpfEncrypted(
  DB: D1Database,
  cpfEncrypted: string
): Promise<WaitlistEntry | null> {
  const row = await DB.prepare(
    "SELECT id, name, cpf_encrypted, phone, notified_at, created_at, updated_at FROM waitlist WHERE cpf_encrypted = ?"
  )
    .bind(cpfEncrypted)
    .first<WaitlistEntry>();
  return row ?? null;
}

export async function insertWaitlistEntry(
  DB: D1Database,
  input: { id: string; name: string; cpfEncrypted: string; phone: string }
): Promise<void> {
  await DB.prepare(
    "INSERT INTO waitlist (id, name, cpf_encrypted, phone, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, datetime('now'), datetime('now'))"
  )
    .bind(input.id, input.name, input.cpfEncrypted, input.phone)
    .run();
}

// Re-envio do mesmo CPF: atualiza nome/telefone sem mexer em created_at,
// preservando a posição original na fila.
export async function updateWaitlistContact(
  DB: D1Database,
  id: string,
  input: { name: string; phone: string }
): Promise<void> {
  await DB.prepare(
    "UPDATE waitlist SET name = ?1, phone = ?2, updated_at = datetime('now') WHERE id = ?3"
  )
    .bind(input.name, input.phone, id)
    .run();
}

// Fila em ordem de chegada — é nessa ordem que o admin avisa quando abre vaga.
export async function listWaitlist(DB: D1Database): Promise<WaitlistEntry[]> {
  const result = await DB.prepare(
    "SELECT id, name, cpf_encrypted, phone, notified_at, created_at, updated_at FROM waitlist ORDER BY datetime(created_at) ASC"
  ).all<WaitlistEntry>();
  return result.results ?? [];
}

export async function setWaitlistNotified(
  DB: D1Database,
  id: string,
  notified: boolean
): Promise<void> {
  const sql = notified
    ? "UPDATE waitlist SET notified_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
    : "UPDATE waitlist SET notified_at = NULL, updated_at = datetime('now') WHERE id = ?";
  await DB.prepare(sql).bind(id).run();
}
