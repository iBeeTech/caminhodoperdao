/// <reference types="@cloudflare/workers-types" />
import { badRequest, json, serverError } from "../../_utils/responses";
import { AdminAuthEnv, authorizeAdminRequest } from "../../_utils/adminAuth";
import { getEventYear, EventYearEnv } from "../../_utils/eventYear";
import { getCapacityLimits, CapacityEnv } from "../../_utils/capacity";
import {
  countActive,
  countActiveSleep,
  countActiveStaff,
} from "../../_utils/registrations";

type Env = AdminAuthEnv & EventYearEnv & CapacityEnv;

const MIN_NAME_LENGTH = 3;
const MIN_PHONE_DIGITS = 10;
const MAX_PHONE_DIGITS = 13;

/**
 * Inscrição manual: o admin cadastra alguém sabendo só nome, telefone e se
 * pagou. Existe porque a inscrição saiu do site público e passou a exigir
 * conta; quem não tem e-mail cria um, mas sobra um punhado de casos que o
 * admin resolve pessoalmente.
 *
 * Grava na MESMA tabela `registrations`, não numa nova: a lotação é contada com
 * COUNT sobre `registrations`, e essas pessoas ocupam vaga. Numa tabela à parte
 * elas sumiriam da contagem, da lista de credenciamento e dos relatórios.
 *
 * Segue o molde de staffRegistration.ts: grava direto, sem cobrança na Woovi.
 * A diferença é payment_provider 'manual' e manual_entry = 1.
 */
export const onRequestPost: PagesFunction<Env> = async context => {
  const auth = await authorizeAdminRequest(context.request, context.env);
  if (auth instanceof Response) {
    return auth;
  }

  let body: {
    name?: string;
    phone?: string;
    paid?: boolean;
    sleepAtMonastery?: boolean;
  } = {};
  try {
    body = await context.request.json();
  } catch {
    return badRequest("invalid_json");
  }

  const name = body.name?.trim().replace(/\s+/g, " ") || "";
  const phoneDigits = (body.phone || "").replace(/\D/g, "");
  const paid = body.paid === true;
  const sleepAtMonastery = body.sleepAtMonastery === true;

  if (name.length < MIN_NAME_LENGTH) {
    return badRequest("invalid_name");
  }
  if (phoneDigits.length < MIN_PHONE_DIGITS || phoneDigits.length > MAX_PHONE_DIGITS) {
    return badRequest("invalid_phone");
  }

  try {
    const eventYear = getEventYear(context.env);
    const registrationNumber = await generateManualRegistrationNumber(
      context.env.DB,
      eventYear
    );
    const nowIso = new Date().toISOString();
    const id = crypto.randomUUID();

    await context.env.DB.prepare(
      `INSERT INTO registrations (
         id, email, name, status, payment_provider, payment_ref,
         sleep_at_monastery, phone, cep, address, number, city, state,
         is_staff, manual_entry, registration_number, event_year,
         created_at, paid_at
       ) VALUES (?1, '', ?2, ?3, 'manual', NULL, ?4, ?5, '', '', '', '', '',
         0, 1, ?6, ?7, datetime('now'), ?8)`
    )
      .bind(
        id,
        name,
        paid ? "PAID" : "PENDING",
        sleepAtMonastery ? 1 : 0,
        phoneDigits,
        registrationNumber,
        eventYear,
        paid ? nowIso : null
      )
      .run();

    // Devolve a lotação DEPOIS de gravar: o admin acabou de ocupar uma vaga e
    // precisa ver o efeito. Não bloqueamos quando lota — o teto já é furado de
    // propósito por convite, e quem cadastra à mão sabe o que está fazendo.
    // Mas ele tem de enxergar que passou do limite, e não descobrir no dia.
    const capacity = await readCapacity(context.env);

    return json(201, {
      id,
      registrationNumber,
      name,
      status: paid ? "PAID" : "PENDING",
      capacity,
    });
  } catch (error) {
    console.error("manual-registration falhou:", error);
    return serverError();
  }
};

/**
 * Numeração própria (M-001-2026), no mesmo formato do staff (S-001-2026), para
 * a origem da inscrição ser óbvia na planilha de credenciamento.
 *
 * Conta PAID e PENDING: contar só as pagas reaproveitaria o número de uma
 * inscrição manual ainda não paga, e duas pessoas ficariam com o mesmo código.
 */
async function generateManualRegistrationNumber(
  DB: D1Database,
  eventYear: number
): Promise<string> {
  const result = await DB.prepare(
    `SELECT COUNT(*) AS count FROM registrations
      WHERE registration_number LIKE ?1 AND status IN ('PENDING','PAID')`
  )
    .bind(`M-%-${eventYear}`)
    .first<{ count: number }>();
  const next = (result?.count ?? 0) + 1;
  return `M-${String(next).padStart(3, "0")}-${eventYear}`;
}

async function readCapacity(env: Env) {
  const limits = getCapacityLimits(env);
  const [total, sleepers, staff] = await Promise.all([
    countActive(env.DB),
    countActiveSleep(env.DB),
    countActiveStaff(env.DB),
  ]);
  return {
    total,
    sleepers,
    // Staff não ocupa vaga de peregrino (decidido em 03/08/2026): o balde dele
    // é separado, então quem disputa as 500 é o total menos o staff.
    nonStaff: total - staff,
    totalLimit: limits.maxRegistrations,
    monasteryLimit: limits.maxRegistrationsSleep,
  };
}
