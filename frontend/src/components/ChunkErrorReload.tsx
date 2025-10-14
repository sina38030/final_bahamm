"use client";

import { useEffect, useRef } from "react";

/**
 * Globally listens for chunk loading failures (e.g. after a new deployment)
 * and forces a one-time reload to recover. Guards against infinite loops via sessionStorage.
 */
export default function ChunkErrorReload() {
  const reloadedRef = useRef(false);

  useEffect(() => {
    const storageKey = "once-reload-on-chunk-error";
    try {
      reloadedRef.current = sessionStorage.getItem(storageKey) === "1";
    } catch {}

    const markReloaded = () => {
      try { sessionStorage.setItem(storageKey, "1"); } catch {}
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

    const reloadOnce = () => {
      if (reloadedRef.current) return;
      reloadedRef.current = true;
      markReloaded();
      try {
        // Prefer hard reload to bypass cached broken chunks
        window.location.reload();
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


