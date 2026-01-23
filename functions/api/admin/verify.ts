/// <reference types="@cloudflare/workers-types" />
import { json } from "../../_utils/responses";
import { AdminAuthEnv, authorizeAdminRequest } from "../../_utils/adminAuth";

export const onRequestGet: PagesFunction<AdminAuthEnv> = async context => {
  const authResult = await authorizeAdminRequest(context.request, context.env);
  if (authResult instanceof Response) {
    return authResult;
  }

  return json(200, {
    valid: true,
    email: authResult.sub,
    exp: authResult.exp,
  });
};

