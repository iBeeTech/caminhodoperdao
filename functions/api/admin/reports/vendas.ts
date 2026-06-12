/// <reference types="@cloudflare/workers-types" />
import {
  AdminAuthEnv,
  authorizeAdminRequest,
  getAdminDefaults,
} from "../../../_utils/adminAuth";
import { unauthorized } from "../../../_utils/responses";
import { CellInput, SheetSpec, xlsxResponse } from "../../../_utils/xlsx";

// Parâmetros financeiros padrão (em reais). Podem ser sobrescritos via query string,
// ex.: /api/admin/reports/vendas?retiradas=30000&saldoInicial=1.60&taxa=0.85
const DEFAULT_FEE_PER_RECEIPT_REAIS = 0.85; // taxa fixa da Woovi por recebimento
const DEFAULT_STARTING_BALANCE_REAIS = 1.6; // saldo inicial da conta Woovi
const DEFAULT_WITHDRAWALS_REAIS = 25000; // total já retirado para a conta bancária

const TITLE_COLOR = "1D2C5E";
const HEADER_FILL = "F0F0F0";
const NOTE_COLOR = "555555";

interface RegistrationsAggRow {
  is_staff: number;
  qtd: number;
  receipts: number;
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
        SUM(CASE WHEN p.amount_cents IS NOT NULL THEN 1 ELSE 0 END) AS receipts,
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
  const peregrinos =
    regRows.find(row => row.is_staff === 0) ?? { qtd: 0, receipts: 0, total_cents: 0, is_staff: 0 };
  const staff =
    regRows.find(row => row.is_staff === 1) ?? { qtd: 0, receipts: 0, total_cents: 0, is_staff: 1 };
  const tshirt = tshirtAgg ?? { qtd_compras: 0, unidades: 0, total_cents: 0 };

  // Parâmetros financeiros (reais → centavos), com defaults sobrescritíveis por query string.
  const url = new URL(context.request.url);
  const feePerReceiptCents = reaisParamToCents(
    url.searchParams.get("taxa"),
    DEFAULT_FEE_PER_RECEIPT_REAIS
  );
  const startingBalanceCents = reaisParamToCents(
    url.searchParams.get("saldoInicial"),
    DEFAULT_STARTING_BALANCE_REAIS
  );
  const withdrawalsCents = reaisParamToCents(
    url.searchParams.get("retiradas"),
    DEFAULT_WITHDRAWALS_REAIS
  );

  // Nº de recebimentos efetivos na Woovi (cada cobrança paga gera 1 taxa).
  const receiptsCount = peregrinos.receipts + staff.receipts + tshirt.qtd_compras;

  const sheet = buildVendasSheet({
    peregrinosQtd: peregrinos.qtd,
    peregrinosCents: peregrinos.total_cents,
    staffQtd: staff.qtd,
    staffCents: staff.total_cents,
    tshirtCompras: tshirt.qtd_compras,
    tshirtUnidades: tshirt.unidades,
    tshirtCents: tshirt.total_cents,
    receiptsCount,
    feePerReceiptCents,
    startingBalanceCents,
    withdrawalsCents,
  });

  return xlsxResponse(sheet, "vendas-totais.xlsx");
};

function formatBRL(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const value = (abs / 100).toFixed(2).replace(".", ",");
  return `${sign}R$ ${value.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

// Converte um parâmetro em reais (ex.: "25000" ou "1,60") para centavos.
// Retorna o default (em reais → centavos) quando ausente ou inválido.
function reaisParamToCents(raw: string | null, defaultReais: number): number {
  if (raw !== null && raw.trim() !== "") {
    const parsed = Number(raw.replace(",", "."));
    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.round(parsed * 100);
    }
  }
  return Math.round(defaultReais * 100);
}

interface VendasTotais {
  peregrinosQtd: number;
  peregrinosCents: number;
  staffQtd: number;
  staffCents: number;
  tshirtCompras: number;
  tshirtUnidades: number;
  tshirtCents: number;
  receiptsCount: number;
  feePerReceiptCents: number;
  startingBalanceCents: number;
  withdrawalsCents: number;
}

function buildVendasSheet(t: VendasTotais): SheetSpec {
  const inscricoesQtd = t.peregrinosQtd + t.staffQtd;
  const inscricoesCents = t.peregrinosCents + t.staffCents;
  const totalGeralCents = inscricoesCents + t.tshirtCents;

  const dataRow = (
    categoria: string,
    qtd: string,
    valorCents: number,
    bold = false
  ): CellInput[] => [
    { value: categoria, style: bold ? { bold: true } : undefined },
    { value: qtd, style: { bold, align: "center" } },
    { value: formatBRL(valorCents), style: bold ? { bold: true } : undefined },
  ];

  const titleRow = (text: string): CellInput[] => [
    { value: text, style: { bold: true, color: TITLE_COLOR } },
    "",
    "",
  ];

  const headerRow = (cells: string[]): CellInput[] =>
    cells.map(value => ({ value, style: { bold: true, fill: HEADER_FILL } }));

  const noteRow = (text: string): CellInput[] => [
    { value: text, style: { color: NOTE_COLOR } },
    "",
    "",
  ];

  // --- Conciliação do saldo Woovi ---
  const feeTotalCents = t.receiptsCount * t.feePerReceiptCents;
  const saldoLiquidoCents =
    totalGeralCents + t.startingBalanceCents - feeTotalCents - t.withdrawalsCents;

  const rows: CellInput[][] = [
    titleRow("Vendas (valores brutos)"),
    headerRow(["CATEGORIA", "QUANTIDADE", "VALOR RECEBIDO"]),
    dataRow("Inscrições — Peregrinos (pagas)", String(t.peregrinosQtd), t.peregrinosCents),
    dataRow("Inscrições — Staff (pagas)", String(t.staffQtd), t.staffCents),
    dataRow("Inscrições — Subtotal", String(inscricoesQtd), inscricoesCents, true),
    dataRow(
      "Camisetas — compras pagas",
      `${t.tshirtCompras} compra(s) / ${t.tshirtUnidades} unid.`,
      t.tshirtCents
    ),
    dataRow("TOTAL BRUTO RECEBIDO (site)", "", totalGeralCents, true),
    ["", "", ""],
    titleRow("Conciliação do saldo Woovi"),
    headerRow(["MOVIMENTO", "DETALHE", "VALOR"]),
    dataRow("(+) Total bruto recebido (site)", "", totalGeralCents),
    dataRow("(+) Saldo inicial", "", t.startingBalanceCents),
    dataRow(
      "(−) Taxa Woovi por recebimento",
      `${t.receiptsCount} × ${formatBRL(t.feePerReceiptCents)}`,
      -feeTotalCents
    ),
    dataRow("(−) Retiradas para conta bancária", "", -t.withdrawalsCents),
    dataRow("(=) SALDO LÍQUIDO ESTIMADO NA WOOVI", "", saldoLiquidoCents, true),
    ["", "", ""],
    noteRow("Valores conforme registros marcados como PAGOS no site."),
    noteRow(
      `Taxa de ${formatBRL(t.feePerReceiptCents)} aplicada a cada um dos ${t.receiptsCount} recebimentos.`
    ),
    noteRow(
      "O SALDO LÍQUIDO ESTIMADO deve bater com o saldo atual disponível no painel da Woovi."
    ),
  ];

  return {
    sheetName: "Vendas",
    rows,
    columnWidths: [42, 26, 18],
  };
}
