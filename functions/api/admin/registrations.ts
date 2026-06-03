/// <reference types="@cloudflare/workers-types" />
import { AdminAuthEnv, authorizeAdminRequest } from "../../_utils/adminAuth";

type Env = AdminAuthEnv & { DB: D1Database };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface Row {
  name: string;
  phone: string | null;
  email: string | null;
  status: string;
  sleep_at_monastery: number;
}

// GET /api/admin/registrations -> inscritos (peregrinos, não-staff) para a tela /admin/inscritos.
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const auth = await authorizeAdminRequest(context.request, context.env);
  if (auth instanceof Response) return auth;

  const result = await context.env.DB.prepare(
    `SELECT name, phone, email, status, sleep_at_monastery
     FROM registrations
     WHERE is_staff = 0
     ORDER BY name COLLATE NOCASE`
  ).all<Row>();

  return new Response(JSON.stringify({ registrations: result.results ?? [] }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...CORS },
  });
};

export const onRequestOptions: PagesFunction<Env> = async () =>
  new Response("OK", { status: 200, headers: CORS });
