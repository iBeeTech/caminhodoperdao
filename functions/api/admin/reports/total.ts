/// <reference types="@cloudflare/workers-types" />
import { AdminAuthEnv, authorizeAdminRequest } from "../../../_utils/adminAuth";
import { decryptCpf } from "../../../_utils/cpfCrypto";
import { formatGender } from "../../../_utils/registrations";
import { CellInput, CellStyle, SheetSpec, xlsxResponse } from "../../../_utils/xlsx";

type TotalEnv = AdminAuthEnv & { CPF_ENCRYPTION_KEY?: string; CPF_ENCRYPTION_IV?: string };

interface TotalRow {
  name: string;
  email: string;
  phone: string | null;
  registration_number: string | null;
  status: string;
  is_staff: number;
  sleep_at_monastery: number;
  companion_name: string | null;
  cep: string | null;
  address: string | null;
  number: string | null;
  complement: string | null;
  city: string | null;
  state: string | null;
  cpf_encrypted: string | null;
  gender: string | null;
  date_of_birth: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  has_allergy_medication: number;
  allergy_medication_details: string | null;
  has_dietary_restriction: number;
  dietary_restriction_details: string | null;
  created_at: string | null;
  paid_at: string | null;
  amount_cents: number | null;
}

const HEADER_FILL = "F0F0F0";
const STAFF_COLOR = "1D2C5E";
const ALERT_COLOR = "C62828";
const PAID_COLOR = "1F7A3D";
const PENDING_COLOR = "B45309";
const CANCELED_COLOR = "C62828";

export const onRequestGet: PagesFunction<TotalEnv> = async context => {
  const authResult = await authorizeAdminRequest(context.request, context.env);
  if (authResult instanceof Response) {
    return authResult;
  }

  // Planilha total: TODAS as inscrições, independente do status
  // (PAGO, PENDENTE e CANCELADO), com todas as informações disponíveis.
  const query = `
    SELECT
      r.name,
      r.email,
      r.phone,
      r.registration_number,
      r.status,
      r.is_staff,
      r.sleep_at_monastery,
      r.companion_name,
      r.cep,
      r.address,
      r.number,
      r.complement,
      r.city,
      r.state,
      r.cpf_encrypted,
      r.gender,
      r.date_of_birth,
      r.emergency_contact_name,
      r.emergency_contact_phone,
      r.has_allergy_medication,
      r.allergy_medication_details,
      r.has_dietary_restriction,
      r.dietary_restriction_details,
      r.created_at,
      r.paid_at,
      p.amount_cents AS amount_cents
    FROM registrations r
    LEFT JOIN payments p ON p.correlation_id = r.payment_ref
    ORDER BY r.status, r.name
  `;

  const results = await context.env.DB.prepare(query).all<TotalRow>();
  const rows = results.results ?? [];

  const key = context.env.CPF_ENCRYPTION_KEY;
  const iv = context.env.CPF_ENCRYPTION_IV;
  const canDecrypt = Boolean(key && iv);

  const rowsWithCpf: Array<TotalRow & { cpfDecrypted: string }> = [];
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

  return xlsxResponse(buildTotalSheet(rowsWithCpf), "planilha-total.xlsx");
};

function formatBRL(cents: number): string {
  const value = (cents / 100).toFixed(2).replace(".", ",");
  return `R$ ${value.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

function formatDateOfBirth(value: string | null): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return value ?? "";
  const [y, m, d] = value.split("-");
  return `${d}/${m}/${y}`;
}

function formatDateTime(value: string | null): string {
  if (!value) return "";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (match) {
    const [, y, m, d, h, min] = match;
    return `${d}/${m}/${y} ${h}:${min}`;
  }
  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const [, y, m, d] = dateOnly;
    return `${d}/${m}/${y}`;
  }
  return value;
}

function statusLabel(status: string): string {
  switch (status) {
    case "PAID":
      return "PAGO";
    case "PENDING":
      return "PENDENTE";
    case "CANCELED":
      return "CANCELADO";
    default:
      return status || "";
  }
}

function statusStyle(status: string): CellStyle | undefined {
  switch (status) {
    case "PAID":
      return { bold: true, color: PAID_COLOR };
    case "PENDING":
      return { bold: true, color: PENDING_COLOR };
    case "CANCELED":
      return { bold: true, color: CANCELED_COLOR };
    default:
      return undefined;
  }
}

function buildTotalSheet(
  rows: Array<TotalRow & { cpfDecrypted: string }>
): SheetSpec {
  const header = [
    "Nº INSCRIÇÃO",
    "STATUS",
    "STAFF",
    "NOME",
    "EMAIL",
    "CPF",
    "SEXO",
    "DATA DE NASCIMENTO",
    "TELEFONE",
    "ACOMPANHANTE",
    "CONTATO EMERGÊNCIA (NOME)",
    "CONTATO EMERGÊNCIA (TELEFONE)",
    "DORME NO MOSTEIRO",
    "USA MEDICAÇÃO",
    "QUAL MEDICAÇÃO",
    "TEM RESTRIÇÃO ALIMENTAR",
    "QUAL RESTRIÇÃO ALIMENTAR",
    "CEP",
    "ENDEREÇO",
    "NÚMERO",
    "COMPLEMENTO",
    "CIDADE",
    "ESTADO",
    "DATA DA INSCRIÇÃO",
    "DATA DO PAGAMENTO",
    "VALOR",
  ];
  const headerRow: CellInput[] = header.map(value => ({
    value,
    style: { bold: true, fill: HEADER_FILL },
  }));

  let totalCents = 0;
  const dataRows: CellInput[][] = rows.map(row => {
    const medicationDetails = (row.allergy_medication_details ?? "").trim();
    const dietaryDetails = (row.dietary_restriction_details ?? "").trim();
    const amountCents = typeof row.amount_cents === "number" ? row.amount_cents : 0;
    // Soma apenas os pagamentos efetivamente concluídos.
    if (row.status === "PAID") totalCents += amountCents;

    return [
      row.registration_number ?? "",
      { value: statusLabel(row.status), style: statusStyle(row.status) },
      {
        value: row.is_staff === 1 ? "Sim" : "Não",
        style: row.is_staff === 1 ? { bold: true, color: STAFF_COLOR } : undefined,
      },
      row.name || "",
      row.email || "",
      row.cpfDecrypted || "",
      formatGender(row.gender),
      formatDateOfBirth(row.date_of_birth),
      row.phone ?? "",
      row.companion_name ?? "",
      row.emergency_contact_name ?? "",
      row.emergency_contact_phone ?? "",
      row.sleep_at_monastery === 1 ? "Sim" : "Não",
      row.has_allergy_medication === 1 ? "Sim" : "Não",
      {
        value: medicationDetails,
        style: medicationDetails ? { bold: true, color: ALERT_COLOR } : undefined,
      },
      row.has_dietary_restriction === 1 ? "Sim" : "Não",
      {
        value: dietaryDetails,
        style: dietaryDetails ? { bold: true, color: ALERT_COLOR } : undefined,
      },
      row.cep ?? "",
      row.address ?? "",
      row.number ?? "",
      row.complement ?? "",
      row.city ?? "",
      row.state ?? "",
      formatDateTime(row.created_at),
      formatDateTime(row.paid_at),
      amountCents > 0 ? formatBRL(amountCents) : "",
    ];
  });

  const sheetRows: CellInput[][] = [headerRow, ...dataRows];

  if (rows.length) {
    const totalRow: CellInput[] = new Array(header.length).fill("");
    totalRow[header.length - 2] = {
      value: "TOTAL PAGO",
      style: { bold: true, align: "right" },
    };
    totalRow[header.length - 1] = { value: formatBRL(totalCents), style: { bold: true } };
    sheetRows.push(totalRow);
  }

  return { sheetName: "Total", rows: sheetRows };
}
