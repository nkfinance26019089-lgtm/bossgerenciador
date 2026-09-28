"use client";

import { useEffect } from "react";

/** Ativa o modo aplicativo (service worker). Só em produção, para não atrapalhar o desenvolvimento. */
export function RegistrarApp() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const registrar = () => navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
    if (document.readyState === "complete") registrar();
    else window.addEventListener("load", registrar, { once: true });
  }, []);
  return null;
}
