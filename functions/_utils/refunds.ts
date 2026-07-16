/// <reference types="@cloudflare/workers-types" />

export type RefundType = "inscricao" | "camiseta" | "downgrade";
export type RefundStatus = "PENDENTE" | "FEITO" | "CANCELADO";

export interface RefundRequest {
  id: string;
  type: RefundType;
  source_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  amount_cents: number;
  refund_status: RefundStatus;
  /** Chave PIX informada por quem cancelou. Nula nos estornos anteriores ao
      campo existir e quando a pessoa não informou. */
  pix_key: string | null;
  created_at: string;
  updated_at: string;
}

/** Limite defensivo: chave PIX é curta (CPF, e-mail, telefone ou UUID). */
const PIX_KEY_MAX_LENGTH = 120;

export function normalizePixKey(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, PIX_KEY_MAX_LENGTH);
}

/**
 * Registra um estorno a fazer (cancelamento PELO SITE de algo já pago, ou downgrade
 * pernoite->geral). Idempotente por (type, source_id): se já existe, não duplica.
 */
export async function createRefundRequest(
  DB: D1Database,
  input: {
    type: RefundType;
    sourceId: string | null;
    name: string;
    phone: string | null;
    email: string | null;
    amountCents: number;
    /** Onde devolver o dinheiro. Opcional: o downgrade automático não pergunta. */
    pixKey?: string | null;
  }
): Promise<void> {
  try {
    await DB.prepare(
      `INSERT OR IGNORE INTO refund_requests
        (id, type, source_id, name, phone, email, amount_cents, refund_status, pix_key, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDENTE', ?, datetime('now'), datetime('now'))`
    )
      .bind(
        crypto.randomUUID(),
        input.type,
        input.sourceId,
        input.name ?? "",
        input.phone,
        input.email,
        Math.max(0, Math.trunc(input.amountCents || 0)),
        input.pixKey ?? null
      )
      .run();
  } catch (error) {
    // Estorno é um registro auxiliar: não pode derrubar o cancelamento em si.
    console.error("Erro ao registrar refund_request:", error);
  }
}

export async function listRefundRequests(DB: D1Database): Promise<RefundRequest[]> {
  const result = await DB.prepare(
    `SELECT id, type, source_id, name, phone, email, amount_cents, refund_status, pix_key, created_at, updated_at
     FROM refund_requests
     ORDER BY (refund_status = 'PENDENTE') DESC, datetime(created_at) DESC`
  ).all<RefundRequest>();
  return result.results ?? [];
}

/**
 * Salva os status escolhidos no painel. Aceita uma lista de { id, refund_status }.
 */
export async function updateRefundStatuses(
  DB: D1Database,
  updates: Array<{ id: string; refund_status: RefundStatus }>
): Promise<number> {
  let updated = 0;
  for (const item of updates) {
    if (!item.id || !["PENDENTE", "FEITO", "CANCELADO"].includes(item.refund_status)) {
      continue;
    }
    const res = await DB.prepare(
      "UPDATE refund_requests SET refund_status = ?, updated_at = datetime('now') WHERE id = ?"
    )
      .bind(item.refund_status, item.id)
      .run();
    if ((res as any)?.success !== false) updated += 1;
  }
  return updated;
}
