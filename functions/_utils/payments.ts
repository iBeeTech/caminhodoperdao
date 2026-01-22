// Salva novo pagamento no D1
export async function savePayment(
  db: any,
  payment: Omit<any, 'id'> & { id?: string }
): Promise<any> {
  const id = payment.id || crypto.randomUUID();
  const now = Date.now();

  try {
    await db
      .prepare(
        `INSERT INTO payments (
          id, email, correlation_id, provider_charge_id, 
          amount_cents, status, brcode, qr_code_image, qr_code_url,
          expires_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        payment.email,
        payment.correlation_id,
        payment.provider_charge_id || null,
        payment.amount_cents,
        payment.status,
        payment.brcode || null,
        payment.qr_code_image || null,
        payment.qr_code_url || null,
        payment.expires_at || null,
        payment.created_at || now,
        payment.updated_at || now
      )
      .run();

    return { ...payment, id };
  } catch (error) {
    console.error('Erro ao salvar pagamento:', error);
    throw error;
  }
}
/// <reference types="@cloudflare/workers-types" />

export interface Payment {
  id: string;
  email: string;
  correlation_id: string;
  provider_charge_id: string;
  amount_cents: number;
  status: string;
  brcode: string | null;
  qr_code_image: string | null;
  qr_code_url: string | null;
  expires_at: number | null;
  created_at: number;
  updated_at: number;
}

export async function getPaymentByRef(DB: D1Database, paymentRef: string): Promise<Payment | null> {
  const stmt = DB.prepare(
    "SELECT * FROM payments WHERE correlation_id = ?"
  ).bind(paymentRef);
  return (await stmt.first<Payment>()) ?? null;
}
