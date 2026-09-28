"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { contextoEvento, ehUuid } from "@/lib/dados";
import { lerValor, texto } from "@/lib/formato";
import { FORMAS_PAGAMENTO } from "@/lib/tipos";

export type EstadoGasto = { erro?: string };

const DATA = /^\d{4}-\d{2}-\d{2}$/;

export async function salvarGasto(_: EstadoGasto, form: FormData): Promise<EstadoGasto> {
  const eventoId = String(form.get("evento_id") ?? "");
  const gastoId = String(form.get("gasto_id") ?? "");
  const ctx = await contextoEvento(eventoId);
  if (!ctx.podeLancar) return { erro: "Você só tem permissão para visualizar este evento." };

  const descricao = texto(form.get("descricao"));
  const valor = lerValor(form.get("valor"));
  const dataGasto = String(form.get("data_gasto") ?? "");
  const status = form.get("status") === "pago" ? "pago" : "pendente";
  const vencimento = status === "pendente" ? texto(form.get("vencimento")) : null;
  const categoriaId = String(form.get("categoria_id") ?? "");
  const responsavelId = String(form.get("responsavel_id") ?? "");
  const forma = texto(form.get("forma_pagamento"));
  const comprovante = texto(form.get("comprovante_path"));

  if (!descricao) return { erro: "Descreva o gasto." };
  if (Number.isNaN(valor) || valor <= 0) return { erro: "Informe um valor válido, por exemplo 1.250,00." };
  if (valor > 9_999_999_999) return { erro: "Valor alto demais." };
  if (!DATA.test(dataGasto)) return { erro: "Informe a data do gasto." };
  if (vencimento && !DATA.test(vencimento)) return { erro: "Data de vencimento inválida." };
  if (forma && !(FORMAS_PAGAMENTO as readonly string[]).includes(forma)) return { erro: "Forma de pagamento inválida." };
  if (comprovante && !comprovante.startsWith(`${eventoId}/`)) return { erro: "Comprovante inválido." };

  const dados = {
    evento_id: eventoId,
    descricao,
    valor,
    data_gasto: dataGasto,
    status,
    vencimento,
    categoria_id: ehUuid(categoriaId) ? categoriaId : null,
    responsavel_id: ehUuid(responsavelId) ? responsavelId : null,
    fornecedor: texto(form.get("fornecedor")),
    forma_pagamento: forma,
    comprovante_path: comprovante,
    observacoes: texto(form.get("observacoes")),
  };

  const { supabase } = ctx;

  if (ehUuid(gastoId)) {
    const { data: antigo } = await supabase
      .from("gastos")
      .select("comprovante_path")
      .eq("id", gastoId)
      .eq("evento_id", eventoId)
      .maybeSingle();

    const { data, error } = await supabase
      .from("gastos")
      .update(dados)
      .eq("id", gastoId)
      .eq("evento_id", eventoId)
      .select("id");
    if (error) return { erro: "Não foi possível salvar. Confira os campos e tente de novo." };
    if (!data?.length) return { erro: "Você não tem permissão para alterar este gasto." };

    if (antigo?.comprovante_path && antigo.comprovante_path !== comprovante) {
      await supabase.storage.from("comprovantes").remove([antigo.comprovante_path]);
    }
  } else {
    const { error } = await supabase.from("gastos").insert({ ...dados, criado_por: ctx.userId });
    if (error) return { erro: "Não foi possível salvar. Confira os campos e tente de novo." };
  }

  revalidatePath(`/eventos/${eventoId}`, "layout");
  revalidatePath("/eventos");
  if (form.get("depois") === "outro") redirect(`/eventos/${eventoId}/gastos/novo?salvo=1`);
  redirect(`/eventos/${eventoId}/gastos?salvo=1`);
}

export async function marcarComoPago(form: FormData) {
  const eventoId = String(form.get("evento_id") ?? "");
  const gastoId = String(form.get("gasto_id") ?? "");
  const ctx = await contextoEvento(eventoId);
  if (!ehUuid(gastoId)) return;
  await ctx.supabase
    .from("gastos")
    .update({ status: "pago", vencimento: null })
    .eq("id", gastoId)
    .eq("evento_id", eventoId);
  revalidatePath(`/eventos/${eventoId}`, "layout");
  revalidatePath("/eventos");
}

export async function excluirGasto(form: FormData) {
  const eventoId = String(form.get("evento_id") ?? "");
  const gastoId = String(form.get("gasto_id") ?? "");
  const ctx = await contextoEvento(eventoId);
  if (!ehUuid(gastoId) || !ctx.ehAdmin) return;

  const { data } = await ctx.supabase
    .from("gastos")
    .delete()
    .eq("id", gastoId)
    .eq("evento_id", eventoId)
    .select("comprovante_path");
  const caminho = data?.[0]?.comprovante_path;
  if (caminho) await ctx.supabase.storage.from("comprovantes").remove([caminho]);

  revalidatePath(`/eventos/${eventoId}`, "layout");
  revalidatePath("/eventos");
  if (form.get("voltar_lista")) redirect(`/eventos/${eventoId}/gastos`);
}
