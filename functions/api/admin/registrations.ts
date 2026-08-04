/// <reference types="@cloudflare/workers-types" />
import { AdminAuthEnv, authorizeAdminRequest } from "../../_utils/adminAuth";

type Env = AdminAuthEnv & { DB: D1Database };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface Row {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: string;
  sleep_at_monastery: number;
  pernoite_granted: number;
  is_staff: number;
  date_of_birth: string | null;
  allergy_medication_details: string | null;
  dietary_restriction_details: string | null;
  city: string | null;
  checked_in_at: string | null;
  checked_in_by: string | null;
  event_year: number | null;
}

// GET /api/admin/registrations -> TODAS as inscrições (inclui staff) para a tela
// /admin/inscritos. O total bate com a tabela registrations; os callouts de pagos
// usam is_staff para contar só peregrinos.
//
// Devolve também event_year (migration 025), que é o que permite o filtro por
// edição na tela: sem ele, inscrições de anos diferentes ficam empilhadas na
// mesma lista sem jeito de separar.
//
// Devolve também id e a baixa do credenciamento (checked_in_at/by): é desta
// mesma lista que a aba Credenciamento vive, e o id é o que identifica a pessoa
// no POST /api/admin/checkin.
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const auth = await authorizeAdminRequest(context.request, context.env);
  if (auth instanceof Response) return auth;

  const result = await context.env.DB.prepare(
    `SELECT id, name, phone, email, status, sleep_at_monastery, pernoite_granted, is_staff,
            date_of_birth, allergy_medication_details, dietary_restriction_details, city,
            checked_in_at, checked_in_by, event_year
     FROM registrations
     ORDER BY name COLLATE NOCASE`
  ).all<Row>();

  return new Response(JSON.stringify({ registrations: result.results ?? [] }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...CORS },
  });
};

export const onRequestOptions: PagesFunction<Env> = async () =>
  new Response("OK", { status: 200, headers: CORS });
