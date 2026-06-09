/// <reference types="@cloudflare/workers-types" />
import { AdminAuthEnv, authorizeAdminRequest } from "../../../_utils/adminAuth";
import { decryptCpf } from "../../../_utils/cpfCrypto";
import { listWaitlist, WaitlistEntry } from "../../../_utils/waitlist";

type ListaEsperaEnv = AdminAuthEnv & {
  CPF_ENCRYPTION_KEY?: string;
  CPF_ENCRYPTION_IV?: string;
};

// GET /api/admin/reports/lista-espera -> planilha da fila, em ordem de entrada.
export const onRequestGet: PagesFunction<ListaEsperaEnv> = async (context) => {
  const authResult = await authorizeAdminRequest(context.request, context.env);
  if (authResult instanceof Response) {
    return authResult;
  }

  const entries = await listWaitlist(context.env.DB);

  const key = context.env.CPF_ENCRYPTION_KEY;
  const iv = context.env.CPF_ENCRYPTION_IV;
  const canDecrypt = Boolean(key && iv);

  const rows: Array<WaitlistEntry & { cpfDecrypted: string }> = [];
  for (const entry of entries) {
    let cpfDecrypted = "";
    if (entry.cpf_encrypted && canDecrypt) {
      try {
        cpfDecrypted = await decryptCpf(entry.cpf_encrypted, key!, iv!);
      } catch {
        cpfDecrypted = "";
      }
    }
    rows.push({ ...entry, cpfDecrypted });
  }

  return new Response(buildSpreadsheet(rows), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": "attachment; filename=lista-espera.xls",
    },
  });
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Datas do SQLite vêm em UTC ("YYYY-MM-DD HH:MM:SS"); exibe como DD/MM/YYYY HH:MM.
function formatDateTime(value: string | null): string {
  if (!value) return "";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (!match) return value;
  const [, y, m, d, hh, mm] = match;
  return `${d}/${m}/${y} ${hh}:${mm}`;
}

function buildSpreadsheet(rows: Array<WaitlistEntry & { cpfDecrypted: string }>): string {
  const headerCells = ["POSIÇÃO", "NOME", "CPF", "WHATSAPP", "ENTROU EM", "AVISADO", "AVISADO EM"];
  const header = headerCells.map(cell => `<th>${escapeHtml(cell)}</th>`).join("");

  const rowsHtml = rows
    .map((row, index) => {
      const notified = row.notified_at ? "Sim" : "Não";
      const notifiedStyle = row.notified_at
        ? " style=\"font-weight:700;color:#15803d;\""
        : "";
      return [
        "<tr>",
        `<td>${index + 1}</td>`,
        `<td>${escapeHtml(row.name || "")}</td>`,
        `<td>${escapeHtml(row.cpfDecrypted || "")}</td>`,
        `<td>${escapeHtml(row.phone || "")}</td>`,
        `<td>${escapeHtml(formatDateTime(row.created_at))}</td>`,
        `<td${notifiedStyle}>${notified}</td>`,
        `<td>${escapeHtml(formatDateTime(row.notified_at))}</td>`,
        "</tr>",
      ].join("");
    })
    .join("");

  return [
    "﻿<html><head><meta charset=\"UTF-8\"></head><body>",
    "<table border=\"1\" cellspacing=\"0\" cellpadding=\"4\">",
    `<thead><tr>${header}</tr></thead>`,
    `<tbody>${rowsHtml}</tbody>`,
    "</table></body></html>",
  ].join("");
}
