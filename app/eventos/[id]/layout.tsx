import { administraAlgo, contextoEvento, eventosDoUsuario, pedidosPendentes } from "@/lib/dados";
import { NOMES_PAPEL } from "@/lib/tipos";
import { Lateral } from "@/components/Lateral";

export default async function LayoutEvento({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [ctx, eventos, veEquipe, pendentes] = await Promise.all([contextoEvento(id), eventosDoUsuario(), administraAlgo(), pedidosPendentes()]);

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <Lateral
        eventoId={id}
        eventoNome={ctx.evento.nome}
        eventos={eventos.map((e) => ({ id: e.id, nome: e.nome }))}
        usuario={ctx.perfil?.nome ?? ""}
        papelNome={ctx.superAdmin ? "Administrador geral" : NOMES_PAPEL[ctx.papel]}
        ehAdmin={ctx.ehAdmin}
        podeLancar={ctx.podeLancar}
        veEquipe={veEquipe}
        superAdmin={ctx.superAdmin}
        pendentes={pendentes}
      />
      <main className="flex min-w-0 flex-grow flex-col gap-5 px-4 pb-28 pt-5 sm:gap-6 sm:px-8 lg:px-10 lg:py-7">{children}</main>
    </div>
  );
}
