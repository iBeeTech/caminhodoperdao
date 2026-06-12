/// <reference types="@cloudflare/workers-types" />
import { AdminAuthEnv, authorizeAdminRequest } from "../../../_utils/adminAuth";
import { decryptCpf } from "../../../_utils/cpfCrypto";
import { listWaitlist, WaitlistEntry } from "../../../_utils/waitlist";
import { CellInput, SheetSpec, xlsxResponse } from "../../../_utils/xlsx";

type ListaEsperaEnv = AdminAuthEnv & {
  CPF_ENCRYPTION_KEY?: string;
  CPF_ENCRYPTION_IV?: string;
};

const HEADER_FILL = "F0F0F0";
const NOTIFIED_COLOR = "15803D";

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

  return xlsxResponse(buildSheet(rows), "lista-espera.xlsx");
};

// Datas do SQLite vêm em UTC ("YYYY-MM-DD HH:MM:SS"); exibe como DD/MM/YYYY HH:MM.
function formatDateTime(value: string | null): string {
  if (!value) return "";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (!match) return value;
  const [, y, m, d, hh, mm] = match;
  return `${d}/${m}/${y} ${hh}:${mm}`;
}

function buildSheet(
  rows: Array<WaitlistEntry & { cpfDecrypted: string }>
): SheetSpec {
  const header = ["POSIÇÃO", "NOME", "CPF", "WHATSAPP", "ENTROU EM", "AVISADO", "AVISADO EM"];
  const headerRow: CellInput[] = header.map(value => ({
    value,
    style: { bold: true, fill: HEADER_FILL },
  }));

  const dataRows: CellInput[][] = rows.map((row, index) => [
    index + 1,
    row.name || "",
    row.cpfDecrypted || "",
    row.phone || "",
    formatDateTime(row.created_at),
    {
      value: row.notified_at ? "Sim" : "Não",
      style: row.notified_at ? { bold: true, color: NOTIFIED_COLOR } : undefined,
    },
    formatDateTime(row.notified_at),
  ]);

  return { sheetName: "Lista de espera", rows: [headerRow, ...dataRows] };
}
