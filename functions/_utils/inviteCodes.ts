/// <reference types="@cloudflare/workers-types" />

export interface InviteCodeRow {
  code: string;
  note: string | null;
  used_at: string | null;
  used_by_registration_id: string | null;
  revoked_at: string | null;
  created_at: string;
}

// Status derivado, usado no /admin/convites.
export type InviteStatus = "available" | "pending" | "used" | "revoked";

export interface InviteCodeView extends InviteCodeRow {
  status: InviteStatus;
  // Nome da inscrição que consumiu o código (quando houver).
  used_by_name: string | null;
}

// Alfabeto sem caracteres ambíguos (0/O, 1/I/L) para ditar o código por telefone/WhatsApp.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;
const MAX_CREATE = 200;

// Normaliza o que o usuário digita: maiúsculas, só A-Z0-9 (remove hífen/espaço).
export function normalizeInviteCode(raw: string | null | undefined): string {
  return (raw ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "").trim();
}

function randomCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let out = "";
  for (const b of bytes) {
    out += ALPHABET[b % ALPHABET.length];
  }
  return out;
}

export async function getInviteCode(DB: D1Database, code: string): Promise<InviteCodeRow | null> {
  const normalized = normalizeInviteCode(code);
  if (!normalized) return null;
  const row = await DB.prepare(
    "SELECT code, note, used_at, used_by_registration_id, revoked_at, created_at FROM invite_codes WHERE code = ?"
  )
    .bind(normalized)
    .first<InviteCodeRow>();
  return row ?? null;
}

export interface InviteEvaluation {
  // Pode abrir o formulário / ser usado por uma inscrição ainda não paga.
  openable: boolean;
  reason: "ok" | "not_found" | "revoked" | "used";
}

// Regra de uso único: o código abre o formulário enquanto não foi REVOGADO e enquanto
// a inscrição que o consumiu não está paga. Assim que a inscrição vira PAID, o código
// fica permanentemente indisponível. A checagem de "mesma pessoa" (CPF) acontece no
// register.ts, que tem o CPF em mãos — aqui é só o portão de UX.
export async function evaluateInvite(DB: D1Database, code: string): Promise<InviteEvaluation> {
  const row = await getInviteCode(DB, code);
  if (!row) return { openable: false, reason: "not_found" };
  if (row.revoked_at) return { openable: false, reason: "revoked" };
  if (row.used_by_registration_id) {
    const reg = await DB.prepare("SELECT status FROM registrations WHERE id = ?")
      .bind(row.used_by_registration_id)
      .first<{ status: string }>();
    if (reg?.status === "PAID") {
      return { openable: false, reason: "used" };
    }
  }
  return { openable: true, reason: "ok" };
}

// Amarra o código a uma inscrição (uso único). Idempotente: só grava se ainda não houver
// vínculo, então uma nova tentativa da MESMA inscrição não sobrescreve o created/used.
export async function bindInviteCode(
  DB: D1Database,
  code: string,
  registrationId: string
): Promise<void> {
  const normalized = normalizeInviteCode(code);
  if (!normalized) return;
  await DB.prepare(
    "UPDATE invite_codes SET used_at = datetime('now'), used_by_registration_id = ?1 WHERE code = ?2 AND used_by_registration_id IS NULL"
  )
    .bind(registrationId, normalized)
    .run();
}

export async function createInviteCodes(
  DB: D1Database,
  count: number,
  note: string | null
): Promise<InviteCodeRow[]> {
  const total = Math.min(Math.max(1, Math.trunc(count) || 1), MAX_CREATE);
  const trimmedNote = note?.trim() || null;
  const created: InviteCodeRow[] = [];

  for (let i = 0; i < total; i += 1) {
    // Tenta algumas vezes em caso de colisão com código já existente.
    let inserted = false;
    for (let attempt = 0; attempt < 5 && !inserted; attempt += 1) {
      const code = randomCode();
      try {
        await DB.prepare("INSERT INTO invite_codes (code, note) VALUES (?1, ?2)")
          .bind(code, trimmedNote)
          .run();
        created.push({
          code,
          note: trimmedNote,
          used_at: null,
          used_by_registration_id: null,
          revoked_at: null,
          created_at: "",
        });
        inserted = true;
      } catch (error) {
        const message = (error as Error)?.message ?? "";
        if (!message.includes("UNIQUE")) {
          throw error;
        }
      }
    }
  }

  return created;
}

export async function listInviteCodes(DB: D1Database): Promise<InviteCodeView[]> {
  const result = await DB.prepare(
    `SELECT ic.code, ic.note, ic.used_at, ic.used_by_registration_id, ic.revoked_at, ic.created_at,
            r.name AS used_by_name, r.status AS reg_status
     FROM invite_codes ic
     LEFT JOIN registrations r ON r.id = ic.used_by_registration_id
     ORDER BY ic.created_at DESC`
  ).all<InviteCodeRow & { used_by_name: string | null; reg_status: string | null }>();

  return (result.results ?? []).map((row) => {
    let status: InviteStatus;
    if (row.revoked_at) {
      status = "revoked";
    } else if (row.used_by_registration_id && row.reg_status === "PAID") {
      status = "used";
    } else if (row.used_by_registration_id) {
      // Vinculado a uma inscrição ainda não paga (pendente/cancelada): convite em uso.
      status = "pending";
    } else {
      status = "available";
    }
    return {
      code: row.code,
      note: row.note,
      used_at: row.used_at,
      used_by_registration_id: row.used_by_registration_id,
      revoked_at: row.revoked_at,
      created_at: row.created_at,
      used_by_name: row.used_by_name,
      status,
    };
  });
}

// Revoga um código que ainda não foi consumido por uma inscrição paga. Retorna se mudou.
export async function revokeInviteCode(DB: D1Database, code: string): Promise<boolean> {
  const normalized = normalizeInviteCode(code);
  if (!normalized) return false;
  const result = await DB.prepare(
    `UPDATE invite_codes
     SET revoked_at = datetime('now')
     WHERE code = ?1
       AND revoked_at IS NULL
       AND (
         used_by_registration_id IS NULL
         OR (SELECT status FROM registrations WHERE id = invite_codes.used_by_registration_id) <> 'PAID'
       )`
  )
    .bind(normalized)
    .run();
  return (result.meta?.changes ?? 0) > 0;
}
