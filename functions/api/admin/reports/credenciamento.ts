/// <reference types="@cloudflare/workers-types" />
import { AdminAuthEnv, authorizeAdminRequest } from "../../../_utils/adminAuth";
import { decryptCpf } from "../../../_utils/cpfCrypto";

type Env = AdminAuthEnv & {
  DB: D1Database;
  CPF_ENCRYPTION_KEY?: string;
  CPF_ENCRYPTION_IV?: string;
};

interface Row {
  name: string;
  phone: string | null;
  cpf_encrypted: string | null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildSheet(headers: string[], rowsHtml: string): string {
  const header = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("");
  return [
    '﻿<html><head><meta charset="UTF-8"></head><body>',
    '<table border="1" cellspacing="0" cellpadding="6">',
    `<thead><tr>${header}</tr></thead>`,
    `<tbody>${rowsHtml}</tbody>`,
    "</table></body></html>",
  ].join("");
}

// Planilhas de Controle (credenciamento). ?tipo=peregrinos | staff | camisetas
// Listas de PAGOS com campo de assinatura em branco (para conferência presencial).
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const auth = await authorizeAdminRequest(context.request, context.env);
  if (auth instanceof Response) return auth;

  const tipo = new URL(context.request.url).searchParams.get("tipo") || "peregrinos";
  const key = context.env.CPF_ENCRYPTION_KEY;
  const iv = context.env.CPF_ENCRYPTION_IV;
  const canDecrypt = Boolean(key && iv);

  let query: string;
  let headers: string[];
  let filename: string;
  const withPhone = tipo !== "camisetas";

  if (tipo === "staff") {
    query = "SELECT name, phone, cpf_encrypted FROM registrations WHERE status='PAID' AND is_staff=1";
    headers = ["NOME", "TELEFONE", "CPF", "ASSINATURA"];
    filename = "credenciamento-staff.xls";
  } else if (tipo === "camisetas") {
    query = "SELECT customer_name AS name, NULL AS phone, cpf_encrypted FROM tshirt_purchase WHERE status='PAID'";
    headers = ["NOME", "CPF", "ASSINATURA"];
    filename = "retirada-camisetas.xls";
  } else {
    query = "SELECT name, phone, cpf_encrypted FROM registrations WHERE status='PAID' AND is_staff=0";
    headers = ["NOME", "TELEFONE", "CPF", "ASSINATURA"];
    filename = "credenciamento-peregrinos.xls";
  }

  const result = await context.env.DB.prepare(query).all<Row>();
  const rows = (result.results ?? []).slice();
  rows.sort((a, b) => (a.name || "").localeCompare(b.name || "", "pt-BR", { sensitivity: "base" }));

  const rowsHtml: string[] = [];
  for (const row of rows) {
    let cpf = "";
    if (row.cpf_encrypted && canDecrypt) {
      try {
        cpf = await decryptCpf(row.cpf_encrypted, key!, iv!);
      } catch {
        cpf = "";
      }
    }
    const name = escapeHtml(row.name || "");
    const cpfCell = escapeHtml(cpf);
    if (withPhone) {
      rowsHtml.push(
        `<tr><td>${name}</td><td>${escapeHtml(row.phone ?? "")}</td><td>${cpfCell}</td><td></td></tr>`
      );
    } else {
      rowsHtml.push(`<tr><td>${name}</td><td>${cpfCell}</td><td></td></tr>`);
    }
  }

  return new Response(buildSheet(headers, rowsHtml.join("")), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename=${filename}`,
    },
  });
};
