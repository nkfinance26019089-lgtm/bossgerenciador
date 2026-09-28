"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Recarrega a verificação a cada 20 s: assim que aprovado, o painel abre sozinho. */
export function VerificarAprovacao() {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => document.visibilityState === "visible" && router.refresh(), 20_000);
    return () => clearInterval(id);
  }, [router]);
  return null;
}
