/// <reference types="@cloudflare/workers-types" />
import { AdminAuthEnv, authorizeAdminRequest } from "../../../_utils/adminAuth";
import { decryptCpf } from "../../../_utils/cpfCrypto";
import { CellInput, SheetSpec, xlsxResponse } from "../../../_utils/xlsx";

type Env = AdminAuthEnv & {
  DB: D1Database;
  CPF_ENCRYPTION_KEY?: string;
  CPF_ENCRYPTION_IV?: string;
};

interface Row {
  name: string;
  date_of_birth: string | null;
  email: string | null;
  phone: string | null;
  cpf_encrypted: string | null;
}

const HEADER_FILL = "F0F0F0";

function formatDateOfBirth(value: string | null): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return value ?? "";
  const [y, m, d] = value.split("-");
  return `${d}/${m}/${y}`;
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
  let sheetName: string;
  const withPhone = tipo !== "camisetas";

  if (tipo === "staff") {
    query = "SELECT name, date_of_birth, email, phone, cpf_encrypted FROM registrations WHERE status='PAID' AND is_staff=1";
    headers = ["NOME", "DATA NASC.", "EMAIL", "TELEFONE", "CPF", "ASSINATURA"];
    filename = "credenciamento-staff.xlsx";
    sheetName = "Staff";
  } else if (tipo === "camisetas") {
    query = "SELECT customer_name AS name, NULL AS date_of_birth, email, NULL AS phone, cpf_encrypted FROM tshirt_purchase WHERE status='PAID'";
    headers = ["NOME", "EMAIL", "CPF", "ASSINATURA"];
    filename = "retirada-camisetas.xlsx";
    sheetName = "Camisetas";
  } else {
    query = "SELECT name, date_of_birth, email, phone, cpf_encrypted FROM registrations WHERE status='PAID' AND is_staff=0";
    headers = ["NOME", "DATA NASC.", "EMAIL", "TELEFONE", "CPF", "ASSINATURA"];
    filename = "credenciamento-peregrinos.xlsx";
    sheetName = "Peregrinos";
  }

  const result = await context.env.DB.prepare(query).all<Row>();
  const rows = (result.results ?? []).slice();
  rows.sort((a, b) => (a.name || "").localeCompare(b.name || "", "pt-BR", { sensitivity: "base" }));

  const dataRows: CellInput[][] = [];
  for (const row of rows) {
    let cpf = "";
    if (row.cpf_encrypted && canDecrypt) {
      try {
        cpf = await decryptCpf(row.cpf_encrypted, key!, iv!);
      } catch {
        cpf = "";
      }
    }
    if (withPhone) {
      dataRows.push([
        row.name || "",
        formatDateOfBirth(row.date_of_birth),
        row.email ?? "",
        row.phone ?? "",
        cpf,
        "",
      ]);
    } else {
      dataRows.push([row.name || "", row.email ?? "", cpf, ""]);
    }
  }

  const headerRow: CellInput[] = headers.map(value => ({
    value,
    style: { bold: true, fill: HEADER_FILL },
  }));

  // Coluna de assinatura em branco fica mais larga para preenchimento à mão.
  const widths = headers.map(h => {
    if (h === "ASSINATURA") return 30;
    if (h === "EMAIL") return 32;
    if (h === "NOME") return 28;
    return Math.max(12, h.length + 4);
  });
  const sheet: SheetSpec = {
    sheetName,
    rows: [headerRow, ...dataRows],
    columnWidths: widths,
  };

  return xlsxResponse(sheet, filename);
};
