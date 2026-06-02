/// <reference types="@cloudflare/workers-types" />
import {
  AdminAuthEnv,
  authorizeAdminRequest,
  getAdminDefaults,
} from "../../../_utils/adminAuth";
import { unauthorized } from "../../../_utils/responses";

interface RegistrationsAggRow {
  is_staff: number;
  qtd: number;
  total_cents: number;
}

interface TshirtAggRow {
  qtd_compras: number;
  unidades: number;
  total_cents: number;
}

export const onRequestGet: PagesFunction<AdminAuthEnv> = async context => {
  const authResult = await authorizeAdminRequest(context.request, context.env);
  if (authResult instanceof Response) {
    return authResult;
  }

  // Relatório financeiro consolidado: visível apenas para o admin geral.
  const superAdminEmail = getAdminDefaults(context.env).email;
  if (authResult.sub.toLowerCase() !== superAdminEmail) {
    return unauthorized("forbidden");
  }

  const registrationsAgg = await context.env.DB.prepare(
    `
      SELECT
        r.is_staff AS is_staff,
        COUNT(*) AS qtd,
        COALESCE(SUM(p.amount_cents), 0) AS total_cents
      FROM registrations r
      LEFT JOIN payments p ON p.correlation_id = r.payment_ref
      WHERE r.status = 'PAID'
      GROUP BY r.is_staff
    `
  ).all<RegistrationsAggRow>();

  const tshirtAgg = await context.env.DB.prepare(
    `
      SELECT
        COUNT(*) AS qtd_compras,
        COALESCE(SUM(total_quantity), 0) AS unidades,
        COALESCE(SUM(amount_cents), 0) AS total_cents
      FROM tshirt_purchase
      WHERE status = 'PAID'
    `
  ).first<TshirtAggRow>();

  const regRows = registrationsAgg.results ?? [];
  const peregrinos = regRows.find(row => row.is_staff === 0) ?? { qtd: 0, total_cents: 0, is_staff: 0 };
  const staff = regRows.find(row => row.is_staff === 1) ?? { qtd: 0, total_cents: 0, is_staff: 1 };
  const tshirt = tshirtAgg ?? { qtd_compras: 0, unidades: 0, total_cents: 0 };

  const spreadsheet = buildVendasSpreadsheet({
    peregrinosQtd: peregrinos.qtd,
    peregrinosCents: peregrinos.total_cents,
    staffQtd: staff.qtd,
    staffCents: staff.total_cents,
    tshirtCompras: tshirt.qtd_compras,
    tshirtUnidades: tshirt.unidades,
    tshirtCents: tshirt.total_cents,
  });

  return new Response(spreadsheet, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": "attachment; filename=vendas-totais.xls",
    },
  });
};

function formatBRL(cents: number): string {
  const value = (cents / 100).toFixed(2).replace(".", ",");
  return `R$ ${value.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface VendasTotais {
  peregrinosQtd: number;
  peregrinosCents: number;
  staffQtd: number;
  staffCents: number;
  tshirtCompras: number;
  tshirtUnidades: number;
  tshirtCents: number;
}

function buildVendasSpreadsheet(t: VendasTotais): string {
  const inscricoesQtd = t.peregrinosQtd + t.staffQtd;
  const inscricoesCents = t.peregrinosCents + t.staffCents;
  const totalGeralCents = inscricoesCents + t.tshirtCents;

  const dataRow = (categoria: string, qtd: string, valorCents: number, bold = false) => {
    const style = bold ? ' style="font-weight:700;"' : "";
    return [
      "<tr>",
      `<td${style}>${escapeHtml(categoria)}</td>`,
      `<td${style} style="text-align:center;">${escapeHtml(qtd)}</td>`,
      `<td${style}>${escapeHtml(formatBRL(valorCents))}</td>`,
      "</tr>",
    ].join("");
  };

  const header = ["CATEGORIA", "QUANTIDADE", "VALOR RECEBIDO"]
    .map(cell => `<th>${escapeHtml(cell)}</th>`)
    .join("");

  const body = [
    dataRow("Inscrições — Peregrinos (pagas)", String(t.peregrinosQtd), t.peregrinosCents),
    dataRow("Inscrições — Staff (pagas)", String(t.staffQtd), t.staffCents),
    dataRow("Inscrições — Subtotal", String(inscricoesQtd), inscricoesCents, true),
    dataRow(
      "Camisetas — compras pagas",
      `${t.tshirtCompras} compra(s) / ${t.tshirtUnidades} unid.`,
      t.tshirtCents
    ),
    dataRow("TOTAL GERAL (site)", "", totalGeralCents, true),
  ].join("");

  return [
    "﻿<html><head><meta charset=\"UTF-8\"></head><body>",
    "<table border=\"1\" cellspacing=\"0\" cellpadding=\"6\">",
    `<thead><tr>${header}</tr></thead>`,
    `<tbody>${body}</tbody>`,
    "</table>",
    "<p style=\"font-size:12px;color:#555;margin-top:8px;\">",
    "Valores conforme registros marcados como PAGOS no site. ",
    "Compare o TOTAL GERAL com o valor recebido no painel da Woovi para conciliação.",
    "</p>",
    "</body></html>",
  ].join("");
}
