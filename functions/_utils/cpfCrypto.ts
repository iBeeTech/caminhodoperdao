/**
 * Criptografia AES-256-CBC para CPF.
 * Usa Web Crypto (crypto.subtle). Key e IV em base64 nas variáveis de ambiente.
 */

const ALG = "AES-CBC";
const KEY_LEN_BITS = 256;
const IV_BYTES = 16;

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export async function encryptCpf(
  plaintextCpf: string,
  keyBase64: string,
  ivBase64: string
): Promise<string> {
  const keyBytes = base64ToArrayBuffer(keyBase64);
  const ivBytes = base64ToArrayBuffer(ivBase64);
  if (ivBytes.byteLength !== IV_BYTES) {
    throw new Error("CPF_ENCRYPTION_IV must be 16 bytes (24 base64 chars)");
  }

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: ALG, length: KEY_LEN_BITS },
    false,
    ["encrypt"]
  );

  const encoded = new TextEncoder().encode(plaintextCpf);
  const cipher = await crypto.subtle.encrypt(
    { name: ALG, iv: ivBytes },
    cryptoKey,
    encoded
  );
  return arrayBufferToBase64(cipher);
}

export async function decryptCpf(
  ciphertextBase64: string,
  keyBase64: string,
  ivBase64: string
): Promise<string> {
  const keyBytes = base64ToArrayBuffer(keyBase64);
  const ivBytes = base64ToArrayBuffer(ivBase64);
  const cipherBytes = base64ToArrayBuffer(ciphertextBase64);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: ALG, length: KEY_LEN_BITS },
    false,
    ["decrypt"]
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: ALG, iv: ivBytes },
    cryptoKey,
    cipherBytes
  );
  return new TextDecoder().decode(decrypted);
}
