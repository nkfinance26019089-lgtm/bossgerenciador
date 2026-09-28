"use server";

import { criarClienteServidor } from "@/lib/supabase/server";
import { destinoSeguro, origemDoSite } from "@/lib/origem";
import { headers } from "next/headers";
import { descreverDispositivo } from "@/lib/dispositivo";
import { criarClienteAdmin } from "@/lib/supabase/admin";

export type EstadoLogin = { erro?: string; ok?: string; destino?: string };

export async function entrar(_: EstadoLogin, form: FormData): Promise<EstadoLogin> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const senha = String(form.get("senha") ?? "");
  if (!email || !senha) return { erro: "Informe e-mail e senha." };

  const supabase = await criarClienteServidor();
  let { error } = await supabase.auth.signInWithPassword({ email, password: senha });

  // Conta criada quando o Supabase ainda pedia confirmação de e-mail: o Supabase só dá esse
  // aviso depois de conferir a senha, então confirmamos aqui e entramos. Quem libera o acesso
  // de verdade é a aprovação do administrador geral no painel.
  if (error && (error.code === "email_not_confirmed" || error.message.toLowerCase().includes("email not confirmed"))) {
    try {
      const admin = criarClienteAdmin();
      const { data: perfil } = await admin.from("perfis").select("id").eq("email", email).maybeSingle();
      if (perfil?.id) {
        await admin.auth.admin.updateUserById(perfil.id, { email_confirm: true });
        ({ error } = await supabase.auth.signInWithPassword({ email, password: senha }));
      }
    } catch {}
  }
  if (error) return { erro: "E-mail ou senha incorretos." };
  const ua = (await headers()).get("user-agent");
  await supabase.rpc("registrar_login", { p_dispositivo: descreverDispositivo(ua), p_via: "senha" }).then(() => undefined, () => undefined);
  // O navegador faz o redirecionamento — assim ele pode oferecer "Salvar senha?"
  return { destino: destinoSeguro(String(form.get("voltar") ?? "")) };
}

export async function recuperarSenha(_: EstadoLogin, form: FormData): Promise<EstadoLogin> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!email) return { erro: "Informe seu e-mail." };

  const supabase = await criarClienteServidor();
  const origem = await origemDoSite();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origem}/auth/confirm?next=/conta`,
  });
  if (error && error.status === 429) {
    return { erro: "Muitos pedidos seguidos. Aguarde alguns minutos ou peça um link de acesso ao administrador." };
  }
  return {
    ok: "Se esse e-mail estiver cadastrado, você vai receber um link para criar uma nova senha. Não chegou? Peça ao administrador um link de acesso.",
  };
}
