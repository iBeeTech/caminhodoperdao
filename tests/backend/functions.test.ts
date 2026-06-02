/// <reference types="@cloudflare/workers-types" />
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mocka apenas a integração de rede com a Woovi. Todo o resto (validação,
// capacidade, criptografia de CPF, persistência via InMemoryD1) roda de verdade.
vi.mock("../../functions/_utils/woovi", () => ({
  createWooviCharge: vi.fn(async (_appId: string, payload: any) => ({
    charge: {
      transactionID: `TX-${payload.correlationID}`,
      brCode: "00020126BR-CODE-PIX",
      qrCodeImage: "data:image/png;base64,AAAA",
      expiresDate: "2026-12-31T23:59:59.000Z",
      correlationID: payload.correlationID,
    },
  })),
  getWooviChargeStatus: vi.fn(async () => ({ charge: { status: "ACTIVE" } })),
}));

import { handleRegister } from "../../functions/api/register";
import { handleStatus } from "../../functions/api/status";
import { onRequestPost as webhookPost } from "../../functions/api/webhooks";
import { createStaffRegistration } from "../../functions/_utils/staffRegistration";

// CPFs válidos (dígitos verificadores corretos).
const CPF_A = "529.982.247-25";
const CPF_B = "111.444.777-35";
// Chave/IV de 32 e 16 bytes (zeros) em base64, válidos para AES-256-CBC.
const CPF_KEY = Buffer.from(new Uint8Array(32)).toString("base64");
const CPF_IV = Buffer.from(new Uint8Array(16)).toString("base64");

interface RegRow {
  id: string;
  email: string;
  name: string;
  status: "PENDING" | "PAID" | "CANCELED";
  payment_provider: string | null;
  payment_ref: string | null;
  sleep_at_monastery: number;
  companion_name: string | null;
  phone: string;
  cep: string;
  address: string;
  number: string;
  complement: string | null;
  city: string;
  state: string;
  cpf_encrypted: string | null;
  date_of_birth: string | null;
  terms_accepted_at: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  has_allergy_medication: number;
  allergy_medication_details: string | null;
  has_dietary_restriction: number;
  dietary_restriction_details: string | null;
  is_staff: number;
  registration_number: string | null;
  created_at: string;
  paid_at: string | null;
}

interface PaymentRow {
  id: string;
  email: string;
  correlation_id: string;
  provider_charge_id: string | null;
  amount_cents: number;
  status: string;
  brcode: string | null;
  qr_code_image: string | null;
  qr_code_url: string | null;
  expires_at: number | null;
  created_at: number;
  updated_at: number;
}

// D1 em memória que atende as queries reais das functions exercitadas no fluxo
// register -> webhook -> status. O roteamento é por trecho da query.
class InMemoryD1 {
  registrations: RegRow[] = [];
  payments: PaymentRow[] = [];

  prepare(query: string) {
    const db = this;
    const statement = {
      _args: [] as any[],
      bind(...args: any[]) {
        this._args = args;
        return this;
      },
      async first<T = any>(): Promise<T | null> {
        return db.runFirst(query, this._args) as T | null;
      },
      async run() {
        return db.runExec(query, this._args);
      },
      async all<T = any>() {
        const row = db.runFirst(query, this._args);
        return { results: (row ? [row] : []) as T[], success: true };
      },
    };
    return statement as any;
  }

  async batch(statements: any[]) {
    const results = [];
    for (const s of statements) results.push(s.run ? await s.run() : { success: true });
    return results;
  }

  async exec() {
    return { count: 0, duration: 0 };
  }

  private runFirst(query: string, args: any[]): any {
    // Contagens de capacidade (a mais específica primeiro).
    if (query.includes("SELECT COUNT(*) as total FROM registrations WHERE status IN ('PENDING','PAID')")) {
      const active = this.registrations.filter((r) => r.status === "PENDING" || r.status === "PAID");
      if (query.includes("sleep_at_monastery = 1")) {
        const sleepers = active.filter((r) => r.sleep_at_monastery === 1);
        // Pool do mosteiro dos peregrinos: conta só não-staff dormindo.
        if (query.includes("is_staff = 0")) {
          return { total: sleepers.filter((r) => r.is_staff === 0).length };
        }
        return { total: sleepers.length };
      }
      if (query.includes("is_staff = 1")) {
        return { total: active.filter((r) => r.is_staff === 1).length };
      }
      return { total: active.length };
    }

    // Pool do mosteiro: contagem SÓ de PAGAS (não-staff dormindo).
    if (query.includes("SELECT COUNT(*) as total FROM registrations WHERE status = 'PAID'")) {
      const paid = this.registrations.filter((r) => r.status === "PAID");
      if (query.includes("sleep_at_monastery = 1") && query.includes("is_staff = 0")) {
        return {
          total: paid.filter((r) => r.sleep_at_monastery === 1 && r.is_staff === 0).length,
        };
      }
      return { total: paid.length };
    }

    // generateRegistrationNumber (webhook).
    if (query.includes("SELECT COUNT(*) as count FROM registrations WHERE registration_number LIKE ?")) {
      const count = this.registrations.filter(
        (r) => r.status === "PAID" && r.registration_number
      ).length;
      return { count };
    }

    // Webhook: busca enxuta por payment_ref.
    if (query.startsWith("SELECT id, email, name FROM registrations WHERE payment_ref = ?")) {
      const r = this.registrations.find((x) => x.payment_ref === args[0]);
      return r ? { id: r.id, email: r.email, name: r.name } : null;
    }

    // Lookups completos de registration.
    if (query.includes("FROM registrations WHERE cpf_encrypted = ?")) {
      return this.registrations.find((r) => r.cpf_encrypted === args[0]) ?? null;
    }
    if (query.includes("FROM registrations WHERE payment_ref = ?")) {
      return this.registrations.find((r) => r.payment_ref === args[0]) ?? null;
    }
    if (query.includes("FROM registrations WHERE phone = ?")) {
      const normalized = String(args[0]).replace(/\D/g, "");
      return this.registrations.find((r) => r.phone === normalized) ?? null;
    }
    if (query.includes("FROM registrations WHERE email = ?")) {
      return this.registrations.find((r) => r.email === String(args[0]).toLowerCase()) ?? null;
    }

    // Pagamentos.
    if (query.includes("SELECT * FROM payments WHERE correlation_id = ?")) {
      return this.payments.find((p) => p.correlation_id === args[0]) ?? null;
    }
    if (query.includes("FROM payments WHERE correlation_id = ? OR provider_charge_id = ?")) {
      const p = this.payments.find(
        (x) => x.correlation_id === args[0] || x.provider_charge_id === args[1]
      );
      return p ? { correlation_id: p.correlation_id, provider_charge_id: p.provider_charge_id } : null;
    }

    // Camiseta: nunca presente neste fluxo.
    if (query.includes("FROM tshirt_purchase")) {
      return null;
    }

    return null;
  }

  private runExec(query: string, args: any[]) {
    // expirePending: registros do teste são recém-criados, ninguém expira.
    if (query.includes("WHERE status = 'PENDING' AND created_at <= datetime('now', '-1 day')")) {
      return { success: true };
    }

    // INSERT de staff (cortesia): ordem de colunas própria, já entra como PAID e is_staff=1.
    if (query.startsWith("INSERT INTO registrations") && query.includes("is_staff,")) {
      const [
        id, email, name, sleep_at_monastery, companion_name, phone, cep, address,
        number, complement, city, state, cpf_encrypted, date_of_birth, terms_accepted_at,
        emergency_contact_name, emergency_contact_phone, has_allergy_medication,
        allergy_medication_details, has_dietary_restriction, dietary_restriction_details,
        registration_number, paid_at,
      ] = args;
      this.registrations.push({
        id, email: String(email).toLowerCase(), name, status: "PAID",
        payment_provider: "cortesia", payment_ref: null, sleep_at_monastery,
        companion_name, phone: String(phone).replace(/\D/g, ""), cep, address, number,
        complement, city, state, cpf_encrypted, date_of_birth, terms_accepted_at,
        emergency_contact_name, emergency_contact_phone,
        has_allergy_medication, allergy_medication_details,
        has_dietary_restriction, dietary_restriction_details,
        is_staff: 1, registration_number,
        created_at: new Date().toISOString(), paid_at,
      });
      return { success: true };
    }

    if (query.startsWith("INSERT INTO registrations")) {
      const [
        id, email, name, status, payment_provider, payment_ref, sleep_at_monastery,
        companion_name, phone, cep, address, number, complement, city, state,
        cpf_encrypted, date_of_birth, terms_accepted_at, emergency_contact_name,
        emergency_contact_phone, has_allergy_medication, allergy_medication_details,
        has_dietary_restriction, dietary_restriction_details,
      ] = args;
      this.registrations.push({
        id, email: String(email).toLowerCase(), name, status,
        payment_provider, payment_ref, sleep_at_monastery,
        companion_name, phone: String(phone).replace(/\D/g, ""), cep, address, number,
        complement, city, state, cpf_encrypted, date_of_birth, terms_accepted_at,
        emergency_contact_name, emergency_contact_phone,
        has_allergy_medication, allergy_medication_details,
        has_dietary_restriction, dietary_restriction_details,
        is_staff: 0, registration_number: null,
        created_at: new Date().toISOString(), paid_at: null,
      });
      return { success: true };
    }

    if (query.startsWith("UPDATE registrations SET name = ?1")) {
      const id = args[22];
      const row = this.registrations.find((r) => r.id === id);
      if (row) {
        row.name = args[0]; row.status = args[1]; row.payment_provider = args[2];
        row.payment_ref = args[3]; row.sleep_at_monastery = args[4]; row.companion_name = args[5];
        row.phone = String(args[6]).replace(/\D/g, ""); row.cep = args[7]; row.address = args[8];
        row.number = args[9]; row.complement = args[10]; row.city = args[11]; row.state = args[12];
        row.cpf_encrypted = args[13]; row.date_of_birth = args[14]; row.terms_accepted_at = args[15];
        row.emergency_contact_name = args[16]; row.emergency_contact_phone = args[17];
        row.has_allergy_medication = args[18]; row.allergy_medication_details = args[19];
        row.has_dietary_restriction = args[20]; row.dietary_restriction_details = args[21];
        row.paid_at = null;
      }
      return { success: true };
    }

    // Webhook: marca como PAID com número de inscrição.
    if (query.includes("SET status = 'PAID', paid_at = ?, registration_number = ?")) {
      const [paid_at, registration_number, id] = args;
      const row = this.registrations.find((r) => r.id === id);
      if (row) {
        row.status = "PAID";
        row.paid_at = String(paid_at);
        row.registration_number = registration_number;
      }
      return { success: true };
    }

    // Sincronização via status (por telefone).
    if (query.includes("SET status = 'PAID', paid_at = ? WHERE phone = ?")) {
      const normalized = String(args[1]).replace(/\D/g, "");
      const row = this.registrations.find((r) => r.phone === normalized);
      if (row) { row.status = "PAID"; row.paid_at = String(args[0]); }
      return { success: true };
    }

    if (query.includes("SET status = 'CANCELED' WHERE id = ?")) {
      const row = this.registrations.find((r) => r.id === args[0]);
      if (row) row.status = "CANCELED";
      return { success: true };
    }

    if (query.startsWith("INSERT INTO payments")) {
      const [
        id, email, correlation_id, provider_charge_id, amount_cents, status,
        brcode, qr_code_image, qr_code_url, expires_at, created_at, updated_at,
      ] = args;
      this.payments.push({
        id, email, correlation_id, provider_charge_id, amount_cents, status,
        brcode, qr_code_image, qr_code_url, expires_at, created_at, updated_at,
      });
      return { success: true };
    }

    return { success: true };
  }
}

function makeEnv(overrides: Record<string, any> = {}) {
  return {
    DB: new InMemoryD1(),
    WOOVI_APP_ID: "test-app-id",
    CPF_ENCRYPTION_KEY: CPF_KEY,
    CPF_ENCRYPTION_IV: CPF_IV,
    ...overrides,
  };
}

function validBody(overrides: Record<string, any> = {}) {
  return {
    name: "Ana",
    email: "ana@example.com",
    phone: "11999999999",
    cpf: CPF_A,
    dateOfBirth: "1990-01-01",
    termsAccepted: true,
    emergencyContactName: "Maria",
    emergencyContactPhone: "11888888888",
    hasAllergyMedication: false,
    hasDietaryRestriction: false,
    sleepAtMonastery: false,
    cep: "12345678",
    address: "Rua Teste",
    number: "123",
    city: "São Paulo",
    state: "SP",
    ...overrides,
  };
}

function paidWebhookRequest(paymentRef: string) {
  return new Request("http://localhost/api/webhooks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      charge: { status: "COMPLETED", transactionID: paymentRef, correlationID: paymentRef },
    }),
  });
}

describe("register flow", () => {
  let env: ReturnType<typeof makeEnv>;

  beforeEach(() => {
    env = makeEnv();
  });

  it("cria inscrição PENDING para um CPF novo", async () => {
    const res = await handleRegister(env as any, validBody());
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("PENDING");
    expect(data.payment_ref).toBeTruthy();
    expect(env.DB.registrations).toHaveLength(1);
    expect(env.DB.registrations[0].status).toBe("PENDING");
  });

  it("permite re-inscrição enquanto PENDING (atualiza, não duplica)", async () => {
    await handleRegister(env as any, validBody());
    const res = await handleRegister(env as any, validBody({ city: "Campinas" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("PENDING");
    // Continua existindo apenas UMA inscrição para o mesmo CPF.
    expect(env.DB.registrations).toHaveLength(1);
    expect(env.DB.registrations[0].city).toBe("Campinas");
  });

  it("retorna 409 quando o CPF já está PAGO", async () => {
    const first = await handleRegister(env as any, validBody());
    const { payment_ref } = await first.json();
    await webhookPost({ request: paidWebhookRequest(payment_ref), env } as any);

    const res = await handleRegister(env as any, validBody());
    expect(res.status).toBe(409);
    const data = await res.json();
    expect(data.error).toBe("registration_exists");
  });

  it("marca como PAID via webhook e reflete no status", async () => {
    const registerRes = await handleRegister(env as any, validBody());
    const { payment_ref } = await registerRes.json();

    const webhookRes = await webhookPost({ request: paidWebhookRequest(payment_ref), env } as any);
    expect(webhookRes.status).toBe(200);

    const statusRes = await handleStatus(env as any, null, null, CPF_A);
    const statusData = await statusRes.json();
    expect(statusData.status).toBe("PAID");
    expect(statusData.exists).toBe(true);
  });

  it("bloqueia com monastery_full quando o pool de PAGAS esgota", async () => {
    const limited = makeEnv({ MAX_REGISTRATIONS_SLEEP: "1" });

    // Primeira inscrição no mosteiro precisa estar PAGA para ocupar a cama.
    const ok = await handleRegister(limited as any, validBody({ sleepAtMonastery: true }));
    expect(ok.status).toBe(200);
    const { payment_ref } = await ok.json();
    await webhookPost({ request: paidWebhookRequest(payment_ref), env: limited } as any);

    // Com a única cama já PAGA, a próxima inscrição no mosteiro é bloqueada.
    const full = await handleRegister(
      limited as any,
      validBody({ cpf: CPF_B, email: "bruno@example.com", sleepAtMonastery: true })
    );
    expect(full.status).toBe(409);
    const data = await full.json();
    expect(data.error).toBe("monastery_full");
  });

  it("inscrição PENDENTE no mosteiro NÃO bloqueia novas (conta só pagas)", async () => {
    const limited = makeEnv({ MAX_REGISTRATIONS_SLEEP: "1" });

    // Primeira fica PENDENTE (não paga) — não reserva a cama.
    const ok = await handleRegister(limited as any, validBody({ sleepAtMonastery: true }));
    expect(ok.status).toBe(200);

    // Segunda inscrição no mosteiro ainda é permitida, pois nenhuma foi paga.
    const second = await handleRegister(
      limited as any,
      validBody({ cpf: CPF_B, email: "bruno@example.com", sleepAtMonastery: true })
    );
    expect(second.status).toBe(200);
  });
});

function staffBody(overrides: Record<string, any> = {}) {
  return {
    name: "Carla Staff",
    email: "carla@example.com",
    phone: "11977777777",
    cpf: CPF_B,
    dateOfBirth: "1985-05-05",
    termsAccepted: true,
    emergencyContactName: "Joana",
    emergencyContactPhone: "11866666666",
    hasAllergyMedication: false,
    hasDietaryRestriction: false,
    sleepAtMonastery: false,
    cep: "12345678",
    address: "Rua Staff",
    number: "10",
    city: "São Paulo",
    state: "SP",
    ...overrides,
  };
}

describe("staff capacity (balde independente dos peregrinos)", () => {
  it("staff dormindo NÃO consome o pool de camas dos peregrinos", async () => {
    // Apenas 1 cama no pool de peregrinos.
    const env = makeEnv({ MAX_REGISTRATIONS_SLEEP: "1" });

    // Um staff dorme no mosteiro (à parte).
    const staff = await createStaffRegistration(env as any, staffBody({ sleepAtMonastery: true }));
    expect(staff.ok).toBe(true);

    // O peregrino ainda consegue ocupar a única cama do pool: o staff não a consumiu.
    const peregrino = await handleRegister(
      env as any,
      validBody({ sleepAtMonastery: true })
    );
    expect(peregrino.status).toBe(200);
  });

  it("staff NÃO ocupa vaga dos peregrinos (teto de peregrinos é próprio)", async () => {
    // Teto de peregrinos = 1; no modelo antigo o staff (40) zerava esse teto.
    const env = makeEnv({ MAX_REGISTRATIONS: "1" });

    const staff = await createStaffRegistration(env as any, staffBody());
    expect(staff.ok).toBe(true);

    // Mesmo com staff presente, ainda há 1 vaga de peregrino disponível.
    const peregrino = await handleRegister(env as any, validBody());
    expect(peregrino.status).toBe(200);
  });

  it("bloqueia com staff_full quando o balde de staff esgota", async () => {
    const env = makeEnv({ MAX_REGISTRATIONS_STAFF: "1" });

    const first = await createStaffRegistration(env as any, staffBody());
    expect(first.ok).toBe(true);

    const second = await createStaffRegistration(
      env as any,
      staffBody({ cpf: CPF_A, email: "diego@example.com" })
    );
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.error).toBe("staff_full");
  });
});
