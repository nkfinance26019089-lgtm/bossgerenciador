import { NextResponse, type NextRequest } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await criarClienteServidor();
  let chave = "";
  try {
    chave = String((await request.formData()).get("chave") ?? "");
  } catch {}
  // registra a saída no histórico antes de encerrar o login
  await supabase.rpc("encerrar_sessao", { p_chave: chave }).then(() => undefined, () => undefined);
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.nextUrl.origin), { status: 303 });
}
