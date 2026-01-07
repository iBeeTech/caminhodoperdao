/// <reference types="@cloudflare/workers-types" />
import { badRequest, json, notFound, unauthorized, serverError } from "../../_utils/responses";
import { getByPaymentRef, markAsPaid } from "../../_utils/registrations";

interface Env {
  DB: D1Database;
  WEBHOOK_SECRET?: string;
}

function validateSignature(request: Request, secret: string | undefined): boolean {
  if (!secret) return false;
  const received = request.headers.get("x-webhook-signature");
  // Stub validation: compare shared secret. Replace with HMAC when real gateway is known.
  return received === secret;
}

export async function handleWebhook(env: Env, request: Request, body: unknown): Promise<Response> {
  if (!validateSignature(request, env.WEBHOOK_SECRET)) {
    return unauthorized("invalid_signature");
  }

  if (!body || typeof body !== "object") {
    return badRequest("invalid_body");
  }

  const { payment_ref, status } = body as { payment_ref?: string; status?: string };
  if (!payment_ref) return badRequest("payment_ref_required");
  if (!status) return badRequest("status_required");

  const registration = await getByPaymentRef(env.DB, payment_ref);
  if (!registration) return notFound("registration_not_found");

  if (registration.status === "PAID") {
    return json(200, { status: registration.status, paid_at: registration.paid_at });
  }

  if (status !== "PAID") {
    return badRequest("unsupported_status");
  }

  try {
    await markAsPaid(env.DB, registration.email, payment_ref);
  } catch (error) {
    return serverError();
  }

  return json(200, { status: "PAID" });
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: unknown;
  try {
    body = await context.request.json();
  } catch (error) {
    return badRequest("invalid_json");
  }

  return handleWebhook(context.env, context.request, body);
};
