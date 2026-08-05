/// <reference types="@cloudflare/workers-types" />

/**
 * Link de upload das fotos do evento (migration 035).
 *
 * O fotógrafo recebe /upload-fotos?t=<segredo> e manda os arquivos direto para
 * o R2, sem conta e sem senha. Como o link é a única credencial, tudo o que
 * limita o estrago de um link vazado mora aqui.
 */

export interface PhotoUploadEnv {
  DB: D1Database;
  PHOTOS: R2Bucket;
}

export interface PhotoUploadLink {
  id: string;
  label: string;
  event_year: number;
  expires_at: string;
  revoked_at: string | null;
  max_bytes: number;
  uploaded_bytes: number;
  uploaded_count: number;
}

export type LinkRejection = "invalid" | "expired" | "revoked" | "quota";

/** 30 dias: prazo padrão do link. O admin pode encurtar ao gerar. */
export const DEFAULT_EXPIRY_DAYS = 30;

/** Teto padrão de um link: 20 GB. Cobre 3032 fotos de ~3,3 MB com folga. */
export const DEFAULT_MAX_BYTES = 20 * 1024 * 1024 * 1024;

/** Teto por arquivo. Foto de câmera passa longe disso; serve de sanidade. */
export const MAX_FILE_BYTES = 120 * 1024 * 1024;

/**
 * Só imagem entra, e a checagem é pelos BYTES do arquivo, não pela extensão nem
 * pelo content-type — os dois são escolhidos por quem envia. Sem isto, um link
 * vazado vira hospedagem de qualquer arquivo no domínio do projeto, que é o
 * abuso clássico de endpoint de upload aberto.
 */
const MAGIC_SIGNATURES: Array<{ format: string; test: (b: Uint8Array) => boolean }> = [
  { format: "jpeg", test: b => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    format: "png",
    test: b =>
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
      b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
  },
  {
    // RIFF....WEBP
    format: "webp",
    test: b =>
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  },
  {
    // caixa "ftyp" no offset 4 — HEIC/HEIF do iPhone
    format: "heic",
    test: b => b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70,
  },
  {
    // TIFF little/big endian — base do DNG e de vários RAW
    format: "tiff",
    test: b =>
      (b[0] === 0x49 && b[1] === 0x49 && b[2] === 0x2a && b[3] === 0x00) ||
      (b[0] === 0x4d && b[1] === 0x4d && b[2] === 0x00 && b[3] === 0x2a),
  },
];

export function detectImageFormat(head: Uint8Array): string | null {
  if (head.length < 12) return null;
  for (const sig of MAGIC_SIGNATURES) {
    if (sig.test(head)) return sig.format;
  }
  return null;
}

/** Segredo do link: 32 bytes de CSPRNG em hex. */
export function generateUploadToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * O banco guarda só o hash. Busca-se PELO hash, então a comparação acontece no
 * índice do SQLite e nunca existe um caminho que compare segredo em texto.
 */
export async function hashUploadToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token.trim()));
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Nome de arquivo seguro para virar chave no R2.
 *
 * Barra e ".." iriam para a chave como se fossem pasta, deixando quem envia
 * escolher onde o arquivo cai — inclusive fora do prefixo do ano.
 */
// Marcas de acento que o normalize("NFD") separa da letra (U+0300–U+036F).
// Montado com RegExp e escape em texto, e não com os caracteres literais: no
// editor eles são invisíveis e uma conversão de codificação do arquivo os
// destruiria em silêncio, fazendo a limpeza de nome parar de tirar acento.
const COMBINING_ACCENTS = new RegExp("[\\u0300-\\u036f]", "g");

export function sanitizeFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "";
  const cleaned = base
    .normalize("NFD")
    .replace(COMBINING_ACCENTS, "") // "peregrinação.jpg" -> "peregrinacao.jpg"
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[.-]+/, "")
    .slice(0, 120);
  return cleaned || "foto";
}

/** originais/<ano>/<arquivo>. O prefixo separa o que é original do que é derivado. */
export function buildPhotoKey(eventYear: number, filename: string): string {
  return `originais/${eventYear}/${sanitizeFilename(filename)}`;
}

/**
 * Devolve o link se ele puder receber arquivo agora, ou o motivo da recusa.
 * `incomingBytes` entra na conta para o teto barrar ANTES de gravar no R2.
 */
export async function resolveUploadLink(
  DB: D1Database,
  token: string,
  incomingBytes = 0
): Promise<PhotoUploadLink | LinkRejection> {
  const trimmed = (token || "").trim();
  // 64 hex = o formato que generateUploadToken produz. Recusar aqui evita
  // consultar o banco a cada tentativa de adivinhação.
  if (!/^[a-f0-9]{64}$/.test(trimmed)) return "invalid";

  const link = await DB.prepare(
    `SELECT id, label, event_year, expires_at, revoked_at, max_bytes, uploaded_bytes, uploaded_count
     FROM photo_upload_links WHERE token_hash = ?1`
  )
    .bind(await hashUploadToken(trimmed))
    .first<PhotoUploadLink>();

  if (!link) return "invalid";
  if (link.revoked_at) return "revoked";
  if (new Date(link.expires_at).getTime() <= Date.now()) return "expired";
  if (link.uploaded_bytes + incomingBytes > link.max_bytes) return "quota";
  return link;
}

export function rejectionStatus(reason: LinkRejection): number {
  // 413 para cota: é limite de tamanho, não falta de permissão. Misturar os dois
  // faria a tela dizer "link inválido" quando o link está ótimo e o balde cheio.
  return reason === "quota" ? 413 : 401;
}

export const REJECTION_MESSAGES: Record<LinkRejection, string> = {
  invalid: "Link inválido. Confira se copiou o endereço inteiro.",
  expired: "Este link expirou. Peça um novo à organização.",
  revoked: "Este link foi cancelado pela organização.",
  quota: "O limite de envio deste link foi atingido. Fale com a organização.",
};
