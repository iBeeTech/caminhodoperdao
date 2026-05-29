/// <reference types="@cloudflare/workers-types" />
import { AdminAuthEnv, authorizeAdminRequest } from "../../../_utils/adminAuth";
import { decryptCpf } from "../../../_utils/cpfCrypto";

type TshirtReportEnv = AdminAuthEnv & {
  CPF_ENCRYPTION_KEY?: string;
  CPF_ENCRYPTION_IV?: string;
};

interface TshirtPurchaseReportRow {
  customer_name: string;
  cpf_encrypted: string | null;
  size_p_qty: number;
  size_m_qty: number;
  size_g_qty: number;
  size_gg_qty: number;
  total_quantity: number;
  amount_cents: number;
  created_at: string;
  paid_at: string | null;
}

export const onRequestGet: PagesFunction<TshirtReportEnv> = async context => {
  const authResult = await authorizeAdminRequest(context.request, context.env);
  if (authResult instanceof Response) {
    return authResult;
  }

  const query = `
    SELECT
      customer_name,
      cpf_encrypted,
      size_p_qty,
      size_m_qty,
      size_g_qty,
      size_gg_qty,
      total_quantity,
      amount_cents,
      created_at,
      paid_at
    FROM tshirt_purchase
    WHERE status = 'PAID'
    ORDER BY customer_name
  `;

  const results = await context.env.DB.prepare(query).all<TshirtPurchaseReportRow>();
  const rows = results.results ?? [];

  const key = context.env.CPF_ENCRYPTION_KEY;
  const iv = context.env.CPF_ENCRYPTION_IV;
  const canDecrypt = Boolean(key && iv);

  const rowsWithCpf: Array<TshirtPurchaseReportRow & { cpfDecrypted: string }> = [];
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

  const spreadsheet = buildTshirtSpreadsheet(rowsWithCpf);
  return new Response(spreadsheet, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": "attachment; filename=planilha-camisetas.xls",
    },
  });
};

function formatDateBR(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

function formatCurrencyBRL(valueInCents: number): string {
  return `R$ ${(valueInCents / 100).toFixed(2).replace(".", ",")}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildTshirtSpreadsheet(
  rows: Array<TshirtPurchaseReportRow & { cpfDecrypted: string }>
): string {
  const headerCells = [
    "NOME",
    "CPF",
    "P",
    "M",
    "G",
    "GG",
    "TOTAL",
    "VALOR",
    "DATA DA COMPRA",
    "DATA DO PAGAMENTO",
  ];

  const header = headerCells
    .map(cell => `<th>${escapeHtml(cell)}</th>`)
    .join("");

  const sorted = [...rows].sort((a, b) => a.customer_name.localeCompare(b.customer_name));

  const totals = sorted.reduce(
    (acc, row) => {
      acc.p += row.size_p_qty;
      acc.m += row.size_m_qty;
      acc.g += row.size_g_qty;
      acc.gg += row.size_gg_qty;
      acc.quantity += row.total_quantity;
      acc.amount += row.amount_cents;
      return acc;
    },
    { p: 0, m: 0, g: 0, gg: 0, quantity: 0, amount: 0 }
  );

  const rowsHtml = sorted
    .map(row => {
      const name = escapeHtml(row.customer_name || "");
      const cpf = escapeHtml(row.cpfDecrypted || "");
      return [
        "<tr>",
        `<td>${name}</td>`,
        `<td>${cpf}</td>`,
        `<td>${row.size_p_qty}</td>`,
        `<td>${row.size_m_qty}</td>`,
        `<td>${row.size_g_qty}</td>`,
        `<td>${row.size_gg_qty}</td>`,
        `<td>${row.total_quantity}</td>`,
        `<td>${escapeHtml(formatCurrencyBRL(row.amount_cents))}</td>`,
        `<td>${escapeHtml(formatDateBR(row.created_at))}</td>`,
        `<td>${escapeHtml(formatDateBR(row.paid_at))}</td>`,
        "</tr>",
      ].join("");
    })
    .join("");

  const totalsRow = [
    "<tr style=\"font-weight:700;background:#f0f0f0;\">",
    "<td>TOTAIS</td>",
    "<td></td>",
    `<td>${totals.p}</td>`,
    `<td>${totals.m}</td>`,
    `<td>${totals.g}</td>`,
    `<td>${totals.gg}</td>`,
    `<td>${totals.quantity}</td>`,
    `<td>${escapeHtml(formatCurrencyBRL(totals.amount))}</td>`,
    "<td></td>",
    "<td></td>",
    "</tr>",
  ].join("");

  return [
    "﻿<html><head><meta charset=\"UTF-8\"></head><body>",
    "<table border=\"1\" cellspacing=\"0\" cellpadding=\"4\">",
    `<thead><tr>${header}</tr></thead>`,
    `<tbody>${rowsHtml}${sorted.length ? totalsRow : ""}</tbody>`,
    "</table></body></html>",
  ].join("");
}
