"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Cliente Supabase no navegador — usado só para enviar comprovantes direto ao Storage.
 * Não renova o login por conta própria: quem renova é o servidor (cookie de 400 dias),
 * o que mantém a pessoa conectada indefinidamente, inclusive no iPhone.
 */
export function criarClienteNavegador() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    { auth: { autoRefreshToken: false } },
  );
}
