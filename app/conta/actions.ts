"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { usuarioAtual } from "@/lib/dados";

export type EstadoConta = { erro?: string; ok?: string };

export async function salvarNome(_: EstadoConta, form: FormData): Promise<EstadoConta> {
  const nome = String(form.get("nome") ?? "").trim();
  if (nome.length < 2) return { erro: "Informe seu nome." };
  const { supabase, userId } = await usuarioAtual();
  const { error } = await supabase.from("perfis").update({ nome }).eq("id", userId);
  if (error) return { erro: "Não foi possível salvar. Tente de novo." };
  revalidatePath("/", "layout");
  return { ok: "Nome atualizado." };
}

export async function salvarSenha(_: EstadoConta, form: FormData): Promise<EstadoConta> {
  const senha = String(form.get("senha") ?? "");
  const repetir = String(form.get("repetir") ?? "");
  if (senha.length < 8) return { erro: "A senha precisa ter pelo menos 8 caracteres." };
  if (senha !== repetir) return { erro: "As duas senhas não são iguais." };

  const { supabase } = await usuarioAtual();
  const { error } = await supabase.auth.updateUser({ password: senha });
  if (error) {
    if (error.message.toLowerCase().includes("different from the old")) {
      return { erro: "A nova senha precisa ser diferente da anterior." };
    }
    return { erro: "Não foi possível salvar a senha. Tente de novo." };
  }
  if (form.get("bemvindo")) redirect("/eventos");
  return { ok: "Senha alterada." };
}
