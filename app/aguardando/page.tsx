import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { perfilAtual } from "@/lib/dados";
import { BotaoSair } from "@/components/Presenca";
import { Icone } from "@/components/Icone";
import { VerificarAprovacao } from "./VerificarAprovacao";

export const metadata: Metadata = { title: "Aguardando aprovação" };

export default async function Aguardando() {
  const perfil = await perfilAtual();
  if (perfil?.aprovado) redirect("/eventos");

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <VerificarAprovacao />
      <div className="flex w-full max-w-[440px] flex-col items-center gap-6 text-center">
        <Image src="/logo-bss.webp" alt="BSS Eventos" width={480} height={457} priority className="h-auto w-[120px] rounded-2xl" />
        <span className="flex size-14 items-center justify-center rounded-full border border-bronze bg-trilho text-ouro">
          <Icone nome="relogio" tamanho={26} />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="titulo text-3xl">Aguardando aprovação</h1>
          <p className="text-[15px] leading-relaxed text-texto-2">
            Olá{perfil?.nome ? `, ${perfil.nome.split(" ")[0]}` : ""}! Sua conta foi criada
            {perfil?.email ? (
              <>
                {" "}com o e-mail <strong className="text-texto">{perfil.email}</strong>
              </>
            ) : null}
            . Um administrador da BSS Eventos precisa aprovar o seu acesso.
          </p>
          <p className="text-sm text-suave">Esta tela verifica sozinha a cada 20 segundos e abre o painel assim que for aprovado.</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row">
          <a href="/aguardando" className="btn btn-ouro flex-1">
            Verificar agora
          </a>
          <BotaoSair className="btn btn-contorno w-full flex-1" comTexto />
        </div>
      </div>
    </main>
  );
}
