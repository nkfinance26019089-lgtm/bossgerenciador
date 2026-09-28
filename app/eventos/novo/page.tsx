import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { eventosDoUsuario, usuarioAtual } from "@/lib/dados";
import { Cabecalho } from "@/components/Cabecalho";
import { Icone } from "@/components/Icone";
import { FormNovoEvento } from "./FormNovoEvento";

export const metadata: Metadata = { title: "Novo evento" };

export default async function NovoEvento() {
  const { perfil } = await usuarioAtual();
  if (!perfil?.super_admin) redirect("/eventos");
  const eventos = await eventosDoUsuario();

  return (
    <>
      <Cabecalho />
      <main className="mx-auto flex max-w-[760px] flex-col gap-5 px-4 py-8 sm:px-10">
        <Link href="/eventos" className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-semibold no-underline">
          <Icone nome="voltar" tamanho={16} />
          Voltar aos eventos
        </Link>
        <div className="flex flex-col gap-1.5">
          <h1 className="titulo text-3xl">Novo evento</h1>
          <p className="text-suave">Você vira administrador do evento e pode convidar a equipe em seguida.</p>
        </div>
        <FormNovoEvento eventos={eventos.map((e) => ({ id: e.id, nome: e.nome }))} />
      </main>
    </>
  );
}
