/**
 * Safe wrapper around localStorage that gracefully falls back
 * when Storage is unavailable (e.g. private mode, embedded WebViews like Android Telegram).
 * 
 * IMPORTANT: On Android Telegram WebView, localStorage may be restricted.
 * This wrapper provides a working in-memory fallback that persists data
 * for the duration of the session.
 */

type StorageLike = {
  readonly length: number;
  clear(): void;
  getItem(key: string): string | null;
  key(index: number): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
};

// In-memory storage that actually stores data (for Android WebView fallback)
const memoryStore: Map<string, string> = new Map();
const memoryStorage: StorageLike = {
  get length() {
    return memoryStore.size;
  },
  clear() {
    memoryStore.clear();
  },
  getItem(key: string) {
    return memoryStore.get(key) ?? null;
  },
  key(index: number) {
    const keys = Array.from(memoryStore.keys());
    return keys[index] ?? null;
  },
  removeItem(key: string) {
    memoryStore.delete(key);
  },
  setItem(key: string, value: string) {
    memoryStore.set(key, value);
  },
};

let resolvedStorage: StorageLike | null = null;
let usingMemoryFallback = false;

function resolveStorage(): StorageLike {
  if (resolvedStorage) {
    return resolvedStorage;
  }

  if (typeof window === 'undefined') {
    resolvedStorage = memoryStorage;
    usingMemoryFallback = true;
    return resolvedStorage;
  }

  try {
    const storage = window.localStorage;
    const testKey = '__bahamm_safe_storage__';
    storage.setItem(testKey, '1');
    storage.removeItem(testKey);
    resolvedStorage = storage;
  } catch (e) {
    console.warn('[SafeStorage] ⚠️ localStorage unavailable, using in-memory fallback. Error:', e);
    console.warn('[SafeStorage] This may happen in Android Telegram WebView or private browsing mode.');
    resolvedStorage = memoryStorage;
    usingMemoryFallback = true;
  }

  return resolvedStorage;
}

// Export flag to check if we're using memory fallback
export function isUsingMemoryStorage(): boolean {
  resolveStorage(); // Ensure storage is resolved
  return usingMemoryFallback;
}

export const safeStorage: StorageLike = {
  get length() {
    try {
      return resolveStorage().length;
    } catch {
      return 0;
    }
  },
  clear() {
    try {
      resolveStorage().clear();
    } catch {}
  },
  getItem(key: string) {
    try {
      return resolveStorage().getItem(key);
    } catch {
      return null;
    }
  },
  key(index: number) {
    try {
      return resolveStorage().key(index);
    } catch {
      return null;
    }
  },
  removeItem(key: string) {
    try {
      resolveStorage().removeItem(key);
    } catch {}
  },
  setItem(key: string, value: string) {
    try {
      resolveStorage().setItem(key, value);
    } catch {}
  },
};






