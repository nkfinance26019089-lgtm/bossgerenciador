import type { Metadata } from "next";
import Link from "next/link";
import { usuarioAtual } from "@/lib/dados";
import { Cabecalho } from "@/components/Cabecalho";
import { Icone } from "@/components/Icone";
import { FormNome, FormSenha } from "./FormsConta";

export const metadata: Metadata = { title: "Minha conta" };

export default async function Conta({ searchParams }: { searchParams: Promise<{ bemvindo?: string }> }) {
  const { bemvindo } = await searchParams;
  const { perfil } = await usuarioAtual();
  const nome = perfil?.nome ?? "";
  const boasVindas = bemvindo === "1";

  return (
    <>
      <Cabecalho />
      <main className="mx-auto flex max-w-[640px] flex-col gap-6 px-4 py-8 sm:px-10">
        {!boasVindas && (
          <Link href="/eventos" className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-semibold no-underline">
            <Icone nome="voltar" tamanho={16} />
            Voltar aos eventos
          </Link>
        )}
        <div className="flex flex-col gap-2">
          <h1 className="titulo text-3xl">{boasVindas ? `Bem-vindo(a), ${nome.split(" ")[0]}!` : "Minha conta"}</h1>
          <p className="text-suave">
            {boasVindas
              ? "Crie uma senha para entrar no painel das próximas vezes."
              : `Você entra com o e-mail ${perfil?.email ?? ""}.`}
          </p>
        </div>

        <section className="cartao flex flex-col gap-4 p-6">
          <h2 className="rotulo !text-ouro-claro">{boasVindas ? "Sua senha" : "Alterar senha"}</h2>
          <FormSenha bemvindo={boasVindas} email={perfil?.email ?? ""} />
        </section>

        <section className="cartao flex flex-col gap-4 p-6">
          <h2 className="rotulo !text-ouro-claro">Seu nome no painel</h2>
          <FormNome nome={nome} />
        </section>
      </main>
    </>
  );
}
