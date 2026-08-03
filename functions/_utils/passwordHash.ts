/// <reference types="@cloudflare/workers-types" />

/**
 * Hash de senha do peregrino, com PBKDF2-HMAC-SHA256.
 *
 * Por que não reaproveitar `hashPassword` de adminAuth.ts: aquele é SHA-256
 * puro, **sem sal**, com pepper vazio em produção. Sem sal, senhas iguais geram
 * hashes iguais — foi exatamente assim que se descobriu, por comparação de
 * hash, que 9 dos 11 admins ainda usavam a senha padrão. Aguenta 11 contas;
 * com centenas de peregrinos é rainbow-table direto.
 *
 * `admin_users` fica como está (decisão de 03/08/2026): trocar o algoritmo lá
 * exigiria re-hash dos 11 admins e mexer no fluxo que acabou de ser
 * estabilizado. O hash forte entra onde o volume justifica.
 */

/**
 * Formato: pbkdf2$<iteracoes>$<salt_hex>$<hash_hex>
 *
 * Auto-descritivo de propósito. Guardar as iterações junto do hash permite
 * aumentá-las no futuro sem invalidar as senhas já criadas: a verificação usa
 * o número gravado na linha, não a constante atual.
 */
const ALGORITHM_TAG = "pbkdf2";

/**
 * Equilíbrio entre força e o tempo de CPU disponível numa Pages Function. Bem
 * acima do que um ataque de dicionário torna prático, e ainda imperceptível no
 * login. Para elevar depois, basta mudar aqui: hashes antigos seguem válidos.
 */
const ITERATIONS = 100_000;

const SALT_BYTES = 16;
const HASH_BITS = 256;

const textEncoder = new TextEncoder();

export async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(SALT_BYTES);
  crypto.getRandomValues(salt);
  const hash = await derive(password, salt, ITERATIONS);
  return `${ALGORITHM_TAG}$${ITERATIONS}$${toHex(salt)}$${toHex(hash)}`;
}

/**
 * Nunca lança: entrada malformada vira `false`. Um hash corrompido no banco
 * deve barrar o login, não derrubar o endpoint com 500 — o 500 diria a quem
 * tenta que aquela conta tem algo diferente das outras.
 */
export async function verifyPassword(
  storedHash: string,
  password: string
): Promise<boolean> {
  try {
    const parts = storedHash.split("$");
    if (parts.length !== 4 || parts[0] !== ALGORITHM_TAG) return false;

    const iterations = Number(parts[1]);
    if (!Number.isInteger(iterations) || iterations <= 0) return false;

    const salt = fromHex(parts[2]);
    if (!salt) return false;

    const candidate = await derive(password, salt, iterations);
    return constantTimeEquals(toHex(candidate), parts[3]);
  } catch {
    return false;
  }
}

/** Comparação de tempo constante: não vaza quantos caracteres bateram. */
function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function derive(
  password: string,
  salt: Uint8Array,
  iterations: number
): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    key,
    HASH_BITS
  );
}

function toHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(value: string): Uint8Array | null {
  if (value.length === 0 || value.length % 2 !== 0) return null;
  const bytes = new Uint8Array(value.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    const byte = Number.parseInt(value.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) return null;
    bytes[i] = byte;
  }
  return bytes;
}
