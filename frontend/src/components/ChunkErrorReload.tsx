"use client";

import { useEffect, useRef } from "react";
import { safeSessionStorage } from "@/utils/safeStorage";

/**
 * Globally listens for chunk loading failures (e.g. after a new deployment)
 * and forces a one-time reload to recover. Guards against infinite loops via sessionStorage.
 */
export default function ChunkErrorReload() {
  const reloadedRef = useRef(false);

  useEffect(() => {
    const storageKey = "once-reload-on-chunk-error";
    const countKey = "chunk-error-reload-count";
    reloadedRef.current = safeSessionStorage.getItem(storageKey) === "1";

    const markReloaded = () => {
      safeSessionStorage.setItem(storageKey, "1");
    };

    const isChunkErrorLike = (value: unknown): boolean => {
      const s = String((value as any)?.message || value || "");
      if (!s) return false;
      return (
        s.includes("ChunkLoadError") ||
        s.includes("Loading chunk") ||
        s.includes("dynamic import") ||
        s.includes("_next/static/chunks/")
      );
    };

    const navigateWithCacheBust = () => {
      // If Telegram Android (or any aggressive WebView cache) is serving stale HTML,
      // a plain reload can keep returning the same cached document. Add a cache-buster.
      let nextHref = window.location.href;
      try {
        const u = new URL(window.location.href);
        u.searchParams.set("__r", String(Date.now()));
        nextHref = u.toString();
      } catch {
        // Fallback to best-effort append
        const sep = nextHref.includes("?") ? "&" : "?";
        nextHref = `${nextHref}${sep}__r=${Date.now()}`;
      }

      try {
        window.location.replace(nextHref);
      } catch {
        window.location.href = nextHref;
      }
    };

    const reloadOnce = () => {
      if (reloadedRef.current) return;
      reloadedRef.current = true;
      markReloaded();
      try {
        const currentCount = Number(safeSessionStorage.getItem(countKey) || "0");
        // Extra guard against loops: never attempt recovery more than twice per session.
        if (currentCount >= 2) return;
        safeSessionStorage.setItem(countKey, String(currentCount + 1));
        // Prefer navigation w/ cache-buster over plain reload (Android Telegram cache).
        navigateWithCacheBust();
      } catch {
        // Fallback
        window.location.href = window.location.href;
      }
    };

    const onUnhandledRejection = (e: PromiseRejectionEvent) => {
      const reason: any = e?.reason;
      if (isChunkErrorLike(reason)) reloadOnce();
    };

    const onError = (e: Event) => {
      // Detect failed script loads pointing to Next chunks
      const target = e.target as HTMLScriptElement | null;
      const src = target?.src || "";
      if (src && src.includes("/_next/static/chunks/")) {
        reloadOnce();
        return;
      }
      // Some browsers attach message to the event
      const anyEvent = e as any;
      if (isChunkErrorLike(anyEvent?.message)) reloadOnce();
    };

    window.addEventListener("unhandledrejection", onUnhandledRejection);
    window.addEventListener("error", onError, true);

    return () => {
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      window.removeEventListener("error", onError, true);
    };
  }, []);

  return null;
}


