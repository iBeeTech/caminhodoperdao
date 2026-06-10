/// <reference types="@cloudflare/workers-types" />
import { AdminAuthEnv, authorizeAdminRequest } from "../../_utils/adminAuth";
import {
  listAllTestimonies,
  setTestimonyStatus,
  TestimonyStatus,
} from "../../_utils/testimonies";

type TestimoniesEnv = AdminAuthEnv & {
  DB: D1Database;
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const VALID_STATUSES: TestimonyStatus[] = ["pending", "approved", "rejected"];

// GET /api/admin/testemunhos -> todos os testemunhos para moderação (pendentes,
// aprovados e rejeitados), mais recentes primeiro.
export const onRequestGet: PagesFunction<TestimoniesEnv> = async (context) => {
  const auth = await authorizeAdminRequest(context.request, context.env);
  if (auth instanceof Response) return auth;

  const rows = await listAllTestimonies(context.env.DB);
  const testimonies = rows.map((row) => ({
    id: row.id,
    name: row.name,
    content: row.content,
    source: row.source,
    audio_url: row.audio_key ? `/api/testemunhos/audio/${row.audio_key}` : null,
    status: row.status,
    created_at: row.created_at,
  }));

  return new Response(JSON.stringify({ testimonies }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...CORS },
  });
};

// POST /api/admin/testemunhos -> aprova/rejeita/volta a pendente.
// Body: { id: string, status: 'approved' | 'rejected' | 'pending' }
export const onRequestPost: PagesFunction<TestimoniesEnv> = async (context) => {
  const auth = await authorizeAdminRequest(context.request, context.env);
  if (auth instanceof Response) return auth;

  let body: { id?: string; status?: string };
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  const id = typeof body.id === "string" ? body.id : "";
  const status = body.status as TestimonyStatus;
  if (!id || !VALID_STATUSES.includes(status)) {
    return new Response(JSON.stringify({ error: "invalid_request" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  await setTestimonyStatus(context.env.DB, id, status);

  return new Response(JSON.stringify({ updated: true, id, status }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...CORS },
  });
};

export const onRequestOptions: PagesFunction<TestimoniesEnv> = async () => {
  return new Response("OK", { status: 200, headers: CORS });
};
