import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { contextoEvento, ehUuid, sessaoAtual } from "@/lib/dados";
import { dataBR, haQuanto, hojeISO } from "@/lib/formato";
import type { Gasto } from "@/lib/tipos";
import { opcoesDoFormulario } from "../opcoes";
import { Icone } from "@/components/Icone";
import { BotaoEnviar } from "@/components/Botoes";
import { FormGasto } from "../FormGasto";
import { excluirGasto } from "../actions";

export const metadata: Metadata = { title: "Editar gasto" };

export default async function EditarGasto({ params }: { params: Promise<{ id: string; gastoId: string }> }) {
  const { id, gastoId } = await params;
  if (!ehUuid(gastoId)) notFound();
  const { supabase } = await sessaoAtual();
  // tudo em paralelo: evento, gasto (com o nome de quem lançou) e opções do formulário
  const [ctx, { data }, { categorias, pessoas }] = await Promise.all([
    contextoEvento(id),
    supabase
      .from("gastos")
      .select("*, autor:perfis!gastos_criado_por_fkey(nome)")
      .eq("id", gastoId)
      .eq("evento_id", id)
      .maybeSingle<Gasto & { autor: { nome: string } | null }>(),
    opcoesDoFormulario(supabase, id),
  ]);
  if (!data) notFound();
  const { autor, ...resto } = data;
  const gasto: Gasto = { ...resto, valor: Number(resto.valor) };
  const podeEditar = ctx.podeEditar(gasto);

  return (
    <div className="flex w-full max-w-[760px] flex-col gap-4">
      <Link href={`/eventos/${id}/gastos`} className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-semibold no-underline">
        <Icone nome="voltar" tamanho={16} />
        Voltar aos gastos
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <h1 className="titulo text-3xl">{podeEditar ? "Editar gasto" : gasto.descricao}</h1>
          <p className="text-sm text-suave">
            Lançado por {autor?.nome ?? "—"} {haQuanto(gasto.criado_em)} · data do gasto {dataBR(gasto.data_gasto)}
          </p>
        </div>
        {ctx.ehAdmin && (
          <form action={excluirGasto}>
            <input type="hidden" name="evento_id" value={id} />
            <input type="hidden" name="gasto_id" value={gasto.id} />
            <input type="hidden" name="voltar_lista" value="1" />
            <BotaoEnviar className="btn btn-perigo" pendente="Excluindo…" confirmar={`Excluir o gasto “${gasto.descricao}”? Isso não pode ser desfeito.`}>
              <Icone nome="lixo" tamanho={16} />
              Excluir gasto
            </BotaoEnviar>
          </form>
        )}
      </div>

      {podeEditar ? (
        <FormGasto
          eventoId={id}
          gasto={gasto}
          categorias={categorias}
          pessoas={pessoas}
          usuarioId={ctx.userId}
          hoje={hojeISO()}
          urlComprovante={gasto.comprovante_path ? `/eventos/${id}/gastos/${gasto.id}/comprovante` : undefined}
        />
      ) : (
        <p className="aviso-erro">Você pode ver este gasto, mas só quem o lançou ou um administrador pode alterá-lo.</p>
      )}
    </div>
  );
}
