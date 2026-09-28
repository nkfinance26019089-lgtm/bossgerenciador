import { NextResponse, type NextRequest } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ehUuid } from "@/lib/dados";

/**
 * Presença pelo servidor (em vez de direto do navegador): assim a renovação do
 * login é sempre gravada pelo servidor, com validade longa — o iPhone não derruba a sessão.
 */

// POST: "estou aqui" (a cada 30 s)
export async function POST(request: NextRequest) {
  const supabase = await criarClienteServidor();
  let corpo: { chave?: string; dispositivo?: string; pagina?: string } = {};
  try {
    corpo = await request.json();
  } catch {}
  const { error } = await supabase.rpc("registrar_sinal", {
    p_chave: String(corpo.chave ?? "").slice(0, 64),
    p_dispositivo: corpo.dispositivo ? String(corpo.dispositivo).slice(0, 80) : null,
    p_pagina: corpo.pagina ? String(corpo.pagina).slice(0, 120) : null,
  });
  return NextResponse.json({ ok: !error }, { headers: { "Cache-Control": "no-store" } });
}

// GET: quem está online (opcionalmente só de um evento)
export async function GET(request: NextRequest) {
  const evento = request.nextUrl.searchParams.get("evento");
  const supabase = await criarClienteServidor();
  const { data } = await supabase.rpc("pessoas_online", { p_evento: ehUuid(evento) ? evento : null });
  return NextResponse.json(data ?? [], { headers: { "Cache-Control": "no-store" } });
}
