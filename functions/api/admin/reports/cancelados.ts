/// <reference types="@cloudflare/workers-types" />
import { AdminAuthEnv, authorizeAdminRequest } from "../../../_utils/adminAuth";
import { decryptCpf } from "../../../_utils/cpfCrypto";
import {
  compareByName,
  numberedDataRows,
  numberedHeaderRow,
} from "../../../_utils/reportRows";
import { CellInput, SheetSpec, xlsxResponse } from "../../../_utils/xlsx";

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

const STAFF_COLOR = "1D2C5E";
const ALERT_COLOR = "C62828";

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

  return xlsxResponse(buildCanceladosSheet(rowsWithCpf), "inscricoes-canceladas.xlsx");
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

function buildCanceladosSheet(
  rows: Array<CanceladoRow & { cpfDecrypted: string }>
): SheetSpec {
  const header = [
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
  const sorted = [...rows].sort((a, b) => compareByName(a.name, b.name));
  const dataRows: CellInput[][] = sorted.map(row => [
    row.registration_number ?? "",
    {
      value: row.is_staff === 1 ? "Sim" : "Não",
      style: row.is_staff === 1 ? { bold: true, color: STAFF_COLOR } : undefined,
    },
    row.name || "",
    row.email || "",
    row.cpfDecrypted || "",
    row.phone ?? "",
    row.city ?? "",
    row.state ?? "",
    formatDateTime(row.created_at),
    {
      value: row.paid_at ? "Sim" : "Não",
      style: row.paid_at ? { bold: true, color: ALERT_COLOR } : undefined,
    },
    formatDateTime(row.paid_at),
  ]);

  return {
    sheetName: "Cancelados",
    rows: [numberedHeaderRow(header), ...numberedDataRows(dataRows)],
  };
}
