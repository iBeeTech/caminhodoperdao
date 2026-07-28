/// <reference types="@cloudflare/workers-types" />
import { describe, it, expect, beforeEach } from "vitest";

import { checkInRegistration, undoCheckIn } from "../../functions/_utils/checkin";
import { onRequestPost as checkinPost } from "../../functions/api/admin/checkin";
import { createJwt } from "../../functions/_utils/adminAuth";

const JWT_SECRET = "segredo-de-teste";
const ADMIN_A = "maria@exemplo.com";
const ADMIN_B = "joao@exemplo.com";
/** Hora fixa: o mock não chama datetime('now') de verdade. */
const NOW = "2026-08-02 10:42:07";

interface RegRow {
  id: string;
  name: string;
  status: "PENDING" | "PAID" | "CANCELED";
  checked_in_at: string | null;
  checked_in_by: string | null;
}

// Mock mínimo do D1: só as três queries do fluxo de credenciamento. O que
// importa aqui é reproduzir o UPDATE condicional e o meta.changes, que é o
// mecanismo que impede a baixa dupla.
class CheckinD1 {
  registrations: RegRow[] = [];

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
    };
    return statement as any;
  }

  private runFirst(query: string, args: any[]): any {
    if (query.includes("FROM registrations WHERE id = ?")) {
      return this.registrations.find((r) => r.id === args[0]) ?? null;
    }
    return null;
  }

  private runExec(query: string, args: any[]) {
    if (query.includes("SET checked_in_at = datetime('now')")) {
      const [by, id] = args;
      const row = this.registrations.find(
        (r) => r.id === id && r.status === "PAID" && r.checked_in_at === null
      );
      if (!row) return { success: true, meta: { changes: 0 } };
      row.checked_in_at = NOW;
      row.checked_in_by = by;
      return { success: true, meta: { changes: 1 } };
    }
    if (query.includes("SET checked_in_at = NULL")) {
      const [id] = args;
      const row = this.registrations.find((r) => r.id === id && r.checked_in_at !== null);
      if (!row) return { success: true, meta: { changes: 0 } };
      row.checked_in_at = null;
      row.checked_in_by = null;
      return { success: true, meta: { changes: 1 } };
    }
    return { success: true, meta: { changes: 0 } };
  }
}

function makeDb(): CheckinD1 {
  const db = new CheckinD1();
  db.registrations = [
    {
      id: "reg-paga",
      name: "Maria de Souza",
      status: "PAID",
      checked_in_at: null,
      checked_in_by: null,
    },
    {
      id: "reg-pendente",
      name: "Ana Lima",
      status: "PENDING",
      checked_in_at: null,
      checked_in_by: null,
    },
  ];
  return db;
}

function makeEnv(db: CheckinD1) {
  return {
    DB: db as unknown as D1Database,
    ADMIN_JWT_SECRET: JWT_SECRET,
  };
}

async function makeToken(sub: string): Promise<string> {
  return createJwt({ sub, role: "admin" }, JWT_SECRET, 3600);
}

function postContext(env: ReturnType<typeof makeEnv>, token: string | null, body: unknown) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return {
    request: new Request("https://exemplo.test/api/admin/checkin", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }),
    env,
  } as any;
}

describe("credenciamento (util)", () => {
  let db: CheckinD1;

  beforeEach(() => {
    db = makeDb();
  });

  it("dá a baixa de um inscrito pago e registra quem credenciou", async () => {
    const result = await checkInRegistration(db as unknown as D1Database, "reg-paga", ADMIN_A);

    expect(result.ok).toBe(true);
    expect(db.registrations[0].checked_in_at).toBe(NOW);
    expect(db.registrations[0].checked_in_by).toBe(ADMIN_A);
  });

  it("segunda baixa no mesmo nome não sobrescreve e devolve quem credenciou antes", async () => {
    await checkInRegistration(db as unknown as D1Database, "reg-paga", ADMIN_A);
    const second = await checkInRegistration(db as unknown as D1Database, "reg-paga", ADMIN_B);

    expect(second.ok).toBe(false);
    if (second.ok) throw new Error("esperava conflito");
    expect(second.reason).toBe("already_checked_in");
    expect(second.row?.checked_in_by).toBe(ADMIN_A);
    // O registro continua com a autoria do primeiro voluntário.
    expect(db.registrations[0].checked_in_by).toBe(ADMIN_A);
  });

  it("não credencia quem não está pago", async () => {
    const result = await checkInRegistration(db as unknown as D1Database, "reg-pendente", ADMIN_A);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("esperava falha");
    expect(result.reason).toBe("not_paid");
    expect(db.registrations[1].checked_in_at).toBeNull();
  });

  it("id inexistente devolve not_found", async () => {
    const result = await checkInRegistration(db as unknown as D1Database, "nao-existe", ADMIN_A);

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("esperava falha");
    expect(result.reason).toBe("not_found");
    expect(result.row).toBeNull();
  });

  it("desfazer limpa a baixa e permite credenciar de novo", async () => {
    await checkInRegistration(db as unknown as D1Database, "reg-paga", ADMIN_A);

    const undone = await undoCheckIn(db as unknown as D1Database, "reg-paga");
    expect(undone.ok).toBe(true);
    expect(db.registrations[0].checked_in_at).toBeNull();
    expect(db.registrations[0].checked_in_by).toBeNull();

    const again = await checkInRegistration(db as unknown as D1Database, "reg-paga", ADMIN_B);
    expect(again.ok).toBe(true);
    expect(db.registrations[0].checked_in_by).toBe(ADMIN_B);
  });

  it("desfazer em quem não foi credenciado não muda nada", async () => {
    const result = await undoCheckIn(db as unknown as D1Database, "reg-paga");

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("esperava falha");
    expect(result.reason).toBe("not_checked_in");
  });
});

describe("POST /api/admin/checkin", () => {
  let db: CheckinD1;

  beforeEach(() => {
    db = makeDb();
  });

  it("sem token responde 401 e não credencia ninguém", async () => {
    const res = await checkinPost(postContext(makeEnv(db), null, { id: "reg-paga", checkIn: true }));

    expect(res.status).toBe(401);
    expect(db.registrations[0].checked_in_at).toBeNull();
  });

  it("com token válido credencia e responde com o horário e o autor", async () => {
    const token = await makeToken(ADMIN_A);
    const res = await checkinPost(
      postContext(makeEnv(db), token, { id: "reg-paga", checkIn: true })
    );
    const body = (await res.json()) as any;

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.checked_in_at).toBe(NOW);
    // A autoria vem do JWT, não do corpo da requisição.
    expect(body.checked_in_by).toBe(ADMIN_A);
  });

  it("conflito responde 409 dizendo quem já tinha credenciado", async () => {
    const tokenA = await makeToken(ADMIN_A);
    const tokenB = await makeToken(ADMIN_B);
    await checkinPost(postContext(makeEnv(db), tokenA, { id: "reg-paga", checkIn: true }));

    const res = await checkinPost(
      postContext(makeEnv(db), tokenB, { id: "reg-paga", checkIn: true })
    );
    const body = (await res.json()) as any;

    expect(res.status).toBe(409);
    expect(body.error).toBe("already_checked_in");
    expect(body.checked_in_by).toBe(ADMIN_A);
    expect(body.checked_in_at).toBe(NOW);
  });

  it("id inexistente responde 404", async () => {
    const token = await makeToken(ADMIN_A);
    const res = await checkinPost(postContext(makeEnv(db), token, { id: "sumiu", checkIn: true }));

    expect(res.status).toBe(404);
  });

  it("corpo inválido responde 400", async () => {
    const token = await makeToken(ADMIN_A);
    const res = await checkinPost(postContext(makeEnv(db), token, { id: "reg-paga" }));

    expect(res.status).toBe(400);
    expect(db.registrations[0].checked_in_at).toBeNull();
  });
});
