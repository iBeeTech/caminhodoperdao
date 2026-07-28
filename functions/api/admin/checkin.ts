/// <reference types="@cloudflare/workers-types" />
import { AdminAuthEnv, authorizeAdminRequest } from "../../_utils/adminAuth";
import { checkInRegistration, undoCheckIn } from "../../_utils/checkin";

type Env = AdminAuthEnv & { DB: D1Database };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

// POST /api/admin/checkin -> dá ou desfaz a baixa do credenciamento presencial.
// Body: { id: string, checkIn: boolean }
//
// Quem credenciou sai do JWT (auth.sub), nunca do corpo: o cliente não escolhe
// em nome de quem a baixa é assinada.
//
// Conflito (409) não é erro de sistema, é a resposta esperada quando dois
// voluntários clicam no mesmo nome: devolve quem já credenciou e quando, para a
// tela mostrar isso em vez de um sucesso falso.
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const auth = await authorizeAdminRequest(context.request, context.env);
  if (auth instanceof Response) return auth;

  let body: { id?: unknown; checkIn?: unknown };
  try {
    body = await context.request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id || typeof body.checkIn !== "boolean") {
    return json({ error: "invalid_input" }, 400);
  }

  const result = body.checkIn
    ? await checkInRegistration(context.env.DB, id, auth.sub)
    : await undoCheckIn(context.env.DB, id);

  if (!result.ok) {
    const status = result.reason === "not_found" ? 404 : 409;
    return json(
      {
        error: result.reason,
        id,
        name: result.row?.name ?? null,
        status: result.row?.status ?? null,
        checked_in_at: result.row?.checked_in_at ?? null,
        checked_in_by: result.row?.checked_in_by ?? null,
      },
      status
    );
  }

  return json({
    ok: true,
    id,
    checked_in_at: result.row.checked_in_at,
    checked_in_by: result.row.checked_in_by,
  });
};

export const onRequestOptions: PagesFunction<Env> = async () =>
  new Response("OK", { status: 200, headers: CORS });
