/// <reference types="@cloudflare/workers-types" />
import { badRequest, json, unauthorized } from "../../_utils/responses";
import { isValidEmail } from "../../_utils/validation";
import {
  AdminAuthEnv,
  ensureDefaultAdmin,
  getAdminByEmail,
  hashPassword,
  updateAdminPassword,
  verifyPassword,
} from "../../_utils/adminAuth";

export const onRequestPost: PagesFunction<AdminAuthEnv> = async context => {
  let body: { email?: string; currentPassword?: string; newPassword?: string } = {};
  try {
    body = (await context.request.json()) as {
      email?: string;
      currentPassword?: string;
      newPassword?: string;
    };
  } catch {
    return badRequest("invalid_json");
  }

  const email = body.email?.trim().toLowerCase() || "";
  const currentPassword = body.currentPassword || "";
  const newPassword = body.newPassword || "";

  if (!email || !currentPassword || !newPassword) {
    return badRequest("missing_fields");
  }
  if (!isValidEmail(email)) {
    return badRequest("invalid_email");
  }

  await ensureDefaultAdmin(context.env);
  const admin = await getAdminByEmail(context.env.DB, email);
  if (!admin) {
    return unauthorized("invalid_credentials");
  }

  const isValid = await verifyPassword(admin.password_hash, currentPassword, context.env.ADMIN_PASSWORD_PEPPER);
  if (!isValid) {
    return unauthorized("invalid_credentials");
  }

  const nextHash = await hashPassword(newPassword, context.env.ADMIN_PASSWORD_PEPPER);
  await updateAdminPassword(context.env.DB, email, nextHash);

  return json(200, { success: true });
};

