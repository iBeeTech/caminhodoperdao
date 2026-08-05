/// <reference types="@cloudflare/workers-types" />
import { AdminAuthEnv, authorizeAdminRequest } from "../../_utils/adminAuth";

type Env = AdminAuthEnv & { DB: D1Database };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface Row {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: string;
  sleep_at_monastery: number;
  pernoite_granted: number;
  is_staff: number;
  date_of_birth: string | null;
  allergy_medication_details: string | null;
  dietary_restriction_details: string | null;
  city: string | null;
  checked_in_at: string | null;
  checked_in_by: string | null;
  event_year: number | null;
  /** 1 = veio de registrations_old (edição arquivada, somente leitura). */
  archived: number;
}

// As colunas pedidas às duas tabelas. registrations_old nasceu de um
// `CREATE TABLE AS SELECT *` (migration 027), então tem exatamente as mesmas
// colunas da viva menos `user_id` — que não está nesta lista de propósito, é o
// único campo que não existe lá e faria o UNION falhar.
const COLUMNS = `id, name, phone, email, status, sleep_at_monastery, pernoite_granted, is_staff,
            date_of_birth, allergy_medication_details, dietary_restriction_details, city,
            checked_in_at, checked_in_by, event_year`;

// GET /api/admin/registrations -> TODAS as inscrições (inclui staff) para a tela
// /admin/inscritos. O total bate com a tabela registrations; os callouts de pagos
// usam is_staff para contar só peregrinos.
//
// Devolve também event_year (migration 025), que é o que permite o filtro por
// edição na tela: sem ele, inscrições de anos diferentes ficam empilhadas na
// mesma lista sem jeito de separar.
//
// Devolve também id e a baixa do credenciamento (checked_in_at/by): é desta
// mesma lista que a aba Credenciamento vive, e o id é o que identifica a pessoa
// no POST /api/admin/checkin.
//
// `?include_archived=1` acrescenta as edições arquivadas em registrations_old
// (migration 027 levou as 747 inscrições de 2026 para lá, e é por isso que a
// tela de inscritos aparecia zerada).
//
// ⚠️ É OPT-IN, e não o padrão, por causa do Credenciamento: ele consome este
// mesmo endpoint e dá baixa com POST /api/admin/checkin, que escreve só em
// `registrations`. Se o arquivo entrasse por padrão, o credenciamento listaria
// 747 pessoas cujo check-in não gravaria nada — falha silenciosa, o pior tipo.
// Só a tela de inscritos, que é somente leitura, pede o arquivo.
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const auth = await authorizeAdminRequest(context.request, context.env);
  if (auth instanceof Response) return auth;

  const includeArchived =
    new URL(context.request.url).searchParams.get("include_archived") === "1";

  // registrations_old só existe onde a migration 027 rodou. O deploy não aplica
  // migrations sozinho, então o banco de teste pode não ter a tabela — sem esta
  // checagem o UNION quebraria com "no such table" em vez de simplesmente não
  // trazer arquivo nenhum.
  const hasArchive =
    includeArchived &&
    Boolean(
      await context.env.DB.prepare(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'registrations_old'"
      ).first()
    );

  const sql = hasArchive
    ? `SELECT ${COLUMNS}, 0 AS archived FROM registrations
       UNION ALL
       SELECT ${COLUMNS}, 1 AS archived FROM registrations_old
       ORDER BY name COLLATE NOCASE`
    : `SELECT ${COLUMNS}, 0 AS archived FROM registrations
       ORDER BY name COLLATE NOCASE`;

  const result = await context.env.DB.prepare(sql).all<Row>();

  return new Response(JSON.stringify({ registrations: result.results ?? [] }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...CORS },
  });
};

export const onRequestOptions: PagesFunction<Env> = async () =>
  new Response("OK", { status: 200, headers: CORS });
