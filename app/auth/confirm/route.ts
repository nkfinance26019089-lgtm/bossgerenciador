import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { criarClienteServidor } from "@/lib/supabase/server";
import { destinoSeguro } from "@/lib/origem";
import { descreverDispositivo } from "@/lib/dispositivo";

const TIPOS: EmailOtpType[] = ["invite", "magiclink", "recovery", "signup", "email", "email_change"];

/**
 * Recebe os links de acesso (convite, link de acesso, recuperação de senha),
 * cria a sessão e leva a pessoa para a página certa.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const tipo = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  // Convite e recuperação sempre levam para criar a senha.
  const precisaSenha = tipo === "invite" || tipo === "recovery" || tipo === "magiclink";
  const next = destinoSeguro(searchParams.get("next"), precisaSenha ? "/conta?bemvindo=1" : "/eventos");

  const supabase = await criarClienteServidor();
  let ok = false;

  if (tokenHash && tipo && TIPOS.includes(tipo)) {
    const { error } = await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  if (ok) {
    await supabase
      .rpc("registrar_login", { p_dispositivo: descreverDispositivo(request.headers.get("user-agent")), p_via: "link" })
      .then(() => undefined, () => undefined);
  }
  const destino = ok ? next : "/login?erro=link";
  return NextResponse.redirect(new URL(destino, origin));
}
