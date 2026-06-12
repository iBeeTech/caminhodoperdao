/// <reference types="@cloudflare/workers-types" />
import { AdminAuthEnv, authorizeAdminRequest } from "../../../_utils/adminAuth";
import { decryptCpf } from "../../../_utils/cpfCrypto";
import { CellInput, SheetSpec, xlsxResponse } from "../../../_utils/xlsx";

type InscritosEnv = AdminAuthEnv & { CPF_ENCRYPTION_KEY?: string; CPF_ENCRYPTION_IV?: string };

interface InscritoRow {
  name: string;
  email: string;
  phone: string | null;
  registration_number: string | null;
  is_staff: number;
  sleep_at_monastery: number;
  city: string | null;
  state: string | null;
  cpf_encrypted: string | null;
  date_of_birth: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  has_allergy_medication: number;
  allergy_medication_details: string | null;
  has_dietary_restriction: number;
  dietary_restriction_details: string | null;
  amount_cents: number | null;
}

// Cores reaproveitadas dos relatórios (hex RRGGBB).
const HEADER_FILL = "F0F0F0";
const STAFF_COLOR = "1D2C5E";
const ALERT_COLOR = "C62828";

// Converte um parâmetro de query (0/1) em filtro opcional. Retorna undefined quando ausente.
function parseFlag(value: string | null): 0 | 1 | undefined {
  if (value === "0") return 0;
  if (value === "1") return 1;
  return undefined;
}

function buildFilename(staff: 0 | 1 | undefined, sleep: 0 | 1 | undefined): string {
  const grupo = staff === 1 ? "staff" : staff === 0 ? "peregrinos" : "inscritos";
  const local = sleep === 1 ? "mosteiro" : sleep === 0 ? "geral" : "todos";
  return `${grupo}-${local}.xlsx`;
}

export const onRequestGet: PagesFunction<InscritosEnv> = async context => {
  const authResult = await authorizeAdminRequest(context.request, context.env);
  if (authResult instanceof Response) {
    return authResult;
  }

  const url = new URL(context.request.url);
  const staffFilter = parseFlag(url.searchParams.get("staff"));
  const sleepFilter = parseFlag(url.searchParams.get("sleep"));

  const conditions = ["r.status = 'PAID'"];
  const bindings: number[] = [];
  if (staffFilter !== undefined) {
    conditions.push("r.is_staff = ?");
    bindings.push(staffFilter);
  }
  if (sleepFilter !== undefined) {
    conditions.push("r.sleep_at_monastery = ?");
    bindings.push(sleepFilter);
  }

  const query = `
    SELECT
      r.name,
      r.email,
      r.phone,
      r.registration_number,
      r.is_staff,
      r.sleep_at_monastery,
      r.city,
      r.state,
      r.cpf_encrypted,
      r.date_of_birth,
      r.emergency_contact_name,
      r.emergency_contact_phone,
      r.has_allergy_medication,
      r.allergy_medication_details,
      r.has_dietary_restriction,
      r.dietary_restriction_details,
      p.amount_cents AS amount_cents
    FROM registrations r
    LEFT JOIN payments p ON p.correlation_id = r.payment_ref
    WHERE ${conditions.join(" AND ")}
    ORDER BY r.name
  `;

  const results = await context.env.DB.prepare(query)
    .bind(...bindings)
    .all<InscritoRow>();
  const rows = results.results ?? [];

  const key = context.env.CPF_ENCRYPTION_KEY;
  const iv = context.env.CPF_ENCRYPTION_IV;
  const canDecrypt = Boolean(key && iv);

  const rowsWithCpf: Array<InscritoRow & { cpfDecrypted: string }> = [];
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

  const spreadsheet =
    sleepFilter === 1
      ? buildMonasterySheet(rowsWithCpf)
      : buildInscritosSheet(rowsWithCpf);

  return xlsxResponse(spreadsheet, buildFilename(staffFilter, sleepFilter));
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

function headerRow(cells: string[]): CellInput[] {
  return cells.map(value => ({ value, style: { bold: true, fill: HEADER_FILL } }));
}

function buildInscritosSheet(
  rows: Array<InscritoRow & { cpfDecrypted: string }>
): SheetSpec {
  const header = [
    "Nº INSCRIÇÃO",
    "STAFF",
    "NOME",
    "EMAIL",
    "CPF",
    "DATA DE NASCIMENTO",
    "TELEFONE",
    "CONTATO EMERGÊNCIA (NOME)",
    "CONTATO EMERGÊNCIA (TELEFONE)",
    "DORME NO MOSTEIRO",
    "USA MEDICAÇÃO",
    "QUAL MEDICAÇÃO",
    "TEM RESTRIÇÃO ALIMENTAR",
    "QUAL RESTRIÇÃO ALIMENTAR",
    "CIDADE",
    "ESTADO",
    "VALOR",
  ];

  const sorted = [...rows].sort((a, b) => a.name.localeCompare(b.name));
  let totalCents = 0;
  const dataRows: CellInput[][] = sorted.map(row => {
    const medicationDetails = (row.allergy_medication_details ?? "").trim();
    const dietaryDetails = (row.dietary_restriction_details ?? "").trim();
    const amountCents = typeof row.amount_cents === "number" ? row.amount_cents : 0;
    totalCents += amountCents;

    return [
      row.registration_number ?? "",
      {
        value: row.is_staff === 1 ? "Sim" : "Não",
        style: row.is_staff === 1 ? { bold: true, color: STAFF_COLOR } : undefined,
      },
      row.name || "",
      row.email || "",
      row.cpfDecrypted || "",
      formatDateOfBirth(row.date_of_birth),
      row.phone ?? "",
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
      row.city ?? "",
      row.state ?? "",
      amountCents > 0 ? formatBRL(amountCents) : "",
    ];
  });

  const totalRow: CellInput[] = new Array(header.length).fill("");
  totalRow[header.length - 2] = {
    value: "TOTAL",
    style: { bold: true, align: "right" },
  };
  totalRow[header.length - 1] = {
    value: formatBRL(totalCents),
    style: { bold: true },
  };

  return {
    sheetName: "Inscritos",
    rows: [headerRow(header), ...dataRows, totalRow],
  };
}

function buildMonasterySheet(
  rows: Array<InscritoRow & { cpfDecrypted: string }>
): SheetSpec {
  const sorted = [...rows].sort((a, b) => a.name.localeCompare(b.name));
  const dataRows: CellInput[][] = sorted.map(row => [
    row.name || "",
    row.cpfDecrypted || "",
  ]);

  return {
    sheetName: "Mosteiro",
    rows: [headerRow(["NOME", "CPF"]), ...dataRows],
  };
}
