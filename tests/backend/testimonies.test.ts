/// <reference types="@cloudflare/workers-types" />
import { describe, it, expect, beforeEach } from "vitest";

import { handleSubmitTestimony } from "../../functions/api/testemunhos/index";
import {
  listApprovedTestimonies,
  listAllTestimonies,
  setTestimonyStatus,
} from "../../functions/_utils/testimonies";

interface TestimonyRow {
  id: string;
  name: string;
  content: string;
  source: "text" | "audio";
  audio_key: string | null;
  audio_content_type: string | null;
  status: "pending" | "approved" | "rejected";
  consent: number;
  created_at: string;
  updated_at: string;
}

// Mock mínimo do D1: só as queries que o fluxo de testemunhos usa.
class TestimoniesD1 {
  testimonies: TestimonyRow[] = [];
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
        return { results: db.runAll(query, this._args) as T[], success: true };
      },
    };
    return statement as any;
  }

  private runFirst(query: string, args: any[]): any {
    if (query.includes("WHERE audio_key = ?")) {
      return this.testimonies.find((t) => t.audio_key === args[0]) ?? null;
    }
    return null;
  }

  private runAll(query: string, _args: any[]): any[] {
    const sorted = [...this.testimonies].sort((a, b) => b.created_at.localeCompare(a.created_at));
    if (query.includes("WHERE status = 'approved'")) {
      return sorted.filter((t) => t.status === "approved");
    }
    return sorted;
  }

  private runExec(query: string, args: any[]) {
    if (query.startsWith("INSERT INTO testimonies")) {
      const [id, name, content, source, audio_key, audio_content_type] = args;
      this.seq += 1;
      const ts = `2026-06-09 10:00:0${this.seq}`;
      this.testimonies.push({
        id,
        name,
        content,
        source,
        audio_key: audio_key ?? null,
        audio_content_type: audio_content_type ?? null,
        status: "pending",
        consent: 1,
        created_at: ts,
        updated_at: ts,
      });
      return { success: true };
    }
    if (query.startsWith("UPDATE testimonies SET status = ?1")) {
      const row = this.testimonies.find((t) => t.id === args[1]);
      if (row) row.status = args[0];
      return { success: true };
    }
    return { success: true };
  }
}

function makeEnv() {
  return { DB: new TestimoniesD1() as unknown as D1Database };
}

function body(overrides: Record<string, any> = {}) {
  return {
    name: "Maria Silva",
    content: "Recebi uma graça enorme no Caminho do Perdão.",
    consent: true,
    ...overrides,
  };
}

const AUDIO_KEY = "12345678-1234-1234-1234-1234567890ab.webm";

describe("testemunhos (POST /api/testemunhos)", () => {
  let env: ReturnType<typeof makeEnv>;
  let db: TestimoniesD1;

  beforeEach(() => {
    env = makeEnv();
    db = env.DB as unknown as TestimoniesD1;
  });

  it("salva testemunho de texto como pendente", async () => {
    const res = await handleSubmitTestimony(env, body());
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ success: true });
    expect(db.testimonies).toHaveLength(1);
    expect(db.testimonies[0].source).toBe("text");
    expect(db.testimonies[0].status).toBe("pending");
    expect(db.testimonies[0].audio_key).toBeNull();
  });

  it("salva testemunho de áudio com a chave do R2", async () => {
    const res = await handleSubmitTestimony(
      env,
      body({ audioKey: AUDIO_KEY, audioContentType: "audio/webm" })
    );
    expect(res.status).toBe(201);
    expect(db.testimonies[0].source).toBe("audio");
    expect(db.testimonies[0].audio_key).toBe(AUDIO_KEY);
  });

  it("exige consentimento de publicação", async () => {
    const res = await handleSubmitTestimony(env, body({ consent: false }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "consent_required" });
    expect(db.testimonies).toHaveLength(0);
  });

  it("rejeita nome curto e conteúdo curto", async () => {
    const noName = await handleSubmitTestimony(env, body({ name: "A" }));
    expect(noName.status).toBe(400);
    expect(await noName.json()).toEqual({ error: "name_required" });

    const shortContent = await handleSubmitTestimony(env, body({ content: "curto" }));
    expect(shortContent.status).toBe(400);
    expect(await shortContent.json()).toEqual({ error: "content_required" });

    expect(db.testimonies).toHaveLength(0);
  });

  it("rejeita chave de áudio em formato inválido", async () => {
    const res = await handleSubmitTestimony(env, body({ audioKey: "../etc/passwd" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_audio_key" });
    expect(db.testimonies).toHaveLength(0);
  });

  it("lista pública mostra só aprovados; moderação aprova", async () => {
    await handleSubmitTestimony(env, body({ name: "Primeiro" }));
    await handleSubmitTestimony(env, body({ name: "Segundo" }));

    let approved = await listApprovedTestimonies(env.DB);
    expect(approved).toHaveLength(0);

    const all = await listAllTestimonies(env.DB);
    expect(all).toHaveLength(2);

    await setTestimonyStatus(env.DB, all[0].id, "approved");
    approved = await listApprovedTestimonies(env.DB);
    expect(approved).toHaveLength(1);
  });
});
