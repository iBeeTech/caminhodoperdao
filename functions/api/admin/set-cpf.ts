/// <reference types="@cloudflare/workers-types" />
import { AdminAuthEnv, authorizeSuperAdminRequest } from "../../_utils/adminAuth";
import { encryptCpf } from "../../_utils/cpfCrypto";
import { canonicalizeCpf, isValidCpf } from "../../_utils/cpfValidation";

type Env = AdminAuthEnv & {
  DB: D1Database;
  CPF_ENCRYPTION_KEY?: string;
  CPF_ENCRYPTION_IV?: string;
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface Row {
  id: string;
  name: string;
  phone: string | null;
  status: string;
  is_staff: number;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

// GET /api/admin/set-cpf -> lista inscritos que estão sem CPF cadastrado, para a
// tela /admin/passar-cpf. Inclui PENDING/PAID; não importa is_staff.
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const auth = await authorizeSuperAdminRequest(context.request, context.env);
  if (auth instanceof Response) return auth;

  const result = await context.env.DB.prepare(
    `SELECT id, name, phone, status, is_staff
     FROM registrations
     WHERE cpf_encrypted IS NULL OR cpf_encrypted = ''
     ORDER BY name COLLATE NOCASE`
  ).all<Row>();

  return json({ registrations: result.results ?? [] });
};

// POST /api/admin/set-cpf -> grava o CPF (criptografado) de um inscrito.
// Body: { id: string, cpf: string }
// A criptografia usa a chave que vive na Cloudflare (env), então o CPF nunca
// trafega em texto puro fora do servidor.
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const auth = await authorizeSuperAdminRequest(context.request, context.env);
  if (auth instanceof Response) return auth;

  let body: { id?: unknown; cpf?: unknown };
  try {
    body = await context.request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const id = typeof body.id === "string" ? body.id.trim() : "";
  const cpf = typeof body.cpf === "string" ? body.cpf : "";
  if (!id) {
    return json({ error: "invalid_input" }, 400);
  }
  if (!isValidCpf(cpf)) {
    return json({ error: "invalid_cpf" }, 400);
  }

  const key = context.env.CPF_ENCRYPTION_KEY;
  const iv = context.env.CPF_ENCRYPTION_IV;
  if (!key || !iv) {
    return json({ error: "cpf_encryption_not_configured" }, 500);
  }

  let cpfEncrypted: string;
  try {
    cpfEncrypted = await encryptCpf(canonicalizeCpf(cpf), key, iv);
  } catch {
    return json({ error: "cpf_encryption_failed" }, 500);
  }

  try {
    const result = await context.env.DB.prepare(
      `UPDATE registrations SET cpf_encrypted = ?1 WHERE id = ?2`
    )
      .bind(cpfEncrypted, id)
      .run();

    const changed = result.meta?.changes ?? 0;
    if (changed === 0) {
      return json({ error: "not_found" }, 404);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    // Índice único em cpf_encrypted: CPF já cadastrado em outra inscrição.
    if (message.includes("registrations.cpf_encrypted")) {
      return json({ error: "cpf_already_registered" }, 409);
    }
    return json({ error: "update_failed" }, 500);
  }

  return json({ ok: true, id });
};

export const onRequestOptions: PagesFunction<Env> = async () =>
  new Response("OK", { status: 200, headers: CORS });
