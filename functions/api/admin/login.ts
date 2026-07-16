/// <reference types="@cloudflare/workers-types" />
import { badRequest, json, unauthorized, serverError } from "../../_utils/responses";
import { isValidEmail } from "../../_utils/validation";
import {
  AdminAuthEnv,
  createJwt,
  ensureDefaultAdmin,
  getAdminByEmail,
  getJwtSecret,
  getJwtTtlSeconds,
  verifyPassword,
} from "../../_utils/adminAuth";

export const onRequestPost: PagesFunction<AdminAuthEnv> = async context => {
  let body: { email?: string; password?: string } = {};
  try {
    body = (await context.request.json()) as { email?: string; password?: string };
  } catch {
    return badRequest("invalid_json");
  }

  const email = body.email?.trim().toLowerCase() || "";
  const password = body.password || "";

  if (!email || !password) {
    return badRequest("email_password_required");
  }
  if (!isValidEmail(email)) {
    return badRequest("invalid_email");
  }

  const jwtSecret = getJwtSecret(context.env);
  if (!jwtSecret) {
    return serverError("admin_jwt_secret_missing");
  }

  await ensureDefaultAdmin(context.env);
  const admin = await getAdminByEmail(context.env.DB, email);
  if (!admin) {
    return unauthorized("invalid_credentials");
  }

  const isValid = await verifyPassword(admin.password_hash, password, context.env.ADMIN_PASSWORD_PEPPER);
  if (!isValid) {
    return unauthorized("invalid_credentials");
  }

  const ttlSeconds = getJwtTtlSeconds(context.env);
  const mustChangePassword = admin.must_change_password === 1;
  // Token marcado: authorizeAdminRequest o recusa em todo endpoint que não
  // seja a troca de senha, então a obrigação vale no servidor, não só na UI.
  const token = await createJwt(
    { sub: admin.email, role: "admin", ...(mustChangePassword ? { mustChange: true } : {}) },
    jwtSecret,
    ttlSeconds
  );

  return json(200, {
    token,
    expiresIn: ttlSeconds,
    email: admin.email,
    mustChangePassword,
  });
};

