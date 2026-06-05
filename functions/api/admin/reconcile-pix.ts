/// <reference types="@cloudflare/workers-types" />
import {
  AdminAuthEnv,
  authorizeAdminRequest,
  getAdminDefaults,
} from "../../_utils/adminAuth";
import { json, serverError, unauthorized } from "../../_utils/responses";
import {
  getWooviChargeStatus,
  listWooviCompletedCharges,
} from "../../_utils/woovi";
import type { WooviListedCharge } from "../../_utils/woovi";
import { enforceCapacity } from "../../_utils/enforceCapacity";

interface ReconcileEnv extends AdminAuthEnv {
  DB: D1Database;
  WOOVI_APP_ID?: string;
}

interface PendingRegistrationRow {
  id: string;
  email: string;
  name: string | null;
  payment_ref: string | null;
  expected_cents: number | null;
}

interface PendingTshirtRow {
  id: string;
  customer_name: string | null;
  payment_ref: string | null;
}

interface ReconcileItemResult {
  type: "registration" | "tshirt";
  name: string;
  email?: string;
  payment_ref: string;
  action: "paid" | "canceled" | "still_pending" | "error";
  wooviStatus?: string;
  detail?: string;
}

// Mesma regra do webhook: número de inscrição sequencial por ano, contando só PAGAS.
async function generateRegistrationNumber(db: D1Database): Promise<string> {
  const year = new Date().getFullYear();
  const result = (await db
    .prepare(
      "SELECT COUNT(*) as count FROM registrations WHERE registration_number LIKE ? AND status = 'PAID'"
    )
    .bind(`%-${year}`)
    .first()) as { count?: number } | null;

  const nextNumber = (result?.count || 0) + 1;
  return `${String(nextNumber).padStart(3, "0")}-${year}`;
}

/**
 * Reconciliação de pagamentos PIX com a Woovi.
 *
 * Consulta na Woovi o status real de cada cobrança ainda PENDENTE (inscrições e
 * compras de camiseta) e aplica localmente o mesmo efeito que o webhook aplicaria:
 *  - COMPLETED -> marca como PAID (gera número de inscrição) e reforça a capacidade.
 *  - EXPIRED   -> marca como CANCELED.
 *  - ACTIVE    -> permanece pendente.
 *
 * Quando o GET direto da cobrança falha (ex.: cobrança apagada/expirada na Woovi, mas o PIX
 * entrou), há um fallback: lista as cobranças PAGAS e casa por referência (correlationID/
 * transactionID) ou por e-mail + valor, recuperando esses casos automaticamente.
 *
 * Serve de rede de segurança para webhooks perdidos. Restrito ao admin geral.
 *
 * POST /api/admin/reconcile-pix
 */
export const onRequestPost: PagesFunction<ReconcileEnv> = async context => {
  const authResult = await authorizeAdminRequest(context.request, context.env);
  if (authResult instanceof Response) {
    return authResult;
  }

  // Ação sensível (escreve status de pagamento): só o admin geral.
  const superAdminEmail = getAdminDefaults(context.env).email;
  if (authResult.sub.toLowerCase() !== superAdminEmail) {
    return unauthorized("forbidden");
  }

  const appId = context.env.WOOVI_APP_ID;
  if (!appId) {
    return serverError("woovi_app_id_missing");
  }

  const db = context.env.DB;
  const results: ReconcileItemResult[] = [];
  let paidCount = 0;

  // ===== Inscrições pendentes =====
  let pendingRegistrations: PendingRegistrationRow[] = [];
  try {
    const res = await db
      .prepare(
        `SELECT r.id, r.email, r.name, r.payment_ref, p.amount_cents AS expected_cents
         FROM registrations r
         LEFT JOIN payments p ON p.correlation_id = r.payment_ref
         WHERE r.status = 'PENDING' AND r.payment_ref IS NOT NULL AND r.payment_ref != ''`
      )
      .all<PendingRegistrationRow>();
    pendingRegistrations = res.results ?? [];
  } catch (error) {
    console.error("Erro ao listar inscrições pendentes:", error);
    return serverError("list_pending_failed");
  }

  // Inscrições cujo GET direto da cobrança falhou — resolvidas depois pelo fallback.
  const erroredRegs: { reg: PendingRegistrationRow; idx: number; label: string }[] = [];

  for (const reg of pendingRegistrations) {
    const ref = reg.payment_ref as string;
    const label = reg.name?.trim() || reg.email;
    try {
      const woovi = await getWooviChargeStatus(appId, ref);
      const status = woovi.charge?.status;

      if (status === "COMPLETED") {
        const registrationNumber = await generateRegistrationNumber(db);
        await db
          .prepare(
            "UPDATE registrations SET status = 'PAID', paid_at = ?, registration_number = ? WHERE id = ?"
          )
          .bind(Date.now(), registrationNumber, reg.id)
          .run();
        paidCount += 1;
        results.push({
          type: "registration",
          name: label,
          email: reg.email,
          payment_ref: ref,
          action: "paid",
          wooviStatus: status,
          detail: registrationNumber,
        });
      } else if (status === "EXPIRED") {
        await db
          .prepare("UPDATE registrations SET status = 'CANCELED' WHERE id = ?")
          .bind(reg.id)
          .run();
        results.push({
          type: "registration",
          name: label,
          email: reg.email,
          payment_ref: ref,
          action: "canceled",
          wooviStatus: status,
        });
      } else {
        results.push({
          type: "registration",
          name: label,
          email: reg.email,
          payment_ref: ref,
          action: "still_pending",
          wooviStatus: status,
        });
      }
    } catch (error: any) {
      console.warn(`GET direto da cobrança falhou para inscrição ${ref}:`, error?.message);
      const idx =
        results.push({
          type: "registration",
          name: label,
          email: reg.email,
          payment_ref: ref,
          action: "error",
          detail: error?.message ? String(error.message).slice(0, 200) : "woovi_error",
        }) - 1;
      erroredRegs.push({ reg, idx, label });
    }
  }

  // ===== Fallback: busca por cliente quando o GET direto da cobrança falhou =====
  // Caso típico: a cobrança foi apagada/expirada na Woovi, mas o PIX entrou. Varremos as
  // cobranças PAGAS e casamos por referência (correlationID/transactionID) ou por e-mail+valor.
  if (erroredRegs.length > 0) {
    let completed: WooviListedCharge[] = [];
    try {
      completed = await listWooviCompletedCharges(appId, "2026-05-01T00:00:00Z");
    } catch (error) {
      console.warn("Listagem de cobranças pagas (fallback) falhou:", error);
    }

    if (completed.length > 0) {
      const byRef = new Map<string, WooviListedCharge>();
      const byEmail = new Map<string, WooviListedCharge[]>();
      for (const charge of completed) {
        if (charge.correlationID) byRef.set(charge.correlationID, charge);
        if (charge.transactionID) byRef.set(charge.transactionID, charge);
        const em = (charge.customer?.email || "").trim().toLowerCase();
        if (em) {
          const arr = byEmail.get(em) ?? [];
          arr.push(charge);
          byEmail.set(em, arr);
        }
      }

      const usedCharges = new Set<string>();
      const chargeKey = (c: WooviListedCharge) => c.correlationID || c.transactionID || "";

      for (const { reg, idx, label } of erroredRegs) {
        const ref = reg.payment_ref as string;

        // 1) Casa por referência (preciso): cobrança paga com o mesmo correlationID/transactionID.
        let matched = byRef.get(ref);

        // 2) Senão, casa por e-mail + valor, só quando há exatamente 1 candidata paga não usada.
        if (!matched) {
          const em = (reg.email || "").trim().toLowerCase();
          const candidates = (byEmail.get(em) ?? []).filter(c => {
            if (usedCharges.has(chargeKey(c))) return false;
            if (reg.expected_cents != null && c.value != null) return c.value === reg.expected_cents;
            return true;
          });
          if (candidates.length === 1) matched = candidates[0];
        }

        if (matched) {
          usedCharges.add(chargeKey(matched));
          const registrationNumber = await generateRegistrationNumber(db);
          await db
            .prepare(
              "UPDATE registrations SET status = 'PAID', paid_at = ?, registration_number = ? WHERE id = ? AND status = 'PENDING'"
            )
            .bind(Date.now(), registrationNumber, reg.id)
            .run();
          paidCount += 1;
          results[idx].action = "paid";
          results[idx].wooviStatus = "COMPLETED (via busca por cliente)";
          results[idx].detail = registrationNumber;
          console.log(`Inscrição recuperada via fallback: ${label} (${registrationNumber})`);
        }
      }
    }
  }

  // ===== Compras de camiseta pendentes =====
  try {
    const res = await db
      .prepare(
        "SELECT id, customer_name, payment_ref FROM tshirt_purchase WHERE status = 'PENDING' AND payment_ref IS NOT NULL AND payment_ref != ''"
      )
      .all<PendingTshirtRow>();
    const pendingTshirts = res.results ?? [];

    for (const purchase of pendingTshirts) {
      const ref = purchase.payment_ref as string;
      const label = purchase.customer_name?.trim() || ref;
      try {
        const woovi = await getWooviChargeStatus(appId, ref);
        const status = woovi.charge?.status;
        const nowIso = new Date().toISOString();

        if (status === "COMPLETED") {
          await db
            .prepare(
              "UPDATE tshirt_purchase SET status = 'PAID', paid_at = ?, updated_at = ? WHERE id = ?"
            )
            .bind(nowIso, nowIso, purchase.id)
            .run();
          results.push({
            type: "tshirt",
            name: label,
            payment_ref: ref,
            action: "paid",
            wooviStatus: status,
          });
        } else if (status === "EXPIRED") {
          await db
            .prepare(
              "UPDATE tshirt_purchase SET status = 'CANCELED', updated_at = ? WHERE id = ?"
            )
            .bind(nowIso, purchase.id)
            .run();
          results.push({
            type: "tshirt",
            name: label,
            payment_ref: ref,
            action: "canceled",
            wooviStatus: status,
          });
        } else {
          results.push({
            type: "tshirt",
            name: label,
            payment_ref: ref,
            action: "still_pending",
            wooviStatus: status,
          });
        }
      } catch (error: any) {
        console.warn(`Reconciliação falhou para camiseta ${ref}:`, error?.message);
        results.push({
          type: "tshirt",
          name: label,
          payment_ref: ref,
          action: "error",
          detail: error?.message ? String(error.message).slice(0, 200) : "woovi_error",
        });
      }
    }
  } catch (error) {
    console.warn("Erro ao listar/reconciliar camisetas pendentes:", error);
  }

  // Entraram vagas pagas: reforça a capacidade (cancela pendentes em overflow).
  if (paidCount > 0) {
    try {
      await enforceCapacity(context.env);
    } catch (error) {
      console.warn("enforceCapacity após reconciliação falhou:", error);
    }
  }

  const summary = {
    checked: results.length,
    paid: results.filter(r => r.action === "paid").length,
    canceled: results.filter(r => r.action === "canceled").length,
    stillPending: results.filter(r => r.action === "still_pending").length,
    errors: results.filter(r => r.action === "error").length,
  };

  return json(200, { ok: true, summary, results });
};
