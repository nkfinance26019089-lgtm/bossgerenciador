import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Categorias e pessoas (admin/editor) para os selects do formulário de gasto. */
export async function opcoesDoFormulario(supabase: SupabaseClient, eventoId: string) {
  const [{ data: cats }, { data: mbs }] = await Promise.all([
    supabase.from("categorias").select("id, nome").eq("evento_id", eventoId).order("ordem").order("nome"),
    supabase.from("evento_membros").select("perfil_id, papel, perfis(nome)").eq("evento_id", eventoId).neq("papel", "leitor"),
  ]);
  const pessoas = ((mbs ?? []) as unknown as { perfil_id: string; perfis: { nome: string } | null }[])
    .map((m) => ({ id: m.perfil_id, nome: m.perfis?.nome ?? "—" }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  return { categorias: (cats ?? []) as { id: string; nome: string }[], pessoas };
}
