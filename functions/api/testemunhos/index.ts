/// <reference types="@cloudflare/workers-types" />
import { badRequest, json, serverError } from "../../_utils/responses";
import {
  insertTestimony,
  listApprovedTestimonies,
  TestimonyRow,
} from "../../_utils/testimonies";

interface Env {
  DB: D1Database;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const MAX_NAME_LENGTH = 80;
const MAX_CONTENT_LENGTH = 4000;

// Chave gerada pelo servidor em /api/testemunhos/transcrever: "<uuid>.<ext>".
const AUDIO_KEY_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webm|mp4|m4a|mp3|ogg|wav)$/;

function clamp(value: string, max: number): string {
  return value.trim().slice(0, max);
}

function toPublicTestimony(row: TestimonyRow) {
  return {
    id: row.id,
    name: row.name,
    content: row.content,
    source: row.source,
    audio_url: row.audio_key ? `/api/testemunhos/audio/${row.audio_key}` : null,
    created_at: row.created_at,
  };
}

// POST /api/testemunhos — recebe um testemunho (texto, ou texto transcrito de
// áudio já enviado em /api/testemunhos/transcrever). Entra como 'pending' e só
// aparece no site após aprovação no admin.
export async function handleSubmitTestimony(env: Env, body: unknown): Promise<Response> {
  if (!body || typeof body !== "object") {
    return badRequest("invalid_body");
  }

  const payload = body as {
    name?: string;
    content?: string;
    consent?: boolean;
    audioKey?: string;
    audioContentType?: string;
  };

  const name = clamp(String(payload.name ?? ""), MAX_NAME_LENGTH);
  const content = clamp(String(payload.content ?? ""), MAX_CONTENT_LENGTH);

  if (name.length < 2) return badRequest("name_required");
  if (content.length < 10) return badRequest("content_required");
  if (payload.consent !== true) return badRequest("consent_required");

  let audioKey: string | null = null;
  let audioContentType: string | null = null;
  if (payload.audioKey) {
    if (!AUDIO_KEY_PATTERN.test(payload.audioKey)) {
      return badRequest("invalid_audio_key");
    }
    audioKey = payload.audioKey;
    audioContentType = clamp(String(payload.audioContentType ?? ""), 60) || null;
  }

  try {
    const id = crypto.randomUUID();
    await insertTestimony(env.DB, {
      id,
      name,
      content,
      source: audioKey ? "audio" : "text",
      audioKey,
      audioContentType,
    });
    return json(201, { success: true, id });
  } catch (error) {
    console.error("Error saving testimony:", (error as Error).message);
    return serverError("testimony_save_failed");
  }
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const rows = await listApprovedTestimonies(context.env.DB);
    return new Response(
      JSON.stringify({ success: true, data: rows.map(toPublicTestimony) }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Error fetching testimonies:", (error as Error).message);
    return serverError("testimonies_fetch_failed");
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return badRequest("invalid_json");
  }
  return handleSubmitTestimony(context.env, body);
};

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, { status: 204, headers: corsHeaders });
};
