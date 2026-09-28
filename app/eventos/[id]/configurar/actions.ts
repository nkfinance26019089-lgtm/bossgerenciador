"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { contextoEvento } from "@/lib/dados";
import { lerValor, texto } from "@/lib/formato";
import type { StatusEvento } from "@/lib/tipos";

const STATUS: StatusEvento[] = ["planejamento", "andamento", "encerrado"];

function voltar(eventoId: string, tipo: "ok" | "erro", msg: string): never {
  revalidatePath(`/eventos/${eventoId}`, "layout");
  revalidatePath("/eventos");
  redirect(`/eventos/${eventoId}/configurar?${tipo}=${encodeURIComponent(msg)}`);
}

export async function salvarEvento(form: FormData) {
  const eventoId = String(form.get("evento_id") ?? "");
  const ctx = await contextoEvento(eventoId);
  if (!ctx.ehAdmin) voltar(eventoId, "erro", "Só administradores podem alterar o evento.");

  const nome = texto(form.get("nome"));
  const orcamento = form.get("orcamento_total") ? lerValor(form.get("orcamento_total")) : 0;
  const status = String(form.get("status") ?? "") as StatusEvento;
  if (!nome) voltar(eventoId, "erro", "O evento precisa de um nome.");
  if (Number.isNaN(orcamento) || orcamento < 0) voltar(eventoId, "erro", "Orçamento inválido. Use o formato 30.000,00.");
  if (!STATUS.includes(status)) voltar(eventoId, "erro", "Situação inválida.");

  const { error } = await ctx.supabase
    .from("eventos")
    .update({
      nome,
      data_evento: texto(form.get("data_evento")),
      local: texto(form.get("local")),
      orcamento_total: orcamento,
      status,
    })
    .eq("id", eventoId);
  if (error) voltar(eventoId, "erro", "Não foi possível salvar.");
  voltar(eventoId, "ok", "Evento atualizado.");
}

export async function excluirEvento(form: FormData) {
  const eventoId = String(form.get("evento_id") ?? "");
  const confirmacao = String(form.get("confirmacao") ?? "").trim();
  const ctx = await contextoEvento(eventoId);
  if (!ctx.superAdmin) voltar(eventoId, "erro", "Só o administrador geral pode excluir eventos.");
  if (confirmacao !== ctx.evento.nome) voltar(eventoId, "erro", "Digite o nome do evento exatamente como aparece para confirmar.");

  // apaga os comprovantes do evento
  const { data: arquivos } = await ctx.supabase.storage.from("comprovantes").list(eventoId, { limit: 1000 });
  if (arquivos?.length) {
    await ctx.supabase.storage.from("comprovantes").remove(arquivos.map((a) => `${eventoId}/${a.name}`));
  }
  const { error } = await ctx.supabase.from("eventos").delete().eq("id", eventoId);
  if (error) voltar(eventoId, "erro", "Não foi possível excluir o evento.");

  revalidatePath("/eventos");
  redirect("/eventos");
}
