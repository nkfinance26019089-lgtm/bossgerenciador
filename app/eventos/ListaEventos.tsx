"use client";

import Link from "next/link";
import { useState } from "react";
import { brl, dataBR } from "@/lib/formato";
import { NOMES_STATUS_EVENTO, type StatusEvento } from "@/lib/tipos";
import { Icone } from "@/components/Icone";

export type ResumoEvento = {
  id: string;
  nome: string;
  data_evento: string | null;
  local: string | null;
  status: StatusEvento;
  orcamento: number;
  gasto: number;
  pessoas: number;
};

type Aba = "todos" | StatusEvento;
const ABAS: { chave: Aba; nome: string }[] = [
  { chave: "todos", nome: "Todos" },
  { chave: "andamento", nome: "Em andamento" },
  { chave: "planejamento", nome: "Planejamento" },
  { chave: "encerrado", nome: "Encerrados" },
];

const PILULA_STATUS: Record<StatusEvento, string> = {
  andamento: "pilula pilula-pago",
  planejamento: "pilula pilula-ouro",
  encerrado: "pilula pilula-neutra",
};

/** Lista com abas instantâneas (filtra no próprio aparelho, sem recarregar). */
export function ListaEventos({ eventos, inicial }: { eventos: ResumoEvento[]; inicial: string | undefined }) {
  const [aba, setAba] = useState<Aba>(ABAS.some((a) => a.chave === inicial) ? (inicial as Aba) : "todos");
  const lista = eventos.filter((e) => aba === "todos" || e.status === aba);

  const trocar = (a: Aba) => {
    setAba(a);
    window.history.replaceState(null, "", a === "todos" ? "/eventos" : `/eventos?status=${a}`);
  };

  return (
    <>
      <div role="tablist" aria-label="Filtrar eventos" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {ABAS.map((a) => {
          const n = a.chave === "todos" ? eventos.length : eventos.filter((e) => e.status === a.chave).length;
          const ativo = a.chave === aba;
          return (
            <button
              key={a.chave}
              type="button"
              role="tab"
              aria-selected={ativo}
              onClick={() => trocar(a.chave)}
              className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm ${
                ativo ? "border-ouro bg-trilho font-semibold text-ouro-claro" : "border-[#3a3127] text-texto-2 hover:border-bronze"
              }`}
            >
              {a.nome}
              <span className={`num text-xs ${ativo ? "text-ouro" : "text-suave"}`}>{n}</span>
            </button>
          );
        })}
      </div>

      {lista.length === 0 ? (
        <p className="cartao p-8 text-center text-suave">Nenhum evento com essa situação.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {lista.map((e) => {
            const pct = e.orcamento > 0 ? Math.round((e.gasto / e.orcamento) * 100) : 0;
            return (
              <Link
                key={e.id}
                href={`/eventos/${e.id}`}
                className="cartao group flex flex-col gap-3.5 p-5 text-texto no-underline transition-colors hover:border-bronze"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={PILULA_STATUS[e.status]}>{NOMES_STATUS_EVENTO[e.status]}</span>
                  <span className="flex items-center gap-1.5 text-[13px] text-suave">
                    <Icone nome="pessoas" tamanho={15} />
                    {e.pessoas}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <h2 className="titulo text-[22px]">{e.nome}</h2>
                  <span className="flex items-center gap-1.5 text-sm text-suave">
                    <Icone nome="calendario" tamanho={15} />
                    {[e.data_evento ? dataBR(e.data_evento) : "Data a definir", e.local].filter(Boolean).join(" · ")}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between gap-2 text-[13px] text-suave">
                    <span>
                      <strong className="num text-base text-texto">{brl(e.gasto)}</strong> de {brl(e.orcamento)}
                    </span>
                    <span className={`num ${pct > 100 ? "font-semibold text-perigo" : ""}`}>{pct}%</span>
                  </div>
                  <div className="trilho">
                    <div className={pct > 100 ? "h-2 bg-perigo" : "h-2 bg-ouro"} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>
                <span className="mt-1 flex items-center justify-end gap-1.5 text-sm font-semibold text-ouro-claro">
                  Abrir painel
                  <Icone nome="seta" tamanho={16} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
