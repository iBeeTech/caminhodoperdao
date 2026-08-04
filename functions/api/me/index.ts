/// <reference types="@cloudflare/workers-types" />
import { json, serverError } from "../../_utils/responses";
import { UserAuthEnv, authorizeUserRequest } from "../../_utils/userAuth";
import { EventYearEnv, getEventYear } from "../../_utils/eventYear";
import { buildBadges } from "../../_utils/badges";

type Env = UserAuthEnv & EventYearEnv;

/** Perfil do peregrino logado: dados, anos de caminhada e medalhas. */
export const onRequestGet: PagesFunction<Env> = async context => {
  const auth = await authorizeUserRequest(context.request, context.env);
  if (auth instanceof Response) return auth;

  try {
    const { results } = await context.env.DB.prepare(
      "SELECT year, source FROM user_participation_years WHERE user_id = ?1 ORDER BY year DESC"
    )
      .bind(auth.sub)
      .all<{ year: number; source: string }>();

    const years = (results ?? []).map(row => row.year);

    return json(200, {
      email: auth.email,
      currentYear: getEventYear(context.env),
      years,
      badges: buildBadges(years),
    });
  } catch (error) {
    console.error("GET /api/me falhou:", error);
    return serverError();
  }
};
