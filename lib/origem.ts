import "server-only";
import { headers } from "next/headers";

/** Endereço do site (ex.: https://bosspainel.vercel.app), a partir da requisição atual. */
export async function origemDoSite() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Aceita só caminhos internos ("/eventos"), nunca outro site. */
export function destinoSeguro(v: string | null | undefined, padrao = "/eventos") {
  if (!v || !v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\")) return padrao;
  return v;
}
