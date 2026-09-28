"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Avatar } from "./Avatar";

export type Online = { perfil_id: string; nome: string; pagina: string | null; dispositivo: string | null; desde: string; ultimo_sinal: string };

const ATUALIZAR_A_CADA = 20_000;

/** Quem está usando o painel agora (atualiza sozinho a cada 20 s). */
export function useOnline(eventoId?: string, inicial: Online[] | null = null) {
  const [pessoas, setPessoas] = useState<Online[] | null>(inicial);
  useEffect(() => {
    let vivo = true;
    const buscar = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const r = await fetch(`/api/presenca${eventoId ? `?evento=${eventoId}` : ""}`, { cache: "no-store" });
        if (!r.ok) return;
        const data = (await r.json()) as Online[];
        if (vivo) setPessoas(data);
      } catch {}
    };
    const inicio = setTimeout(buscar, inicial ? 20_000 : 1500); // espera o 1º sinal de presença
    const id = setInterval(buscar, ATUALIZAR_A_CADA);
    document.addEventListener("visibilitychange", buscar);
    return () => {
      vivo = false;
      clearTimeout(inicio);
      clearInterval(id);
      document.removeEventListener("visibilitychange", buscar);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventoId]);
  return pessoas;
}

export function OnlineAgora({ eventoId, compacto, link }: { eventoId?: string; compacto?: boolean; link?: string }) {
  const pessoas = useOnline(eventoId);
  if (!pessoas) return compacto ? null : <div className="h-[52px]" />;

  const nomes = pessoas.map((p) => p.nome).join(", ");
  const conteudo = compacto ? (
    <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#2f5a3a] bg-pago-fundo px-2.5 text-xs font-semibold text-pago-claro">
      <span className="size-2 rounded-full bg-pago" aria-hidden="true" />
      {pessoas.length} online
    </span>
  ) : (
    <span className="flex flex-col gap-2 rounded-xl border border-trilho bg-painel px-3 py-2.5">
      <span className="flex items-center justify-between">
        <span className="rotulo !text-xs flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-pago" aria-hidden="true" />
          Online agora
        </span>
        <span className="text-xs font-semibold text-pago-claro">{pessoas.length}</span>
      </span>
      <span className="flex flex-wrap gap-1.5">
        {pessoas.slice(0, 8).map((p) => (
          <span key={p.perfil_id} title={`${p.nome}${p.pagina ? ` — ${p.pagina}` : ""}`}>
            <Avatar nome={p.nome} tamanho={28} online />
          </span>
        ))}
        {pessoas.length > 8 && <span className="self-center text-xs text-suave">+{pessoas.length - 8}</span>}
      </span>
    </span>
  );

  const rotulo = `${pessoas.length} ${pessoas.length === 1 ? "pessoa online" : "pessoas online"}: ${nomes}`;
  return link ? (
    <Link href={link} aria-label={rotulo} title={nomes} className="no-underline text-texto">
      {conteudo}
    </Link>
  ) : (
    <span aria-label={rotulo} title={nomes}>
      {conteudo}
    </span>
  );
}
