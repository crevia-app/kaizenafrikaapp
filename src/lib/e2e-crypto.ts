/**
 * End-to-End Encryption for Kaizen Chat
 * RSA-OAEP-2048 / SHA-256 for key exchange, AES-256-GCM for messages.
 *
 * Flow:
 * 1. Each user generates an RSA-OAEP key pair on first use.
 * 2. Public keys are stored in Supabase (user_encryption_keys).
 * 3. Private keys are stored in IndexedDB as native CryptoKey objects.
 * 4. Per-room: a random AES-256-GCM key is generated.
 * 5. The room key is wrapped with each member's RSA public key via wrapKey.
 * 6. Messages are encrypted/decrypted with the room's AES key.
 */

import {
  idbStorePrivateKey,
  idbGetPrivateKey,
  idbStorePublicKeyJwk,
  idbGetPublicKeyJwk,
  idbStoreRoomKey,
  idbGetRoomKey,
  idbClearRoomKey,
} from "./indexeddb-crypto";

const RSA_PARAMS = {
  name: "RSA-OAEP",
  modulusLength: 2048,
  publicExponent: new Uint8Array([0x01, 0x00, 0x01]), // 65537
  hash: "SHA-256",
} as const;

// ========================
// Key Generation
// ========================

export async function generateUserKeyPair(): Promise<{
  publicKeyJwk: JsonWebKey;
  privateKey: CryptoKey;
}> {
  const keyPair = await crypto.subtle.generateKey(
    RSA_PARAMS,
    true, // extractable: true — required for JWK export and encrypted cloud backup
    ["wrapKey", "unwrapKey"]
  );
  const publicKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  return { publicKeyJwk, privateKey: keyPair.privateKey };
}

export async function generateRoomKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
}

// ========================
// Room Key Wrapping — RSA-OAEP direct wrap (no ECDH derivation step)
// ========================

// Encrypts an AES room key for a specific recipient using their RSA public key.
// RSA-OAEP can wrap up to 190 bytes with 2048-bit / SHA-256; AES-256 raw = 32 bytes ✓
export async function wrapRoomKey(
  roomKey: CryptoKey,
  _myPrivateKey: CryptoKey, // unused — kept for call-site compatibility
  theirPublicKeyJwk: JsonWebKey
): Promise<string> {
  const recipientPublicKey = await crypto.subtle.importKey(
    "jwk",
    theirPublicKeyJwk,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false,
    ["wrapKey"]
  );
  const wrapped = await crypto.subtle.wrapKey("raw", roomKey, recipientPublicKey, {
    name: "RSA-OAEP",
  });
  return btoa(String.fromCharCode(...new Uint8Array(wrapped)));
}

// Decrypts a wrapped room key using the current user's RSA private key.
export async function unwrapRoomKey(
  wrappedKeyBase64: string,
  myPrivateKey: CryptoKey,
  _theirPublicKeyJwk: JsonWebKey // unused — kept for call-site compatibility
): Promise<CryptoKey> {
  const wrapped = Uint8Array.from(atob(wrappedKeyBase64), (c) => c.charCodeAt(0));
  return crypto.subtle.unwrapKey(
    "raw",
    wrapped,
    myPrivateKey,
    { name: "RSA-OAEP" },
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

// ========================
// Message Encryption / Decryption
// ========================

export async function encryptMessage(plaintext: string, roomKey: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    roomKey,
    new TextEncoder().encode(plaintext)
  );
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

export async function decryptMessage(
  ciphertextBase64: string,
  roomKey: CryptoKey
): Promise<string> {
  try {
    const combined = Uint8Array.from(atob(ciphertextBase64), (c) => c.charCodeAt(0));
    if (combined.length < 13) return "[Unable to decrypt message]";
    const iv = combined.slice(0, 12);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      roomKey,
      combined.slice(12)
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    return "[Unable to decrypt message]";
  }
}

// ========================
// Local key management (IndexedDB)
// ========================

export async function initUserKeys(userId: string): Promise<{
  publicKeyJwk: JsonWebKey;
  isNew: boolean;
}> {
  const existingPrivateKey = await idbGetPrivateKey(userId);
  if (existingPrivateKey) {
    const storedPublicKeyJwk = await idbGetPublicKeyJwk(userId);
    if (storedPublicKeyJwk) {
      return { publicKeyJwk: storedPublicKeyJwk, isNew: false };
    }
  }
  const { publicKeyJwk, privateKey } = await generateUserKeyPair();
  await idbStorePrivateKey(userId, privateKey);
  await idbStorePublicKeyJwk(userId, publicKeyJwk);
  return { publicKeyJwk, isNew: true };
}

export async function getUserPrivateKey(userId: string): Promise<CryptoKey | null> {
  return idbGetPrivateKey(userId);
}

export async function cacheRoomKey(roomId: string, roomKey: CryptoKey): Promise<void> {
  return idbStoreRoomKey(roomId, roomKey);
}

export async function getCachedRoomKey(roomId: string): Promise<CryptoKey | null> {
  return idbGetRoomKey(roomId);
}

export async function clearRoomKeyCache(roomId: string): Promise<void> {
  return idbClearRoomKey(roomId);
}

// ========================
// Private Key Cloud Backup — cross-device sync
//
// Security model (v2): PBKDF2(userRecoveryPassword, randomSalt, 210k) → AES-GCM wrapping key.
// The salt is stored alongside the ciphertext in Supabase; RLS prevents any other user
// from reading it. The plaintext private key never leaves the device.
//
// v1 (legacy, read-only): PBKDF2(userId, randomSalt, 100k) — userId is not a secret.
// Any v1 backup is auto-restored on first login then immediately migrated to v2.
// ========================

const PBKDF2_ITERATIONS_V1 = 100_000; // legacy scheme — do not use for new keys
const PBKDF2_ITERATIONS_V2 = 210_000; // OWASP 2024 recommendation
const V2_PREFIX = "v2:";

// Returns true when the stored blob was produced by the v2 (password-based) scheme.
export function isV2Key(encryptedKey: string): boolean {
  return encryptedKey.startsWith(V2_PREFIX);
}

async function deriveWrappingKey(
  secret: string,
  salt: Uint8Array,
  iterations: number
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt.buffer.slice(
        salt.byteOffset,
        salt.byteOffset + salt.byteLength
      ) as ArrayBuffer,
      iterations,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// ── v2: password-based backup (use this for all new backups) ──────────────────

export async function backupPrivateKey(
  password: string, // user-defined recovery password — never sent to server
  privateKey: CryptoKey
): Promise<{ encryptedKey: string; saltBase64: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const wrappingKey = await deriveWrappingKey(password, salt, PBKDF2_ITERATIONS_V2);
  const jwk = await crypto.subtle.exportKey("jwk", privateKey);
  const encoded = new TextEncoder().encode(JSON.stringify(jwk));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    wrappingKey,
    encoded
  );
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return {
    encryptedKey: V2_PREFIX + btoa(String.fromCharCode(...combined)),
    saltBase64: btoa(String.fromCharCode(...salt)),
  };
}

// Decrypts a v2 backup using the user's recovery password and caches it in IndexedDB.
// Throws a DOMException if the password is wrong — callers should catch and surface
// a "Incorrect recovery password" message rather than a generic error.
export async function restorePrivateKey(
  userId: string,   // used only for IDB key name — not for crypto
  password: string, // the user's recovery password
  encryptedKey: string,
  saltBase64: string
): Promise<CryptoKey> {
  const rawBase64 = encryptedKey.startsWith(V2_PREFIX)
    ? encryptedKey.slice(V2_PREFIX.length)
    : encryptedKey;
  const salt = Uint8Array.from(atob(saltBase64), (c) => c.charCodeAt(0));
  const wrappingKey = await deriveWrappingKey(password, salt, PBKDF2_ITERATIONS_V2);
  const combined = Uint8Array.from(atob(rawBase64), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    wrappingKey,
    combined.slice(12)
  );
  const jwk = JSON.parse(new TextDecoder().decode(decrypted)) as JsonWebKey;
  const privateKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true, // extractable: true so the key can be re-backed-up if needed
    ["unwrapKey"]
  );
  await idbStorePrivateKey(userId, privateKey);
  return privateKey;
}

// ── v1: legacy scheme — used for new user generation until they set a password ─

// Creates a v1 backup (no v2: prefix) keyed by userId. Used ONLY during initial
// key generation for brand-new users who have not yet set a recovery password.
// The migration prompt (needsMigration: true) will upgrade them to v2 immediately.
export async function backupPrivateKeyV1(
  userId: string,
  privateKey: CryptoKey
): Promise<{ encryptedKey: string; saltBase64: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const wrappingKey = await deriveWrappingKey(userId, salt, PBKDF2_ITERATIONS_V1);
  const jwk = await crypto.subtle.exportKey("jwk", privateKey);
  const encoded = new TextEncoder().encode(JSON.stringify(jwk));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, wrappingKey, encoded);
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return {
    encryptedKey: btoa(String.fromCharCode(...combined)), // deliberately no v2: prefix
    saltBase64: btoa(String.fromCharCode(...salt)),
  };
}

// Auto-restores a v1 backup using the userId as the PBKDF2 input.
// Call this ONLY when migrating an existing user; immediately call
// migrateToPasswordScheme() afterward to re-encrypt under a real password.
export async function restorePrivateKeyV1(
  userId: string, // used as both IDB key name and PBKDF2 password (v1 behaviour)
  encryptedKey: string,
  saltBase64: string
): Promise<CryptoKey> {
  const salt = Uint8Array.from(atob(saltBase64), (c) => c.charCodeAt(0));
  const wrappingKey = await deriveWrappingKey(userId, salt, PBKDF2_ITERATIONS_V1);
  const combined = Uint8Array.from(atob(encryptedKey), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    wrappingKey,
    combined.slice(12)
  );
  const jwk = JSON.parse(new TextDecoder().decode(decrypted)) as JsonWebKey;
  const privateKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["unwrapKey"]
  );
  await idbStorePrivateKey(userId, privateKey);
  return privateKey;
}

// ========================
// Helpers
// ========================

// Returns true if the string looks like a base64-encoded encrypted payload
// (IV prefix = 12 bytes → at least 16 base64 chars of meaningful content).
export function isEncryptedContent(content: string | null): boolean {
  if (!content || content.length < 20) return false;
  try {
    return atob(content).length >= 13;
  } catch {
    return false;
  }
}
