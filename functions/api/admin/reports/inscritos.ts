/// <reference types="@cloudflare/workers-types" />
import { AdminAuthEnv, authorizeAdminRequest } from "../../../_utils/adminAuth";

interface InscritoRow {
  name: string;
  email: string;
  phone: string | null;
  sleep_at_monastery: number;
  city: string | null;
  state: string | null;
}

export const onRequestGet: PagesFunction<AdminAuthEnv> = async context => {
  const authResult = await authorizeAdminRequest(context.request, context.env);
  if (authResult instanceof Response) {
    return authResult;
  }

  const query = `
    SELECT name, email, phone, sleep_at_monastery, city, state
    FROM registrations
    WHERE status = 'PAID'
    ORDER BY name
  `;

  const results = await context.env.DB.prepare(query).all<InscritoRow>();
  const rows = results.results ?? [];

  const csv = buildInscritosCsv(rows);
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=credential-list.csv",
    },
  });
};

function buildInscritosCsv(rows: InscritoRow[]): string {
  const header =
    "NOME,EMAIL,TELEFONE,DORME NO MOSTEIRO,CIDADE,ESTADO,ASSINATURA RECEBIMENTO KIT\n";
  if (!rows.length) {
    return header;
  }

  const sorted = [...rows].sort((a, b) => a.name.localeCompare(b.name));
  const body = sorted
    .map(row => {
      const name = `"${row.name}"`;
      const email = `"${row.email}"`;
      const phone = `"${row.phone ?? ""}"`;
      const dorme = row.sleep_at_monastery === 1 ? "Sim" : "Não";
      const city = `"${row.city ?? ""}"`;
      const state = `"${row.state ?? ""}"`;
      return `${name},${email},${phone},${dorme},${city},${state},""`;
    })
    .join("\n");

  return header + body;
}

