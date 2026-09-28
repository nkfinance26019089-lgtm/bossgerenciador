"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icone, type NomeIcone } from "./Icone";
import { Avatar } from "./Avatar";
import { BotaoSair, Presenca } from "./Presenca";
import { OnlineAgora } from "./OnlineAgora";
import { InstalarApp } from "./InstalarApp";

type Props = {
  eventoId: string;
  eventoNome: string;
  eventos: { id: string; nome: string }[];
  usuario: string;
  papelNome: string;
  ehAdmin: boolean;
  podeLancar: boolean;
  veEquipe: boolean;
  superAdmin: boolean;
  pendentes?: number;
};

export function Lateral({ eventoId, eventoNome, eventos, usuario, papelNome, ehAdmin, podeLancar, veEquipe, superAdmin, pendentes = 0 }: Props) {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);
  useEffect(() => setAberto(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = aberto ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [aberto]);

  const base = `/eventos/${eventoId}`;
  const itens: { href: string; nome: string; icone: NomeIcone; exato?: boolean; contador?: number }[] = [
    { href: base, nome: "Visão geral", icone: "painel", exato: true },
    { href: `${base}/gastos`, nome: "Gastos", icone: "recibo" },
    { href: `${base}/categorias`, nome: "Categorias", icone: "etiqueta" },
    { href: `${base}/responsaveis`, nome: "Responsáveis", icone: "pessoas" },
    ...(ehAdmin
      ? [
          { href: `${base}/logs`, nome: "Logs", icone: "logs" as NomeIcone },
          { href: `${base}/configurar`, nome: "Configurar evento", icone: "ajustes" as NomeIcone },
        ]
      : []),
    ...(veEquipe ? [{ href: "/equipe", nome: "Equipe online", icone: "online" as NomeIcone, contador: pendentes }] : []),
    ...(superAdmin ? [{ href: "/logs", nome: "Logs gerais", icone: "historico" as NomeIcone, exato: true }] : []),
    { href: "/eventos", nome: "Todos os eventos", icone: "calendario", exato: true },
  ];
  const ativo = (href: string, exato?: boolean) => (exato ? pathname === href : pathname.startsWith(href));

  const seletor = (
    <details className="group relative">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2.5 rounded-xl border border-[#3a3127] bg-painel px-3.5 py-3 [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 flex-grow flex-col gap-0.5">
          <span className="rotulo !text-xs">Evento atual</span>
          <span className="truncate text-[15px] font-semibold">{eventoNome}</span>
        </span>
        <Icone nome="seletor" className="text-ouro" />
      </summary>
      <div className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-72 overflow-auto rounded-xl border border-borda bg-painel-2 p-1.5 shadow-2xl">
        {eventos.map((e) => (
          <Link
            key={e.id}
            href={`/eventos/${e.id}`}
            className={`flex min-h-11 items-center rounded-lg px-3 text-sm no-underline hover:bg-trilho ${
              e.id === eventoId ? "font-semibold text-ouro-claro" : "text-texto-2"
            }`}
          >
            {e.nome}
          </Link>
        ))}
      </div>
    </details>
  );

  const navegacao = (
    <nav aria-label="Principal" className="flex flex-col gap-1">
      {itens.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={ativo(i.href, i.exato) ? "page" : undefined}
          className={`flex min-h-11 items-center gap-3 rounded-[10px] px-3.5 text-[15px] no-underline ${
            ativo(i.href, i.exato) ? "bg-trilho font-semibold text-ouro-claro" : "font-medium text-texto-2 hover:bg-painel hover:text-texto"
          }`}
        >
          <Icone nome={i.icone} />
          <span className="flex-grow">{i.nome}</span>
          {!!i.contador && (
            <span className="num rounded-full bg-pendente px-2 py-0.5 text-xs font-bold text-tinta-ouro" aria-label={`${i.contador} pedidos de acesso`}>
              {i.contador}
            </span>
          )}
        </Link>
      ))}
    </nav>
  );

  const rodape = (
    <div className="mt-auto flex flex-col gap-3 border-t border-trilho pt-3">
      <OnlineAgora eventoId={eventoId} link={veEquipe ? "/equipe" : undefined} />
      <div className="flex items-center gap-2.5">
        <Link href="/conta" className="flex min-w-0 flex-grow items-center gap-2.5 rounded-lg px-1 py-1 text-texto no-underline hover:bg-painel">
          <Avatar nome={usuario} />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm font-semibold">{usuario}</span>
            <span className="text-xs text-suave">{papelNome}</span>
          </span>
        </Link>
        <BotaoSair />
      </div>
    </div>
  );

  // barra inferior do celular
  const abas: { href: string; nome: string; icone: NomeIcone; exato?: boolean }[] = [
    { href: base, nome: "Início", icone: "painel", exato: true },
    { href: `${base}/gastos`, nome: "Gastos", icone: "recibo" },
    { href: `${base}/categorias`, nome: "Categorias", icone: "etiqueta" },
  ];

  return (
    <>
      <Presenca evento={eventoNome} />

      {/* Celular: barra superior */}
      <header className="topo-seguro sticky top-0 z-40 box-content flex h-14 items-center gap-3 border-b border-trilho bg-lateral/95 px-4 backdrop-blur lg:hidden">
        <Link href="/eventos" aria-label="Todos os eventos" className="shrink-0">
          <Image src="/logo-bss.webp" alt="BSS Eventos" width={480} height={457} className="h-10 w-auto rounded-md" />
        </Link>
        <span className="min-w-0 flex-grow truncate text-[15px] font-semibold">{eventoNome}</span>
        <OnlineAgora eventoId={eventoId} compacto link={veEquipe ? "/equipe" : undefined} />
      </header>

      {/* Celular: barra inferior */}
      <nav
        aria-label="Atalhos"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 items-end border-t border-trilho bg-lateral/95 px-1 pb-[max(env(safe-area-inset-bottom),6px)] pt-1.5 backdrop-blur lg:hidden"
      >
        {abas.slice(0, 2).map((a) => (
          <AbaInferior key={a.href} {...a} ativo={ativo(a.href, a.exato)} />
        ))}
        {podeLancar ? (
          <Link
            href={`${base}/gastos/novo`}
            aria-label="Registrar gasto"
            className="mx-auto -mt-5 flex size-14 items-center justify-center rounded-full bg-ouro text-tinta-ouro no-underline shadow-[0_6px_20px_rgba(0,0,0,0.5)] ring-4 ring-lateral"
          >
            <Icone nome="mais" tamanho={26} />
          </Link>
        ) : (
          <AbaInferior href={`${base}/responsaveis`} nome="Equipe" icone="pessoas" ativo={ativo(`${base}/responsaveis`)} />
        )}
        <AbaInferior {...abas[2]} ativo={ativo(abas[2].href)} />
        <button
          type="button"
          onClick={() => setAberto(true)}
          aria-expanded={aberto}
          className="flex min-h-[52px] flex-col items-center justify-center gap-1 text-[11px] font-medium text-texto-2"
        >
          <Icone nome="menu" tamanho={22} />
          Menu
        </button>
      </nav>

      {/* Celular: menu completo */}
      {aberto && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" aria-label="Fechar menu" className="absolute inset-0 bg-black/60" onClick={() => setAberto(false)} />
          <aside className="absolute inset-y-0 right-0 flex w-[min(320px,88vw)] flex-col gap-5 overflow-y-auto bg-lateral p-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-[max(env(safe-area-inset-top),16px)]">
            <div className="flex items-center justify-between">
              <span className="rotulo !text-ouro">Menu</span>
              <button type="button" className="btn btn-icone" aria-label="Fechar menu" onClick={() => setAberto(false)}>
                <Icone nome="fechar" tamanho={22} />
              </button>
            </div>
            {seletor}
            {navegacao}
            <InstalarApp />
            {rodape}
          </aside>
        </div>
      )}

      {/* Computador: barra lateral fixa */}
      <aside className="hidden w-[256px] shrink-0 border-r border-trilho bg-lateral lg:block">
        <div className="sticky top-0 flex h-dvh flex-col gap-5 overflow-y-auto px-4 py-5">
          <Image src="/logo-bss.webp" alt="BSS Eventos" width={480} height={457} priority className="w-[132px] h-auto self-center rounded-xl" />
          {seletor}
          {navegacao}
          {rodape}
        </div>
      </aside>
    </>
  );
}

function AbaInferior({ href, nome, icone, ativo }: { href: string; nome: string; icone: NomeIcone; ativo: boolean }) {
  return (
    <Link
      href={href}
      aria-current={ativo ? "page" : undefined}
      className={`flex min-h-[52px] flex-col items-center justify-center gap-1 text-[11px] no-underline ${
        ativo ? "font-semibold text-ouro-claro" : "font-medium text-texto-2"
      }`}
    >
      <Icone nome={icone} tamanho={22} />
      {nome}
    </Link>
  );
}
