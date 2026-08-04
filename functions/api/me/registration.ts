/// <reference types="@cloudflare/workers-types" />
import { badRequest, conflict, json, serverError } from "../../_utils/responses";
import { UserAuthEnv, authorizeUserRequest } from "../../_utils/userAuth";
import { EventYearEnv, getEventYear } from "../../_utils/eventYear";
import {
  RegistrationWindowEnv,
  getRegistrationWindow,
} from "../../_utils/registrationWindow";
import { CapacityEnv, getCapacityLimits } from "../../_utils/capacity";
import { bindInviteCode, evaluateInvite, normalizeInviteCode } from "../../_utils/inviteCodes";
import { insertRegistration } from "../../_utils/registrations";
import { USER_PROFILE_COLUMNS, UserProfileRow } from "../../_utils/userProfile";

interface CpfEnv {
  CPF_ENCRYPTION_KEY?: string;
  CPF_ENCRYPTION_IV?: string;
}

type Env = UserAuthEnv & EventYearEnv & RegistrationWindowEnv & CapacityEnv & CpfEnv;

/**
 * A inscrição do peregrino logado, dentro da conta.
 *
 * ⚠️ **A cobrança ainda NÃO acontece aqui.** O organizador decidiu trocar de
 * adquirente e ainda não escolheu qual. Enquanto isso, a inscrição nasce
 * `PENDING` com `payment_provider = 'A_DEFINIR'` e nenhuma cobrança é criada —
 * a tela diz isso com todas as letras. Amarrar ao Woovi agora significaria
 * refazer o fluxo inteiro na troca, e criar cobrança de verdade num fluxo que
 * ainda está sendo testado é pior ainda.
 *
 * ## Vaga e convite
 *
 * Passando do teto (`MAX_REGISTRATIONS`), a inscrição só sai com **código de
 * convite** — é a mesma regra de 2026, onde o código era o que furava a
 * lotação. O código é de uso único e a checagem é a mesma do site público
 * (`evaluateInvite`), para não haver duas regras de convite convivendo.
 */

const PROVIDER_TO_BE_DEFINED = "A_DEFINIR";

interface RegistrationRow {
  id: string;
  status: string;
  sleep_at_monastery: number;
  companion_name: string | null;
  invite_code: string | null;
  event_year: number;
  created_at: string;
  paid_at: string | null;
}

async function loadMyRegistration(
  env: Env,
  userId: string,
  eventYear: number
): Promise<RegistrationRow | null> {
  return (
    (await env.DB.prepare(
      `SELECT id, status, sleep_at_monastery, companion_name, invite_code,
              event_year, created_at, paid_at
         FROM registrations
        WHERE user_id = ?1 AND event_year = ?2
        ORDER BY created_at DESC
        LIMIT 1`
    )
      .bind(userId, eventYear)
      .first<RegistrationRow>()) ?? null
  );
}

/** Quantas vagas de peregrino já foram tomadas nesta edição. */
async function countTaken(env: Env, eventYear: number): Promise<number> {
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS total
       FROM registrations
      WHERE event_year = ?1 AND is_staff = 0 AND status IN ('PAID','PENDING')`
  )
    .bind(eventYear)
    .first<{ total: number }>();
  return row?.total ?? 0;
}

export const onRequestGet: PagesFunction<Env> = async context => {
  const auth = await authorizeUserRequest(context.request, context.env);
  if (auth instanceof Response) return auth;

  try {
    const eventYear = getEventYear(context.env);
    const window = getRegistrationWindow(context.env);
    const limits = getCapacityLimits(context.env);
    const [registration, taken] = await Promise.all([
      loadMyRegistration(context.env, auth.sub, eventYear),
      countTaken(context.env, eventYear),
    ]);

    const profile = await context.env.DB.prepare(
      `SELECT ${USER_PROFILE_COLUMNS} FROM users WHERE id = ?1`
    )
      .bind(auth.sub)
      .first<UserProfileRow>();

    // O que a inscrição exige e o perfil pode não ter. Nome, CPF e telefone são
    // o mínimo para existir inscrição; sem eles a tela abre o formulário em vez
    // do "confira seus dados".
    const missing: string[] = [];
    if (!profile?.name) missing.push("nome");
    if (!profile?.cpf_encrypted) missing.push("CPF");
    if (!profile?.phone) missing.push("telefone");
    if (!profile?.date_of_birth) missing.push("data de nascimento");
    if (!profile?.cep) missing.push("CEP");
    if (!profile?.address) missing.push("endereço");
    if (!profile?.city) missing.push("cidade");
    if (!profile?.state) missing.push("estado");

    return json(200, {
      eventYear,
      opensAt: window.opensAt,
      isOpen: window.isOpen,
      isForced: window.isForced,
      capacity: { taken, limit: limits.maxRegistrationsNonStaff },
      // Passando do teto, só entra com convite — mesma regra de 2026.
      needsInviteCode: taken >= limits.maxRegistrationsNonStaff,
      missingProfileFields: missing,
      registration: registration
        ? {
            id: registration.id,
            status: registration.status,
            sleepAtMonastery: registration.sleep_at_monastery === 1,
            companionName: registration.companion_name,
            usedInviteCode: registration.invite_code !== null,
            createdAt: registration.created_at,
            paidAt: registration.paid_at,
          }
        : null,
    });
  } catch (error) {
    console.error("GET /api/me/registration falhou:", error);
    return serverError();
  }
};

export const onRequestPost: PagesFunction<Env> = async context => {
  const auth = await authorizeUserRequest(context.request, context.env);
  if (auth instanceof Response) return auth;

  let body: {
    sleepAtMonastery?: unknown;
    companionName?: unknown;
    acceptsTerms?: unknown;
    inviteCode?: unknown;
  } = {};
  try {
    body = await context.request.json();
  } catch {
    return badRequest("invalid_json");
  }

  const eventYear = getEventYear(context.env);
  const window = getRegistrationWindow(context.env);
  if (!window.isOpen) return conflict("registration_not_open");

  // Aceite de termos é individual e por edição: o de um ano não vale para o
  // outro, e o da pessoa que cedeu a vaga não vale para quem recebe.
  if (body.acceptsTerms !== true) return badRequest("terms_not_accepted");

  try {
    const existing = await loadMyRegistration(context.env, auth.sub, eventYear);
    if (existing && existing.status !== "CANCELED") {
      return conflict("already_registered");
    }

    const profile = await context.env.DB.prepare(
      `SELECT ${USER_PROFILE_COLUMNS} FROM users WHERE id = ?1`
    )
      .bind(auth.sub)
      .first<UserProfileRow>();

    if (!profile) return serverError("user_not_found");
    if (
      !profile.name ||
      !profile.cpf_encrypted ||
      !profile.phone ||
      !profile.date_of_birth ||
      !profile.cep ||
      !profile.address ||
      !profile.city ||
      !profile.state
    ) {
      return badRequest("incomplete_profile");
    }

    // Duas contas não podem reivindicar o mesmo CPF na mesma edição. O índice
    // único de (cpf, ano) já barraria, mas aqui a mensagem é entendível.
    const sameCpf = await context.env.DB.prepare(
      `SELECT id FROM registrations
        WHERE cpf_encrypted = ?1 AND event_year = ?2 AND status IN ('PAID','PENDING')`
    )
      .bind(profile.cpf_encrypted, eventYear)
      .first<{ id: string }>();
    if (sameCpf) return conflict("cpf_already_registered");

    const limits = getCapacityLimits(context.env);
    const taken = await countTaken(context.env, eventYear);
    const code = normalizeInviteCode(
      typeof body.inviteCode === "string" ? body.inviteCode : ""
    );

    if (taken >= limits.maxRegistrationsNonStaff) {
      if (!code) return conflict("sold_out");
      const invite = await evaluateInvite(context.env.DB, code);
      if (!invite.openable) return conflict(`invite_${invite.reason}`);
    } else if (code) {
      // Código enviado com vaga sobrando: recusar em silêncio gastaria o
      // convite sem necessidade. Só valida se é real, e amarra depois.
      const invite = await evaluateInvite(context.env.DB, code);
      if (!invite.openable) return conflict(`invite_${invite.reason}`);
    }

    const id = crypto.randomUUID();
    await insertRegistration(context.env.DB, {
      id,
      email: auth.email,
      name: profile.name,
      status: "PENDING",
      // ⚠️ Sem adquirente definida ainda. Ver o cabeçalho deste arquivo.
      payment_provider: PROVIDER_TO_BE_DEFINED,
      payment_ref: "",
      sleep_at_monastery: body.sleepAtMonastery === true ? 1 : 0,
      companion_name:
        typeof body.companionName === "string" && body.companionName.trim()
          ? body.companionName.trim().slice(0, 120)
          : null,
      phone: profile.phone,
      cep: profile.cep,
      address: profile.address,
      number: profile.number ?? "",
      complement: profile.complement,
      city: profile.city,
      state: profile.state,
      cpf_encrypted: profile.cpf_encrypted,
      date_of_birth: profile.date_of_birth,
      terms_accepted_at: new Date().toISOString(),
      emergency_contact_name: profile.emergency_contact_name,
      emergency_contact_phone: profile.emergency_contact_phone,
      has_allergy_medication: profile.has_allergy_medication,
      allergy_medication_details: profile.allergy_medication_details,
      has_dietary_restriction: profile.has_dietary_restriction,
      dietary_restriction_details: profile.dietary_restriction_details,
      gender: profile.gender ? profile.gender.toUpperCase() : null,
      event_year: eventYear,
    });

    // `insertRegistration` é compartilhada com o fluxo antigo e não conhece
    // `user_id`. O vínculo entra logo em seguida, em vez de duplicar o INSERT.
    await context.env.DB.prepare(
      "UPDATE registrations SET user_id = ?2 WHERE id = ?1"
    )
      .bind(id, auth.sub)
      .run();

    if (code) {
      await context.env.DB.prepare(
        "UPDATE registrations SET invite_code = ?2 WHERE id = ?1"
      )
        .bind(id, code)
        .run();
      await bindInviteCode(context.env.DB, code, id);
    }

    return json(201, {
      id,
      status: "PENDING",
      // A tela precisa dizer o que vem depois, e hoje a resposta honesta é
      // "ainda não dá para pagar".
      paymentPending: true,
    });
  } catch (error) {
    console.error("POST /api/me/registration falhou:", error);
    return serverError();
  }
};
