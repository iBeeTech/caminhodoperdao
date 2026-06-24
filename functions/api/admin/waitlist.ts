/// <reference types="@cloudflare/workers-types" />
import { AdminAuthEnv, authorizeAdminRequest } from "../../_utils/adminAuth";
import { decryptCpf } from "../../_utils/cpfCrypto";
import {
  listWaitlist,
  setWaitlistNotified,
  setWaitlistContactFailed,
} from "../../_utils/waitlist";

type WaitlistEnv = AdminAuthEnv & {
  DB: D1Database;
  CPF_ENCRYPTION_KEY?: string;
  CPF_ENCRYPTION_IV?: string;
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// GET /api/admin/waitlist -> fila por ordem de chegada, com CPF decriptado.
export const onRequestGet: PagesFunction<WaitlistEnv> = async (context) => {
  const auth = await authorizeAdminRequest(context.request, context.env);
  if (auth instanceof Response) return auth;

  const entries = await listWaitlist(context.env.DB);

  const key = context.env.CPF_ENCRYPTION_KEY;
  const iv = context.env.CPF_ENCRYPTION_IV;
  const canDecrypt = Boolean(key && iv);

  const waitlist = [];
  for (const entry of entries) {
    let cpf = "";
    if (entry.cpf_encrypted && canDecrypt) {
      try {
        cpf = await decryptCpf(entry.cpf_encrypted, key!, iv!);
      } catch {
        cpf = "";
      }
    }
    waitlist.push({
      id: entry.id,
      name: entry.name,
      cpf,
      phone: entry.phone,
      notified_at: entry.notified_at,
      contact_failed_at: entry.contact_failed_at,
      created_at: entry.created_at,
    });
  }

  return new Response(JSON.stringify({ waitlist }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...CORS },
  });
};

// POST /api/admin/waitlist -> marca/desmarca "avisado" e/ou "não consegui contato".
// Body: { updates: [{ id, notified?: boolean, contactFailed?: boolean }] }
export const onRequestPost: PagesFunction<WaitlistEnv> = async (context) => {
  const auth = await authorizeAdminRequest(context.request, context.env);
  if (auth instanceof Response) return auth;

  let body: {
    updates?: Array<{ id?: string; notified?: boolean; contactFailed?: boolean }>;
  };
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  const updates = (body.updates ?? []).filter(
    (u): u is { id: string; notified?: boolean; contactFailed?: boolean } =>
      typeof u?.id === "string" &&
      (typeof u?.notified === "boolean" || typeof u?.contactFailed === "boolean")
  );

  let updated = 0;
  for (const item of updates) {
    if (typeof item.notified === "boolean") {
      await setWaitlistNotified(context.env.DB, item.id, item.notified);
    }
    if (typeof item.contactFailed === "boolean") {
      await setWaitlistContactFailed(context.env.DB, item.id, item.contactFailed);
    }
    updated += 1;
  }

  return new Response(JSON.stringify({ updated }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...CORS },
  });
};

export const onRequestOptions: PagesFunction<WaitlistEnv> = async () => {
  return new Response("OK", { status: 200, headers: CORS });
};
