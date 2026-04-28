/// <reference types="@cloudflare/workers-types" />
import { badRequest, json, notFound, serverError } from "../_utils/responses";
import { isValidPhone } from "../_utils/validation";
import { getPaymentProvider } from "../_utils/payment";
import { expirePending, getByPhone, updatePaymentRef } from "../_utils/registrations";

interface Env {
  DB: D1Database;
  WOOVI_APP_ID?: string;
}

export async function handleReissue(env: Env, body: unknown): Promise<Response> {
  if (!body || typeof body !== "object") {
    return badRequest("invalid_body");
  }

  const { phone, name } = body as { phone?: string; name?: string };
  if (!phone) return badRequest("phone_required");
  if (!isValidPhone(phone)) return badRequest("invalid_phone");

  await expirePending(env.DB);
  const registration = await getByPhone(env.DB, phone);
  if (!registration) return notFound("registration_not_found");
  if (registration.status !== "PENDING") {
    return badRequest("registration_not_pending");
  }

  const provider = getPaymentProvider(env);
  const charge = await provider.createCharge({
    email: registration.email,
    name: name || registration.name,
  });

  try {
    await updatePaymentRef(env.DB, phone, "woovi", charge.payment_ref);
  } catch (error) {
    return serverError();
  }

  return json(200, {
    status: "PENDING",
    payment_ref: charge.payment_ref,
    qrCodeText: charge.qrCodeText,
    qrCodeImageUrl: charge.qrCodeImageUrl ?? null,
    expires_at: charge.expires_at ?? null,
  });
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: unknown;
  try {
    body = await context.request.json();
  } catch (error) {
    return badRequest("invalid_json");
  }

  return handleReissue(context.env, body);
};
