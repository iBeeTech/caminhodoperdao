/// <reference types="@cloudflare/workers-types" />

/**
 * Desafios de "esqueci minha senha" por código de uso único (OTP).
 *
 * Substitui o fluxo manual em que o super admin gerava uma senha temporária e
 * a ditava por WhatsApp. A diferença que importa: a senha temporária **logava**
 * e ficava no histórico da conversa; o código daqui não loga em nada — ele só
 * autoriza trocar a senha, uma vez, e expira em minutos.
 *
 * O código é guardado como **HMAC-SHA-256** com o ADMIN_JWT_SECRET, nunca em
 * texto e nunca com SHA-256 puro: 6 dígitos é um espaço de 1 milhão, que um
 * hash sem chave quebra por força bruta offline em instantes se o banco vazar.
 */

/** Validade do código enviado por e-mail. */
export const OTP_TTL_MS = 10 * 60 * 1000;

/** Validade da autorização emitida DEPOIS de o código ser aceito. */
export const RESET_TTL_MS = 10 * 60 * 1000;

/** Tentativas erradas antes de queimar o desafio. Sem isto, 6 dígitos caem por força bruta. */
export const MAX_OTP_ATTEMPTS = 5;

/** Janela e tetos do limite de pedidos. */
export const RATE_WINDOW_MS = 15 * 60 * 1000;
export const MAX_REQUESTS_PER_EMAIL = 3;
export const MAX_REQUESTS_PER_IP = 10;

const OTP_DIGITS = 6;
const RESET_TOKEN_BYTES = 32;
const CHALLENGE_ID_BYTES = 16;

const textEncoder = new TextEncoder();

export interface OtpChallengeRow {
  id: string;
  email: string;
  code_hash: string;
  attempts: number;
  expires_at: number;
  verified_at: number | null;
  reset_token_hash: string | null;
  reset_expires_at: number | null;
  used_at: number | null;
}

/**
 * Código decimal de 6 dígitos por CSPRNG, com rejeição de amostra.
 * O `% 10` cru sobre um byte enviesaria os dígitos 0–5, porque 256 não é
 * múltiplo de 10 — descartar os bytes acima de 249 elimina o viés.
 */
export function generateOtpCode(): string {
  let out = "";
  const buffer = new Uint8Array(1);
  while (out.length < OTP_DIGITS) {
    crypto.getRandomValues(buffer);
    if (buffer[0] >= 250) continue;
    out += String(buffer[0] % 10);
  }
  return out;
}

export function generateChallengeId(): string {
  return randomHex(CHALLENGE_ID_BYTES);
}

export function generateResetToken(): string {
  return randomHex(RESET_TOKEN_BYTES);
}

/** HMAC-SHA-256 em hex. A chave é o segredo do JWT, que já existe como secret. */
export async function hmacHex(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(value));
  return bufferToHex(signature);
}

/** Comparação de tempo constante: não vaza quantos caracteres bateram. */
export function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Os dois contadores leem `password_reset_requests`, NÃO a tabela de desafios.
 *
 * Só existe desafio para e-mail que é de admin, então contar desafios faria o
 * limite disparar para conta existente e nunca para inexistente — e essa
 * diferença de resposta entregaria quais endereços são de admin. Já
 * `password_reset_requests` recebe uma linha por pedido, exista o e-mail ou
 * não, e por isso mede o abuso sem vazar nada.
 */
export async function countRecentRequestsByEmail(
  DB: D1Database,
  email: string,
  since: number
): Promise<number> {
  const row = await DB.prepare(
    "SELECT COUNT(*) AS total FROM password_reset_requests WHERE email = ?1 AND requested_at > ?2"
  )
    .bind(email, since)
    .first<{ total: number }>();
  return row?.total ?? 0;
}

export async function countRecentRequestsByIp(
  DB: D1Database,
  ip: string,
  since: number
): Promise<number> {
  const row = await DB.prepare(
    "SELECT COUNT(*) AS total FROM password_reset_requests WHERE request_ip = ?1 AND requested_at > ?2"
  )
    .bind(ip, since)
    .first<{ total: number }>();
  return row?.total ?? 0;
}

/** Registra o pedido para auditoria E para os contadores acima. Sempre insere. */
export async function logResetRequest(
  DB: D1Database,
  input: { email: string; requestIp: string; now: number }
): Promise<void> {
  await DB.prepare(
    "INSERT INTO password_reset_requests (email, requested_at, request_ip) VALUES (?1, ?2, ?3)"
  )
    .bind(input.email, input.now, input.requestIp)
    .run();
}

/** Fecha a trilha de auditoria quando a senha é realmente trocada pelo OTP. */
export async function closeResetRequests(
  DB: D1Database,
  email: string,
  now: number
): Promise<void> {
  await DB.prepare(
    "UPDATE password_reset_requests SET handled_at = ?2, handled_by = 'otp' WHERE email = ?1 AND handled_at IS NULL"
  )
    .bind(email, now)
    .run();
}

export async function createChallenge(
  DB: D1Database,
  input: { id: string; email: string; codeHash: string; requestIp: string; now: number }
): Promise<void> {
  await DB.prepare(
    `INSERT INTO password_otp_challenges
       (id, email, code_hash, attempts, expires_at, request_ip, created_at)
     VALUES (?1, ?2, ?3, 0, ?4, ?5, ?6)`
  )
    .bind(
      input.id,
      input.email,
      input.codeHash,
      input.now + OTP_TTL_MS,
      input.requestIp,
      input.now
    )
    .run();
}

export async function getChallenge(
  DB: D1Database,
  id: string
): Promise<OtpChallengeRow | null> {
  return (
    (await DB.prepare(
      `SELECT id, email, code_hash, attempts, expires_at, verified_at,
              reset_token_hash, reset_expires_at, used_at
         FROM password_otp_challenges WHERE id = ?1`
    )
      .bind(id)
      .first<OtpChallengeRow>()) ?? null
  );
}

export async function registerAttempt(DB: D1Database, id: string): Promise<void> {
  await DB.prepare(
    "UPDATE password_otp_challenges SET attempts = attempts + 1 WHERE id = ?1"
  )
    .bind(id)
    .run();
}

export async function markVerified(
  DB: D1Database,
  input: { id: string; resetTokenHash: string; now: number }
): Promise<void> {
  await DB.prepare(
    `UPDATE password_otp_challenges
        SET verified_at = ?2, reset_token_hash = ?3, reset_expires_at = ?4
      WHERE id = ?1`
  )
    .bind(input.id, input.now, input.resetTokenHash, input.now + RESET_TTL_MS)
    .run();
}

export async function markUsed(DB: D1Database, id: string, now: number): Promise<void> {
  await DB.prepare("UPDATE password_otp_challenges SET used_at = ?2 WHERE id = ?1")
    .bind(id, now)
    .run();
}

/**
 * Faxina oportunista: o projeto não tem cron, então cada novo pedido apaga os
 * desafios já vencidos há bastante tempo. Mantém a tabela pequena sem tarefa
 * agendada e sem apagar nada que ainda possa estar em uso.
 */
export async function purgeExpiredChallenges(DB: D1Database, now: number): Promise<void> {
  try {
    await DB.prepare("DELETE FROM password_otp_challenges WHERE expires_at < ?1")
      .bind(now - RESET_TTL_MS)
      .run();
  } catch (error) {
    // Faxina é acessório: falhar aqui não pode derrubar o pedido do usuário.
    console.warn("purgeExpiredChallenges falhou:", error);
  }
}

function randomHex(bytes: number): string {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return Array.from(buffer)
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}
