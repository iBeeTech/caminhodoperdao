/// <reference types="@cloudflare/workers-types" />
import { badRequest, json, serverError } from "../../_utils/responses";
import { UserAuthEnv, authorizeUserRequest } from "../../_utils/userAuth";
import { EventYearEnv, getEventYear } from "../../_utils/eventYear";
import { buildBadges, nextMilestone } from "../../_utils/badges";
import { FIRST_EDITION_YEAR, listEditionYears } from "../../_utils/editions";

type Env = UserAuthEnv & EventYearEnv;

/** Teto de anos declarados de uma vez. Evita payload absurdo. */
const MAX_YEARS = 30;

/**
 * Grava os anos declarados pelo peregrino. Substitui a lista inteira em vez de
 * acrescentar: a tela é uma lista de caixas marcadas, então DESmarcar um ano
 * precisa apagá-lo. Acrescentar só faria o ano marcado por engano ficar para
 * sempre.
 *
 * Registros vindos de inscrição real (`source = 'inscricao'`) NÃO são tocados:
 * aqueles têm lastro, e a declaração não pode apagar o que foi apurado.
 */
export const onRequestPost: PagesFunction<Env> = async context => {
  const auth = await authorizeUserRequest(context.request, context.env);
  if (auth instanceof Response) return auth;

  let body: { years?: unknown } = {};
  try {
    body = await context.request.json();
  } catch {
    return badRequest("invalid_json");
  }

  if (!Array.isArray(body.years)) return badRequest("invalid_years");
  if (body.years.length > MAX_YEARS) return badRequest("too_many_years");

  const currentYear = getEventYear(context.env);
  const years = Array.from(
    new Set(
      body.years
        .map(value => Number(value))
        .filter(
          year =>
            Number.isInteger(year) && year >= FIRST_EDITION_YEAR && year <= currentYear
        )
    )
  ).sort((a, b) => b - a);

  // Entrada com anos, todos inválidos, é erro de quem chamou — não um pedido
  // de apagar tudo. Lista vazia de verdade continua valendo como "apagar".
  if (years.length === 0 && body.years.length > 0) return badRequest("invalid_years");

  try {
    const now = Date.now();
    const statements = [
      context.env.DB.prepare(
        "DELETE FROM user_participation_years WHERE user_id = ?1 AND source = 'declarado'"
      ).bind(auth.sub),
      ...years.map(year =>
        context.env.DB.prepare(
          `INSERT INTO user_participation_years (user_id, year, source, created_at)
           VALUES (?1, ?2, 'declarado', ?3)
           ON CONFLICT (user_id, year) DO NOTHING`
        ).bind(auth.sub, year, now)
      ),
      // Marca que a pessoa já respondeu à pergunta. Fica no MESMO batch de
      // propósito: se gravasse depois, uma falha entre as duas coisas faria o
      // primeiro acesso reaparecer com os anos já salvos — a tela pedindo de
      // novo algo que ela acabou de responder.
      context.env.DB.prepare(
        "UPDATE users SET years_declared_at = ?2, updated_at = ?2 WHERE id = ?1"
      ).bind(auth.sub, now),
    ];

    // batch é atômico no D1: sem ele, uma falha depois do DELETE deixaria a
    // pessoa sem nenhum ano — pior do que não ter salvado.
    await context.env.DB.batch(statements);

    const { results } = await context.env.DB.prepare(
      "SELECT year FROM user_participation_years WHERE user_id = ?1 ORDER BY year DESC"
    )
      .bind(auth.sub)
      .all<{ year: number }>();

    const saved = (results ?? []).map(row => row.year);
    // O selo de Servo não sai dos anos, sai do papel na organização — precisa
    // vir do banco, senão ele sumiria da tela toda vez que alguém salvasse os
    // anos e voltaria só no próximo carregamento.
    const account = await context.env.DB.prepare(
      "SELECT is_staff FROM users WHERE id = ?1"
    )
      .bind(auth.sub)
      .first<{ is_staff: number }>();

    return json(200, {
      years: saved,
      badges: buildBadges(saved, { isStaff: account?.is_staff === 1 }),
      nextBadge: nextMilestone(saved.length),
      hasDeclaredYears: true,
    });
  } catch (error) {
    console.error("POST /api/me/years falhou:", error);
    return serverError();
  }
};

/** A tela precisa saber quais anos oferecer. */
export const onRequestGet: PagesFunction<Env> = async context => {
  const auth = await authorizeUserRequest(context.request, context.env);
  if (auth instanceof Response) return auth;

  return json(200, { available: listEditionYears(getEventYear(context.env)) });
};
