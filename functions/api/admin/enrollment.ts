/// <reference types="@cloudflare/workers-types" />
import {
  AdminAuthEnv,
  authorizeAdminRequest,
  authorizeSuperAdminRequest,
} from "../../_utils/adminAuth";
import { badRequest, json, serverError } from "../../_utils/responses";
import { isValidEmail } from "../../_utils/validation";
import {
  addBypass,
  isEnrollmentOpen,
  listBypass,
  removeBypass,
  setEnrollmentOpen,
} from "../../_utils/enrollmentGate";

type Env = AdminAuthEnv & { DB: D1Database };

/**
 * A chave das inscrições e a lista de exceção, para o `/admin/sistema`.
 *
 * Um endpoint só para uma tela só: a flag e a lista são a mesma decisão
 * ("quem entra hoje?"), e separá-las obrigaria a tela a fazer duas chamadas
 * para desenhar uma coisa que se lê junto.
 *
 * ⚠️ **Ler é de qualquer admin; virar a chave é só do admin geral.** Fechar as
 * inscrições tranca todo mundo do lado de fora, inclusive quem já se
 * inscreveu — é do mesmo tamanho de conceder papel de admin, que já exige
 * admin geral (ver `accounts.ts`).
 */

const MAX_NOTE = 200;

export const onRequestGet: PagesFunction<Env> = async context => {
  const auth = await authorizeAdminRequest(context.request, context.env);
  if (auth instanceof Response) return auth;

  try {
    const [open, bypass] = await Promise.all([
      isEnrollmentOpen(context.env.DB),
      listBypass(context.env.DB),
    ]);
    return json(200, { enrollmentOpen: open, bypass });
  } catch (error) {
    console.error("GET /api/admin/enrollment falhou:", error);
    return serverError();
  }
};

export const onRequestPost: PagesFunction<Env> = async context => {
  const auth = await authorizeSuperAdminRequest(context.request, context.env);
  if (auth instanceof Response) return auth;

  let body: { action?: unknown; open?: unknown; email?: unknown; note?: unknown } = {};
  try {
    body = await context.request.json();
  } catch {
    return badRequest("invalid_json");
  }

  try {
    if (body.action === "setFlag") {
      if (typeof body.open !== "boolean") return badRequest("invalid_open");
      await setEnrollmentOpen(context.env.DB, body.open);
      return json(200, { enrollmentOpen: body.open, bypass: await listBypass(context.env.DB) });
    }

    if (body.action === "addBypass") {
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      if (!email || !isValidEmail(email)) return badRequest("invalid_email");
      await addBypass(context.env.DB, {
        email,
        note: typeof body.note === "string" ? body.note.slice(0, MAX_NOTE) : "",
        // No token do admin o e-mail é o `sub`.
        createdBy: auth.sub,
      });
      return json(200, {
        enrollmentOpen: await isEnrollmentOpen(context.env.DB),
        bypass: await listBypass(context.env.DB),
      });
    }

    if (body.action === "removeBypass") {
      const email = typeof body.email === "string" ? body.email : "";
      if (!email) return badRequest("invalid_email");
      await removeBypass(context.env.DB, email);
      return json(200, {
        enrollmentOpen: await isEnrollmentOpen(context.env.DB),
        bypass: await listBypass(context.env.DB),
      });
    }

    return badRequest("invalid_action");
  } catch (error) {
    console.error("POST /api/admin/enrollment falhou:", error);
    return serverError();
  }
};
