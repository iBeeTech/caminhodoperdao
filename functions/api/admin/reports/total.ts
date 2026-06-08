/// <reference types="@cloudflare/workers-types" />
import { AdminAuthEnv, authorizeAdminRequest } from "../../../_utils/adminAuth";
import { decryptCpf } from "../../../_utils/cpfCrypto";

type TotalEnv = AdminAuthEnv & { CPF_ENCRYPTION_KEY?: string; CPF_ENCRYPTION_IV?: string };

interface TotalRow {
  name: string;
  email: string;
  phone: string | null;
  registration_number: string | null;
  status: string;
  is_staff: number;
  sleep_at_monastery: number;
  companion_name: string | null;
  cep: string | null;
  address: string | null;
  number: string | null;
  complement: string | null;
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
  created_at: string | null;
  paid_at: string | null;
  amount_cents: number | null;
}

export const onRequestGet: PagesFunction<TotalEnv> = async context => {
  const authResult = await authorizeAdminRequest(context.request, context.env);
  if (authResult instanceof Response) {
    return authResult;
  }

  // Planilha total: TODAS as inscrições, independente do status
  // (PAGO, PENDENTE e CANCELADO), com todas as informações disponíveis.
  const query = `
    SELECT
      r.name,
      r.email,
      r.phone,
      r.registration_number,
      r.status,
      r.is_staff,
      r.sleep_at_monastery,
      r.companion_name,
      r.cep,
      r.address,
      r.number,
      r.complement,
      r.city,
      r.state,
      r.cpf_encrypted,
      r.date_of_birth,
      r.emergency_contact_name,
      r.emergency_contact_phone,
      r.has_allergy_medication,
      r.allergy_medication_details,
      r.has_dietary_restriction,
      r.dietary_restriction_details,
      r.created_at,
      r.paid_at,
      p.amount_cents AS amount_cents
    FROM registrations r
    LEFT JOIN payments p ON p.correlation_id = r.payment_ref
    ORDER BY r.status, r.name
  `;

  const results = await context.env.DB.prepare(query).all<TotalRow>();
  const rows = results.results ?? [];

  const key = context.env.CPF_ENCRYPTION_KEY;
  const iv = context.env.CPF_ENCRYPTION_IV;
  const canDecrypt = Boolean(key && iv);

  const rowsWithCpf: Array<TotalRow & { cpfDecrypted: string }> = [];
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

  const spreadsheet = buildTotalSpreadsheet(rowsWithCpf);
  return new Response(spreadsheet, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": "attachment; filename=planilha-total.xls",
    },
  });
};

function formatBRL(cents: number): string {
  const value = (cents / 100).toFixed(2).replace(".", ",");
  return `R$ ${value.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

function formatDateOfBirth(value: string | null): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return value ?? "";
  const [y, m, d] = value.split("-");
  return `${d}/${m}/${y}`;
}

function formatDateTime(value: string | null): string {
  if (!value) return "";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (match) {
    const [, y, m, d, h, min] = match;
    return `${d}/${m}/${y} ${h}:${min}`;
  }
  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const [, y, m, d] = dateOnly;
    return `${d}/${m}/${y}`;
  }
  return value;
}

function statusLabel(status: string): string {
  switch (status) {
    case "PAID":
      return "PAGO";
    case "PENDING":
      return "PENDENTE";
    case "CANCELED":
      return "CANCELADO";
    default:
      return status || "";
  }
}

function statusStyle(status: string): string {
  switch (status) {
    case "PAID":
      return " style=\"font-weight:700;color:#1f7a3d;\"";
    case "PENDING":
      return " style=\"font-weight:700;color:#b45309;\"";
    case "CANCELED":
      return " style=\"font-weight:700;color:#c62828;\"";
    default:
      return "";
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildTotalSpreadsheet(
  rows: Array<TotalRow & { cpfDecrypted: string }>
): string {
  const headerCells = [
    "Nº INSCRIÇÃO",
    "STATUS",
    "STAFF",
    "NOME",
    "EMAIL",
    "CPF",
    "DATA DE NASCIMENTO",
    "TELEFONE",
    "ACOMPANHANTE",
    "CONTATO EMERGÊNCIA (NOME)",
    "CONTATO EMERGÊNCIA (TELEFONE)",
    "DORME NO MOSTEIRO",
    "USA MEDICAÇÃO",
    "QUAL MEDICAÇÃO",
    "TEM RESTRIÇÃO ALIMENTAR",
    "QUAL RESTRIÇÃO ALIMENTAR",
    "CEP",
    "ENDEREÇO",
    "NÚMERO",
    "COMPLEMENTO",
    "CIDADE",
    "ESTADO",
    "DATA DA INSCRIÇÃO",
    "DATA DO PAGAMENTO",
    "VALOR",
  ];

  const header = headerCells.map(cell => `<th>${escapeHtml(cell)}</th>`).join("");

  if (!rows.length) {
    return [
      "﻿<html><head><meta charset=\"UTF-8\"></head><body>",
      "<table border=\"1\" cellspacing=\"0\" cellpadding=\"4\">",
      `<thead><tr>${header}</tr></thead>`,
      "<tbody></tbody>",
      "</table>",
      "<p style=\"font-size:12px;color:#555;margin-top:8px;\">Nenhuma inscrição encontrada.</p>",
      "</body></html>",
    ].join("");
  }

  let totalCents = 0;
  const rowsHtml = rows
    .map(row => {
      const registrationNumber = escapeHtml(row.registration_number ?? "");
      const status = escapeHtml(statusLabel(row.status));
      const isStaff = row.is_staff === 1 ? "Sim" : "Não";
      const name = escapeHtml(row.name || "");
      const email = escapeHtml(row.email || "");
      const cpf = escapeHtml(row.cpfDecrypted || "");
      const dateOfBirth = escapeHtml(formatDateOfBirth(row.date_of_birth));
      const phone = escapeHtml(row.phone ?? "");
      const companion = escapeHtml(row.companion_name ?? "");
      const emergencyName = escapeHtml(row.emergency_contact_name ?? "");
      const emergencyPhone = escapeHtml(row.emergency_contact_phone ?? "");
      const dorme = row.sleep_at_monastery === 1 ? "Sim" : "Não";
      const hasMedication = row.has_allergy_medication === 1 ? "Sim" : "Não";
      const medicationDetails = escapeHtml((row.allergy_medication_details ?? "").trim());
      const hasDietaryRestriction = row.has_dietary_restriction === 1 ? "Sim" : "Não";
      const dietaryDetails = escapeHtml((row.dietary_restriction_details ?? "").trim());
      const cep = escapeHtml(row.cep ?? "");
      const address = escapeHtml(row.address ?? "");
      const number = escapeHtml(row.number ?? "");
      const complement = escapeHtml(row.complement ?? "");
      const city = escapeHtml(row.city ?? "");
      const state = escapeHtml(row.state ?? "");
      const createdAt = escapeHtml(formatDateTime(row.created_at));
      const paidAt = escapeHtml(formatDateTime(row.paid_at));
      const amountCents = typeof row.amount_cents === "number" ? row.amount_cents : 0;
      // Soma apenas os pagamentos efetivamente concluídos.
      if (row.status === "PAID") totalCents += amountCents;
      const valor = amountCents > 0 ? escapeHtml(formatBRL(amountCents)) : "";

      const medicationCellStyle = medicationDetails
        ? " style=\"font-weight:700;color:#c62828;\""
        : "";
      const dietaryCellStyle = dietaryDetails
        ? " style=\"font-weight:700;color:#c62828;\""
        : "";
      const staffCellStyle = row.is_staff === 1
        ? " style=\"font-weight:700;color:#1d2c5e;\""
        : "";

      return [
        "<tr>",
        `<td>${registrationNumber}</td>`,
        `<td${statusStyle(row.status)}>${status}</td>`,
        `<td${staffCellStyle}>${isStaff}</td>`,
        `<td>${name}</td>`,
        `<td>${email}</td>`,
        `<td>${cpf}</td>`,
        `<td>${dateOfBirth}</td>`,
        `<td>${phone}</td>`,
        `<td>${companion}</td>`,
        `<td>${emergencyName}</td>`,
        `<td>${emergencyPhone}</td>`,
        `<td>${dorme}</td>`,
        `<td>${hasMedication}</td>`,
        `<td${medicationCellStyle}>${medicationDetails}</td>`,
        `<td>${hasDietaryRestriction}</td>`,
        `<td${dietaryCellStyle}>${dietaryDetails}</td>`,
        `<td>${cep}</td>`,
        `<td>${address}</td>`,
        `<td>${number}</td>`,
        `<td>${complement}</td>`,
        `<td>${city}</td>`,
        `<td>${state}</td>`,
        `<td>${createdAt}</td>`,
        `<td>${paidAt}</td>`,
        `<td>${valor}</td>`,
        "</tr>",
      ].join("");
    })
    .join("");

  const totalColspan = headerCells.length - 1;
  const totalRow = [
    "<tr>",
    `<td colspan="${totalColspan}" style="text-align:right;font-weight:700;">TOTAL PAGO</td>`,
    `<td style="font-weight:700;">${escapeHtml(formatBRL(totalCents))}</td>`,
    "</tr>",
  ].join("");

  return [
    "﻿<html><head><meta charset=\"UTF-8\"></head><body>",
    "<table border=\"1\" cellspacing=\"0\" cellpadding=\"4\">",
    `<thead><tr>${header}</tr></thead>`,
    `<tbody>${rowsHtml}${totalRow}</tbody>`,
    "</table>",
    "<p style=\"font-size:12px;color:#555;margin-top:8px;\">",
    "Todas as inscrições, incluindo PAGAS, PENDENTES e CANCELADAS. ",
    "O TOTAL considera apenas inscrições pagas.",
    "</p>",
    "</body></html>",
  ].join("");
}
