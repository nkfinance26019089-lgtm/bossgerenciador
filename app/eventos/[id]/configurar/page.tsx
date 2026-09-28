import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { contextoEvento } from "@/lib/dados";
import { BotaoEnviar } from "@/components/Botoes";
import { CamposEvento } from "@/components/CamposEvento";
import { Mensagem } from "@/components/Mensagem";
import { excluirEvento, salvarEvento } from "./actions";

export const metadata: Metadata = { title: "Configurar evento" };

export default async function Configurar({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const { id } = await params;
  const { ok, erro } = await searchParams;
  const ctx = await contextoEvento(id);
  if (!ctx.ehAdmin) redirect(`/eventos/${id}`);

  return (
    <div className="flex w-full max-w-[760px] flex-col gap-6">
      <div className="flex flex-col gap-1">
        <span className="rotulo !text-ouro">{ctx.evento.nome}</span>
        <h1 className="titulo text-[30px] sm:text-[34px]">Configurar evento</h1>
      </div>

      <Mensagem ok={ok} erro={erro} />

      <form action={salvarEvento} className="cartao flex flex-col gap-6 p-5 sm:p-8">
        <input type="hidden" name="evento_id" value={id} />
        <CamposEvento evento={ctx.evento} />
        <p className="text-sm text-suave">
          Use “Encerrado” quando a festa já passou e as contas foram fechadas — o evento continua disponível para consulta.
        </p>
        <div className="flex justify-end border-t border-trilho pt-5">
          <BotaoEnviar>Salvar alterações</BotaoEnviar>
        </div>
      </form>

      {ctx.superAdmin && (
        <form action={excluirEvento} className="flex flex-col gap-4 rounded-2xl border border-[#6b2f28] p-5 sm:p-6">
          <input type="hidden" name="evento_id" value={id} />
          <h2 className="rotulo !text-perigo">Excluir evento</h2>
          <p className="text-sm text-texto-2">
            Apaga o evento, todos os gastos, categorias e comprovantes. Não dá para desfazer. Para confirmar, digite o nome do evento:{" "}
            <strong className="text-texto">{ctx.evento.nome}</strong>
          </p>
          <input name="confirmacao" required className="campo" aria-label="Nome do evento para confirmar" autoComplete="off" />
          <BotaoEnviar className="btn btn-perigo self-start" pendente="Excluindo…">
            Excluir evento definitivamente
          </BotaoEnviar>
        </form>
      )}
    </div>
  );
}
