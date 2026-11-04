/**
 * Encrypted refresh-token storage.
 *
 * The refresh token is stored in localStorage under `secure_rt` as AES-256-GCM ciphertext
 * (`v1.<iv>.<ciphertext>`, base64). The AES key is generated in the browser as a
 * NON-extractable WebCrypto key and persisted in IndexedDB, so the raw key can never be read
 * by JS: a copied/dumped localStorage value is useless outside this browser profile.
 *
 * Note: code running on this origin (e.g. an XSS payload) can still call
 * `getSecureRefreshToken()`. This protects the token at rest, it is not a substitute for
 * HttpOnly cookies.
 */

export const SECURE_RT_KEY = 'secure_rt';
const LEGACY_RT_KEY = 'refreshToken';

const DB_NAME = 'pratham_secure_store';
const DB_STORE = 'keys';
const KEY_ID = 'secure_rt_key_v1';
const FORMAT_VERSION = 'v1';
const IV_LENGTH = 12;

let keyPromise: Promise<CryptoKey> | null = null;
// Used only on insecure origins (plain http, non-localhost) where WebCrypto is unavailable:
// the token lives for the page lifetime and is never written to storage in plaintext.
let memoryFallback: string | null = null;

const isBrowser = () =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const isCryptoAvailable = () =>
  isBrowser() && !!window.crypto?.subtle && typeof window.indexedDB !== 'undefined';

const toBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return window.btoa(binary);
};

const fromBase64 = (value: string): Uint8Array => {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
};

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(DB_STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const idbRequest = <T>(
  db: IDBDatabase,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest
): Promise<T> =>
  new Promise((resolve, reject) => {
    const request = run(db.transaction(DB_STORE, mode).objectStore(DB_STORE));
    request.onsuccess = () => resolve(request.result as T);
    request.onerror = () => reject(request.error);
  });

const loadOrCreateKey = async (): Promise<CryptoKey> => {
  const db = await openDb();
  try {
    const existing = await idbRequest<CryptoKey | undefined>(db, 'readonly', (s) =>
      s.get(KEY_ID)
    );
    if (existing) return existing;

    const key = await window.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false, // non-extractable
      ['encrypt', 'decrypt']
    );
    try {
      // `add` (not `put`) so a key created concurrently by another tab is never overwritten.
      await idbRequest(db, 'readwrite', (s) => s.add(key, KEY_ID));
      return key;
    } catch {
      const winner = await idbRequest<CryptoKey | undefined>(db, 'readonly', (s) =>
        s.get(KEY_ID)
      );
      if (winner) return winner;
      throw new Error('Unable to persist encryption key');
    }
  } finally {
    db.close();
  }
};

const getKey = (): Promise<CryptoKey> => {
  if (!keyPromise) {
    keyPromise = loadOrCreateKey().catch((error) => {
      keyPromise = null;
      throw error;
    });
  }
  return keyPromise;
};

const additionalData = () => new TextEncoder().encode(SECURE_RT_KEY);

export const encryptValue = async (plainText: string): Promise<string> => {
  const key = await getKey();
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const cipher = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: additionalData() },
    key,
    new TextEncoder().encode(plainText)
  );
  return `${FORMAT_VERSION}.${toBase64(iv)}.${toBase64(new Uint8Array(cipher))}`;
};

export const decryptValue = async (payload: string): Promise<string> => {
  const [version, ivPart, cipherPart] = payload.split('.');
  if (version !== FORMAT_VERSION || !ivPart || !cipherPart) {
    throw new Error('Unsupported encrypted payload');
  }
  const key = await getKey();
  const plain = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(ivPart), additionalData: additionalData() },
    key,
    fromBase64(cipherPart)
  );
  return new TextDecoder().decode(plain);
};

/** Encrypts and stores the refresh token. Passing an empty value clears it. */
export const setSecureRefreshToken = async (
  refreshToken?: string | null
): Promise<void> => {
  if (!isBrowser()) return;
  if (!refreshToken) {
    clearSecureRefreshToken();
    return;
  }
  // Never keep a plaintext copy around once we own the token.
  localStorage.removeItem(LEGACY_RT_KEY);
  if (!isCryptoAvailable()) {
    memoryFallback = refreshToken;
    return;
  }
  try {
    localStorage.setItem(SECURE_RT_KEY, await encryptValue(refreshToken));
  } catch (error) {
    console.error('Failed to store refresh token securely:', error);
    memoryFallback = refreshToken;
  }
};

/** Returns the decrypted refresh token, or null if missing/undecryptable. */
export const getSecureRefreshToken = async (): Promise<string | null> => {
  if (!isBrowser()) return null;
  if (!isCryptoAvailable()) return memoryFallback;

  const stored = localStorage.getItem(SECURE_RT_KEY);
  if (!stored) {
    // One-time migration for sessions created before encrypted storage existed.
    const legacy = localStorage.getItem(LEGACY_RT_KEY);
    if (legacy) {
      await setSecureRefreshToken(legacy);
      return legacy;
    }
    return memoryFallback;
  }
  try {
    return await decryptValue(stored);
  } catch (error) {
    // Tampered value or the key was wiped with site data: the token is unrecoverable.
    console.error('Failed to decrypt refresh token:', error);
    localStorage.removeItem(SECURE_RT_KEY);
    return null;
  }
};

export const clearSecureRefreshToken = (): void => {
  memoryFallback = null;
  if (!isBrowser()) return;
  localStorage.removeItem(SECURE_RT_KEY);
  localStorage.removeItem(LEGACY_RT_KEY);
};
