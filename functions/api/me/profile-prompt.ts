/// <reference types="@cloudflare/workers-types" />
import { json, serverError } from "../../_utils/responses";
import { UserAuthEnv, authorizeUserRequest } from "../../_utils/userAuth";

type Env = UserAuthEnv;

/**
 * "Preencher depois": marca que a pessoa já viu o convite para completar o
 * cadastro no primeiro acesso.
 *
 * Endpoint separado do `PUT /api/me` de propósito. Pular é dizer "não quero
 * preencher agora"; mandar isso pelo PUT significaria enviar um perfil vazio, e
 * perfil vazio APAGA o que já existe. Um clique em "depois" não pode limpar
 * dado nenhum.
 */
export const onRequestPost: PagesFunction<Env> = async context => {
  const auth = await authorizeUserRequest(context.request, context.env);
  if (auth instanceof Response) return auth;

  try {
    const now = Date.now();
    await context.env.DB.prepare(
      `UPDATE users
          SET profile_prompted_at = COALESCE(profile_prompted_at, ?2), updated_at = ?2
        WHERE id = ?1`
    )
      .bind(auth.sub, now)
      .run();

    return json(200, { hasSeenProfilePrompt: true });
  } catch (error) {
    console.error("POST /api/me/profile-prompt falhou:", error);
    return serverError();
  }
};
