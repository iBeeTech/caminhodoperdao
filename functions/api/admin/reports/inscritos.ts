/// <reference types="@cloudflare/workers-types" />
import { AdminAuthEnv, authorizeAdminRequest } from "../../../_utils/adminAuth";
import { decryptCpf } from "../../../_utils/cpfCrypto";

type InscritosEnv = AdminAuthEnv & { CPF_ENCRYPTION_KEY?: string; CPF_ENCRYPTION_IV?: string };

interface InscritoRow {
  name: string;
  email: string;
  phone: string | null;
  sleep_at_monastery: number;
  city: string | null;
  state: string | null;
  cpf_encrypted: string | null;
  date_of_birth: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
}

export const onRequestGet: PagesFunction<InscritosEnv> = async context => {
  const authResult = await authorizeAdminRequest(context.request, context.env);
  if (authResult instanceof Response) {
    return authResult;
  }

  const query = `
    SELECT name, email, phone, sleep_at_monastery, city, state, cpf_encrypted, date_of_birth, emergency_contact_name, emergency_contact_phone
    FROM registrations
    WHERE status = 'PAID'
    ORDER BY name
  `;

  const results = await context.env.DB.prepare(query).all<InscritoRow>();
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

  const csv = buildInscritosCsv(rowsWithCpf);
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=credential-list.csv",
    },
  });
};

function formatDateOfBirth(value: string | null): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return value ?? "";
  const [y, m, d] = value.split("-");
  return `${d}/${m}/${y}`;
}

function buildInscritosCsv(
  rows: Array<InscritoRow & { cpfDecrypted: string }>
): string {
  const header =
    "NOME,EMAIL,CPF,DATA DE NASCIMENTO,TELEFONE,CONTATO EMERGÊNCIA (NOME),CONTATO EMERGÊNCIA (TELEFONE),DORME NO MOSTEIRO,CIDADE,ESTADO,ASSINATURA RECEBIMENTO KIT\n";
  if (!rows.length) {
    return header;
  }

  const sorted = [...rows].sort((a, b) => a.name.localeCompare(b.name));
  const body = sorted
    .map(row => {
      const name = `"${(row.name || "").replace(/"/g, '""')}"`;
      const email = `"${(row.email || "").replace(/"/g, '""')}"`;
      const cpf = `"${(row.cpfDecrypted || "").replace(/"/g, '""')}"`;
      const dateOfBirth = `"${formatDateOfBirth(row.date_of_birth)}"`;
      const phone = `"${(row.phone ?? "").replace(/"/g, '""')}"`;
      const emergencyName = `"${(row.emergency_contact_name ?? "").replace(/"/g, '""')}"`;
      const emergencyPhone = `"${(row.emergency_contact_phone ?? "").replace(/"/g, '""')}"`;
      const dorme = row.sleep_at_monastery === 1 ? "Sim" : "Não";
      const city = `"${(row.city ?? "").replace(/"/g, '""')}"`;
      const state = `"${(row.state ?? "").replace(/"/g, '""')}"`;
      return `${name},${email},${cpf},${dateOfBirth},${phone},${emergencyName},${emergencyPhone},${dorme},${city},${state},""`;
    })
    .join("\n");

  return header + body;
}

