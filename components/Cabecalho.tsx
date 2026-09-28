import Image from "next/image";
import Link from "next/link";
import { administraAlgo, pedidosPendentes, perfilAtual } from "@/lib/dados";
import { Avatar } from "./Avatar";
import { BotaoSair, Presenca } from "./Presenca";
import { OnlineAgora } from "./OnlineAgora";
import { Icone } from "./Icone";

export { Avatar };

/** Barra superior das páginas fora de um evento (lista de eventos, equipe, logs, minha conta). */
export async function Cabecalho() {
  const [perfil, veEquipe, pendentes] = await Promise.all([perfilAtual(), administraAlgo(), pedidosPendentes()]);
  const nome = perfil?.nome ?? "";
  const superAdmin = !!perfil?.super_admin;

  return (
    <header className="sticky top-0 z-40 border-b border-trilho bg-lateral/95 backdrop-blur">
      <Presenca />
      <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-2 px-4 sm:h-[76px] sm:gap-3 sm:px-10">
        <Link href="/eventos" className="flex min-w-0 items-center gap-3 text-texto no-underline">
          <Image src="/logo-bss.webp" alt="" width={480} height={457} className="h-11 w-auto shrink-0 rounded-lg sm:h-[52px]" />
          <span className="hidden min-w-0 flex-col leading-tight min-[420px]:flex">
            <span className="titulo truncate text-lg sm:text-xl">BSS Eventos</span>
            <span className="rotulo !text-[11px] !text-ouro sm:!text-[13px]">Painel de custos</span>
          </span>
        </Link>
        <nav aria-label="Administração" className="ml-auto flex items-center gap-1">
          {veEquipe && (
            <Link
              href="/equipe"
              className="relative flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-[10px] px-2.5 text-sm font-semibold text-texto-2 no-underline hover:bg-trilho hover:text-ouro-claro"
              aria-label={pendentes ? `Equipe — ${pendentes} pedidos de acesso` : "Equipe online"}
            >
              <Icone nome="online" />
              <span className="hidden md:inline">Equipe</span>
              {pendentes > 0 && (
                <span className="num absolute right-0.5 top-0.5 flex min-w-5 items-center justify-center rounded-full bg-pendente px-1 text-[11px] font-bold text-tinta-ouro md:static">
                  {pendentes}
                </span>
              )}
            </Link>
          )}
          {superAdmin && (
            <Link
              href="/logs"
              className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-[10px] px-2.5 text-sm font-semibold text-texto-2 no-underline hover:bg-trilho hover:text-ouro-claro"
              aria-label="Logs gerais"
            >
              <Icone nome="historico" />
              <span className="hidden md:inline">Logs</span>
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-1 sm:gap-2">
          <span className="hidden sm:block">
            <OnlineAgora compacto link={veEquipe ? "/equipe" : undefined} />
          </span>
          <Link
            href="/conta"
            aria-label="Minha conta"
            className="flex min-h-11 items-center gap-2 rounded-[10px] px-1.5 py-1 text-texto no-underline hover:bg-trilho"
          >
            <span className="hidden flex-col items-end leading-tight lg:flex">
              <span className="text-sm font-semibold">{nome}</span>
              <span className="text-xs text-suave">{superAdmin ? "Administrador geral" : "Minha conta"}</span>
            </span>
            <Avatar nome={nome} />
          </Link>
          <BotaoSair />
        </div>
      </div>
    </header>
  );
}
