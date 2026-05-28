/// <reference types="@cloudflare/workers-types" />
import { badRequest, conflict, json, serverError } from "../_utils/responses";
import { canonicalizeCpf, isValidCpf } from "../_utils/cpfValidation";
import { encryptCpf } from "../_utils/cpfCrypto";
import { getPaymentProvider } from "../_utils/payment";
import { getWooviChargeStatus } from "../_utils/woovi";

interface Env {
  DB: D1Database;
  WOOVI_APP_ID?: string;
  CPF_ENCRYPTION_KEY?: string;
  CPF_ENCRYPTION_IV?: string;
}

interface TshirtSizes {
  P: number;
  M: number;
  G: number;
  GG: number;
}

interface TshirtPurchaseRow {
  id: string;
  customer_name: string;
  cpf_encrypted: string;
  size_p_qty: number;
  size_m_qty: number;
  size_g_qty: number;
  size_gg_qty: number;
  total_quantity: number;
  amount_cents: number;
  status: "PENDING" | "PAID" | "CANCELED";
  payment_provider: string;
  payment_ref: string;
  correlation_id: string | null;
  provider_charge_id: string | null;
  qr_code_text: string | null;
  qr_code_image: string | null;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
}

interface TshirtPaidTotalsRow {
  total_p: number;
  total_m: number;
  total_g: number;
  total_gg: number;
  total_quantity: number;
  total_amount_cents: number;
}

const PRICE_PER_TSHIRT_CENTS = 10_000;

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeNameForComparison(value: string): string {
  return normalizeName(value).toLocaleLowerCase("pt-BR");
}

function toNonNegativeInteger(value: unknown): number | null {
  if (typeof value === "number") {
    if (!Number.isInteger(value) || value < 0) return null;
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed) || parsed < 0) return null;
    return parsed;
  }

  return null;
}

function readSizes(body: Record<string, unknown>): TshirtSizes | null {
  const source =
    typeof body.sizes === "object" && body.sizes !== null
      ? (body.sizes as Record<string, unknown>)
      : body;

  const p = toNonNegativeInteger(source.P ?? source.p ?? 0);
  const m = toNonNegativeInteger(source.M ?? source.m ?? 0);
  const g = toNonNegativeInteger(source.G ?? source.g ?? 0);
  const gg = toNonNegativeInteger(source.GG ?? source.gg ?? 0);

  if (p === null || m === null || g === null || gg === null) {
    return null;
  }

  return { P: p, M: m, G: g, GG: gg };
}

function getTotalQuantity(sizes: TshirtSizes): number {
  return sizes.P + sizes.M + sizes.G + sizes.GG;
}

async function encryptCpfForLookup(env: Env, cpf: string): Promise<string> {
  const key = env.CPF_ENCRYPTION_KEY;
  const iv = env.CPF_ENCRYPTION_IV;

  if (!key || !iv) {
    throw new Error("cpf_encryption_not_configured");
  }

  return encryptCpf(canonicalizeCpf(cpf), key, iv);
}

async function getLatestPurchaseByCpf(
  DB: D1Database,
  cpfEncrypted: string
): Promise<TshirtPurchaseRow | null> {
  const stmt = DB.prepare(
    `SELECT
       id,
       customer_name,
       cpf_encrypted,
       size_p_qty,
       size_m_qty,
       size_g_qty,
       size_gg_qty,
       total_quantity,
       amount_cents,
       status,
       payment_provider,
       payment_ref,
       correlation_id,
       provider_charge_id,
       qr_code_text,
       qr_code_image,
       created_at,
       updated_at,
       paid_at
     FROM tshirt_purchase
     WHERE cpf_encrypted = ?
     ORDER BY datetime(created_at) DESC
     LIMIT 1`
  ).bind(cpfEncrypted);

  return (await stmt.first<TshirtPurchaseRow>()) ?? null;
}

async function getPaidTotalsByCpf(
  DB: D1Database,
  cpfEncrypted: string
): Promise<TshirtPaidTotalsRow> {
  const stmt = DB.prepare(
    `SELECT
       COALESCE(SUM(size_p_qty), 0) as total_p,
       COALESCE(SUM(size_m_qty), 0) as total_m,
       COALESCE(SUM(size_g_qty), 0) as total_g,
       COALESCE(SUM(size_gg_qty), 0) as total_gg,
       COALESCE(SUM(total_quantity), 0) as total_quantity,
       COALESCE(SUM(amount_cents), 0) as total_amount_cents
     FROM tshirt_purchase
     WHERE cpf_encrypted = ? AND status = 'PAID'`
  ).bind(cpfEncrypted);

  return (
    (await stmt.first<TshirtPaidTotalsRow>()) ?? {
      total_p: 0,
      total_m: 0,
      total_g: 0,
      total_gg: 0,
      total_quantity: 0,
      total_amount_cents: 0,
    }
  );
}

async function updatePurchaseStatus(
  DB: D1Database,
  purchaseId: string,
  status: "PAID" | "CANCELED"
): Promise<string> {
  const nowIso = new Date().toISOString();

  if (status === "PAID") {
    await DB.prepare(
      "UPDATE tshirt_purchase SET status = 'PAID', paid_at = ?, updated_at = ? WHERE id = ?"
    )
      .bind(nowIso, nowIso, purchaseId)
      .run();
    return nowIso;
  }

  await DB.prepare(
    "UPDATE tshirt_purchase SET status = 'CANCELED', updated_at = ? WHERE id = ?"
  )
    .bind(nowIso, purchaseId)
    .run();

  return nowIso;
}

async function handleCreatePurchase(env: Env, body: unknown): Promise<Response> {
  if (!body || typeof body !== "object") {
    return badRequest("invalid_body");
  }

  const payload = body as Record<string, unknown>;
  const rawName = typeof payload.name === "string" ? payload.name : "";
  const name = normalizeName(rawName);
  const cpf = typeof payload.cpf === "string" ? payload.cpf : "";

  if (!name) {
    return badRequest("name_required");
  }

  if (!cpf) {
    return badRequest("cpf_required");
  }

  if (!isValidCpf(cpf)) {
    return badRequest("invalid_cpf");
  }

  const sizes = readSizes(payload);
  if (!sizes) {
    return badRequest("invalid_quantity");
  }

  const totalQuantity = getTotalQuantity(sizes);
  if (totalQuantity <= 0) {
    return badRequest("quantity_required");
  }

  let cpfEncrypted: string;
  try {
    cpfEncrypted = await encryptCpfForLookup(env, cpf);
  } catch (error: any) {
    if (error?.message === "cpf_encryption_not_configured") {
      return serverError("cpf_encryption_not_configured");
    }
    return serverError("cpf_encryption_failed");
  }

  const latestPurchase = await getLatestPurchaseByCpf(env.DB, cpfEncrypted);
  if (
    latestPurchase &&
    normalizeNameForComparison(latestPurchase.customer_name) !== normalizeNameForComparison(name)
  ) {
    return conflict("cpf_used_by_other_name");
  }

  const amountCents = totalQuantity * PRICE_PER_TSHIRT_CENTS;

  let provider;
  try {
    provider = getPaymentProvider(env);
  } catch (error: any) {
    console.error("Erro ao obter provider de pagamento da camiseta:", error?.message || error);
    return serverError("payment_provider_not_configured");
  }

  let charge;
  try {
    charge = await provider.createCharge({
      name,
      amountCents,
      taxId: canonicalizeCpf(cpf),
      comment: `Camiseta Exclusiva - Caminhada do Perdão (${totalQuantity} unidade(s))`,
      additionalInfo: [
        { key: "produto", value: "Camiseta Exclusiva Caminhada do Perdão" },
        { key: "tamanhos", value: `P:${sizes.P} M:${sizes.M} G:${sizes.G} GG:${sizes.GG}` },
      ],
    });
  } catch (error: any) {
    console.error("Erro ao criar cobrança Woovi da camiseta:", error?.message || error);
    return serverError("pix_creation_failed");
  }

  const purchaseId = crypto.randomUUID();
  const nowIso = new Date().toISOString();

  try {
    await env.DB.prepare(
      `INSERT INTO tshirt_purchase (
         id,
         customer_name,
         cpf_encrypted,
         size_p_qty,
         size_m_qty,
         size_g_qty,
         size_gg_qty,
         total_quantity,
         amount_cents,
         status,
         payment_provider,
         payment_ref,
         correlation_id,
         provider_charge_id,
         qr_code_text,
         qr_code_image,
         created_at,
         updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 'woovi', ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        purchaseId,
        name,
        cpfEncrypted,
        sizes.P,
        sizes.M,
        sizes.G,
        sizes.GG,
        totalQuantity,
        amountCents,
        charge.payment_ref,
        charge.correlation_id || null,
        charge.provider_charge_id || charge.payment_ref,
        charge.qrCodeText,
        charge.qrCodeImageUrl || null,
        nowIso,
        nowIso
      )
      .run();
  } catch (error: any) {
    console.error("Erro ao salvar compra de camiseta:", error?.message || error);
    return serverError("purchase_persistence_failed");
  }

  return json(200, {
    status: "PENDING",
    purchase_id: purchaseId,
    payment_ref: charge.payment_ref,
    qrCodeText: charge.qrCodeText,
    qrCodeImageUrl: charge.qrCodeImageUrl || null,
    amountCents,
    totalQuantity,
    pricePerUnitCents: PRICE_PER_TSHIRT_CENTS,
    sizes,
  });
}

async function handlePurchaseStatus(env: Env, requestUrl: string): Promise<Response> {
  const url = new URL(requestUrl);
  const cpf = url.searchParams.get("cpf") || "";
  const rawName = url.searchParams.get("name") || "";
  const name = normalizeName(rawName);

  if (!cpf) {
    return badRequest("cpf_required");
  }

  if (!name) {
    return badRequest("name_required");
  }

  if (!isValidCpf(cpf)) {
    return badRequest("invalid_cpf");
  }

  let cpfEncrypted: string;
  try {
    cpfEncrypted = await encryptCpfForLookup(env, cpf);
  } catch (error: any) {
    if (error?.message === "cpf_encryption_not_configured") {
      return serverError("cpf_encryption_not_configured");
    }
    return serverError("cpf_encryption_failed");
  }

  const latestPurchase = await getLatestPurchaseByCpf(env.DB, cpfEncrypted);

  if (!latestPurchase) {
    return json(200, { exists: false });
  }

  if (normalizeNameForComparison(latestPurchase.customer_name) !== normalizeNameForComparison(name)) {
    return conflict("cpf_used_by_other_name");
  }

  let refreshedStatus = latestPurchase.status;
  let paidAtForResponse = latestPurchase.paid_at;

  if (latestPurchase.status === "PENDING") {
    try {
      const appId = env.WOOVI_APP_ID;
      if (appId) {
        const wooviChargeId = latestPurchase.provider_charge_id || latestPurchase.payment_ref;
        const wooviResponse = await getWooviChargeStatus(appId, wooviChargeId);
        const wooviStatus = wooviResponse.charge?.status;

        if (["COMPLETED", "RECEIVED"].includes(wooviStatus)) {
          paidAtForResponse = await updatePurchaseStatus(env.DB, latestPurchase.id, "PAID");
          refreshedStatus = "PAID";
        } else if (wooviStatus === "EXPIRED") {
          await updatePurchaseStatus(env.DB, latestPurchase.id, "CANCELED");
          refreshedStatus = "CANCELED";
        }
      }
    } catch (error) {
      console.error("Erro ao consultar status Woovi da camiseta:", error);
    }
  }

  const paidTotals = await getPaidTotalsByCpf(env.DB, cpfEncrypted);

  return json(200, {
    exists: true,
    status: refreshedStatus,
    message:
      refreshedStatus === "PAID"
        ? "Compra confirmada"
        : refreshedStatus === "CANCELED"
          ? "Compra cancelada"
          : null,
    payment_ref: latestPurchase.payment_ref,
    qrCodeText: refreshedStatus === "PENDING" ? latestPurchase.qr_code_text : null,
    qrCodeImageUrl: refreshedStatus === "PENDING" ? latestPurchase.qr_code_image : null,
    latestPurchase: {
      id: latestPurchase.id,
      sizes: {
        P: latestPurchase.size_p_qty,
        M: latestPurchase.size_m_qty,
        G: latestPurchase.size_g_qty,
        GG: latestPurchase.size_gg_qty,
      },
      totalQuantity: latestPurchase.total_quantity,
      amountCents: latestPurchase.amount_cents,
      createdAt: latestPurchase.created_at,
      paidAt: refreshedStatus === "PAID" ? paidAtForResponse : null,
    },
    paidTotals: {
      P: paidTotals.total_p,
      M: paidTotals.total_m,
      G: paidTotals.total_g,
      GG: paidTotals.total_gg,
      totalQuantity: paidTotals.total_quantity,
      amountCents: paidTotals.total_amount_cents,
    },
  });
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return badRequest("invalid_json");
  }

  return handleCreatePurchase(context.env, body);
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  return handlePurchaseStatus(context.env, context.request.url);
};
