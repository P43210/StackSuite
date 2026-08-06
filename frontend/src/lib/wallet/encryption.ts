/**
 * Encrypts/decrypts the mnemonic for browser storage using the native
 * Web Crypto API - no third-party crypto dependency for this part.
 * AES-256-GCM (authenticated encryption - tampered ciphertext fails to
 * decrypt rather than silently returning garbage) with a key derived
 * from the user's password via PBKDF2 (210,000 iterations, per current
 * OWASP guidance for PBKDF2-SHA256 as of this writing).
 *
 * This password is the wallet's own encryption password, deliberately
 * separate from the account login password - losing it, with no copy
 * of the mnemonic elsewhere, means permanent loss of funds. That's the
 * expected, standard model for self-custody (the same as any other
 * wallet), not a bug to work around.
 */

const PBKDF2_ITERATIONS = 210_000;
const SALT_LENGTH_BYTES = 16;
const IV_LENGTH_BYTES = 12; // standard for AES-GCM

export interface EncryptedPayload {
  ciphertext: string; // base64
  salt: string; // base64
  iv: string; // base64
}

// Newer TS DOM lib types want ArrayBufferView<ArrayBuffer> specifically
// (excluding SharedArrayBuffer-backed views), which Uint8Array's default
// type parameter doesn't guarantee even though every array here is
// always freshly allocated and never shared. One helper, applied at
// every Web Crypto call site, instead of scattering casts.
function asBufferSource(bytes: Uint8Array): BufferSource {
  return bytes as unknown as BufferSource;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    asBufferSource(new TextEncoder().encode(password)),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: asBufferSource(salt),
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptMnemonic(
  mnemonic: string,
  password: string,
): Promise<EncryptedPayload> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));
  const key = await deriveKey(password, salt);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: asBufferSource(iv) },
    key,
    asBufferSource(new TextEncoder().encode(mnemonic)),
  );

  return {
    ciphertext: bytesToBase64(new Uint8Array(ciphertextBuffer)),
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
  };
}

export class DecryptionError extends Error {
  constructor() {
    super("Incorrect password, or the stored data has been corrupted.");
  }
}

export async function decryptMnemonic(
  payload: EncryptedPayload,
  password: string,
): Promise<string> {
  const salt = base64ToBytes(payload.salt);
  const iv = base64ToBytes(payload.iv);
  const key = await deriveKey(password, salt);

  try {
    const plaintextBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: asBufferSource(iv) },
      key,
      asBufferSource(base64ToBytes(payload.ciphertext)),
    );
    return new TextDecoder().decode(plaintextBuffer);
  } catch {
    throw new DecryptionError();
  }
}
