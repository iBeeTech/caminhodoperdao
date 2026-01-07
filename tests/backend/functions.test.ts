/// <reference types="@cloudflare/workers-types" />
import { describe, it, expect, beforeEach } from "vitest";
import { handleRegister } from "../../functions/api/register";
import { handleWebhook } from "../../functions/api/webhooks/pix";
import { handleStatus } from "../../functions/api/status";

interface MemoryRegistration {
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

class InMemoryD1 implements D1Database {
  private registrations: MemoryRegistration[] = [];

  prepare(query: string): D1PreparedStatement {
    const db = this;
    return {
      bind(...args: unknown[]) {
        return {
          async first<T>() {
            if (query.startsWith("SELECT COUNT(1) as total FROM registrations WHERE status IN ('PENDING','PAID') AND sleep_at_monastery = 1")) {
              const total = db.registrations.filter(r => (r.status === "PENDING" || r.status === "PAID") && r.sleep_at_monastery === 1).length;
              return { total } as unknown as T;
            }
            if (query.startsWith("SELECT COUNT(1) as total FROM registrations WHERE status IN ('PENDING','PAID')")) {
              const total = db.registrations.filter(r => r.status === "PENDING" || r.status === "PAID").length;
              return { total } as unknown as T;
            }
            if (query.includes("WHERE email = ?")) {
              const email = String(args[0]).toLowerCase();
              const found = db.registrations.find(r => r.email === email);
              return (found as unknown as T) ?? null;
            }
            if (query.includes("WHERE payment_ref = ?")) {
              const ref = String(args[0]);
              const found = db.registrations.find(r => r.payment_ref === ref);
              return (found as unknown as T) ?? null;
            }
            return null as T;
          },
          async run() {
            if (query.startsWith("INSERT INTO registrations")) {
              const [id, email, name, status, provider, ref, sleep, phone, cep, address, number, complement, city, state] = args as [
                string,
                string,
                string,
                string,
                string,
                string,
                number,
                string,
                string,
                string,
                string,
                string | null,
                string,
                string
              ];
              if (db.registrations.some(r => r.email === email.toLowerCase())) {
                throw new Error("UNIQUE constraint failed: registrations.email");
              }
              db.registrations.push({
                id,
                email: email.toLowerCase(),
                name,
                status: status as MemoryRegistration["status"],
                payment_provider: provider,
                payment_ref: ref,
                sleep_at_monastery: sleep,
                phone,
                cep,
                address,
                number,
                complement,
                city,
                state,
                created_at: new Date().toISOString(),
                paid_at: null,
              });
              return { success: true } as D1Result;
            }

            if (query.startsWith("UPDATE registrations SET payment_ref")) {
              const [payment_ref, provider, email] = args as [string, string, string];
              db.registrations = db.registrations.map(r =>
                r.email === email.toLowerCase()
                  ? { ...r, payment_ref, payment_provider: provider }
                  : r
              );
              return { success: true } as D1Result;
            }

            if (query.startsWith("UPDATE registrations SET status = 'PAID'")) {
              const [email, ref] = args as [string, string];
              db.registrations = db.registrations.map(r =>
                r.email === email.toLowerCase() && r.payment_ref === ref
                  ? { ...r, status: "PAID", paid_at: new Date().toISOString() }
                  : r
              );
              return { success: true } as D1Result;
            }

            if (query.startsWith("UPDATE registrations SET status = 'CANCELED' WHERE status = 'PENDING' AND created_at <= datetime('now', '-1 day')")) {
              const cutoff = Date.now() - 24 * 60 * 60 * 1000;
              db.registrations = db.registrations.map(r =>
                r.status === "PENDING" && new Date(r.created_at).getTime() <= cutoff
                  ? { ...r, status: "CANCELED" }
                  : r
              );
              return { success: true } as D1Result;
            }

            return { success: true } as D1Result;
          },
        } as D1PreparedStatement;
      },
    } as D1PreparedStatement;
  }

  async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
    const results: D1Result<T>[] = [];
    for (const statement of statements) {
      const run = (statement as unknown as { run?: () => Promise<D1Result<T>> }).run;
      results.push(run ? await run() : ({ success: true } as D1Result<T>));
    }
    return results;
  }

  async exec(): Promise<D1ExecResult> {
    return { count: 0, duration: 0 };
  }

  withSession(): D1DatabaseSession {
    return new InMemoryD1Session(this);
  }

  async dump(): Promise<ArrayBuffer> {
    return new ArrayBuffer(0);
  }
}

class InMemoryD1Session implements D1DatabaseSession {
  constructor(private readonly db: InMemoryD1) {}

  prepare(query: string): D1PreparedStatement {
    return this.db.prepare(query);
  }

  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
    return this.db.batch<T>(statements);
  }

  getBookmark(): D1SessionBookmark | null {
    return null;
  }
}

function responseJson(response: Response): Promise<any> {
  return response.json();
}

describe("register flow", () => {
  let env: { DB: InMemoryD1; WEBHOOK_SECRET: string };

  beforeEach(() => {
    env = { DB: new InMemoryD1(), WEBHOOK_SECRET: "secret" };
  });

  it("creates PENDING on new email", async () => {
    const res = await handleRegister(env as any, { name: "Ana", email: "ana@example.com" });
    expect(res.status).toBe(200);
    const data = await responseJson(res);
    expect(data.status).toBe("PENDING");
    expect(data.payment_ref).toBeTruthy();
  });

  it("returns 409 when email already exists", async () => {
    await handleRegister(env as any, { name: "Ana", email: "ana@example.com" });
    const res = await handleRegister(env as any, { name: "Ana", email: "ana@example.com" });
    expect(res.status).toBe(409);
    const data = await responseJson(res);
    expect(data.error).toBe("registration_exists");
  });

  it("marks as PAID on webhook", async () => {
    const registerRes = await handleRegister(env as any, { name: "Ana", email: "ana@example.com" });
    const { payment_ref } = await responseJson(registerRes);

    const webhookReq = new Request("http://localhost/api/webhooks/pix", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-signature": "secret",
      },
      body: JSON.stringify({ payment_ref, status: "PAID" }),
    });

    const webhookRes = await handleWebhook(env as any, webhookReq, { payment_ref, status: "PAID" });
    expect(webhookRes.status).toBe(200);
    const statusRes = await handleStatus(env as any, "ana@example.com");
    const statusData = await responseJson(statusRes);
    expect(statusData.status).toBe("PAID");
  });
});
