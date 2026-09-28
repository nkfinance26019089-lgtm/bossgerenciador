import type { Metadata } from "next";
import Link from "next/link";
import { contextoEvento, sessaoAtual } from "@/lib/dados";
import { lerFiltros } from "@/lib/consultaGastos";
import type { Categoria, Gasto, Membro } from "@/lib/tipos";
import { Icone } from "@/components/Icone";
import { ListaGastos } from "./ListaGastos";

export const metadata: Metadata = { title: "Gastos" };

export default async function Gastos({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase } = await sessaoAtual();
  // dados da página em paralelo com a checagem do evento (uma espera a menos)
  const [ctx, { data: gs }, { data: cats }, { data: mbs }] = await Promise.all([
    contextoEvento(id),
    supabase
      .from("gastos")
      .select("*")
      .eq("evento_id", id)
      .order("data_gasto", { ascending: false })
      .order("criado_em", { ascending: false }),
    supabase.from("categorias").select("id, nome, cor").eq("evento_id", id).order("ordem").order("nome"),
    supabase.from("evento_membros").select("perfil_id, perfis(id, nome)").eq("evento_id", id),
  ]);
  const gastos = ((gs ?? []) as Gasto[]).map((g) => ({ ...g, valor: Number(g.valor) }));
  const categorias = (cats ?? []) as Pick<Categoria, "id" | "nome" | "cor">[];
  const pessoas = ((mbs ?? []) as unknown as Pick<Membro, "perfil_id" | "perfis">[])
    .map((m) => ({ id: m.perfil_id, nome: m.perfis?.nome ?? "—" }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const f = lerFiltros(sp);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="rotulo !text-ouro">{ctx.evento.nome}</span>
          <h1 className="titulo text-[30px] sm:text-[34px]">Gastos</h1>
        </div>
        {ctx.podeLancar && (
          <Link href={`/eventos/${id}/gastos/novo`} className="btn btn-ouro hidden lg:inline-flex">
            <Icone nome="mais" tamanho={16} />
            Novo gasto
          </Link>
        )}
      </div>

      {sp.salvo === "1" && <p className="aviso-ok">Gasto salvo.</p>}

      <ListaGastos
        eventoId={id}
        gastos={gastos}
        categorias={categorias}
        pessoas={pessoas}
        inicial={{ status: f.status ?? "", categoria: f.categoria ?? "", responsavel: f.responsavel ?? "", busca: f.busca ?? "" }}
        userId={ctx.userId}
        papel={ctx.papel}
        podeLancar={ctx.podeLancar}
      />
    </>
  );
}
