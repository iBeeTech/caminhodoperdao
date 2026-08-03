/// <reference types="@cloudflare/workers-types" />
import { unauthorized, serverError, forbidden } from "./responses";

/**
 * Sessão do peregrino. Mesmo desenho de token do admin (HS256 curto, sem
 * estado no servidor), mas com papel próprio e verificação própria.
 *
 * Os dois mundos não se cruzam: `verifyJwt` do adminAuth recusa qualquer token
 * cujo papel não seja "admin", e o daqui recusa qualquer um que não seja
 * "peregrino". Então um token de peregrino não abre `/admin`, e vice-versa,
 * mesmo os dois sendo assinados com o mesmo segredo.
 */

export interface UserAuthEnv {
  DB: D1Database;
  /**
   * Segredo próprio da sessão de peregrino. Opcional: sem ele, cai no
   * ADMIN_JWT_SECRET, que já existe como secret do Pages. Separar os dois é
   * melhor higiene (chave por público) e este campo existe para permitir isso
   * depois, sem mexer no código.
   */
  USER_JWT_SECRET?: string;
  ADMIN_JWT_SECRET?: string;
  USER_JWT_TTL_SECONDS?: string;
}

export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  email_confirmed_at: number | null;
  confirm_code_hash: string | null;
  confirm_expires_at: number | null;
  confirm_attempts: number;
}

export interface UserTokenPayload {
  sub: string;
  email: string;
  role: "peregrino";
  iat: number;
  exp: number;
}

/** 30 dias: o peregrino entra poucas vezes por ano, relogar sempre irrita. */
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 30;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export function getUserJwtSecret(env: UserAuthEnv): string | null {
  return env.USER_JWT_SECRET?.trim() || env.ADMIN_JWT_SECRET?.trim() || null;
}

export function getUserJwtTtlSeconds(env: UserAuthEnv): number {
  const ttl = Number(env.USER_JWT_TTL_SECONDS);
  return Number.isFinite(ttl) && ttl > 0 ? ttl : DEFAULT_TTL_SECONDS;
}

export async function getUserByEmail(
  DB: D1Database,
  email: string
): Promise<UserRecord | null> {
  return (
    (await DB.prepare(
      `SELECT id, email, password_hash, email_confirmed_at,
              confirm_code_hash, confirm_expires_at, confirm_attempts
         FROM users WHERE email = ?1`
    )
      .bind(email.trim().toLowerCase())
      .first<UserRecord>()) ?? null
  );
}

export async function createUserJwt(
  payload: Omit<UserTokenPayload, "iat" | "exp">,
  secret: string,
  ttlSeconds: number
): Promise<string> {
  const iat = Math.floor(Date.now() / 1000);
  const full: UserTokenPayload = { ...payload, iat, exp: iat + ttlSeconds };
  const unsigned = `${base64UrlEncode(
    JSON.stringify({ alg: "HS256", typ: "JWT" })
  )}.${base64UrlEncode(JSON.stringify(full))}`;
  return `${unsigned}.${await signHmac(unsigned, secret)}`;
}

export async function verifyUserJwt(
  token: string,
  secret: string
): Promise<UserTokenPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const unsigned = `${parts[0]}.${parts[1]}`;
  if (parts[2] !== (await signHmac(unsigned, secret))) return null;

  try {
    const parsed = JSON.parse(base64UrlDecode(parts[1])) as UserTokenPayload;
    // Recusar papel diferente é o que impede um token de admin de valer aqui.
    if (parsed.role !== "peregrino" || !parsed.sub) return null;
    if (typeof parsed.exp !== "number") return null;
    if (Math.floor(Date.now() / 1000) >= parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Portão único dos endpoints do peregrino, espelhando authorizeAdminRequest. */
export async function authorizeUserRequest(
  request: Request,
  env: UserAuthEnv
): Promise<UserTokenPayload | Response> {
  const secret = getUserJwtSecret(env);
  if (!secret) return serverError("user_jwt_secret_missing");

  const token = (request.headers.get("Authorization") || "")
    .replace(/^Bearer\s+/i, "")
    .trim();
  if (!token) return unauthorized("missing_token");

  const payload = await verifyUserJwt(token, secret);
  if (!payload) return unauthorized("invalid_token");

  // E-mail não confirmado não se inscreve nem acessa o perfil: a conta existe,
  // mas ainda não se provou dona daquele endereço — e é por ele que passam
  // inscrição, QR code e troca.
  const user = await env.DB.prepare(
    "SELECT email_confirmed_at FROM users WHERE id = ?1"
  )
    .bind(payload.sub)
    .first<{ email_confirmed_at: number | null }>();

  if (!user) return unauthorized("invalid_token");
  if (!user.email_confirmed_at) return forbidden("email_not_confirmed");

  return payload;
}

async function signHmac(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return base64UrlEncode(
    await crypto.subtle.sign("HMAC", key, textEncoder.encode(value))
  );
}

function base64UrlEncode(input: string | ArrayBuffer): string {
  const bytes = typeof input === "string" ? textEncoder.encode(input) : new Uint8Array(input);
  let binary = "";
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(input: string): string {
  const padded = `${input}${"=".repeat((4 - (input.length % 4)) % 4)}`
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return textDecoder.decode(bytes);
}
