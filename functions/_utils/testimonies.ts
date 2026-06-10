/// <reference types="@cloudflare/workers-types" />

export type TestimonySource = "text" | "audio";
export type TestimonyStatus = "pending" | "approved" | "rejected";

export interface TestimonyRow {
  id: string;
  name: string;
  content: string;
  source: TestimonySource;
  audio_key: string | null;
  audio_content_type: string | null;
  status: TestimonyStatus;
  consent: number;
  created_at: string;
  updated_at: string;
}

export interface NewTestimony {
  id: string;
  name: string;
  content: string;
  source: TestimonySource;
  audioKey?: string | null;
  audioContentType?: string | null;
}

export async function insertTestimony(db: D1Database, entry: NewTestimony): Promise<void> {
  await db
    .prepare(
      `INSERT INTO testimonies (id, name, content, source, audio_key, audio_content_type, status, consent)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', 1)`
    )
    .bind(
      entry.id,
      entry.name,
      entry.content,
      entry.source,
      entry.audioKey ?? null,
      entry.audioContentType ?? null
    )
    .run();
}

export async function listApprovedTestimonies(db: D1Database, limit = 50): Promise<TestimonyRow[]> {
  const result = await db
    .prepare(
      `SELECT id, name, content, source, audio_key, audio_content_type, status, consent, created_at, updated_at
       FROM testimonies WHERE status = 'approved' ORDER BY created_at DESC LIMIT ?`
    )
    .bind(limit)
    .all<TestimonyRow>();
  return result.results ?? [];
}

export async function listAllTestimonies(db: D1Database): Promise<TestimonyRow[]> {
  const result = await db
    .prepare(
      `SELECT id, name, content, source, audio_key, audio_content_type, status, consent, created_at, updated_at
       FROM testimonies ORDER BY created_at DESC`
    )
    .all<TestimonyRow>();
  return result.results ?? [];
}

export async function getTestimonyByAudioKey(
  db: D1Database,
  audioKey: string
): Promise<TestimonyRow | null> {
  return db
    .prepare(
      `SELECT id, name, content, source, audio_key, audio_content_type, status, consent, created_at, updated_at
       FROM testimonies WHERE audio_key = ?`
    )
    .bind(audioKey)
    .first<TestimonyRow>();
}

export async function setTestimonyStatus(
  db: D1Database,
  id: string,
  status: TestimonyStatus
): Promise<void> {
  await db
    .prepare(`UPDATE testimonies SET status = ?1, updated_at = datetime('now') WHERE id = ?2`)
    .bind(status, id)
    .run();
}
