/// <reference types="@cloudflare/workers-types" />
import { json, badRequest, conflict, serverError } from "../_utils/responses";
import { isValidPhone, normalizePhone } from "../_utils/validation";
import { encryptCpf } from "../_utils/cpfCrypto";
import { canonicalizeCpf, isValidCpf } from "../_utils/cpfValidation";
import { getByCpfEncrypted } from "../_utils/registrations";
import {
  getWaitlistByCpfEncrypted,
  insertWaitlistEntry,
  updateWaitlistContact,
} from "../_utils/waitlist";

interface Env {
  DB: D1Database;
  CPF_ENCRYPTION_KEY?: string;
  CPF_ENCRYPTION_IV?: string;
}

// POST /api/waitlist — entra na lista de espera (nome + CPF + WhatsApp).
// Regras: CPF com inscrição ativa (PENDING/PAID) não entra; CANCELED ou sem
// inscrição pode. Re-envio do mesmo CPF atualiza o contato e mantém a posição.
export async function handleJoinWaitlist(env: Env, body: unknown): Promise<Response> {
  if (!body || typeof body !== "object") {
    return badRequest("invalid_body");
  }

  const { name, cpf, phone } = body as { name?: string; cpf?: string; phone?: string };

  const trimmedName = name?.trim();
  if (!trimmedName) {
    return badRequest("invalid_name");
  }

  if (!cpf || !isValidCpf(cpf)) {
    return badRequest("invalid_cpf");
  }

  if (!phone || !isValidPhone(phone)) {
    return badRequest("invalid_phone");
  }
  const phoneDigits = normalizePhone(phone);

  let cpfEncrypted: string;
  try {
    const key = env.CPF_ENCRYPTION_KEY;
    const iv = env.CPF_ENCRYPTION_IV;
    if (!key || !iv) {
      console.error("CPF_ENCRYPTION_KEY or CPF_ENCRYPTION_IV not set");
      return serverError("cpf_encryption_not_configured");
    }
    cpfEncrypted = await encryptCpf(canonicalizeCpf(cpf), key, iv);
  } catch (err: any) {
    console.error("CPF encryption error:", err?.message);
    return serverError("cpf_encryption_failed");
  }

  try {
    const registration = await getByCpfEncrypted(env.DB, cpfEncrypted);
    const hasActiveRegistration =
      registration?.status === "PAID" || registration?.status === "PENDING";
    if (hasActiveRegistration) {
      return conflict("already_registered", { status: registration!.status });
    }

    const existing = await getWaitlistByCpfEncrypted(env.DB, cpfEncrypted);
    if (existing) {
      await updateWaitlistContact(env.DB, existing.id, {
        name: trimmedName,
        phone: phoneDigits,
      });
      return json(200, { status: "ALREADY_ON_WAITLIST" });
    }

    await insertWaitlistEntry(env.DB, {
      id: crypto.randomUUID(),
      name: trimmedName,
      cpfEncrypted,
      phone: phoneDigits,
    });
    return json(200, { status: "ADDED" });
  } catch (error) {
    const message = (error as Error).message || "unknown_error";
    // Corrida entre o SELECT e o INSERT do mesmo CPF: trata como já inscrito na lista.
    if (message.includes("UNIQUE constraint failed")) {
      return json(200, { status: "ALREADY_ON_WAITLIST" });
    }
    console.error("Error joining waitlist:", message);
    return serverError("waitlist_error");
  }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return badRequest("invalid_json");
  }
  return handleJoinWaitlist(context.env, body);
};
