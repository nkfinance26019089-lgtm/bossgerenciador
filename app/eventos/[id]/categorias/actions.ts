"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { contextoEvento, ehUuid } from "@/lib/dados";
import { lerValor, texto } from "@/lib/formato";
import { CORES_CATEGORIA } from "@/lib/tipos";

function voltar(eventoId: string, tipo: "ok" | "erro", msg: string): never {
  revalidatePath(`/eventos/${eventoId}`, "layout");
  redirect(`/eventos/${eventoId}/categorias?${tipo}=${encodeURIComponent(msg)}`);
}

function lerCampos(form: FormData) {
  const nome = texto(form.get("nome"));
  const previsto = form.get("orcamento_previsto") ? lerValor(form.get("orcamento_previsto")) : 0;
  const cor = String(form.get("cor") ?? "");
  return { nome, previsto, cor: /^#[0-9a-fA-F]{6}$/.test(cor) ? cor : null };
}

export async function criarCategoria(form: FormData) {
  const eventoId = String(form.get("evento_id") ?? "");
  const ctx = await contextoEvento(eventoId);
  if (!ctx.ehAdmin) voltar(eventoId, "erro", "Só administradores podem alterar categorias.");

  const { nome, previsto, cor } = lerCampos(form);
  if (!nome) voltar(eventoId, "erro", "Dê um nome à categoria.");
  if (Number.isNaN(previsto) || previsto < 0) voltar(eventoId, "erro", "Valor previsto inválido.");

  const { count } = await ctx.supabase.from("categorias").select("id", { count: "exact", head: true }).eq("evento_id", eventoId);
  const n = count ?? 0;
  const { error } = await ctx.supabase.from("categorias").insert({
    evento_id: eventoId,
    nome,
    orcamento_previsto: previsto,
    cor: cor ?? CORES_CATEGORIA[n % CORES_CATEGORIA.length],
    ordem: n,
  });
  if (error) voltar(eventoId, "erro", error.code === "23505" ? "Já existe uma categoria com esse nome." : "Não foi possível criar a categoria.");
  voltar(eventoId, "ok", `Categoria “${nome}” criada.`);
}

export async function salvarCategoria(form: FormData) {
  const eventoId = String(form.get("evento_id") ?? "");
  const categoriaId = String(form.get("categoria_id") ?? "");
  const ctx = await contextoEvento(eventoId);
  if (!ctx.ehAdmin || !ehUuid(categoriaId)) voltar(eventoId, "erro", "Só administradores podem alterar categorias.");

  const { nome, previsto, cor } = lerCampos(form);
  if (!nome) voltar(eventoId, "erro", "A categoria precisa de um nome.");
  if (Number.isNaN(previsto) || previsto < 0) voltar(eventoId, "erro", "Valor previsto inválido.");

  const { error } = await ctx.supabase
    .from("categorias")
    .update({ nome, orcamento_previsto: previsto, ...(cor ? { cor } : {}) })
    .eq("id", categoriaId)
    .eq("evento_id", eventoId);
  if (error) voltar(eventoId, "erro", error.code === "23505" ? "Já existe uma categoria com esse nome." : "Não foi possível salvar.");
  voltar(eventoId, "ok", `Categoria “${nome}” salva.`);
}

export async function excluirCategoria(form: FormData) {
  const eventoId = String(form.get("evento_id") ?? "");
  const categoriaId = String(form.get("categoria_id") ?? "");
  const ctx = await contextoEvento(eventoId);
  if (!ctx.ehAdmin || !ehUuid(categoriaId)) voltar(eventoId, "erro", "Só administradores podem alterar categorias.");

  const { error } = await ctx.supabase.from("categorias").delete().eq("id", categoriaId).eq("evento_id", eventoId);
  if (error) voltar(eventoId, "erro", "Não foi possível excluir a categoria.");
  voltar(eventoId, "ok", "Categoria excluída. Os gastos dela ficaram como “Sem categoria”.");
}
