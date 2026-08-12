/// <reference types="@cloudflare/workers-types" />
import { isValidPhone, normalizePhone } from "./validation";

/**
 * Acolhimento — quem mora em Franca ou Claraval recebe peregrinos de fora
 * (migration 038).
 *
 * As regras moram todas aqui porque são usadas em três lugares: a tela do
 * peregrino (`/api/me/hosting`), a lista da organização
 * (`/api/admin/hosting`) e os testes. Espalhadas, a primeira cidade nova ou o
 * primeiro campo novo já as faria divergir.
 *
 * ⚠️ **Elegibilidade é do servidor.** A cidade que vale é a do cadastro
 * (`users.city`), lida do banco na hora de gravar. O navegador não manda
 * cidade — se mandasse, "sou de Franca" seria só uma linha no JSON.
 */

export type HostingCity = "franca" | "claraval";
export type GenderPreference = "qualquer" | "feminino" | "masculino";

export const HOSTING_CITIES: ReadonlyArray<{ key: HostingCity; label: string }> = [
  { key: "franca", label: "Franca (SP)" },
  { key: "claraval", label: "Claraval (MG)" },
];

const GENDER_PREFERENCES: readonly GenderPreference[] = ["qualquer", "feminino", "masculino"];

/** Teto de sanidade. Acima disso não é casa de família, é pousada. */
const MAX_SPOTS = 20;
const MAX_ADDRESS = 200;
const MAX_NOTES = 500;

/**
 * "Cláraval ", "FRANCA", "Franca " e "Franca" são a mesma cidade. Sem tirar
 * acento e caixa, quem digitasse com acento ficaria de fora sem entender por
 * quê — e a pessoa não tem como adivinhar que o problema era o "á".
 */
export function normalizeCityName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

/** A cidade elegível correspondente, ou `null` para todo o resto do Brasil. */
export function hostingCityFor(city: string | null | undefined): HostingCity | null {
  if (!city) return null;
  const normalized = normalizeCityName(city);
  const match = HOSTING_CITIES.find(entry => entry.key === normalized);
  return match ? match.key : null;
}

export function hostingCityLabel(city: HostingCity): string {
  return HOSTING_CITIES.find(entry => entry.key === city)?.label ?? city;
}

export interface HostingOfferRow {
  id: string;
  user_id: string;
  event_year: number;
  city: string;
  spots: number;
  gender_preference: string;
  offers_meal: number;
  offers_shower: number;
  offers_transport: number;
  address: string;
  contact_phone: string;
  notes: string | null;
  status: string;
  created_at: number;
  updated_at: number;
}

/** O que a tela do peregrino recebe. */
export interface HostingOfferView {
  id: string;
  city: HostingCity;
  cityLabel: string;
  spots: number;
  genderPreference: GenderPreference;
  offersMeal: boolean;
  offersShower: boolean;
  offersTransport: boolean;
  address: string;
  contactPhone: string;
  notes: string;
  status: "ATIVO" | "CANCELADO";
  updatedAt: number;
}

/** O que a tela manda para gravar. Cidade não entra: quem a define é o perfil. */
export interface HostingOfferInput {
  spots: number;
  genderPreference: GenderPreference;
  offersMeal: boolean;
  offersShower: boolean;
  offersTransport: boolean;
  address: string;
  contactPhone: string;
  notes: string;
}

export function toHostingView(row: HostingOfferRow): HostingOfferView {
  const city = (hostingCityFor(row.city) ?? "franca") as HostingCity;
  return {
    id: row.id,
    city,
    cityLabel: hostingCityLabel(city),
    spots: row.spots,
    genderPreference: (GENDER_PREFERENCES.includes(row.gender_preference as GenderPreference)
      ? row.gender_preference
      : "qualquer") as GenderPreference,
    offersMeal: row.offers_meal === 1,
    offersShower: row.offers_shower === 1,
    offersTransport: row.offers_transport === 1,
    address: row.address,
    contactPhone: row.contact_phone,
    notes: row.notes ?? "",
    status: row.status === "CANCELADO" ? "CANCELADO" : "ATIVO",
    updatedAt: row.updated_at,
  };
}

export type HostingValidation =
  | { ok: true; value: HostingOfferInput }
  | { ok: false; error: string };

/**
 * Valida o que veio da tela.
 *
 * Diferente do perfil, aqui campo em branco NÃO passa: uma oferta sem endereço
 * e sem telefone é uma linha na lista da organização que ninguém consegue
 * usar no dia — e alguém vai descobrir isso na véspera, ligando para o vazio.
 */
export function validateHostingInput(input: unknown): HostingValidation {
  if (typeof input !== "object" || input === null) {
    return { ok: false, error: "invalid_hosting" };
  }
  const raw = input as Record<string, unknown>;

  const text = (key: string, max: number): string =>
    typeof raw[key] === "string" ? (raw[key] as string).trim().slice(0, max) : "";

  const spots = Number(raw.spots);
  if (!Number.isInteger(spots) || spots < 1 || spots > MAX_SPOTS) {
    return { ok: false, error: "invalid_spots" };
  }

  const genderPreference = text("genderPreference", 20) || "qualquer";
  if (!GENDER_PREFERENCES.includes(genderPreference as GenderPreference)) {
    return { ok: false, error: "invalid_gender_preference" };
  }

  const address = text("address", MAX_ADDRESS);
  if (address.length < 5) return { ok: false, error: "invalid_hosting_address" };

  const contactPhone = normalizePhone(text("contactPhone", 20));
  if (!isValidPhone(contactPhone)) return { ok: false, error: "invalid_hosting_phone" };

  return {
    ok: true,
    value: {
      spots,
      genderPreference: genderPreference as GenderPreference,
      offersMeal: raw.offersMeal === true,
      offersShower: raw.offersShower === true,
      offersTransport: raw.offersTransport === true,
      address,
      contactPhone,
      notes: text("notes", MAX_NOTES),
    },
  };
}

const OFFER_COLUMNS = `
  id, user_id, event_year, city, spots, gender_preference,
  offers_meal, offers_shower, offers_transport, address, contact_phone,
  notes, status, created_at, updated_at
`;

export async function getHostingOffer(
  DB: D1Database,
  userId: string,
  eventYear: number
): Promise<HostingOfferRow | null> {
  const row = await DB.prepare(
    `SELECT ${OFFER_COLUMNS} FROM hosting_offers WHERE user_id = ?1 AND event_year = ?2`
  )
    .bind(userId, eventYear)
    .first<HostingOfferRow>();
  return row ?? null;
}

/**
 * Cria ou atualiza a oferta do ano. Gravar de novo REATIVA uma oferta
 * cancelada, em vez de recusar: quem voltou atrás está justamente dizendo
 * "mudei de ideia, ainda quero receber".
 */
export async function saveHostingOffer(
  DB: D1Database,
  params: {
    id: string;
    userId: string;
    eventYear: number;
    city: HostingCity;
    input: HostingOfferInput;
    now: number;
  }
): Promise<void> {
  const { id, userId, eventYear, city, input, now } = params;
  await DB.prepare(
    `INSERT INTO hosting_offers (
       id, user_id, event_year, city, spots, gender_preference,
       offers_meal, offers_shower, offers_transport, address, contact_phone,
       notes, status, created_at, updated_at
     ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, 'ATIVO', ?13, ?13)
     ON CONFLICT (user_id, event_year) DO UPDATE SET
       city = excluded.city,
       spots = excluded.spots,
       gender_preference = excluded.gender_preference,
       offers_meal = excluded.offers_meal,
       offers_shower = excluded.offers_shower,
       offers_transport = excluded.offers_transport,
       address = excluded.address,
       contact_phone = excluded.contact_phone,
       notes = excluded.notes,
       status = 'ATIVO',
       updated_at = excluded.updated_at`
  )
    .bind(
      id,
      userId,
      eventYear,
      city,
      input.spots,
      input.genderPreference,
      input.offersMeal ? 1 : 0,
      input.offersShower ? 1 : 0,
      input.offersTransport ? 1 : 0,
      input.address,
      input.contactPhone,
      input.notes || null,
      now
    )
    .run();
}

export async function cancelHostingOffer(
  DB: D1Database,
  userId: string,
  eventYear: number,
  now: number
): Promise<void> {
  await DB.prepare(
    `UPDATE hosting_offers SET status = 'CANCELADO', updated_at = ?3
      WHERE user_id = ?1 AND event_year = ?2`
  )
    .bind(userId, eventYear, now)
    .run();
}

export interface HostingOfferWithHost extends HostingOfferRow {
  host_name: string | null;
  host_email: string | null;
  host_phone: string | null;
}

/** A lista da organização: a oferta com o nome e o contato de quem recebe. */
export async function listHostingOffers(
  DB: D1Database,
  eventYear: number
): Promise<HostingOfferWithHost[]> {
  const result = await DB.prepare(
    `SELECT ${OFFER_COLUMNS.split(",")
      .map(column => `o.${column.trim()}`)
      .join(", ")},
            u.name AS host_name, u.email AS host_email, u.phone AS host_phone
       FROM hosting_offers o
       LEFT JOIN users u ON u.id = o.user_id
      WHERE o.event_year = ?1
      ORDER BY o.status ASC, o.created_at ASC`
  )
    .bind(eventYear)
    .all<HostingOfferWithHost>();
  return result.results ?? [];
}
