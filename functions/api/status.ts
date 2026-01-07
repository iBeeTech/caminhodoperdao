/// <reference types="@cloudflare/workers-types" />
import { badRequest, json } from "../_utils/responses";
import { isValidEmail } from "../_utils/validation";
import { expirePending, getByEmail } from "../_utils/registrations";

interface Env {
  DB: D1Database;
}

export async function handleStatus(env: Env, email: string | null): Promise<Response> {
  if (!email) return badRequest("email_required");
  if (!isValidEmail(email)) return badRequest("invalid_email");

  await expirePending(env.DB);
  const registration = await getByEmail(env.DB, email);
  if (!registration) {
    return json(200, { exists: false });
  }

  const expired = registration.status === "CANCELED" && !registration.paid_at;
  const qrCodeText = registration.payment_ref ? `PIX|REF=${registration.payment_ref}` : null;
  const message = registration.status === "PAID" ? "Inscrição confirmada" : null;

  return json(200, {
    exists: true,
    status: registration.status,
    message,
    expired,
    name: registration.name,
    payment_ref: registration.payment_ref,
    qrCodeText,
    sleep_at_monastery: registration.sleep_at_monastery,
    phone: registration.phone,
    cep: registration.cep,
    address: registration.address,
    number: registration.number,
    complement: registration.complement,
    city: registration.city,
    state: registration.state,
    created_at: registration.created_at,
    paid_at: registration.paid_at,
  });
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const email = url.searchParams.get("email");
  return handleStatus(context.env, email);
};
