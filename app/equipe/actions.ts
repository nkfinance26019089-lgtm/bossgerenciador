"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ehUuid, usuarioAtual } from "@/lib/dados";
import { criarClienteAdmin } from "@/lib/supabase/admin";

function voltar(tipo: "ok" | "erro", msg: string): never {
  revalidatePath("/", "layout");
  redirect(`/equipe?${tipo}=${encodeURIComponent(msg)}#contas`);
}

function erroDoBanco(m: string | undefined, padrao: string) {
  if (!m) return padrao;
  if (m.includes("pelo menos um administrador geral")) return "O painel precisa ter pelo menos um administrador geral.";
  if (m.includes("já aprovada")) return "Essa conta já tinha sido aprovada.";
  return padrao;
}

export async function aprovarConta(form: FormData) {
  const id = String(form.get("perfil_id") ?? "");
  const adminGeral = form.get("admin_geral") === "1";
  const { supabase, perfil } = await usuarioAtual();
  if (!perfil?.super_admin || !ehUuid(id)) voltar("erro", "Só administradores gerais aprovam contas.");

  const { error } = await supabase.rpc("aprovar_usuario", { p_id: id, p_admin_geral: adminGeral });
  if (error) voltar("erro", erroDoBanco(error.message, "Não foi possível aprovar a conta."));
  voltar("ok", adminGeral ? "Conta aprovada como administrador geral." : "Conta aprovada. Adicione a pessoa aos eventos em Responsáveis.");
}

export async function recusarConta(form: FormData) {
  const id = String(form.get("perfil_id") ?? "");
  const { supabase, perfil, userId } = await usuarioAtual();
  if (!perfil?.super_admin || !ehUuid(id)) voltar("erro", "Só administradores gerais recusam contas.");

  // só contas ainda não aprovadas podem ser recusadas (apagadas)
  const { data: alvo } = await supabase.from("perfis").select("nome, email, aprovado").eq("id", id).maybeSingle();
  if (!alvo) voltar("erro", "Conta não encontrada.");
  if (alvo.aprovado) voltar("erro", "Essa conta já foi aprovada.");

  const admin = criarClienteAdmin();
  await admin.from("auditoria").insert({
    evento_id: null,
    perfil_id: userId,
    acao: "usuario.recusado",
    descricao: alvo.nome,
    detalhes: { email: alvo.email },
  });
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) voltar("erro", "Não foi possível recusar a conta.");
  voltar("ok", `Cadastro de ${alvo.nome} recusado e apagado.`);
}

export async function definirAdminGeral(form: FormData) {
  const id = String(form.get("perfil_id") ?? "");
  const valor = form.get("valor") === "1";
  const { supabase, perfil } = await usuarioAtual();
  if (!perfil?.super_admin || !ehUuid(id)) voltar("erro", "Só administradores gerais alteram administradores.");

  const { error } = await supabase.rpc("definir_admin_geral", { p_id: id, p_valor: valor });
  if (error) voltar("erro", erroDoBanco(error.message, "Não foi possível alterar."));
  voltar("ok", valor ? "Agora é administrador geral." : "Deixou de ser administrador geral.");
}
