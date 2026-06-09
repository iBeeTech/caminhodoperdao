/// <reference types="@cloudflare/workers-types" />
import { describe, it, expect, beforeEach } from "vitest";

import { handleJoinWaitlist } from "../../functions/api/waitlist";
import { listWaitlist, setWaitlistNotified } from "../../functions/_utils/waitlist";
import { encryptCpf } from "../../functions/_utils/cpfCrypto";
import { canonicalizeCpf } from "../../functions/_utils/cpfValidation";

// CPFs válidos (dígitos verificadores corretos) — os mesmos do harness principal.
const CPF_A = "529.982.247-25";
const CPF_B = "111.444.777-35";
const CPF_KEY = Buffer.from(new Uint8Array(32)).toString("base64");
const CPF_IV = Buffer.from(new Uint8Array(16)).toString("base64");

interface WaitlistRow {
  id: string;
  name: string;
  cpf_encrypted: string;
  phone: string;
  notified_at: string | null;
  created_at: string;
  updated_at: string;
}

interface RegRow {
  cpf_encrypted: string;
  status: "PENDING" | "PAID" | "CANCELED";
  is_staff: number;
}

// Mock mínimo do D1: só as queries que o fluxo da lista de espera usa.
class WaitlistD1 {
  waitlist: WaitlistRow[] = [];
  registrations: RegRow[] = [];
  private seq = 0;

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
        return { results: db.runAll(query) as T[], success: true };
      },
    };
    return statement as any;
  }

  private runFirst(query: string, args: any[]): any {
    if (query.includes("FROM registrations WHERE cpf_encrypted = ?")) {
      return this.registrations.find((r) => r.cpf_encrypted === args[0]) ?? null;
    }
    if (query.includes("FROM waitlist WHERE cpf_encrypted = ?")) {
      return this.waitlist.find((w) => w.cpf_encrypted === args[0]) ?? null;
    }
    return null;
  }

  private runAll(query: string): any[] {
    if (query.includes("FROM waitlist ORDER BY")) {
      return [...this.waitlist].sort((a, b) => a.created_at.localeCompare(b.created_at));
    }
    return [];
  }

  private runExec(query: string, args: any[]) {
    if (query.startsWith("INSERT INTO waitlist")) {
      const [id, name, cpf_encrypted, phone] = args;
      // Timestamps sintéticos crescentes para a ordenação ser determinística.
      this.seq += 1;
      const ts = `2026-06-09 10:00:0${this.seq}`;
      this.waitlist.push({ id, name, cpf_encrypted, phone, notified_at: null, created_at: ts, updated_at: ts });
      return { success: true };
    }
    if (query.startsWith("UPDATE waitlist SET name = ?1, phone = ?2")) {
      const row = this.waitlist.find((w) => w.id === args[2]);
      if (row) {
        row.name = args[0];
        row.phone = args[1];
      }
      return { success: true };
    }
    if (query.includes("UPDATE waitlist SET notified_at = datetime('now')")) {
      const row = this.waitlist.find((w) => w.id === args[0]);
      if (row) row.notified_at = "2026-06-09 12:00:00";
      return { success: true };
    }
    if (query.includes("UPDATE waitlist SET notified_at = NULL")) {
      const row = this.waitlist.find((w) => w.id === args[0]);
      if (row) row.notified_at = null;
      return { success: true };
    }
    return { success: true };
  }
}

function makeEnv() {
  return {
    DB: new WaitlistD1() as unknown as D1Database,
    CPF_ENCRYPTION_KEY: CPF_KEY,
    CPF_ENCRYPTION_IV: CPF_IV,
  };
}

function body(overrides: Record<string, any> = {}) {
  return { name: "Maria Silva", cpf: CPF_A, phone: "(11) 99999-9999", ...overrides };
}

describe("lista de espera (POST /api/waitlist)", () => {
  let env: ReturnType<typeof makeEnv>;
  let db: WaitlistD1;

  beforeEach(() => {
    env = makeEnv();
    db = env.DB as unknown as WaitlistD1;
  });

  it("adiciona na lista com telefone normalizado (só dígitos)", async () => {
    const res = await handleJoinWaitlist(env, body());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ADDED" });
    expect(db.waitlist).toHaveLength(1);
    expect(db.waitlist[0].name).toBe("Maria Silva");
    expect(db.waitlist[0].phone).toBe("11999999999");
    expect(db.waitlist[0].notified_at).toBeNull();
  });

  it("re-envio do mesmo CPF atualiza contato e mantém a posição", async () => {
    await handleJoinWaitlist(env, body());
    const firstCreatedAt = db.waitlist[0].created_at;

    const res = await handleJoinWaitlist(
      env,
      body({ name: "Maria S. Atualizada", phone: "(16) 98888-7777" })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ALREADY_ON_WAITLIST" });
    expect(db.waitlist).toHaveLength(1);
    expect(db.waitlist[0].name).toBe("Maria S. Atualizada");
    expect(db.waitlist[0].phone).toBe("16988887777");
    expect(db.waitlist[0].created_at).toBe(firstCreatedAt);
  });

  it.each(["PENDING", "PAID"] as const)(
    "bloqueia CPF com inscrição ativa (%s)",
    async (status) => {
      db.registrations.push({
        cpf_encrypted: await encryptCpf(canonicalizeCpf(CPF_A), CPF_KEY, CPF_IV),
        status,
        is_staff: 0,
      });
      const res = await handleJoinWaitlist(env, body());
      expect(res.status).toBe(409);
      expect(await res.json()).toMatchObject({ error: "already_registered", status });
      expect(db.waitlist).toHaveLength(0);
    }
  );

  it("permite CPF com inscrição CANCELED", async () => {
    db.registrations.push({
      cpf_encrypted: await encryptCpf(canonicalizeCpf(CPF_A), CPF_KEY, CPF_IV),
      status: "CANCELED",
      is_staff: 0,
    });
    const res = await handleJoinWaitlist(env, body());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ADDED" });
  });

  it("rejeita nome vazio, CPF inválido e telefone inválido", async () => {
    const noName = await handleJoinWaitlist(env, body({ name: "  " }));
    expect(noName.status).toBe(400);
    expect(await noName.json()).toEqual({ error: "invalid_name" });

    const badCpf = await handleJoinWaitlist(env, body({ cpf: "123.456.789-00" }));
    expect(badCpf.status).toBe(400);
    expect(await badCpf.json()).toEqual({ error: "invalid_cpf" });

    const badPhone = await handleJoinWaitlist(env, body({ phone: "9999" }));
    expect(badPhone.status).toBe(400);
    expect(await badPhone.json()).toEqual({ error: "invalid_phone" });

    expect(db.waitlist).toHaveLength(0);
  });

  it("lista em ordem de chegada e marca/desmarca avisado", async () => {
    await handleJoinWaitlist(env, body({ cpf: CPF_A, name: "Primeira" }));
    await handleJoinWaitlist(env, body({ cpf: CPF_B, name: "Segunda" }));

    let entries = await listWaitlist(env.DB);
    expect(entries.map((e) => e.name)).toEqual(["Primeira", "Segunda"]);

    await setWaitlistNotified(env.DB, entries[0].id, true);
    entries = await listWaitlist(env.DB);
    expect(entries[0].notified_at).not.toBeNull();
    expect(entries[1].notified_at).toBeNull();

    await setWaitlistNotified(env.DB, entries[0].id, false);
    entries = await listWaitlist(env.DB);
    expect(entries[0].notified_at).toBeNull();
  });
});
