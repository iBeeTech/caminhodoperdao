/// <reference types="@cloudflare/workers-types" />
import { AdminAuthEnv, authorizeAdminRequest } from "../../_utils/adminAuth";
import { badRequest, json, notFound } from "../../_utils/responses";
import {
  DEFAULT_EXPIRY_DAYS,
  DEFAULT_MAX_BYTES,
  generateUploadToken,
  hashUploadToken,
} from "../../_utils/photoUpload";

type Env = AdminAuthEnv & { DB: D1Database; SITE_URL?: string };

/** Prazo máximo que o admin pode dar a um link. */
const MAX_EXPIRY_DAYS = 90;

/**
 * Links de upload de fotos, para a organização entregar ao fotógrafo.
 *
 * GET    -> lista os links (nunca devolve o segredo; ele não existe em texto)
 * POST   -> cria um link e devolve a URL completa UMA ÚNICA VEZ
 * DELETE -> revoga um link na hora
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const auth = await authorizeAdminRequest(context.request, context.env);
  if (auth instanceof Response) return auth;

  const result = await context.env.DB.prepare(
    `SELECT id, label, event_year, expires_at, revoked_at, max_bytes,
            uploaded_bytes, uploaded_count, last_upload_at, created_at, created_by
       FROM photo_upload_links
      ORDER BY created_at DESC`
  ).all();

  return json(200, { links: result.results ?? [] });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const auth = await authorizeAdminRequest(context.request, context.env);
  if (auth instanceof Response) return auth;

  let body: { label?: unknown; eventYear?: unknown; days?: unknown };
  try {
    body = await context.request.json();
  } catch {
    return badRequest("invalid_json");
  }

  const label = String(body.label ?? "").trim();
  if (!label) return badRequest("label_required");
  if (label.length > 120) return badRequest("label_too_long");

  const eventYear = Number(body.eventYear);
  if (!Number.isInteger(eventYear) || eventYear < 2008 || eventYear > 2100) {
    return badRequest("invalid_event_year");
  }

  // Prazo limitado no SERVIDOR, não só no formulário: é o prazo que faz o link
  // morrer sozinho, e é isso que permite "depois dessa data eu tiro as fotos".
  const days = Number(body.days ?? DEFAULT_EXPIRY_DAYS);
  if (!Number.isInteger(days) || days < 1 || days > MAX_EXPIRY_DAYS) {
    return badRequest("invalid_days");
  }

  const token = generateUploadToken();
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  await context.env.DB.prepare(
    `INSERT INTO photo_upload_links
       (id, token_hash, label, event_year, expires_at, max_bytes, created_by, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, datetime('now'))`
  )
    .bind(id, await hashUploadToken(token), label, eventYear, expiresAt, DEFAULT_MAX_BYTES, auth.sub)
    .run();

  const base = (context.env.SITE_URL || new URL(context.request.url).origin).replace(/\/$/, "");

  // ⚠️ Única vez que a URL com o segredo existe. O banco só tem o hash, então
  // não há como reexibi-la depois — perdeu, gera outro. Mesma postura da senha
  // temporária de admin.
  return json(201, {
    id,
    label,
    eventYear,
    expiresAt,
    url: `${base}/upload-fotos?t=${token}`,
  });
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const auth = await authorizeAdminRequest(context.request, context.env);
  if (auth instanceof Response) return auth;

  const id = new URL(context.request.url).searchParams.get("id") ?? "";
  if (!id) return badRequest("id_required");

  const result = await context.env.DB.prepare(
    "UPDATE photo_upload_links SET revoked_at = datetime('now') WHERE id = ?1 AND revoked_at IS NULL"
  )
    .bind(id)
    .run();

  if (!result.meta.changes) return notFound("link_not_found");
  return json(200, { ok: true });
};
