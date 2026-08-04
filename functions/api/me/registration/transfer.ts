/// <reference types="@cloudflare/workers-types" />
import { badRequest, conflict, json, notFound, serverError } from "../../../_utils/responses";
import { UserAuthEnv, authorizeUserRequest } from "../../../_utils/userAuth";
import { EventYearEnv, getEventYear } from "../../../_utils/eventYear";
import { USER_PROFILE_COLUMNS, UserProfileRow } from "../../../_utils/userProfile";

type Env = UserAuthEnv & EventYearEnv;

/**
 * Transferência de inscrição entre peregrinos (migration 034).
 *
 * ⚠️ A inscrição NUNCA é cancelada no meio do caminho. A linha em
 * `registrations` continua a mesma — mesmo pagamento, mesma vaga contada — e o
 * que muda são os campos pessoais e o dono. Se passasse pelo cancelamento, a
 * vaga voltaria para o balde e outra pessoa poderia tomá-la no intervalo.
 *
 * Três passos, um por ação:
 *
 * - `create`  — quem cede indica o nome de quem vai receber.
 * - `release` — quem cede libera. É aqui que nasce o código. Separado do
 *   `create` porque o acerto de dinheiro é por fora (PIX direto entre as duas
 *   pessoas), e quem cede só libera quando o dinheiro cai. Quem doa libera na
 *   hora.
 * - `accept`  — quem recebe usa o código, e a inscrição passa a ser dele.
 *
 * O aceite dos termos é REFEITO por quem recebe: o aceite da pessoa anterior
 * não vale para ela.
 */

/** Código curto, ditável por WhatsApp. Sem 0/O e 1/I, que se confundem. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

function generateCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  return Array.from(bytes, byte => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
}

interface TransferRow {
  id: string;
  registration_id: string;
  from_user_id: string;
  from_name: string;
  to_name: string;
  to_user_id: string | null;
  transfer_code: string | null;
  is_donation: number;
  status: string;
  created_at: number;
  released_at: number | null;
}

/** A transferência viva da inscrição de quem está logado, se houver. */
async function loadMyTransfer(env: Env, userId: string, eventYear: number) {
  return (
    (await env.DB.prepare(
      `SELECT t.* FROM registration_transfers t
        WHERE t.from_user_id = ?1 AND t.event_year = ?2
          AND t.status IN ('PENDENTE','LIBERADA')
        ORDER BY t.created_at DESC LIMIT 1`
    )
      .bind(userId, eventYear)
      .first<TransferRow>()) ?? null
  );
}

export const onRequestGet: PagesFunction<Env> = async context => {
  const auth = await authorizeUserRequest(context.request, context.env);
  if (auth instanceof Response) return auth;

  try {
    const transfer = await loadMyTransfer(context.env, auth.sub, getEventYear(context.env));
    return json(200, {
      transfer: transfer
        ? {
            id: transfer.id,
            toName: transfer.to_name,
            status: transfer.status,
            isDonation: transfer.is_donation === 1,
            // O código só sai depois de liberado — antes disso ele nem existe.
            code: transfer.transfer_code,
          }
        : null,
    });
  } catch (error) {
    console.error("GET /api/me/registration/transfer falhou:", error);
    return serverError();
  }
};

export const onRequestPost: PagesFunction<Env> = async context => {
  const auth = await authorizeUserRequest(context.request, context.env);
  if (auth instanceof Response) return auth;

  let body: {
    action?: unknown;
    toName?: unknown;
    isDonation?: unknown;
    code?: unknown;
    acceptsTerms?: unknown;
  } = {};
  try {
    body = await context.request.json();
  } catch {
    return badRequest("invalid_json");
  }

  const eventYear = getEventYear(context.env);
  const action = typeof body.action === "string" ? body.action : "";

  try {
    if (action === "create") {
      const toName = typeof body.toName === "string" ? body.toName.trim().slice(0, 120) : "";
      if (toName.length < 3) return badRequest("invalid_to_name");

      const registration = await context.env.DB.prepare(
        `SELECT id, name FROM registrations
          WHERE user_id = ?1 AND event_year = ?2 AND status IN ('PAID','PENDING')`
      )
        .bind(auth.sub, eventYear)
        .first<{ id: string; name: string }>();
      if (!registration) return notFound("no_active_registration");

      const existing = await loadMyTransfer(context.env, auth.sub, eventYear);
      if (existing) return conflict("transfer_already_open");

      const isDonation = body.isDonation === true;
      const id = crypto.randomUUID();
      const now = Date.now();

      await context.env.DB.prepare(
        `INSERT INTO registration_transfers
           (id, registration_id, event_year, from_user_id, from_name, to_name,
            transfer_code, is_donation, status, created_at, released_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`
      )
        .bind(
          id,
          registration.id,
          eventYear,
          auth.sub,
          registration.name,
          toName,
          // Doação já nasce liberada: não há dinheiro para esperar cair.
          isDonation ? generateCode() : null,
          isDonation ? 1 : 0,
          isDonation ? "LIBERADA" : "PENDENTE",
          now,
          isDonation ? now : null
        )
        .run();

      const saved = await loadMyTransfer(context.env, auth.sub, eventYear);
      return json(201, {
        id,
        status: saved?.status ?? "PENDENTE",
        code: saved?.transfer_code ?? null,
      });
    }

    if (action === "release") {
      const transfer = await loadMyTransfer(context.env, auth.sub, eventYear);
      if (!transfer) return notFound("no_open_transfer");
      if (transfer.status === "LIBERADA") {
        return json(200, { status: "LIBERADA", code: transfer.transfer_code });
      }

      const code = generateCode();
      await context.env.DB.prepare(
        `UPDATE registration_transfers
            SET status = 'LIBERADA', transfer_code = ?2, released_at = ?3
          WHERE id = ?1`
      )
        .bind(transfer.id, code, Date.now())
        .run();

      return json(200, { status: "LIBERADA", code });
    }

    if (action === "cancel") {
      const transfer = await loadMyTransfer(context.env, auth.sub, eventYear);
      if (!transfer) return notFound("no_open_transfer");

      // Some o código junto: um código já enviado no WhatsApp não pode
      // continuar valendo depois de a origem desistir.
      await context.env.DB.prepare(
        `UPDATE registration_transfers
            SET status = 'CANCELADA', transfer_code = NULL
          WHERE id = ?1`
      )
        .bind(transfer.id)
        .run();

      return json(200, { status: "CANCELADA" });
    }

    if (action === "accept") {
      if (body.acceptsTerms !== true) return badRequest("terms_not_accepted");
      const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
      if (!code) return badRequest("missing_code");

      const transfer = await context.env.DB.prepare(
        `SELECT * FROM registration_transfers
          WHERE transfer_code = ?1 AND status = 'LIBERADA'`
      )
        .bind(code)
        .first<TransferRow>();
      if (!transfer) return notFound("transfer_not_found");
      if (transfer.from_user_id === auth.sub) return conflict("cannot_accept_own");

      const profile = await context.env.DB.prepare(
        `SELECT ${USER_PROFILE_COLUMNS} FROM users WHERE id = ?1`
      )
        .bind(auth.sub)
        .first<UserProfileRow>();
      if (!profile) return serverError("user_not_found");

      // Trocar o nome não basta: CPF, nascimento, telefone, endereço e contato
      // de emergência são da pessoa nova. Sem isso a portaria receberia uma
      // pessoa e um cadastro de outra.
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

      // Quem recebe não pode já ter inscrição no mesmo ano: a unicidade
      // (CPF, ano) quebraria na reescrita, e a pessoa ficaria com duas vagas.
      const alreadyRegistered = await context.env.DB.prepare(
        `SELECT id FROM registrations
          WHERE event_year = ?1 AND status IN ('PAID','PENDING')
            AND (user_id = ?2 OR cpf_encrypted = ?3)`
      )
        .bind(eventYear, auth.sub, profile.cpf_encrypted)
        .first<{ id: string }>();
      if (alreadyRegistered) return conflict("already_registered");

      const now = Date.now();
      await context.env.DB.batch([
        context.env.DB.prepare(
          `UPDATE registrations SET
             user_id = ?2, email = ?3, name = ?4, phone = ?5, cpf_encrypted = ?6,
             date_of_birth = ?7, cep = ?8, address = ?9, number = ?10,
             complement = ?11, city = ?12, state = ?13,
             emergency_contact_name = ?14, emergency_contact_phone = ?15,
             has_allergy_medication = ?16, allergy_medication_details = ?17,
             has_dietary_restriction = ?18, dietary_restriction_details = ?19,
             gender = ?20,
             terms_accepted_at = ?21,
             -- Avisos precisam ser reenviados: os carimbos abaixo se referem à
             -- pessoa anterior. Sem zerar, quem recebe nunca receberia o
             -- convite do grupo nem as instruções do mosteiro.
             group_invited_at = NULL, monastery_info_sent_at = NULL
           WHERE id = ?1`
        ).bind(
          transfer.registration_id,
          auth.sub,
          auth.email,
          profile.name,
          profile.phone,
          profile.cpf_encrypted,
          profile.date_of_birth,
          profile.cep,
          profile.address,
          profile.number ?? "",
          profile.complement,
          profile.city,
          profile.state,
          profile.emergency_contact_name,
          profile.emergency_contact_phone,
          profile.has_allergy_medication,
          profile.allergy_medication_details,
          profile.has_dietary_restriction,
          profile.dietary_restriction_details,
          profile.gender ? profile.gender.toUpperCase() : null,
          new Date().toISOString()
        ),
        context.env.DB.prepare(
          `UPDATE registration_transfers
              SET status = 'ACEITA', to_user_id = ?2, accepted_at = ?3, transfer_code = NULL
            WHERE id = ?1`
        ).bind(transfer.id, auth.sub, now),
      ]);

      return json(200, { accepted: true, registrationId: transfer.registration_id });
    }

    return badRequest("invalid_action");
  } catch (error) {
    console.error("POST /api/me/registration/transfer falhou:", error);
    return serverError();
  }
};
