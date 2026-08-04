/// <reference types="@cloudflare/workers-types" />
import { badRequest, conflict, json, serverError } from "../../_utils/responses";
import { UserAuthEnv, authorizeUserRequest } from "../../_utils/userAuth";
import { EventYearEnv, getEventYear } from "../../_utils/eventYear";
import { buildBadges, nextMilestone } from "../../_utils/badges";
import { FIRST_EDITION_YEAR } from "../../_utils/editions";
import { canonicalizeCpf, isValidCpf } from "../../_utils/cpfValidation";
import { decryptCpf, encryptCpf } from "../../_utils/cpfCrypto";
import {
  USER_PROFILE_COLUMNS,
  UserProfileRow,
  profileBindings,
  toProfileView,
  validateProfile,
} from "../../_utils/userProfile";

interface CpfEnv {
  CPF_ENCRYPTION_KEY?: string;
  CPF_ENCRYPTION_IV?: string;
}

type Env = UserAuthEnv & EventYearEnv & CpfEnv;

/** Só os 3 primeiros e os 2 últimos, como banco e cartório fazem. */
function maskCpf(digits: string): string {
  if (digits.length !== 11) return "";
  return `${digits.slice(0, 3)}.***.***-${digits.slice(9)}`;
}

/**
 * Descriptografa só para mascarar. Falha de chave NÃO derruba o perfil: sem o
 * CPF a tela ainda serve para tudo o mais, e um perfil em branco por causa de
 * uma env ausente seria um estrago maior do que o campo faltando.
 */
async function maskStoredCpf(env: Env, encrypted: string | null): Promise<string | null> {
  if (!encrypted) return null;
  const key = env.CPF_ENCRYPTION_KEY;
  const iv = env.CPF_ENCRYPTION_IV;
  if (!key || !iv) return null;
  try {
    return maskCpf(canonicalizeCpf(await decryptCpf(encrypted, key, iv)));
  } catch (error) {
    console.error("GET /api/me: falha ao descriptografar CPF:", error);
    return null;
  }
}

async function loadProfileRow(env: Env, userId: string): Promise<UserProfileRow | null> {
  return (
    (await env.DB.prepare(`SELECT ${USER_PROFILE_COLUMNS} FROM users WHERE id = ?1`)
      .bind(userId)
      .first<UserProfileRow>()) ?? null
  );
}

async function loadYears(env: Env, userId: string): Promise<number[]> {
  const { results } = await env.DB.prepare(
    "SELECT year FROM user_participation_years WHERE user_id = ?1 ORDER BY year DESC"
  )
    .bind(userId)
    .all<{ year: number }>();
  return (results ?? []).map(row => row.year);
}

/** Perfil do peregrino logado: dados, anos de caminhada e medalhas. */
export const onRequestGet: PagesFunction<Env> = async context => {
  const auth = await authorizeUserRequest(context.request, context.env);
  if (auth instanceof Response) return auth;

  try {
    const [row, years] = await Promise.all([
      loadProfileRow(context.env, auth.sub),
      loadYears(context.env, auth.sub),
    ]);
    if (!row) return serverError("user_not_found");

    return json(200, {
      email: auth.email,
      currentYear: getEventYear(context.env),
      firstEditionYear: FIRST_EDITION_YEAR,
      years,
      badges: buildBadges(years, { isStaff: row.is_staff === 1 }),
      // A próxima medalha, ainda apagada. Sai do servidor junto com as
      // conquistadas para a tela não ter de repetir os números dos degraus.
      nextBadge: nextMilestone(years.length),
      // Quem nunca respondeu a pergunta dos anos vê o primeiro acesso; quem já
      // respondeu (mesmo que com nenhum ano) vai direto para a estrada.
      hasDeclaredYears: row.years_declared_at !== null,
      // Idem para o cadastro: quem já preencheu OU já clicou em "preencher
      // depois" não vê o convite de novo.
      hasSeenProfilePrompt: row.profile_prompted_at !== null,
      isStaff: row.is_staff === 1,
      isAdmin: row.is_admin === 1,
      // Só o carimbo, não a imagem: a foto vem por `/api/me/photo`, e embutir
      // 25 KB de base64 aqui engordaria toda abertura do perfil.
      photoUpdatedAt: row.photo_updated_at,
      profile: toProfileView(row),
      // O CPF só sai daqui MASCARADO. A tela precisa que a pessoa se reconheça
      // ("é o meu mesmo"), não precisa do número inteiro — e um CPF completo
      // trafegando é dado sensível que ninguém pediu.
      hasCpf: row.cpf_encrypted !== null,
      cpfMasked: await maskStoredCpf(context.env, row.cpf_encrypted),
    });
  } catch (error) {
    console.error("GET /api/me falhou:", error);
    return serverError();
  }
};

/**
 * Atualiza os dados pessoais.
 *
 * O CPF é SET-ONCE: entra uma vez, e depois nem esta rota o altera. É ele que
 * liga a conta ao histórico e ao pagamento — deixá-lo livre transformaria
 * "editar meu perfil" em "assumir a inscrição de outra pessoa". Correção passa
 * pelo admin (`/admin/passar-cpf`), que é o motivo do aviso de WhatsApp na tela.
 */
export const onRequestPut: PagesFunction<Env> = async context => {
  const auth = await authorizeUserRequest(context.request, context.env);
  if (auth instanceof Response) return auth;

  let body: { profile?: unknown; cpf?: unknown } = {};
  try {
    body = await context.request.json();
  } catch {
    return badRequest("invalid_json");
  }

  const validation = validateProfile(body.profile);
  if (!validation.ok) return badRequest(validation.error);

  try {
    const row = await loadProfileRow(context.env, auth.sub);
    if (!row) return serverError("user_not_found");

    let cpfEncrypted: string | null = null;
    const rawCpf = typeof body.cpf === "string" ? canonicalizeCpf(body.cpf) : "";

    if (rawCpf && !row.cpf_encrypted) {
      if (!isValidCpf(rawCpf)) return badRequest("invalid_cpf");

      const key = context.env.CPF_ENCRYPTION_KEY;
      const iv = context.env.CPF_ENCRYPTION_IV;
      if (!key || !iv) {
        console.error("PUT /api/me: CPF_ENCRYPTION_KEY/IV ausentes.");
        return serverError("cpf_encryption_not_configured");
      }
      cpfEncrypted = await encryptCpf(rawCpf, key, iv);
    }

    const now = Date.now();
    const bindings = profileBindings(validation.value);

    if (cpfEncrypted) {
      try {
        await context.env.DB.prepare(
          `UPDATE users SET
             name = ?1, phone = ?2, gender = ?3, date_of_birth = ?4, cep = ?5,
             address = ?6, number = ?7, complement = ?8, city = ?9, state = ?10,
             emergency_contact_name = ?11, emergency_contact_phone = ?12,
             has_allergy_medication = ?13, allergy_medication_details = ?14,
             has_dietary_restriction = ?15, dietary_restriction_details = ?16,
             cpf_encrypted = ?17, updated_at = ?18,
             profile_prompted_at = COALESCE(profile_prompted_at, ?18)
           WHERE id = ?19`
        )
          .bind(...bindings, cpfEncrypted, now, auth.sub)
          .run();
      } catch (error) {
        // O índice único do CPF (migration 030) é a última barreira contra duas
        // contas reivindicando a mesma pessoa. Aqui ele vira mensagem, não 500.
        if (String(error).includes("UNIQUE")) return conflict("cpf_already_used");
        throw error;
      }
    } else {
      await context.env.DB.prepare(
        `UPDATE users SET
           name = ?1, phone = ?2, gender = ?3, date_of_birth = ?4, cep = ?5,
           address = ?6, number = ?7, complement = ?8, city = ?9, state = ?10,
           emergency_contact_name = ?11, emergency_contact_phone = ?12,
           has_allergy_medication = ?13, allergy_medication_details = ?14,
           has_dietary_restriction = ?15, dietary_restriction_details = ?16,
           updated_at = ?17,
           profile_prompted_at = COALESCE(profile_prompted_at, ?17)
         WHERE id = ?18`
      )
        .bind(...bindings, now, auth.sub)
        .run();
    }

    const saved = await loadProfileRow(context.env, auth.sub);
    if (!saved) return serverError("user_not_found");

    return json(200, {
      profile: toProfileView(saved),
      hasCpf: saved.cpf_encrypted !== null,
      cpfMasked: rawCpf ? maskCpf(rawCpf) : null,
      hasSeenProfilePrompt: true,
    });
  } catch (error) {
    console.error("PUT /api/me falhou:", error);
    return serverError();
  }
};
