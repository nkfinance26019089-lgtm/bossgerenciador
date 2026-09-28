import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ehUuid } from "@/lib/dados";
import type { Gasto } from "@/lib/tipos";

export type FiltrosGastos = {
  status?: string;
  categoria?: string;
  responsavel?: string;
  busca?: string;
};

/** Lê os filtros da URL, descartando valores inválidos. */
export function lerFiltros(sp: Record<string, string | string[] | undefined>): FiltrosGastos {
  const um = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const status = um(sp.status);
  const categoria = um(sp.categoria);
  const responsavel = um(sp.responsavel);
  const busca = um(sp.busca).trim().slice(0, 80);
  return {
    status: status === "pago" || status === "pendente" ? status : undefined,
    categoria: categoria === "sem" || ehUuid(categoria) ? categoria : undefined,
    responsavel: ehUuid(responsavel) ? responsavel : undefined,
    busca: busca || undefined,
  };
}

export function filtrosParaQuery(f: FiltrosGastos) {
  const qs = new URLSearchParams();
  Object.entries(f).forEach(([k, v]) => v && qs.set(k, v));
  return qs.toString();
}

export async function buscarGastos(supabase: SupabaseClient, eventoId: string, f: FiltrosGastos) {
  let q = supabase
    .from("gastos")
    .select("*")
    .eq("evento_id", eventoId)
    .order("data_gasto", { ascending: false })
    .order("criado_em", { ascending: false });

  if (f.status) q = q.eq("status", f.status);
  if (f.categoria === "sem") q = q.is("categoria_id", null);
  else if (f.categoria) q = q.eq("categoria_id", f.categoria);
  if (f.responsavel) q = q.eq("responsavel_id", f.responsavel);
  if (f.busca) {
    // remove caracteres que têm significado especial no filtro
    const termo = f.busca.replace(/[%_,()*\\"]/g, " ").trim();
    if (termo) q = q.or(`descricao.ilike.%${termo}%,fornecedor.ilike.%${termo}%`);
  }

  const { data } = await q;
  return ((data ?? []) as Gasto[]).map((g) => ({ ...g, valor: Number(g.valor) }));
}
