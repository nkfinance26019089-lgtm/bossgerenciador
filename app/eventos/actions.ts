"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ehUuid, usuarioAtual } from "@/lib/dados";
import { lerValor, texto } from "@/lib/formato";
import { CATEGORIAS_PADRAO, CORES_CATEGORIA, type StatusEvento } from "@/lib/tipos";

export type EstadoForm = { erro?: string; ok?: string };

const STATUS: StatusEvento[] = ["planejamento", "andamento", "encerrado"];

export async function criarEvento(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const { supabase, perfil } = await usuarioAtual();
  if (!perfil?.super_admin) return { erro: "Só o administrador geral pode criar eventos." };

  const nome = texto(form.get("nome"));
  const orcamento = form.get("orcamento_total") ? lerValor(form.get("orcamento_total")) : 0;
  const status = String(form.get("status") ?? "planejamento") as StatusEvento;
  const categorias = String(form.get("categorias") ?? "padrao");
  const copiarDe = String(form.get("copiar_de") ?? "");

  if (!nome) return { erro: "Dê um nome ao evento." };
  if (Number.isNaN(orcamento) || orcamento < 0) return { erro: "Orçamento inválido. Use o formato 30.000,00." };
  if (!STATUS.includes(status)) return { erro: "Status inválido." };

  const { data: evento, error } = await supabase
    .from("eventos")
    .insert({
      nome,
      data_evento: texto(form.get("data_evento")),
      local: texto(form.get("local")),
      orcamento_total: orcamento,
      status,
    })
    .select("id")
    .single();
  if (error || !evento) return { erro: "Não foi possível criar o evento. Tente de novo." };

  // Categorias iniciais
  let linhas: { evento_id: string; nome: string; cor: string; orcamento_previsto: number; ordem: number }[] = [];
  if (categorias === "copiar" && ehUuid(copiarDe)) {
    const { data: origem } = await supabase
      .from("categorias")
      .select("nome, cor, orcamento_previsto, ordem")
      .eq("evento_id", copiarDe)
      .order("ordem");
    linhas = (origem ?? []).map((c) => ({
      evento_id: evento.id,
      nome: c.nome,
      cor: c.cor,
      orcamento_previsto: form.get("copiar_valores") ? Number(c.orcamento_previsto) : 0,
      ordem: c.ordem,
    }));
  } else if (categorias === "padrao") {
    linhas = CATEGORIAS_PADRAO.map((n, i) => ({
      evento_id: evento.id,
      nome: n,
      cor: CORES_CATEGORIA[i % CORES_CATEGORIA.length],
      orcamento_previsto: 0,
      ordem: i,
    }));
  }
  if (linhas.length) await supabase.from("categorias").insert(linhas);

  revalidatePath("/eventos");
  redirect(`/eventos/${evento.id}/categorias?novo=1`);
}
