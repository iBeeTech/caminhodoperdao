/// <reference types="@cloudflare/workers-types" />
export interface Registration {
  id: string;
  email: string;
  name: string;
  status: "PENDING" | "PAID" | "CANCELED";
  payment_provider: string | null;
  payment_ref: string | null;
  sleep_at_monastery: number;
  phone: string;
  cep: string;
  address: string;
  number: string;
  complement: string | null;
  city: string;
  state: string;
  created_at: string;
  paid_at: string | null;
}

export async function getByEmail(DB: D1Database, email: string): Promise<Registration | null> {
  const stmt = DB.prepare(
    "SELECT id, email, name, status, payment_provider, payment_ref, sleep_at_monastery, phone, cep, address, number, complement, city, state, created_at, paid_at FROM registrations WHERE email = ?"
  ).bind(email.toLowerCase());
  return (await stmt.first<Registration>()) ?? null;
}

export async function getByPaymentRef(DB: D1Database, paymentRef: string): Promise<Registration | null> {
  const stmt = DB.prepare(
    "SELECT id, email, name, status, payment_provider, payment_ref, sleep_at_monastery, phone, cep, address, number, complement, city, state, created_at, paid_at FROM registrations WHERE payment_ref = ?"
  ).bind(paymentRef);
  return (await stmt.first<Registration>()) ?? null;
}

export async function insertRegistration(
  DB: D1Database,
  input: {
    id: string;
    email: string;
    name: string;
    status: Registration["status"];
    payment_provider: string;
    payment_ref: string;
    sleep_at_monastery: number;
    phone: string;
    cep: string;
    address: string;
    number: string;
    complement: string | null;
    city: string;
    state: string;
  }
): Promise<void> {
  const stmt = DB.prepare(
    "INSERT INTO registrations (id, email, name, status, payment_provider, payment_ref, sleep_at_monastery, phone, cep, address, number, complement, city, state, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, datetime('now'))"
  ).bind(
    input.id,
    input.email.toLowerCase(),
    input.name,
    input.status,
    input.payment_provider,
    input.payment_ref,
    input.sleep_at_monastery,
    input.phone,
    input.cep,
    input.address,
    input.number,
    input.complement,
    input.city,
    input.state
  );
  await stmt.run();
}

export async function updateRegistration(
  DB: D1Database,
  email: string,
  input: {
    name: string;
    status: Registration["status"];
    payment_provider: string;
    payment_ref: string;
    sleep_at_monastery: number;
    phone: string;
    cep: string;
    address: string;
    number: string;
    complement: string | null;
    city: string;
    state: string;
  }
): Promise<void> {
  const stmt = DB.prepare(
    "UPDATE registrations SET name = ?1, status = ?2, payment_provider = ?3, payment_ref = ?4, sleep_at_monastery = ?5, phone = ?6, cep = ?7, address = ?8, number = ?9, complement = ?10, city = ?11, state = ?12, created_at = datetime('now'), paid_at = NULL WHERE email = ?13"
  ).bind(
    input.name,
    input.status,
    input.payment_provider,
    input.payment_ref,
    input.sleep_at_monastery,
    input.phone,
    input.cep,
    input.address,
    input.number,
    input.complement,
    input.city,
    input.state,
    email.toLowerCase()
  );
  await stmt.run();
}

export async function updatePaymentRef(
  DB: D1Database,
  email: string,
  provider: string,
  paymentRef: string
): Promise<void> {
  const stmt = DB.prepare(
    "UPDATE registrations SET payment_ref = ?, payment_provider = ? WHERE email = ?"
  ).bind(paymentRef, provider, email.toLowerCase());
  await stmt.run();
}

export async function markAsPaid(DB: D1Database, email: string, paymentRef: string): Promise<void> {
  const stmt = DB.prepare(
    "UPDATE registrations SET status = 'PAID', paid_at = datetime('now') WHERE email = ? AND payment_ref = ?"
  ).bind(email.toLowerCase(), paymentRef);
  await stmt.run();
}

export async function expirePending(DB: D1Database): Promise<void> {
  await DB.prepare(
    "UPDATE registrations SET status = 'CANCELED' WHERE status = 'PENDING' AND created_at <= datetime('now', '-1 day')"
  ).run();
}

export async function countActive(DB: D1Database): Promise<number> {
  try {
    const row = await DB.prepare(
      "SELECT COUNT(*) as total FROM registrations WHERE status IN ('PENDING','PAID')"
    ).first<{ total: number }>();
    return row?.total ?? 0;
  } catch (error) {
    console.error("Error counting active registrations:", error);
    return 0;
  }
}

export async function countActiveSleep(DB: D1Database): Promise<number> {
  try {
    const row = await DB.prepare(
      "SELECT COUNT(*) as total FROM registrations WHERE status IN ('PENDING','PAID') AND sleep_at_monastery = 1"
    ).first<{ total: number }>();
    return row?.total ?? 0;
  } catch (error) {
    console.error("Error counting active sleep registrations:", error);
    return 0;
  }
}
