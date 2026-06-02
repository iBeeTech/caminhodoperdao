/// <reference types="@cloudflare/workers-types" />
import { AdminAuthEnv, authorizeAdminRequest } from "../../../_utils/adminAuth";
import { decryptCpf } from "../../../_utils/cpfCrypto";

type CanceladosEnv = AdminAuthEnv & { CPF_ENCRYPTION_KEY?: string; CPF_ENCRYPTION_IV?: string };

interface CanceladoRow {
  name: string;
  email: string;
  phone: string | null;
  registration_number: string | null;
  is_staff: number;
  city: string | null;
  state: string | null;
  cpf_encrypted: string | null;
  created_at: string | null;
  paid_at: string | null;
}

export const onRequestGet: PagesFunction<CanceladosEnv> = async context => {
  const authResult = await authorizeAdminRequest(context.request, context.env);
  if (authResult instanceof Response) {
    return authResult;
  }

  const query = `
    SELECT
      name,
      email,
      phone,
      registration_number,
      is_staff,
      city,
      state,
      cpf_encrypted,
      created_at,
      paid_at
    FROM registrations
    WHERE status = 'CANCELED'
    ORDER BY name
  `;

  const results = await context.env.DB.prepare(query).all<CanceladoRow>();
  const rows = results.results ?? [];

  const key = context.env.CPF_ENCRYPTION_KEY;
  const iv = context.env.CPF_ENCRYPTION_IV;
  const canDecrypt = Boolean(key && iv);

  const rowsWithCpf: Array<CanceladoRow & { cpfDecrypted: string }> = [];
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

  const spreadsheet = buildCanceladosSpreadsheet(rowsWithCpf);
  return new Response(spreadsheet, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": "attachment; filename=inscricoes-canceladas.xls",
    },
  });
};

function formatDateTime(value: string | null): string {
  if (!value) return "";
  // Formato esperado: "YYYY-MM-DD HH:MM:SS" (datetime do SQLite).
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (match) {
    const [, y, m, d, h, min] = match;
    return `${d}/${m}/${y} ${h}:${min}`;
  }
  // Apenas data (YYYY-MM-DD).
  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const [, y, m, d] = dateOnly;
    return `${d}/${m}/${y}`;
  }
  return value;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildCanceladosSpreadsheet(
  rows: Array<CanceladoRow & { cpfDecrypted: string }>
): string {
  const headerCells = [
    "Nº INSCRIÇÃO",
    "STAFF",
    "NOME",
    "EMAIL",
    "CPF",
    "TELEFONE",
    "CIDADE",
    "ESTADO",
    "DATA DA INSCRIÇÃO",
    "JÁ TINHA PAGO?",
    "DATA DO PAGAMENTO",
  ];

  const header = headerCells.map(cell => `<th>${escapeHtml(cell)}</th>`).join("");

  if (!rows.length) {
    return [
      "﻿<html><head><meta charset=\"UTF-8\"></head><body>",
      "<table border=\"1\" cellspacing=\"0\" cellpadding=\"4\">",
      `<thead><tr>${header}</tr></thead>`,
      "<tbody></tbody>",
      "</table>",
      "<p style=\"font-size:12px;color:#555;margin-top:8px;\">Nenhuma inscrição cancelada.</p>",
      "</body></html>",
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
      const phone = escapeHtml(row.phone ?? "");
      const city = escapeHtml(row.city ?? "");
      const state = escapeHtml(row.state ?? "");
      const createdAt = escapeHtml(formatDateTime(row.created_at));
      const wasPaid = row.paid_at ? "Sim" : "Não";
      const paidAt = escapeHtml(formatDateTime(row.paid_at));

      const staffStyle = row.is_staff === 1 ? " style=\"font-weight:700;color:#1d2c5e;\"" : "";
      const paidStyle = row.paid_at ? " style=\"font-weight:700;color:#c62828;\"" : "";

      return [
        "<tr>",
        `<td>${registrationNumber}</td>`,
        `<td${staffStyle}>${isStaff}</td>`,
        `<td>${name}</td>`,
        `<td>${email}</td>`,
        `<td>${cpf}</td>`,
        `<td>${phone}</td>`,
        `<td>${city}</td>`,
        `<td>${state}</td>`,
        `<td>${createdAt}</td>`,
        `<td${paidStyle}>${wasPaid}</td>`,
        `<td>${paidAt}</td>`,
        "</tr>",
      ].join("");
    })
    .join("");

  return [
    "﻿<html><head><meta charset=\"UTF-8\"></head><body>",
    "<table border=\"1\" cellspacing=\"0\" cellpadding=\"4\">",
    `<thead><tr>${header}</tr></thead>`,
    `<tbody>${rowsHtml}</tbody>`,
    "</table>",
    "<p style=\"font-size:12px;color:#555;margin-top:8px;\">",
    "Inscrições com status CANCELADO. \"JÁ TINHA PAGO? = Sim\" indica cancelamento após pagamento; ",
    "\"Não\" geralmente é PIX que expirou sem pagamento.",
    "</p>",
    "</body></html>",
  ].join("");
}
