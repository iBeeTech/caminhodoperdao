/// <reference types="@cloudflare/workers-types" />
import { describe, it, expect, beforeEach } from "vitest";

import {
  blockWhenEnrollmentClosed,
  isEnrollmentOpen,
  setEnrollmentOpen,
  isBypassed,
  addBypass,
  removeBypass,
  listBypass,
} from "../../functions/_utils/enrollmentGate";

/**
 * A porta da inscrição: flag `enrollment` (migration 002) + lista de exceção
 * (migration 039).
 *
 * O que estes testes protegem:
 *
 * 1. **A polaridade.** `enabled = 1` é ABERTAS. Invertida, a chave do admin
 *    trancaria o site inteiro no clique que deveria destrancá-lo.
 * 2. **A lista de exceção.** É a única saída de um site fechado; se ela
 *    parasse de funcionar, ninguém — nem a organização — entraria.
 * 3. **Falha de leitura deixa aberto.** Um erro de banco não pode trancar
 *    todo mundo do lado de fora.
 */

interface FlagRow {
  name: string;
  enabled: number;
}

interface BypassRow {
  email: string;
  note: string | null;
  created_at: number;
  created_by: string | null;
}

class GateD1 {
  flags: FlagRow[] = [];
  bypass: BypassRow[] = [];
  /** Liga para simular banco fora do ar. */
  shouldThrow = false;

  prepare(query: string) {
    const db = this;
    const statement = {
      _args: [] as any[],
      bind(...args: any[]) {
        this._args = args;
        return this;
      },
      async first<T = any>(): Promise<T | null> {
        if (db.shouldThrow) throw new Error("D1 fora do ar");
        return db.runFirst(query, this._args) as T | null;
      },
      async run() {
        if (db.shouldThrow) throw new Error("D1 fora do ar");
        db.runExec(query, this._args);
        return { success: true };
      },
      async all<T = any>() {
        if (db.shouldThrow) throw new Error("D1 fora do ar");
        return { results: db.runAll(query) as T[], success: true };
      },
    };
    return statement as any;
  }

  private runFirst(query: string, args: any[]): any {
    if (query.includes("FROM feature_flags WHERE name")) {
      return this.flags.find(f => f.name === args[0]) ?? null;
    }
    if (query.includes("FROM enrollment_bypass WHERE email")) {
      return this.bypass.find(b => b.email === args[0]) ?? null;
    }
    return null;
  }

  private runAll(query: string): any[] {
    if (query.includes("FROM enrollment_bypass ORDER BY")) {
      return [...this.bypass].sort((a, b) => b.created_at - a.created_at);
    }
    return [];
  }

  private runExec(query: string, args: any[]) {
    if (query.includes("INSERT INTO feature_flags")) {
      const [, name, enabled] = args;
      const existing = this.flags.find(f => f.name === name);
      if (existing) existing.enabled = enabled;
      else this.flags.push({ name, enabled });
      return;
    }
    if (query.includes("INSERT INTO enrollment_bypass")) {
      const [email, note, createdAt, createdBy] = args;
      const existing = this.bypass.find(b => b.email === email);
      if (existing) {
        existing.note = note;
        existing.created_by = createdBy;
        return;
      }
      this.bypass.push({ email, note, created_at: createdAt, created_by: createdBy });
      return;
    }
    if (query.includes("DELETE FROM enrollment_bypass")) {
      this.bypass = this.bypass.filter(b => b.email !== args[0]);
    }
  }
}

const asDb = (db: GateD1) => db as unknown as D1Database;

describe("porta da inscrição — a flag", () => {
  let db: GateD1;

  beforeEach(() => {
    db = new GateD1();
  });

  it("enabled = 1 significa ABERTAS", async () => {
    db.flags = [{ name: "enrollment", enabled: 1 }];
    expect(await isEnrollmentOpen(asDb(db))).toBe(true);
  });

  it("enabled = 0 significa ENCERRADAS", async () => {
    db.flags = [{ name: "enrollment", enabled: 0 }];
    expect(await isEnrollmentOpen(asDb(db))).toBe(false);
  });

  it("sem a linha da flag, as inscrições ficam abertas", async () => {
    expect(await isEnrollmentOpen(asDb(db))).toBe(true);
  });

  it("banco fora do ar não tranca ninguém do lado de fora", async () => {
    db.flags = [{ name: "enrollment", enabled: 0 }];
    db.shouldThrow = true;
    expect(await isEnrollmentOpen(asDb(db))).toBe(true);
  });

  it("encerrar e reabrir grava a mesma linha", async () => {
    await setEnrollmentOpen(asDb(db), false);
    expect(await isEnrollmentOpen(asDb(db))).toBe(false);
    await setEnrollmentOpen(asDb(db), true);
    expect(await isEnrollmentOpen(asDb(db))).toBe(true);
    expect(db.flags).toHaveLength(1);
  });
});

describe("porta da inscrição — a lista de exceção", () => {
  let db: GateD1;

  beforeEach(() => {
    db = new GateD1();
  });

  it("libera o e-mail cadastrado, ignorando caixa e espaços", async () => {
    await addBypass(asDb(db), { email: "  Maria@Exemplo.com ", note: "testes", createdBy: "admin@x" });
    expect(await isBypassed(asDb(db), "maria@exemplo.com")).toBe(true);
    expect(await isBypassed(asDb(db), "MARIA@EXEMPLO.COM")).toBe(true);
  });

  it("não libera quem não está na lista", async () => {
    expect(await isBypassed(asDb(db), "joao@exemplo.com")).toBe(false);
    expect(await isBypassed(asDb(db), "")).toBe(false);
  });

  it("adicionar duas vezes atualiza o motivo, sem duplicar", async () => {
    await addBypass(asDb(db), { email: "maria@exemplo.com", note: "testes", createdBy: "admin@x" });
    await addBypass(asDb(db), { email: "maria@exemplo.com", note: "outro motivo", createdBy: "admin@y" });
    const list = await listBypass(asDb(db));
    expect(list).toHaveLength(1);
    expect(list[0].note).toBe("outro motivo");
    expect(list[0].created_by).toBe("admin@y");
  });

  it("tirar da lista fecha a porta de novo", async () => {
    await addBypass(asDb(db), { email: "maria@exemplo.com", note: "", createdBy: "admin@x" });
    await removeBypass(asDb(db), "Maria@Exemplo.com");
    expect(await isBypassed(asDb(db), "maria@exemplo.com")).toBe(false);
  });

  it("motivo em branco vira nulo, nao string vazia", async () => {
    await addBypass(asDb(db), { email: "maria@exemplo.com", note: "   ", createdBy: "admin@x" });
    expect((await listBypass(asDb(db)))[0].note).toBeNull();
  });
});

describe("porta da inscrição — a guarda de login e cadastro", () => {
  let db: GateD1;

  beforeEach(() => {
    db = new GateD1();
  });

  it("inscrições abertas deixam qualquer um passar", async () => {
    db.flags = [{ name: "enrollment", enabled: 1 }];
    expect(await blockWhenEnrollmentClosed(asDb(db), "joao@exemplo.com")).toBeNull();
  });

  it("inscrições encerradas recusam com 403 enrollment_closed", async () => {
    db.flags = [{ name: "enrollment", enabled: 0 }];
    const response = await blockWhenEnrollmentClosed(asDb(db), "joao@exemplo.com");
    expect(response).not.toBeNull();
    expect(response!.status).toBe(403);
    expect(await response!.json()).toEqual({ error: "enrollment_closed" });
  });

  it("quem está na lista entra mesmo com tudo encerrado", async () => {
    db.flags = [{ name: "enrollment", enabled: 0 }];
    await addBypass(asDb(db), { email: "maria@exemplo.com", note: "organização", createdBy: "admin@x" });
    expect(await blockWhenEnrollmentClosed(asDb(db), "maria@exemplo.com")).toBeNull();
    // E o vizinho continua barrado.
    expect(await blockWhenEnrollmentClosed(asDb(db), "joao@exemplo.com")).not.toBeNull();
  });
});
