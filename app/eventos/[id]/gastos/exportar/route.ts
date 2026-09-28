import { NextResponse, type NextRequest } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ehUuid } from "@/lib/dados";
import { buscarGastos, lerFiltros } from "@/lib/consultaGastos";
import { dataBR } from "@/lib/formato";

/** Planilha CSV (abre no Excel/Google Planilhas) com os gastos filtrados. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ehUuid(id)) return new NextResponse("Não encontrado", { status: 404 });

  const supabase = await criarClienteServidor();
  const { data: evento } = await supabase.from("eventos").select("nome").eq("id", id).maybeSingle();
  if (!evento) return new NextResponse("Não encontrado", { status: 404 });

  const filtros = lerFiltros(Object.fromEntries(request.nextUrl.searchParams));
  const [gastos, { data: cats }, { data: mbs }] = await Promise.all([
    buscarGastos(supabase, id, filtros),
    supabase.from("categorias").select("id, nome").eq("evento_id", id),
    supabase.from("evento_membros").select("perfil_id, perfis(nome)").eq("evento_id", id),
  ]);
  const cat = new Map((cats ?? []).map((c) => [c.id, c.nome]));
  const pessoa = new Map(
    ((mbs ?? []) as unknown as { perfil_id: string; perfis: { nome: string } | null }[]).map((m) => [m.perfil_id, m.perfis?.nome ?? ""]),
  );

  const cel = (v: unknown) => {
    let s = String(v ?? "");
    if (/^[=+\-@]/.test(s)) s = "'" + s; // evita fórmulas maliciosas no Excel
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const num = (v: number) => v.toFixed(2).replace(".", ",");

  const cabecalho = ["Data", "Descrição", "Categoria", "Fornecedor", "Forma de pagamento", "Status", "Vencimento", "Responsável", "Valor (R$)", "Observações", "Tem comprovante"];
  const linhas = gastos.map((g) =>
    [
      dataBR(g.data_gasto),
      cel(g.descricao),
      cel(g.categoria_id ? cat.get(g.categoria_id) : "Sem categoria"),
      cel(g.fornecedor),
      cel(g.forma_pagamento),
      g.status === "pago" ? "Pago" : "Pendente",
      g.vencimento ? dataBR(g.vencimento) : "",
      cel(g.responsavel_id ? pessoa.get(g.responsavel_id) : ""),
      num(g.valor),
      cel(g.observacoes),
      g.comprovante_path ? "Sim" : "Não",
    ].join(";"),
  );
  const total = gastos.reduce((s, g) => s + g.valor, 0);
  linhas.push(["", "TOTAL", "", "", "", "", "", "", num(total), "", ""].join(";"));

  const csv = "﻿" + [cabecalho.join(";"), ...linhas].join("\r\n");
  const nomeArquivo = `gastos-${evento.nome}`.normalize("NFD").replace(/[^\w-]+/g, "-").replace(/-+/g, "-").toLowerCase();

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomeArquivo}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
