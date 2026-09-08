const DB_NAME = "kaizen-e2ee";
const STORE_NAME = "keys";
// v2: stores CryptoKey objects directly instead of serialised JWK objects
const DB_VERSION = 2;

function openCryptoDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      // Drop old v1 store (stored raw JWK objects) and create clean store
      if (db.objectStoreNames.contains(STORE_NAME)) {
        db.deleteObjectStore(STORE_NAME);
      }
      db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbPut(id: string, value: unknown): Promise<void> {
  const db = await openCryptoDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(value, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGet<T>(id: string): Promise<T | null> {
  const db = await openCryptoDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => resolve((req.result as T) ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(id: string): Promise<void> {
  const db = await openCryptoDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Clears the entire key store — use only for session recovery / corrupted state
export async function idbClear(): Promise<void> {
  const db = await openCryptoDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// CryptoKey objects are stored directly — IDB handles structured cloning.
// The key's own extractable flag governs whether it can be exported later.
export const idbStorePrivateKey = (userId: string, key: CryptoKey) =>
  idbPut(`private-${userId}`, key);

export const idbGetPrivateKey = (userId: string) =>
  idbGet<CryptoKey>(`private-${userId}`);

export const idbStorePublicKeyJwk = (userId: string, jwk: JsonWebKey) =>
  idbPut(`public-${userId}`, jwk);

export const idbGetPublicKeyJwk = (userId: string) =>
  idbGet<JsonWebKey>(`public-${userId}`);

export const idbStoreRoomKey = (roomId: string, key: CryptoKey) =>
  idbPut(`room-${roomId}`, key);

export const idbGetRoomKey = (roomId: string) =>
  idbGet<CryptoKey>(`room-${roomId}`);

export const idbClearRoomKey = (roomId: string) =>
  idbDelete(`room-${roomId}`);
