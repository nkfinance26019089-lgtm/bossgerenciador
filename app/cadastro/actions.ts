"use server";

import { headers } from "next/headers";
import { criarClienteServidor } from "@/lib/supabase/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { descreverDispositivo } from "@/lib/dispositivo";

export type EstadoCadastro = { erro?: string; ok?: string; destino?: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Cria a conta pelo servidor, já com o e-mail confirmado: o Supabase não pede nenhuma
 * confirmação. A conta nasce "aguardando aprovação" e só um administrador geral a libera,
 * dentro do painel (Equipe › Pedidos de acesso).
 */
export async function criarConta(_: EstadoCadastro, form: FormData): Promise<EstadoCadastro> {
  const nome = String(form.get("nome") ?? "").trim().replace(/\s+/g, " ");
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const senha = String(form.get("senha") ?? "");
  const repetir = String(form.get("repetir") ?? "");

  if (nome.length < 3) return { erro: "Informe seu nome completo." };
  if (!EMAIL.test(email)) return { erro: "E-mail inválido." };
  if (senha.length < 8) return { erro: "A senha precisa ter pelo menos 8 caracteres." };
  if (senha !== repetir) return { erro: "As duas senhas não são iguais." };

  let admin: ReturnType<typeof criarClienteAdmin>;
  try {
    admin = criarClienteAdmin();
  } catch {
    return { erro: "O cadastro não está configurado (falta a chave secreta do Supabase na Vercel)." };
  }

  const { error } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome: nome.slice(0, 80) },
  });

  if (error) {
    const m = error.message.toLowerCase();
    if (error.code === "email_exists" || m.includes("already") || m.includes("registered")) {
      return { erro: "Esse e-mail já tem conta. Volte e entre com sua senha." };
    }
    if (error.code === "weak_password" || m.includes("password")) {
      return { erro: "Senha fraca. Use pelo menos 8 caracteres, misturando letras e números." };
    }
    return { erro: "Não foi possível criar a conta agora. Tente de novo." };
  }

  // entra na conta recém-criada (ela verá a tela "Aguardando aprovação")
  const supabase = await criarClienteServidor();
  const { error: erroLogin } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (erroLogin) return { ok: "Conta criada! Aguarde a aprovação de um administrador e depois entre com seu e-mail e senha." };

  const ua = (await headers()).get("user-agent");
  await supabase
    .rpc("registrar_login", { p_dispositivo: descreverDispositivo(ua), p_via: "cadastro" })
    .then(() => undefined, () => undefined);
  return { destino: "/aguardando" };
}
