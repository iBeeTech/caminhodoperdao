/// <reference types="@cloudflare/workers-types" />
import { badRequest, conflict, json, serverError } from "../../_utils/responses";
import { UserAuthEnv, authorizeUserRequest } from "../../_utils/userAuth";
import { EventYearEnv, getEventYear } from "../../_utils/eventYear";
import {
  cancelHostingOffer,
  getHostingOffer,
  hostingCityFor,
  saveHostingOffer,
  toHostingView,
  validateHostingInput,
} from "../../_utils/hosting";

type Env = UserAuthEnv & EventYearEnv;

/**
 * Acolhimento do peregrino logado (migration 038).
 *
 * Quem mora em Franca ou Claraval se oferece para receber peregrinos de fora
 * na própria casa.
 *
 * ⚠️ **Não há GET aqui.** A pergunta é feita DENTRO do formulário de
 * inscrição, e a leitura ("posso acolher?", "o que já ofereci?") vem junto do
 * `GET /api/me/registration` — a tela precisa das duas coisas no mesmo
 * instante, e duas chamadas atrasariam a janela que a pessoa já está olhando.
 *
 * Sobram os dois verbos de escrita, usados quando ela muda de ideia DEPOIS de
 * inscrita:
 *
 * - **PUT** — cria ou atualiza. Gravar por cima de uma oferta cancelada a
 *   reativa (ver `saveHostingOffer`).
 * - **DELETE** — desiste. Vira `CANCELADO`, não some: a organização precisa
 *   ver que a vaga anotada deixou de existir.
 *
 * ⚠️ **A cidade vem do BANCO, nunca do corpo da requisição.** A tela só decide
 * se mostra o cartão; quem decide se grava é este arquivo, lendo `users.city`.
 */

interface ProfileRow {
  name: string | null;
  city: string | null;
}

async function loadProfile(env: Env, userId: string): Promise<ProfileRow | null> {
  return (
    (await env.DB.prepare(
      "SELECT name, city FROM users WHERE id = ?1"
    )
      .bind(userId)
      .first<ProfileRow>()) ?? null
  );
}

export const onRequestPut: PagesFunction<Env> = async context => {
  const auth = await authorizeUserRequest(context.request, context.env);
  if (auth instanceof Response) return auth;

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return badRequest("invalid_json");
  }

  try {
    const eventYear = getEventYear(context.env);
    const profile = await loadProfile(context.env, auth.sub);
    if (!profile) return serverError("user_not_found");

    const city = hostingCityFor(profile.city);
    if (!city) return conflict("not_eligible_city");

    // Sem nome, a lista da organização vira "alguém em Claraval recebe 3
    // pessoas" — e ninguém consegue combinar nada com "alguém".
    if (!profile.name) return badRequest("incomplete_profile");

    const validation = validateHostingInput(body);
    if (!validation.ok) return badRequest(validation.error);

    const existing = await getHostingOffer(context.env.DB, auth.sub, eventYear);
    await saveHostingOffer(context.env.DB, {
      id: existing?.id ?? crypto.randomUUID(),
      userId: auth.sub,
      eventYear,
      city,
      input: validation.value,
      now: Date.now(),
    });

    const saved = await getHostingOffer(context.env.DB, auth.sub, eventYear);
    return json(existing ? 200 : 201, { offer: saved ? toHostingView(saved) : null });
  } catch (error) {
    console.error("PUT /api/me/hosting falhou:", error);
    return serverError();
  }
};

export const onRequestDelete: PagesFunction<Env> = async context => {
  const auth = await authorizeUserRequest(context.request, context.env);
  if (auth instanceof Response) return auth;

  try {
    const eventYear = getEventYear(context.env);
    const existing = await getHostingOffer(context.env.DB, auth.sub, eventYear);
    if (!existing) return conflict("no_hosting_offer");

    await cancelHostingOffer(context.env.DB, auth.sub, eventYear, Date.now());
    const canceled = await getHostingOffer(context.env.DB, auth.sub, eventYear);
    return json(200, { offer: canceled ? toHostingView(canceled) : null });
  } catch (error) {
    console.error("DELETE /api/me/hosting falhou:", error);
    return serverError();
  }
};
