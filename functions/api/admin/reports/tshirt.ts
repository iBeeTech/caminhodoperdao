/// <reference types="@cloudflare/workers-types" />
import { AdminAuthEnv, authorizeAdminRequest } from "../../../_utils/adminAuth";
import { decryptCpf } from "../../../_utils/cpfCrypto";
import { CellInput, CellValue, SheetSpec, xlsxResponse } from "../../../_utils/xlsx";

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
}

interface TshirtBuyerGroup {
  name: string;
  cpf: string;
  p: number;
  m: number;
  g: number;
  gg: number;
  quantity: number;
  amount: number;
}

const HEADER_FILL = "F0F0F0";
const TOTALS_FILL = "F0F0F0";

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
      amount_cents
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

  const groups = groupByBuyer(rowsWithCpf);
  return xlsxResponse(buildTshirtSheet(groups), "planilha-camisetas.xlsx");
};

// Junta todas as compras pagas de um mesmo comprador (mesmo CPF) numa unica
// linha, somando os tamanhos, o total e o valor.
function groupByBuyer(
  rows: Array<TshirtPurchaseReportRow & { cpfDecrypted: string }>
): TshirtBuyerGroup[] {
  const map = new Map<string, TshirtBuyerGroup>();

  for (const row of rows) {
    const key = row.cpf_encrypted || row.customer_name;
    const existing = map.get(key);

    if (existing) {
      existing.p += row.size_p_qty;
      existing.m += row.size_m_qty;
      existing.g += row.size_g_qty;
      existing.gg += row.size_gg_qty;
      existing.quantity += row.total_quantity;
      existing.amount += row.amount_cents;
      if (!existing.cpf && row.cpfDecrypted) existing.cpf = row.cpfDecrypted;
    } else {
      map.set(key, {
        name: row.customer_name,
        cpf: row.cpfDecrypted,
        p: row.size_p_qty,
        m: row.size_m_qty,
        g: row.size_g_qty,
        gg: row.size_gg_qty,
        quantity: row.total_quantity,
        amount: row.amount_cents,
      });
    }
  }

  return [...map.values()];
}

function formatCurrencyBRL(valueInCents: number): string {
  return `R$ ${(valueInCents / 100).toFixed(2).replace(".", ",")}`;
}

function buildTshirtSheet(groups: TshirtBuyerGroup[]): SheetSpec {
  const header = ["NOME", "CPF", "P", "M", "G", "GG", "TOTAL", "VALOR"];
  const headerRow: CellInput[] = header.map(value => ({
    value,
    style: { bold: true, fill: HEADER_FILL },
  }));

  const sorted = [...groups].sort((a, b) => a.name.localeCompare(b.name));

  const totals = sorted.reduce(
    (acc, group) => {
      acc.p += group.p;
      acc.m += group.m;
      acc.g += group.g;
      acc.gg += group.gg;
      acc.quantity += group.quantity;
      acc.amount += group.amount;
      return acc;
    },
    { p: 0, m: 0, g: 0, gg: 0, quantity: 0, amount: 0 }
  );

  const dataRows: CellInput[][] = sorted.map(group => [
    group.name || "",
    group.cpf || "",
    group.p,
    group.m,
    group.g,
    group.gg,
    group.quantity,
    formatCurrencyBRL(group.amount),
  ]);

  const sheetRows: CellInput[][] = [headerRow, ...dataRows];

  if (sorted.length) {
    const totalsCell = (value: CellValue): CellInput => ({
      value,
      style: { bold: true, fill: TOTALS_FILL },
    });
    sheetRows.push([
      totalsCell("TOTAIS"),
      totalsCell(""),
      totalsCell(totals.p),
      totalsCell(totals.m),
      totalsCell(totals.g),
      totalsCell(totals.gg),
      totalsCell(totals.quantity),
      totalsCell(formatCurrencyBRL(totals.amount)),
    ]);
  }

  return { sheetName: "Camisetas", rows: sheetRows };
}
