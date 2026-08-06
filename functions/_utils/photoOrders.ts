/// <reference types="@cloudflare/workers-types" />
import { isSafePhotoName } from "./photoGallery";

/**
 * Pedido de fotos (migration 036).
 *
 * A pessoa escolhe as fotos na galeria, paga um PIX pelo carrinho inteiro e
 * baixa os arquivos em alta. Aqui ficam as regras que não podem morar na tela:
 * preço, limpeza da lista de fotos e o segredo que abre o pedido.
 */

export interface PhotoOrderEnv {
  DB: D1Database;
  PHOTOS: R2Bucket;
  /** Preço de UMA foto, em reais (ex.: "5" ou "5,00"). Configurável na Cloudflare. */
  PHOTO_PRICE?: string;
  /** Dias que os links de download continuam valendo depois do pagamento. */
  PHOTO_DOWNLOAD_DAYS?: string;
}

/** R$ 5,00 — combinado com a organização em 06/08/2026. */
const PRECO_PADRAO_CENTAVOS = 500;

/** Teto de fotos por pedido: acima disso é engano ou robô, não peregrino. */
export const MAX_FOTOS_POR_PEDIDO = 300;

/** Prazo padrão dos links depois de pago. */
const DIAS_DOWNLOAD_PADRAO = 30;

export interface PhotoOrderRow {
  id: string;
  customer_name: string;
  email: string;
  event_year: number;
  photo_count: number;
  unit_price_cents: number;
  amount_cents: number;
  status: "PENDING" | "PAID" | "CANCELED";
  payment_ref: string;
  correlation_id: string | null;
  provider_charge_id: string | null;
  qr_code_text: string | null;
  qr_code_image: string | null;
  access_token_hash: string;
  downloads_expire_at: string | null;
  created_at: string;
  paid_at: string | null;
}

// Estes dois recebem só o pedaço da env que usam, e não PhotoOrderEnv inteira:
// quem confirma o pagamento (webhook) tem banco e e-mail, mas não tem o balde.
export function precoUnitarioCentavos(env: { PHOTO_PRICE?: string }): number {
  const bruto = env.PHOTO_PRICE?.trim();
  if (!bruto) return PRECO_PADRAO_CENTAVOS;

  const reais = Number(bruto.replace(",", "."));
  if (!Number.isFinite(reais) || reais <= 0) {
    console.warn(`PHOTO_PRICE inválido ("${bruto}"), usando o padrão.`);
    return PRECO_PADRAO_CENTAVOS;
  }
  return Math.round(reais * 100);
}

export function diasDeDownload(env: { PHOTO_DOWNLOAD_DAYS?: string }): number {
  const bruto = env.PHOTO_DOWNLOAD_DAYS?.trim();
  const dias = bruto ? Number(bruto) : NaN;
  return Number.isInteger(dias) && dias > 0 ? dias : DIAS_DOWNLOAD_PADRAO;
}

/**
 * Limpa a lista de fotos que veio da tela.
 *
 * ⚠️ Tira repetidas ANTES de calcular o total. Sem isto, a mesma foto mandada
 * cinco vezes cobraria R$ 25 por um arquivo só — e o INSERT da segunda cópia
 * quebraria na chave primária, deixando o pedido pago e sem itens.
 */
export function normalizarFotos(bruto: unknown): string[] | null {
  if (!Array.isArray(bruto)) return null;

  const limpas = new Set<string>();
  for (const item of bruto) {
    if (typeof item !== "string") return null;
    const nome = item.trim();
    if (!isSafePhotoName(nome)) return null;
    limpas.add(nome);
  }

  if (limpas.size === 0 || limpas.size > MAX_FOTOS_POR_PEDIDO) return null;
  return Array.from(limpas);
}

/** Segredo que abre a página do pedido: 32 bytes de CSPRNG em hexadecimal. */
export function gerarTokenDoPedido(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashTokenDoPedido(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token.trim()));
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Acha o pedido pelo segredo do link. Busca PELO HASH, então o valor em claro
 * nunca é comparado com nada guardado.
 */
export async function pedidoPorToken(
  DB: D1Database,
  token: string
): Promise<PhotoOrderRow | null> {
  const limpo = (token || "").trim();
  if (!/^[a-f0-9]{64}$/.test(limpo)) return null;

  return DB.prepare(
    `SELECT id, customer_name, email, event_year, photo_count, unit_price_cents,
            amount_cents, status, payment_ref, correlation_id, provider_charge_id,
            qr_code_text, qr_code_image, access_token_hash, downloads_expire_at,
            created_at, paid_at
       FROM photo_order WHERE access_token_hash = ?1`
  )
    .bind(await hashTokenDoPedido(limpo))
    .first<PhotoOrderRow>();
}

export async function fotosDoPedido(DB: D1Database, orderId: string): Promise<string[]> {
  const { results } = await DB.prepare(
    "SELECT photo_name FROM photo_order_item WHERE order_id = ?1 ORDER BY photo_name"
  )
    .bind(orderId)
    .all<{ photo_name: string }>();

  return (results ?? []).map(linha => linha.photo_name);
}

/** O download só abre com pedido pago e dentro do prazo. */
export function podeBaixar(pedido: PhotoOrderRow): boolean {
  if (pedido.status !== "PAID") return false;
  if (!pedido.downloads_expire_at) return true;
  return new Date(pedido.downloads_expire_at).getTime() > Date.now();
}
