/// <reference types="@cloudflare/workers-types" />
import { AdminAuthEnv, authorizeAdminRequest } from "../../../_utils/adminAuth";
import { compareByName, ROW_NUMBER_HEADER } from "../../../_utils/reportRows";

interface MonasteryRow {
  companion_name: string | null;
  name: string;
  phone: string | null;
}

export const onRequestGet: PagesFunction<AdminAuthEnv> = async context => {
  const authResult = await authorizeAdminRequest(context.request, context.env);
  if (authResult instanceof Response) {
    return authResult;
  }

  const query = `
    SELECT companion_name, name, phone
    FROM registrations
    WHERE status = 'PAID' AND sleep_at_monastery = 1
    ORDER BY companion_name, name
  `;

  const results = await context.env.DB.prepare(query).all<MonasteryRow>();
  const rows = results.results ?? [];
  const csv = buildMonasteryCsv(rows);
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=monastery-rooms-organization.csv",
    },
  });
};

function buildMonasteryCsv(rows: MonasteryRow[]): string {
  const header = `${ROW_NUMBER_HEADER},NOME,TELEFONE,GRUPO/FAMILIA\n`;
  if (!rows.length) {
    return header;
  }
  // O agrupamento por família vem antes do nome: a planilha existe para
  // organizar os quartos, então quem viaja junto precisa ficar junto.
  const sorted = [...rows].sort((a, b) => {
    const groupA = a.companion_name && a.companion_name !== "null" ? a.companion_name : "ZZZ_Sem Grupo";
    const groupB = b.companion_name && b.companion_name !== "null" ? b.companion_name : "ZZZ_Sem Grupo";
    if (groupA !== groupB) return compareByName(groupA, groupB);
    return compareByName(a.name, b.name);
  });

  const body = sorted
    .map((row, index) => {
      const name = `"${row.name}"`;
      const phone = `"${row.phone ?? ""}"`;
      const group =
        row.companion_name && row.companion_name !== "null" ? row.companion_name : "Sem Grupo";
      return `${index + 1},${name},${phone},"${group}"`;
    })
    .join("\n");

  return header + body;
}

