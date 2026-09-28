import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { contextoEvento, sessaoAtual } from "@/lib/dados";
import type { Log } from "@/lib/logs";
import type { Membro } from "@/lib/tipos";
import { ListaLogs } from "@/components/ListaLogs";

export const metadata: Metadata = { title: "Logs" };

export default async function Logs({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await sessaoAtual();
  const [ctx, { data: mbs }, { data: doEvento }] = await Promise.all([
    contextoEvento(id),
    supabase.from("evento_membros").select("perfil_id, perfis(id, nome)").eq("evento_id", id),
    supabase
      .from("auditoria")
      .select("id, evento_id, perfil_id, acao, descricao, detalhes, criado_em, perfis(nome)")
      .eq("evento_id", id)
      .order("criado_em", { ascending: false })
      .limit(1000),
  ]);
  if (!ctx.ehAdmin) redirect(`/eventos/${id}`);
  const membros = (mbs ?? []) as unknown as Pick<Membro, "perfil_id" | "perfis">[];
  const ids = membros.map((m) => m.perfil_id);
  const trintaDias = new Date(Date.now() - 30 * 86_400_000).toISOString();

  const [{ data: acessos }] = await Promise.all([
    ids.length
      ? supabase
          .from("auditoria")
          .select("id, evento_id, perfil_id, acao, descricao, detalhes, criado_em, perfis(nome)")
          .is("evento_id", null)
          .like("acao", "sessao.%")
          .in("perfil_id", ids)
          .gte("criado_em", trintaDias)
          .order("criado_em", { ascending: false })
          .limit(500)
      : { data: [] },
  ]);

  const logs = ([...(doEvento ?? []), ...(acessos ?? [])] as unknown as Log[]).sort((a, b) =>
    b.criado_em.localeCompare(a.criado_em),
  );
  const pessoas = membros
    .map((m) => ({ id: m.perfil_id, nome: m.perfis?.nome ?? "—" }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return (
    <div className="flex w-full max-w-[1000px] flex-col gap-5">
      <div className="flex flex-col gap-1">
        <span className="rotulo !text-ouro">{ctx.evento.nome}</span>
        <h1 className="titulo text-[30px] sm:text-[34px]">Logs</h1>
        <p className="text-[15px] text-suave">
          Tudo o que foi feito neste evento — quem, quando e o que mudou (valor antigo → novo) — e as entradas e saídas da equipe.
        </p>
      </div>
      <ListaLogs logs={logs} pessoas={pessoas} tipos={["gastos", "categorias", "equipe", "evento", "acessos"]} />
    </div>
  );
}
