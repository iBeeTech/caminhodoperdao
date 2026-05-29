/// <reference types="@cloudflare/workers-types" />
import { AdminAuthEnv, authorizeAdminRequest } from "../../../_utils/adminAuth";
import { decryptCpf } from "../../../_utils/cpfCrypto";

type InscritosEnv = AdminAuthEnv & { CPF_ENCRYPTION_KEY?: string; CPF_ENCRYPTION_IV?: string };

interface InscritoRow {
  name: string;
  email: string;
  phone: string | null;
  registration_number: string | null;
  is_staff: number;
  sleep_at_monastery: number;
  city: string | null;
  state: string | null;
  cpf_encrypted: string | null;
  date_of_birth: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  has_allergy_medication: number;
  allergy_medication_details: string | null;
  has_dietary_restriction: number;
  dietary_restriction_details: string | null;
}

// Converte um parâmetro de query (0/1) em filtro opcional. Retorna undefined quando ausente.
function parseFlag(value: string | null): 0 | 1 | undefined {
  if (value === "0") return 0;
  if (value === "1") return 1;
  return undefined;
}

function buildFilename(staff: 0 | 1 | undefined, sleep: 0 | 1 | undefined): string {
  const grupo = staff === 1 ? "staff" : staff === 0 ? "peregrinos" : "inscritos";
  const local = sleep === 1 ? "mosteiro" : sleep === 0 ? "geral" : "todos";
  return `${grupo}-${local}.xls`;
}

export const onRequestGet: PagesFunction<InscritosEnv> = async context => {
  const authResult = await authorizeAdminRequest(context.request, context.env);
  if (authResult instanceof Response) {
    return authResult;
  }

  const url = new URL(context.request.url);
  const staffFilter = parseFlag(url.searchParams.get("staff"));
  const sleepFilter = parseFlag(url.searchParams.get("sleep"));

  const conditions = ["status = 'PAID'"];
  const bindings: number[] = [];
  if (staffFilter !== undefined) {
    conditions.push("is_staff = ?");
    bindings.push(staffFilter);
  }
  if (sleepFilter !== undefined) {
    conditions.push("sleep_at_monastery = ?");
    bindings.push(sleepFilter);
  }

  const query = `
    SELECT
      name,
      email,
      phone,
      registration_number,
      is_staff,
      sleep_at_monastery,
      city,
      state,
      cpf_encrypted,
      date_of_birth,
      emergency_contact_name,
      emergency_contact_phone,
      has_allergy_medication,
      allergy_medication_details,
      has_dietary_restriction,
      dietary_restriction_details
    FROM registrations
    WHERE ${conditions.join(" AND ")}
    ORDER BY name
  `;

  const results = await context.env.DB.prepare(query)
    .bind(...bindings)
    .all<InscritoRow>();
  const rows = results.results ?? [];

  const key = context.env.CPF_ENCRYPTION_KEY;
  const iv = context.env.CPF_ENCRYPTION_IV;
  const canDecrypt = Boolean(key && iv);

  const rowsWithCpf: Array<InscritoRow & { cpfDecrypted: string }> = [];
  for (const row of rows) {
    let cpfDecrypted = "";
    if (row.cpf_encrypted && canDecrypt) {
      try {
        cpfDecrypted = await decryptCpf(row.cpf_encrypted, key!, iv!);
      } catch {
        cpfDecrypted = "";
      }
    }
    rowsWithCpf.push({ ...row, cpfDecrypted });
  }

  const spreadsheet = buildInscritosSpreadsheet(rowsWithCpf);
  return new Response(spreadsheet, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename=${buildFilename(staffFilter, sleepFilter)}`,
    },
  });
};

function formatDateOfBirth(value: string | null): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return value ?? "";
  const [y, m, d] = value.split("-");
  return `${d}/${m}/${y}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildInscritosSpreadsheet(
  rows: Array<InscritoRow & { cpfDecrypted: string }>
): string {
  const headerCells = [
    "Nº INSCRIÇÃO",
    "STAFF",
    "NOME",
    "EMAIL",
    "CPF",
    "DATA DE NASCIMENTO",
    "TELEFONE",
    "CONTATO EMERGÊNCIA (NOME)",
    "CONTATO EMERGÊNCIA (TELEFONE)",
    "DORME NO MOSTEIRO",
    "USA MEDICAÇÃO",
    "QUAL MEDICAÇÃO",
    "TEM RESTRIÇÃO ALIMENTAR",
    "QUAL RESTRIÇÃO ALIMENTAR",
    "CIDADE",
    "ESTADO",
    "ASSINATURA RECEBIMENTO KIT",
  ];

  const header = headerCells
    .map(cell => `<th>${escapeHtml(cell)}</th>`)
    .join("");

  if (!rows.length) {
    return [
      "\uFEFF<html><head><meta charset=\"UTF-8\"></head><body>",
      "<table border=\"1\" cellspacing=\"0\" cellpadding=\"4\">",
      `<thead><tr>${header}</tr></thead>`,
      "<tbody></tbody>",
      "</table></body></html>",
    ].join("");
  }

  const sorted = [...rows].sort((a, b) => a.name.localeCompare(b.name));
  const rowsHtml = sorted
    .map(row => {
      const registrationNumber = escapeHtml(row.registration_number ?? "");
      const isStaff = row.is_staff === 1 ? "Sim" : "Não";
      const name = escapeHtml(row.name || "");
      const email = escapeHtml(row.email || "");
      const cpf = escapeHtml(row.cpfDecrypted || "");
      const dateOfBirth = escapeHtml(formatDateOfBirth(row.date_of_birth));
      const phone = escapeHtml(row.phone ?? "");
      const emergencyName = escapeHtml(row.emergency_contact_name ?? "");
      const emergencyPhone = escapeHtml(row.emergency_contact_phone ?? "");
      const dorme = row.sleep_at_monastery === 1 ? "Sim" : "Não";
      const hasMedication = row.has_allergy_medication === 1 ? "Sim" : "Não";
      const medicationDetails = escapeHtml((row.allergy_medication_details ?? "").trim());
      const hasDietaryRestriction = row.has_dietary_restriction === 1 ? "Sim" : "Não";
      const dietaryDetails = escapeHtml((row.dietary_restriction_details ?? "").trim());
      const city = escapeHtml(row.city ?? "");
      const state = escapeHtml(row.state ?? "");

      const medicationStyle = medicationDetails
        ? " style=\"font-weight:700;color:#c62828;\""
        : "";
      const dietaryStyle = dietaryDetails
        ? " style=\"font-weight:700;color:#c62828;\""
        : "";

      const staffStyle = row.is_staff === 1
        ? " style=\"font-weight:700;color:#1d2c5e;\""
        : "";

      return [
        "<tr>",
        `<td>${registrationNumber}</td>`,
        `<td${staffStyle}>${isStaff}</td>`,
        `<td>${name}</td>`,
        `<td>${email}</td>`,
        `<td>${cpf}</td>`,
        `<td>${dateOfBirth}</td>`,
        `<td>${phone}</td>`,
        `<td>${emergencyName}</td>`,
        `<td>${emergencyPhone}</td>`,
        `<td>${dorme}</td>`,
        `<td>${hasMedication}</td>`,
        `<td${medicationStyle}>${medicationDetails}</td>`,
        `<td>${hasDietaryRestriction}</td>`,
        `<td${dietaryStyle}>${dietaryDetails}</td>`,
        `<td>${city}</td>`,
        `<td>${state}</td>`,
        "<td></td>",
        "</tr>",
      ].join("");
    })
    .join("");

  return [
    "\uFEFF<html><head><meta charset=\"UTF-8\"></head><body>",
    "<table border=\"1\" cellspacing=\"0\" cellpadding=\"4\">",
    `<thead><tr>${header}</tr></thead>`,
    `<tbody>${rowsHtml}</tbody>`,
    "</table></body></html>",
  ].join("");
}

