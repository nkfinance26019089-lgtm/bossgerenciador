import type { Metadata } from "next";
import Link from "next/link";
import { eventosDoUsuario, pedidosPendentes, sessaoAtual, usuarioAtual } from "@/lib/dados";
import { Cabecalho } from "@/components/Cabecalho";
import { Icone } from "@/components/Icone";
import { InstalarApp } from "@/components/InstalarApp";
import { ListaEventos, type ResumoEvento } from "./ListaEventos";

export const metadata: Metadata = { title: "Seus eventos" };

export default async function Eventos({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { supabase } = await sessaoAtual();
  // tudo em paralelo; as regras do banco já limitam aos eventos que a pessoa pode ver
  const [{ status }, { perfil }, eventos, pendentes, { data: gastos }, { data: membros }] = await Promise.all([
    searchParams,
    usuarioAtual(),
    eventosDoUsuario(),
    pedidosPendentes(),
    supabase.from("gastos").select("evento_id, valor"),
    supabase.from("evento_membros").select("evento_id"),
  ]);

  const total = new Map<string, number>();
  for (const g of gastos ?? []) total.set(g.evento_id, (total.get(g.evento_id) ?? 0) + Number(g.valor));
  const pessoas = new Map<string, number>();
  for (const m of membros ?? []) pessoas.set(m.evento_id, (pessoas.get(m.evento_id) ?? 0) + 1);

  const resumo: ResumoEvento[] = eventos.map((e) => ({
    id: e.id,
    nome: e.nome,
    data_evento: e.data_evento,
    local: e.local,
    status: e.status,
    orcamento: Number(e.orcamento_total),
    gasto: total.get(e.id) ?? 0,
    pessoas: pessoas.get(e.id) ?? 0,
  }));
  const superAdmin = !!perfil?.super_admin;

  return (
    <>
      <Cabecalho />
      <main className="mx-auto flex max-w-[1280px] flex-col gap-5 px-4 py-6 sm:gap-6 sm:px-10 sm:py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <h1 className="titulo text-[30px] sm:text-[34px]">Seus eventos</h1>
            <p className="text-[15px] text-suave">Cada evento tem seu próprio orçamento, categorias e equipe.</p>
          </div>
          {superAdmin && (
            <Link href="/eventos/novo" className="btn btn-ouro w-full sm:w-auto">
              <Icone nome="mais" tamanho={16} />
              Novo evento
            </Link>
          )}
        </div>

        <InstalarApp />

        {pendentes > 0 && (
          <Link
            href="/equipe#pedidos"
            className="flex items-center gap-3 rounded-2xl border border-[#6b4a1e] bg-pendente-fundo px-4 py-3.5 text-texto no-underline hover:border-pendente"
          >
            <Icone nome="usuario" className="shrink-0 text-pendente" />
            <span className="flex-grow text-[15px]">
              <strong>{pendentes} {pendentes === 1 ? "conta aguardando" : "contas aguardando"}</strong> a sua aprovação
            </span>
            <span className="flex items-center gap-1 text-sm font-semibold text-pendente">
              Ver
              <Icone nome="seta" tamanho={16} />
            </span>
          </Link>
        )}

        {eventos.length === 0 ? (
          <div className="cartao flex flex-col items-center gap-3 p-8 text-center sm:p-10">
            <Icone nome="calendario" tamanho={32} className="text-ouro" />
            <h2 className="titulo text-2xl">Nenhum evento ainda</h2>
            <p className="max-w-md text-suave">
              {superAdmin
                ? "Crie o primeiro evento para começar a registrar os gastos."
                : "Você ainda não foi adicionado a nenhum evento. Peça ao administrador para te incluir."}
            </p>
            {superAdmin && (
              <Link href="/eventos/novo" className="btn btn-ouro mt-2">
                <Icone nome="mais" tamanho={16} />
                Criar evento
              </Link>
            )}
          </div>
        ) : (
          <ListaEventos eventos={resumo} inicial={status} />
        )}
      </main>
    </>
  );
}
