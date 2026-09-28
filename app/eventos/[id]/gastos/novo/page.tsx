import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { contextoEvento, sessaoAtual } from "@/lib/dados";
import { hojeISO } from "@/lib/formato";
import { opcoesDoFormulario } from "../opcoes";
import { Icone } from "@/components/Icone";
import { FormGasto } from "../FormGasto";

export const metadata: Metadata = { title: "Registrar gasto" };

export default async function NovoGasto({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ salvo?: string }>;
}) {
  const { id } = await params;
  const { salvo } = await searchParams;
  const { supabase } = await sessaoAtual();
  const [ctx, { categorias, pessoas }] = await Promise.all([contextoEvento(id), opcoesDoFormulario(supabase, id)]);
  if (!ctx.podeLancar) redirect(`/eventos/${id}/gastos`);

  return (
    <div className="flex w-full max-w-[760px] flex-col gap-4">
      <Link href={`/eventos/${id}/gastos`} className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-semibold no-underline">
        <Icone nome="voltar" tamanho={16} />
        Voltar aos gastos
      </Link>
      <div className="flex flex-col gap-1.5">
        <h1 className="titulo text-3xl">Registrar gasto</h1>
        <p className="text-sm text-suave">Preencha os dados do pagamento. Campos com * são obrigatórios.</p>
      </div>
      {salvo === "1" && <p className="aviso-ok">Gasto salvo. Pode registrar o próximo.</p>}
      <FormGasto eventoId={id} categorias={categorias} pessoas={pessoas} usuarioId={ctx.userId} hoje={hojeISO()} />
    </div>
  );
}
