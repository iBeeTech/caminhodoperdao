/// <reference types="@cloudflare/workers-types" />
import {
  AdminAuthEnv,
  authorizeAdminRequest,
  authorizeSuperAdminRequest,
  generateTempPassword,
  getAdminByEmail,
  hashPassword,
} from "../../_utils/adminAuth";
import { badRequest, json, notFound, serverError } from "../../_utils/responses";

type Env = AdminAuthEnv & { DB: D1Database };

/**
 * Contas de peregrino e seus papéis (migration 031).
 *
 * ⚠️ MARCAR AQUI NÃO ABRE O PAINEL. `is_admin = 1` identifica a pessoa como
 * admin do evento; quem abre `/admin` continua sendo `admin_users` + JWT de
 * admin. Se um dia os dois logins forem unificados (Planning.md, bloco 1), é
 * esta coluna que vira a claim de papel — e aí a conta passa a abrir porta.
 *
 * Conceder papel é restrito ao ADMIN GERAL (`ADMIN_DEFAULT_EMAIL`). Não é
 * excesso de zelo: quem pode se promover a admin pode tudo, e o painel tem 11
 * contas. A leitura da lista, essa sim, qualquer admin faz.
 */

interface AccountRow {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  is_staff: number;
  is_admin: number;
  email_confirmed_at: number | null;
  role_updated_at: number | null;
  role_updated_by: string | null;
  created_at: number;
}

export const onRequestGet: PagesFunction<Env> = async context => {
  const auth = await authorizeAdminRequest(context.request, context.env);
  if (auth instanceof Response) return auth;

  try {
    const { results } = await context.env.DB.prepare(
      `SELECT id, email, name, phone, is_staff, is_admin, email_confirmed_at,
              role_updated_at, role_updated_by, created_at
         FROM users
        ORDER BY is_admin DESC, is_staff DESC, email COLLATE NOCASE`
    ).all<AccountRow>();

    return json(200, { accounts: results ?? [] });
  } catch (error) {
    console.error("GET /api/admin/accounts falhou:", error);
    return serverError();
  }
};

/**
 * Concede ou tira papel. Só o admin geral.
 *
 * Recebe o estado DESEJADO (`isStaff`, `isAdmin`), não um "alternar": dois
 * cliques rápidos na mesma linha, ou duas abas abertas, fariam um toggle
 * terminar no valor oposto ao que a tela mostra.
 */
export const onRequestPost: PagesFunction<Env> = async context => {
  const auth = await authorizeSuperAdminRequest(context.request, context.env);
  if (auth instanceof Response) return auth;

  let body: { userId?: unknown; isStaff?: unknown; isAdmin?: unknown } = {};
  try {
    body = await context.request.json();
  } catch {
    return badRequest("invalid_json");
  }

  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  if (!userId) return badRequest("missing_user_id");
  if (typeof body.isStaff !== "boolean" || typeof body.isAdmin !== "boolean") {
    return badRequest("invalid_roles");
  }

  // Todo admin é servo. Em vez de recusar a combinação impossível e devolver um
  // erro que a tela teria de explicar, corrige: quem é admin passa a ser staff.
  const isAdmin = body.isAdmin;
  const isStaff = isAdmin ? true : body.isStaff;

  try {
    const now = Date.now();
    const result = await context.env.DB.prepare(
      `UPDATE users
          SET is_staff = ?2, is_admin = ?3, role_updated_at = ?4, role_updated_by = ?5,
              updated_at = ?4
        WHERE id = ?1`
    )
      .bind(userId, isStaff ? 1 : 0, isAdmin ? 1 : 0, now, auth.sub)
      .run();

    if (!result.meta.changes) return notFound("account_not_found");

    // Marcar "admin" aqui passa a CRIAR a conta do painel, se ela ainda não
    // existir. Antes eram dois passos em telas diferentes — marcar o papel e
    // depois digitar o mesmo e-mail no "criar admin" —, e esquecer o segundo
    // deixava a pessoa marcada como admin sem conseguir entrar em lugar nenhum.
    let panelAccount: { created: boolean; tempPassword?: string; reason?: string } | null = null;

    if (isAdmin) {
      const account = await context.env.DB.prepare(
        "SELECT email FROM users WHERE id = ?1"
      )
        .bind(userId)
        .first<{ email: string }>();

      if (account) {
        const email = account.email.trim().toLowerCase();
        const existing = await getAdminByEmail(context.env.DB, email);

        if (existing) {
          panelAccount = { created: false, reason: "already_exists" };
        } else {
          // ⚠️ SEM SENHA PADRÃO. Cada conta nasce com senha aleatória, mostrada
          // uma vez só, e com troca obrigatória no primeiro acesso. Já houve
          // senha fixa neste projeto: ela vazou no histórico do git e 9 dos 11
          // admins continuavam usando — e, como o hash do admin é SHA-256 sem
          // sal, deu para descobrir quem era só comparando hashes.
          const tempPassword = generateTempPassword();
          const passwordHash = await hashPassword(
            tempPassword,
            context.env.ADMIN_PASSWORD_PEPPER
          );
          await context.env.DB.prepare(
            `INSERT INTO admin_users (email, password_hash, created_at, updated_at, must_change_password)
             VALUES (?1, ?2, ?3, ?3, 1)`
          )
            .bind(email, passwordHash, now)
            .run();
          panelAccount = { created: true, tempPassword };
        }
      }
    }

    return json(200, {
      userId,
      isStaff,
      isAdmin,
      roleUpdatedAt: now,
      roleUpdatedBy: auth.sub,
      panelAccount,
    });
  } catch (error) {
    console.error("POST /api/admin/accounts falhou:", error);
    return serverError();
  }
};
