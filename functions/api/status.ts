/// <reference types="@cloudflare/workers-types" />
import { badRequest, json } from "../_utils/responses";
import { isValidEmail } from "../_utils/validation";
import { expirePending, getByEmail } from "../_utils/registrations";
import { getPaymentByRef } from "../_utils/payments";
import { getWooviChargeStatus } from "../_utils/woovi";

interface Env {
  DB: D1Database;
  WOOVI_APP_ID?: string;
}

export async function handleStatus(env: Env, email: string | null): Promise<Response> {
  if (!email) return badRequest("email_required");
  if (!isValidEmail(email)) return badRequest("invalid_email");

  await expirePending(env.DB);
  const registration = await getByEmail(env.DB, email);
  if (!registration) {
    return json(200, { exists: false });
  }

  // Se o status já é PAID, não precisa consultar Woovi
  if (registration.status !== "PAID" && registration.payment_ref) {
    // Tentar consultar status na Woovi
    try {
      const appId = env.WOOVI_APP_ID;
      if (appId) {
        const wooviResponse = await getWooviChargeStatus(appId, registration.payment_ref);
        
        // Se a Woovi diz que foi pago, atualizar o D1
        if (["COMPLETED", "RECEIVED"].includes(wooviResponse.charge?.status)) {
          await env.DB
            .prepare("UPDATE registrations SET status = 'PAID', paid_at = ? WHERE email = ?")
            .bind(Date.now(), email.toLowerCase())
            .run();
          
          registration.status = "PAID";
          registration.paid_at = new Date(Date.now()).toISOString();
          
          console.log(`Status atualizado via Woovi: ${email} -> PAID`);
        }
      }
    } catch (error) {
      console.error(`Erro ao consultar status na Woovi: ${error}`);
      // Continuar com o status do D1 mesmo com erro
    }
  }

  const expired = registration.status === "CANCELED" && !registration.paid_at;
  const message = registration.status === "PAID" ? "Inscrição confirmada" : null;

  let qrCodeText = null;
  let qrCodeImage = null;
  if (registration.status === "PENDING" && registration.payment_ref) {
    const payment = await getPaymentByRef(env.DB, registration.payment_ref);
    if (payment) {
      qrCodeText = payment.brcode;
      qrCodeImage = payment.qr_code_image;
    }
  } else if (registration.payment_ref) {
    qrCodeText = `PIX|REF=${registration.payment_ref}`;
  }

  return json(200, {
    exists: true,
    status: registration.status,
    message,
    expired,
    name: registration.name,
    email: registration.email,
    payment_ref: registration.payment_ref,
    qrCodeText,
    qrCodeImageUrl: qrCodeImage,
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
