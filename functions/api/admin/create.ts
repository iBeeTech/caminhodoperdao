/// <reference types="@cloudflare/workers-types" />
import { badRequest, json, unauthorized } from "../../_utils/responses";
import { isValidEmail } from "../../_utils/validation";
import {
  AdminAuthEnv,
  authorizeAdminRequest,
  getAdminByEmail,
  getAdminDefaults,
  hashPassword,
} from "../../_utils/adminAuth";

export const onRequestPost: PagesFunction<AdminAuthEnv> = async context => {
  const authResult = await authorizeAdminRequest(context.request, context.env);
  if (authResult instanceof Response) {
    return authResult;
  }

  const allowedEmail = getAdminDefaults(context.env).email.toLowerCase();
  if (authResult.sub.toLowerCase() !== allowedEmail) {
    return unauthorized("not_allowed");
  }

  let body: { email?: string } = {};
  try {
    body = (await context.request.json()) as { email?: string };
  } catch {
    return badRequest("invalid_json");
  }

  const email = body.email?.trim().toLowerCase() || "";
  if (!email) {
    return badRequest("email_required");
  }
  if (!isValidEmail(email)) {
    return badRequest("invalid_email");
  }

  const existing = await getAdminByEmail(context.env.DB, email);
  if (existing) {
    return json(200, { created: false, reason: "already_exists" });
  }

  const defaultPassword = getAdminDefaults(context.env).password;
  const passwordHash = await hashPassword(defaultPassword, context.env.ADMIN_PASSWORD_PEPPER);
  const now = Date.now();
  await context.env.DB
    .prepare("INSERT INTO admin_users (email, password_hash, created_at, updated_at) VALUES (?1, ?2, ?3, ?4)")
    .bind(email, passwordHash, now, now)
    .run();

  return json(201, { created: true });
};

