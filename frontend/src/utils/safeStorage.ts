/**
 * Safe wrapper around localStorage and sessionStorage that gracefully falls back
 * when Storage is unavailable (e.g. private mode, embedded WebViews like Android Telegram).
 * 
 * IMPORTANT: On Android Telegram WebView, localStorage/sessionStorage may be restricted.
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

// Separate memory storage for sessionStorage fallback
const sessionMemoryStore: Map<string, string> = new Map();
const sessionMemoryStorage: StorageLike = {
  get length() {
    return sessionMemoryStore.size;
  },
  clear() {
    sessionMemoryStore.clear();
  },
  getItem(key: string) {
    return sessionMemoryStore.get(key) ?? null;
  },
  key(index: number) {
    const keys = Array.from(sessionMemoryStore.keys());
    return keys[index] ?? null;
  },
  removeItem(key: string) {
    sessionMemoryStore.delete(key);
  },
  setItem(key: string, value: string) {
    sessionMemoryStore.set(key, value);
  },
};

let resolvedStorage: StorageLike | null = null;
let resolvedSessionStorage: StorageLike | null = null;
let usingMemoryFallback = false;
let usingSessionMemoryFallback = false;

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

function resolveSessionStorage(): StorageLike {
  if (resolvedSessionStorage) {
    return resolvedSessionStorage;
  }

  if (typeof window === 'undefined') {
    resolvedSessionStorage = sessionMemoryStorage;
    usingSessionMemoryFallback = true;
    return resolvedSessionStorage;
  }

  try {
    const storage = window.sessionStorage;
    const testKey = '__bahamm_safe_session_storage__';
    storage.setItem(testKey, '1');
    storage.removeItem(testKey);
    resolvedSessionStorage = storage;
  } catch (e) {
    console.warn('[SafeStorage] ⚠️ sessionStorage unavailable, using in-memory fallback. Error:', e);
    console.warn('[SafeStorage] This may happen in Android Telegram WebView or private browsing mode.');
    resolvedSessionStorage = sessionMemoryStorage;
    usingSessionMemoryFallback = true;
  }

  return resolvedSessionStorage;
}

// Export flag to check if we're using memory fallback
export function isUsingMemoryStorage(): boolean {
  resolveStorage(); // Ensure storage is resolved
  return usingMemoryFallback;
}

export function isUsingSessionMemoryStorage(): boolean {
  resolveSessionStorage(); // Ensure storage is resolved
  return usingSessionMemoryFallback;
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

// Safe sessionStorage wrapper
export const safeSessionStorage: StorageLike = {
  get length() {
    try {
      return resolveSessionStorage().length;
    } catch {
      return 0;
    }
  },
  clear() {
    try {
      resolveSessionStorage().clear();
    } catch {}
  },
  getItem(key: string) {
    try {
      return resolveSessionStorage().getItem(key);
    } catch {
      return null;
    }
  },
  key(index: number) {
    try {
      return resolveSessionStorage().key(index);
    } catch {
      return null;
    }
  },
  removeItem(key: string) {
    try {
      resolveSessionStorage().removeItem(key);
    } catch {}
  },
  setItem(key: string, value: string) {
    try {
      resolveSessionStorage().setItem(key, value);
    } catch {}
  },
};

/**
 * Safely dispatch a storage event for cross-tab synchronization.
 * This handles Android Telegram WebView which doesn't support the 
 * StorageEvent constructor with options object (requires Chrome 70+).
 */
export function dispatchStorageEvent(
  key: string | null,
  newValue: string | null,
  oldValue: string | null
): void {
  if (typeof window === 'undefined') return;

  try {
    // Try the modern StorageEvent constructor first
    const event = new StorageEvent('storage', {
      key,
      newValue,
      oldValue,
      url: window.location.href,
      storageArea: window.localStorage,
    });
    window.dispatchEvent(event);
  } catch (e) {
    // Fallback for older browsers (Android WebView < Chrome 70)
    // Use a CustomEvent which is more widely supported
    try {
      const customEvent = new CustomEvent('storage', {
        detail: { key, newValue, oldValue },
      });
      window.dispatchEvent(customEvent);
    } catch (e2) {
      // If even CustomEvent fails, try document.createEvent (very old browsers)
      try {
        const evt = document.createEvent('StorageEvent');
        // initStorageEvent is deprecated but works on old browsers
        (evt as any).initStorageEvent(
          'storage',
          false,
          false,
          key,
          oldValue,
          newValue,
          window.location.href,
          window.localStorage
        );
        window.dispatchEvent(evt);
      } catch (e3) {
        // Last resort: just log the issue and continue
        // Cross-tab sync won't work but at least the app won't crash
        console.warn('[safeStorage] Could not dispatch storage event:', e3);
      }
    }
  }
}






