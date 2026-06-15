/// <reference types="@cloudflare/workers-types" />
import { AdminAuthEnv, authorizeAdminRequest } from "../../_utils/adminAuth";

type Env = AdminAuthEnv & { DB: D1Database };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface Row {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  city: string | null;
  is_staff: number;
  pernoite_granted: number;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

// GET /api/admin/grant-pernoite -> dois grupos para a tela /admin/pernoiteExtra:
//   candidates: inscritos PAID que ainda NÃO dormem (sleep_at_monastery = 0) e
//               que poderiam ser promovidos manualmente.
//   granted:    inscritos cuja pernoite foi concedida pelo admin (pernoite_granted = 1).
// Não inclui quem já se inscreveu com pernoite "de origem" (esses não são candidatos
// nem foram concedidos), preservando a distinção pedida.
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const auth = await authorizeAdminRequest(context.request, context.env);
  if (auth instanceof Response) return auth;

  const [candidatesResult, grantedResult] = await Promise.all([
    context.env.DB.prepare(
      `SELECT id, name, phone, email, city, is_staff, pernoite_granted
       FROM registrations
       WHERE status = 'PAID' AND sleep_at_monastery = 0
       ORDER BY name COLLATE NOCASE`
    ).all<Row>(),
    context.env.DB.prepare(
      `SELECT id, name, phone, email, city, is_staff, pernoite_granted
       FROM registrations
       WHERE status = 'PAID' AND pernoite_granted = 1
       ORDER BY name COLLATE NOCASE`
    ).all<Row>(),
  ]);

  return json({
    candidates: candidatesResult.results ?? [],
    granted: grantedResult.results ?? [],
  });
};

// POST /api/admin/grant-pernoite -> concede ou revoga pernoite de um inscrito pago.
// Body: { id: string, grant: boolean }
//   grant = true  -> sleep_at_monastery = 1, pernoite_granted = 1 (só sobre PAID que
//                    ainda não dorme; não mexe em quem já era pernoite de origem).
//   grant = false -> sleep_at_monastery = 0, pernoite_granted = 0 (só revoga o que
//                    foi concedido; nunca derruba uma pernoite de inscrição original).
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const auth = await authorizeAdminRequest(context.request, context.env);
  if (auth instanceof Response) return auth;

  let body: { id?: unknown; grant?: unknown };
  try {
    body = await context.request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id || typeof body.grant !== "boolean") {
    return json({ error: "invalid_input" }, 400);
  }

  const result = body.grant
    ? await context.env.DB.prepare(
        `UPDATE registrations
         SET sleep_at_monastery = 1, pernoite_granted = 1
         WHERE id = ?1 AND status = 'PAID' AND sleep_at_monastery = 0`
      )
        .bind(id)
        .run()
    : await context.env.DB.prepare(
        `UPDATE registrations
         SET sleep_at_monastery = 0, pernoite_granted = 0
         WHERE id = ?1 AND pernoite_granted = 1`
      )
        .bind(id)
        .run();

  const changed = result.meta?.changes ?? 0;
  if (changed === 0) {
    // Nada mudou: id inexistente, não-PAID, ou já no estado pedido.
    return json({ error: "no_change", grant: body.grant }, 409);
  }

  return json({ ok: true, id, grant: body.grant });
};

export const onRequestOptions: PagesFunction<Env> = async () =>
  new Response("OK", { status: 200, headers: CORS });
