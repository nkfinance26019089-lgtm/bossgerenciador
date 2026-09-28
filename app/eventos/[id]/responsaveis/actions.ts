"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { contextoEvento, ehUuid } from "@/lib/dados";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { origemDoSite } from "@/lib/origem";
import type { Papel } from "@/lib/tipos";

export type EstadoConvite = { erro?: string; ok?: string; link?: string; nome?: string };

const PAPEIS: Papel[] = ["admin", "editor", "leitor"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function linkDeAcesso(
  admin: ReturnType<typeof criarClienteAdmin>,
  tipo: "invite" | "magiclink",
  email: string,
  nome?: string,
) {
  const origem = await origemDoSite();
  const { data, error } = await admin.auth.admin.generateLink({
    type: tipo,
    email,
    options: { redirectTo: `${origem}/auth/confirm`, ...(nome ? { data: { nome } } : {}) },
  });
  if (error || !data?.properties?.hashed_token) return { erro: error?.message ?? "sem token" };
  const tipoVerificacao = data.properties.verification_type ?? tipo;
  return {
    userId: data.user?.id,
    link: `${origem}/auth/confirm?token_hash=${data.properties.hashed_token}&type=${tipoVerificacao}`,
  };
}

export async function convidar(_: EstadoConvite, form: FormData): Promise<EstadoConvite> {
  const eventoId = String(form.get("evento_id") ?? "");
  const ctx = await contextoEvento(eventoId);
  if (!ctx.ehAdmin) return { erro: "Só administradores do evento podem convidar pessoas." };

  const nome = String(form.get("nome") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const papel = String(form.get("papel") ?? "editor") as Papel;
  if (nome.length < 2) return { erro: "Informe o nome da pessoa." };
  if (!EMAIL.test(email)) return { erro: "E-mail inválido." };
  if (!PAPEIS.includes(papel)) return { erro: "Papel inválido." };

  const admin = criarClienteAdmin();
  const { data: existente } = await admin.from("perfis").select("id, nome, aprovado").eq("email", email).maybeSingle();

  if (existente) {
    const { data: jaMembro } = await ctx.supabase
      .from("evento_membros")
      .select("papel")
      .eq("evento_id", eventoId)
      .eq("perfil_id", existente.id)
      .maybeSingle();
    if (jaMembro) return { erro: `${existente.nome} já participa deste evento.` };

    // quem se cadastrou e ainda aguardava aprovação: ser convidado por um administrador aprova a conta
    if (existente.aprovado === false) {
      await admin.from("perfis").update({ aprovado: true, aprovado_em: new Date().toISOString() }).eq("id", existente.id);
    }
    const { error } = await ctx.supabase.from("evento_membros").insert({ evento_id: eventoId, perfil_id: existente.id, papel });
    if (error) return { erro: "Não foi possível adicionar a pessoa. Tente de novo." };
    revalidatePath(`/eventos/${eventoId}`, "layout");
    return { ok: `${existente.nome} já tinha acesso ao painel e foi adicionado(a) a este evento. É só entrar com o e-mail e a senha de sempre.` };
  }

  const r = await linkDeAcesso(admin, "invite", email, nome);
  if (!r.link || !r.userId) return { erro: "Não foi possível criar o convite. Confira a chave secreta do Supabase (veja o README)." };

  // convite feito por administrador = conta já aprovada
  await admin.from("perfis").update({ aprovado: true, aprovado_em: new Date().toISOString() }).eq("id", r.userId);
  const { error } = await ctx.supabase.from("evento_membros").insert({ evento_id: eventoId, perfil_id: r.userId, papel });
  if (error) return { erro: "O acesso foi criado, mas não deu para incluir no evento. Tente convidar de novo." };

  revalidatePath(`/eventos/${eventoId}`, "layout");
  return { ok: `Convite criado para ${nome}.`, link: r.link, nome };
}

/** Novo link para quem ainda não ativou o acesso (ou, para o admin geral, para qualquer pessoa). */
export async function gerarLink(_: EstadoConvite, form: FormData): Promise<EstadoConvite> {
  const eventoId = String(form.get("evento_id") ?? "");
  const perfilId = String(form.get("perfil_id") ?? "");
  const ctx = await contextoEvento(eventoId);
  if (!ctx.ehAdmin || !ehUuid(perfilId)) return { erro: "Sem permissão." };

  const admin = criarClienteAdmin();
  const [{ data: alvo }, { data: membro }, { count: outrosEventos }] = await Promise.all([
    admin.from("perfis").select("nome, email, super_admin, ultimo_acesso").eq("id", perfilId).maybeSingle(),
    admin.from("evento_membros").select("papel").eq("evento_id", eventoId).eq("perfil_id", perfilId).maybeSingle(),
    admin.from("evento_membros").select("evento_id", { count: "exact", head: true }).eq("perfil_id", perfilId).neq("evento_id", eventoId),
  ]);
  if (!alvo || !membro) return { erro: "Pessoa não encontrada neste evento." };

  // Segurança: um link de acesso entra na conta da pessoa. Só o admin geral pode gerar
  // para quem já usa o painel ou participa de outros eventos.
  if (!ctx.superAdmin && (alvo.super_admin || alvo.ultimo_acesso || (outrosEventos ?? 0) > 0)) {
    return { erro: "Essa pessoa já usa o painel. Ela pode usar “Esqueci minha senha” na tela de entrada, ou peça ao administrador geral um novo link." };
  }

  const r = await linkDeAcesso(admin, "magiclink", alvo.email);
  if (!r.link) return { erro: "Não foi possível gerar o link agora." };
  return { ok: `Novo link de acesso para ${alvo.nome}.`, link: r.link, nome: alvo.nome };
}

function voltar(eventoId: string, tipo: "ok" | "erro", msg: string): never {
  revalidatePath(`/eventos/${eventoId}`, "layout");
  redirect(`/eventos/${eventoId}/responsaveis?${tipo}=${encodeURIComponent(msg)}`);
}

export async function alterarPapel(form: FormData) {
  const eventoId = String(form.get("evento_id") ?? "");
  const perfilId = String(form.get("perfil_id") ?? "");
  const papel = String(form.get("papel") ?? "") as Papel;
  const ctx = await contextoEvento(eventoId);
  if (!ctx.ehAdmin || !ehUuid(perfilId) || !PAPEIS.includes(papel)) voltar(eventoId, "erro", "Sem permissão.");

  const { error } = await ctx.supabase
    .from("evento_membros")
    .update({ papel })
    .eq("evento_id", eventoId)
    .eq("perfil_id", perfilId);
  if (error) {
    voltar(eventoId, "erro", error.message.includes("pelo menos um administrador") ? "O evento precisa ter pelo menos um administrador." : "Não foi possível alterar o papel.");
  }
  voltar(eventoId, "ok", "Papel atualizado.");
}

export async function removerMembro(form: FormData) {
  const eventoId = String(form.get("evento_id") ?? "");
  const perfilId = String(form.get("perfil_id") ?? "");
  const ctx = await contextoEvento(eventoId);
  if (!ctx.ehAdmin || !ehUuid(perfilId)) voltar(eventoId, "erro", "Sem permissão.");
  if (perfilId === ctx.userId) voltar(eventoId, "erro", "Você não pode remover a si mesmo.");

  const { error } = await ctx.supabase.from("evento_membros").delete().eq("evento_id", eventoId).eq("perfil_id", perfilId);
  if (error) {
    voltar(eventoId, "erro", error.message.includes("pelo menos um administrador") ? "O evento precisa ter pelo menos um administrador." : "Não foi possível remover.");
  }
  voltar(eventoId, "ok", "Pessoa removida do evento. Os gastos que ela lançou continuam registrados.");
}
