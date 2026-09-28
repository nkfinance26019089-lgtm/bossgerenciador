import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { usuarioAtual } from "@/lib/dados";
import type { Log } from "@/lib/logs";
import { Cabecalho } from "@/components/Cabecalho";
import { Icone } from "@/components/Icone";
import { ListaLogs } from "@/components/ListaLogs";

export const metadata: Metadata = { title: "Logs gerais" };

/** Todos os logs de todos os eventos + contas e acessos — para os administradores gerais. */
export default async function LogsGerais() {
  const { supabase, perfil } = await usuarioAtual();
  if (!perfil?.super_admin) redirect("/eventos");

  const noventaDias = new Date(Date.now() - 90 * 86_400_000).toISOString();
  const [{ data }, { data: pfs }] = await Promise.all([
    supabase
      .from("auditoria")
      .select("id, evento_id, perfil_id, acao, descricao, detalhes, criado_em, perfis(nome), eventos(nome)")
      .gte("criado_em", noventaDias)
      .order("criado_em", { ascending: false })
      .limit(3000),
    supabase.from("perfis").select("id, nome").order("nome"),
  ]);
  const logs = ((data ?? []) as unknown as (Log & { eventos: { nome: string } | null })[]).map((l) => ({
    ...l,
    evento_nome: l.eventos?.nome ?? null,
  }));

  return (
    <>
      <Cabecalho />
      <main className="mx-auto flex max-w-[1000px] flex-col gap-5 px-4 py-6 sm:px-10 sm:py-8">
        <Link href="/eventos" className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-semibold no-underline">
          <Icone nome="voltar" tamanho={16} />
          Voltar aos eventos
        </Link>
        <div className="flex flex-col gap-1.5">
          <h1 className="titulo text-[30px] sm:text-[34px]">Logs gerais</h1>
          <p className="text-[15px] text-suave">
            Tudo o que aconteceu no painel, em todos os eventos: gastos, categorias, equipe, contas aprovadas e entradas e saídas. Visível para
            todos os administradores gerais.
          </p>
        </div>
        <ListaLogs
          logs={logs}
          pessoas={(pfs ?? []) as { id: string; nome: string }[]}
          tipos={["gastos", "categorias", "equipe", "evento", "usuarios", "acessos"]}
          mostrarEvento
        />
      </main>
    </>
  );
}
