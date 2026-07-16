/// <reference types="@cloudflare/workers-types" />
import { unauthorized, serverError, forbidden } from "./responses";
import { isValidEmail } from "./validation";

export interface AdminAuthEnv {
  DB: D1Database;
  ADMIN_JWT_SECRET?: string;
  ADMIN_DEFAULT_EMAIL?: string;
  ADMIN_DEFAULT_PASSWORD?: string;
  ADMIN_PASSWORD_PEPPER?: string;
  ADMIN_JWT_TTL_SECONDS?: string;
}

export interface AdminUserRecord {
  id: number;
  email: string;
  password_hash: string;
  created_at: number;
  updated_at: number;
  /** 1 = precisa trocar a senha antes de usar o painel (primeiro login ou reset). */
  must_change_password: number;
}

export interface AdminTokenPayload {
  sub: string;
  role: "admin";
  iat: number;
  exp: number;
  /**
   * true = token emitido para quem ainda deve trocar a senha. Serve só para
   * chegar à tela de nova senha: authorizeAdminRequest o rejeita em todo o
   * resto, para a obrigação não ser apenas cosmética no front.
   */
  mustChange?: boolean;
}

const DEFAULT_ADMIN_EMAIL = "cassiotakarada7@gmail.com";
const DEFAULT_JWT_TTL_SECONDS = 60 * 60 * 12;

// Alfabeto sem caracteres ambíguos (0/O, 1/l/I): a senha temporária é ditada
// por WhatsApp, então confundir um caractere é o modo de falha esperado.
const TEMP_PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const TEMP_PASSWORD_LENGTH = 14;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export function getAdminDefaults(env: AdminAuthEnv) {
  return {
    email: (env.ADMIN_DEFAULT_EMAIL ?? DEFAULT_ADMIN_EMAIL).toLowerCase(),
  };
}

/**
 * Senha de bootstrap do super admin, só via env (secret) — nunca hardcoded.
 * Não existe mais senha padrão: até a criação de admin gera senha aleatória.
 * Sem isso configurado, ensureDefaultAdmin não cria ninguém.
 */
export function getAdminDefaultPassword(env: AdminAuthEnv): string | null {
  return env.ADMIN_DEFAULT_PASSWORD?.trim() || null;
}

/** Senha temporária aleatória (CSPRNG), entregue uma vez e trocada no 1º uso. */
export function generateTempPassword(): string {
  const bytes = new Uint8Array(TEMP_PASSWORD_LENGTH);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < bytes.length; i += 1) {
    out += TEMP_PASSWORD_ALPHABET[bytes[i] % TEMP_PASSWORD_ALPHABET.length];
  }
  return out;
}

export function getJwtSecret(env: AdminAuthEnv): string | null {
  return env.ADMIN_JWT_SECRET?.trim() || null;
}

export function getJwtTtlSeconds(env: AdminAuthEnv): number {
  const ttl = Number(env.ADMIN_JWT_TTL_SECONDS);
  if (Number.isFinite(ttl) && ttl > 0) {
    return ttl;
  }
  return DEFAULT_JWT_TTL_SECONDS;
}

/**
 * Bootstrap do super admin em base nova. Sem ADMIN_DEFAULT_PASSWORD (secret)
 * não cria ninguém — em produção o super admin já existe, então isto é no-op.
 */
export async function ensureDefaultAdmin(env: AdminAuthEnv): Promise<void> {
  const { email } = getAdminDefaults(env);
  if (!isValidEmail(email)) {
    throw new Error("invalid_default_admin_email");
  }
  const existing = await getAdminByEmail(env.DB, email);
  if (existing) return;

  const password = getAdminDefaultPassword(env);
  if (!password) return;

  const passwordHash = await hashPassword(password, env.ADMIN_PASSWORD_PEPPER);
  const now = Date.now();
  await env.DB.prepare(
    "INSERT INTO admin_users (email, password_hash, created_at, updated_at, must_change_password) VALUES (?1, ?2, ?3, ?4, 1)"
  )
    .bind(email, passwordHash, now, now)
    .run();
}

export async function getAdminByEmail(DB: D1Database, email: string): Promise<AdminUserRecord | null> {
  const stmt = DB.prepare(
    "SELECT id, email, password_hash, created_at, updated_at, must_change_password FROM admin_users WHERE email = ?"
  ).bind(email.toLowerCase());
  return (await stmt.first<AdminUserRecord>()) ?? null;
}

/** Troca a senha e encerra a obrigação de trocar — os dois andam juntos. */
export async function updateAdminPassword(
  DB: D1Database,
  email: string,
  passwordHash: string
): Promise<void> {
  const now = Date.now();
  await DB.prepare(
    "UPDATE admin_users SET password_hash = ?1, updated_at = ?2, must_change_password = 0 WHERE email = ?3"
  )
    .bind(passwordHash, now, email.toLowerCase())
    .run();
}

/** Define senha temporária e obriga a troca no próximo login. */
export async function setTempPassword(
  DB: D1Database,
  email: string,
  passwordHash: string
): Promise<void> {
  const now = Date.now();
  await DB.prepare(
    "UPDATE admin_users SET password_hash = ?1, updated_at = ?2, must_change_password = 1 WHERE email = ?3"
  )
    .bind(passwordHash, now, email.toLowerCase())
    .run();
}

export async function hashPassword(password: string, pepper?: string): Promise<string> {
  const combined = `${pepper ?? ""}${password}`;
  const digest = await crypto.subtle.digest("SHA-256", textEncoder.encode(combined));
  return bufferToHex(digest);
}

export async function verifyPassword(
  passwordHash: string,
  password: string,
  pepper?: string
): Promise<boolean> {
  const candidate = await hashPassword(password, pepper);
  return candidate === passwordHash;
}

export async function createJwt(
  payload: Omit<AdminTokenPayload, "iat" | "exp">,
  secret: string,
  ttlSeconds: number
): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + ttlSeconds;
  const fullPayload: AdminTokenPayload = { ...payload, iat, exp };
  const unsigned = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(
    JSON.stringify(fullPayload)
  )}`;
  const signature = await signHmac(unsigned, secret);
  return `${unsigned}.${signature}`;
}

export async function verifyJwt(token: string, secret: string): Promise<AdminTokenPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  const unsigned = `${header}.${payload}`;
  const expectedSignature = await signHmac(unsigned, secret);
  if (signature !== expectedSignature) return null;

  try {
    const payloadJson = base64UrlDecode(payload);
    const parsed = JSON.parse(payloadJson) as AdminTokenPayload;
    if (parsed.role !== "admin" || !parsed.sub) return null;
    if (parsed.mustChange !== undefined && typeof parsed.mustChange !== "boolean") return null;
    if (typeof parsed.exp !== "number") return null;
    const now = Math.floor(Date.now() / 1000);
    if (now >= parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function authorizeAdminRequest(
  request: Request,
  env: AdminAuthEnv
): Promise<AdminTokenPayload | Response> {
  const secret = getJwtSecret(env);
  if (!secret) {
    return serverError("admin_jwt_secret_missing");
  }
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return unauthorized("missing_token");
  }
  const payload = await verifyJwt(token, secret);
  if (!payload) {
    return unauthorized("invalid_token");
  }
  // Senha temporária/primeiro login: o token só serve para chegar à troca de
  // senha. Barrar aqui cobre os 23 endpoints de uma vez — inclusive os que
  // leem dados pessoais dos inscritos.
  if (payload.mustChange) {
    return forbidden("password_change_required");
  }
  return payload;
}

// Igual ao authorizeAdminRequest, mas exige que seja o ADMIN GERAL (ADMIN_DEFAULT_EMAIL,
// padrão cassiotakarada7@gmail.com). Usado em ações reservadas a ele (ex.: convites).
export async function authorizeSuperAdminRequest(
  request: Request,
  env: AdminAuthEnv
): Promise<AdminTokenPayload | Response> {
  const result = await authorizeAdminRequest(request, env);
  if (result instanceof Response) {
    return result;
  }
  const superEmail = getAdminDefaults(env).email;
  if (result.sub.trim().toLowerCase() !== superEmail) {
    return forbidden("forbidden_not_super_admin");
  }
  return result;
}

async function signHmac(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(value));
  return base64UrlEncode(signature);
}

function base64UrlEncode(input: string | ArrayBuffer): string {
  const bytes = typeof input === "string" ? textEncoder.encode(input) : new Uint8Array(input);
  let binary = "";
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(input: string): string {
  const padLength = (4 - (input.length % 4)) % 4;
  const padded = `${input}${"=".repeat(padLength)}`.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return textDecoder.decode(bytes);
}

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

