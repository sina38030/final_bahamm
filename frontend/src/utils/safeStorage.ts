/**
 * Safe wrapper around localStorage that gracefully falls back
 * when Storage is unavailable (e.g. private mode, embedded WebViews).
 */

type StorageLike = {
  readonly length: number;
  clear(): void;
  getItem(key: string): string | null;
  key(index: number): string | null;
  removeItem(key: string): void;
  setItem(key: string, value: string): void;
};

const memoryStorage: StorageLike = {
  get length() {
    return 0;
  },
  clear() {},
  getItem() {
    return null;
  },
  key() {
    return null;
  },
  removeItem() {},
  setItem() {},
};

let resolvedStorage: StorageLike | null = null;

function resolveStorage(): StorageLike {
  if (resolvedStorage) {
    return resolvedStorage;
  }

  if (typeof window === 'undefined') {
    resolvedStorage = memoryStorage;
    return resolvedStorage;
  }

  try {
    const storage = window.localStorage;
    const testKey = '__bahamm_safe_storage__';
    storage.setItem(testKey, '1');
    storage.removeItem(testKey);
    resolvedStorage = storage;
  } catch {
    resolvedStorage = memoryStorage;
  }

  return resolvedStorage;
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






