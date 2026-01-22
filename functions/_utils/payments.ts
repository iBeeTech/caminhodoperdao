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
