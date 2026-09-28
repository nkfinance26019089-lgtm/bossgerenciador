"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { chaveDoDia, diaPorExtenso, horaBR } from "@/lib/formato";
import { NOMES_TIPO, VERBOS, corDaAcao, mudancas, tipoDoLog, type Log, type TipoLog } from "@/lib/logs";
import { Avatar } from "./Avatar";
import { Icone } from "./Icone";

const PERIODOS = [
  { v: "1", nome: "Hoje" },
  { v: "7", nome: "7 dias" },
  { v: "30", nome: "30 dias" },
  { v: "", nome: "Tudo" },
] as const;

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Linha do tempo de logs com filtros instantâneos. Atualiza sozinha a cada 30 s. */
export function ListaLogs({
  logs,
  pessoas,
  tipos,
  mostrarEvento,
}: {
  logs: (Log & { evento_nome?: string | null })[];
  pessoas: { id: string; nome: string }[];
  tipos: TipoLog[];
  mostrarEvento?: boolean;
}) {
  const router = useRouter();
  const [pessoa, setPessoa] = useState("");
  const [tipo, setTipo] = useState<"" | TipoLog>("");
  const [periodo, setPeriodo] = useState<string>("7");
  const [busca, setBusca] = useState("");
  const [limite, setLimite] = useState(80);

  useEffect(() => {
    const id = setInterval(() => document.visibilityState === "visible" && router.refresh(), 30_000);
    return () => clearInterval(id);
  }, [router]);

  const filtrados = useMemo(() => {
    const desde = periodo ? Date.now() - Number(periodo) * 86_400_000 : 0;
    const hoje = chaveDoDia(new Date().toISOString());
    const termo = semAcento(busca.trim());
    return logs.filter(
      (l) =>
        (!pessoa || l.perfil_id === pessoa) &&
        (!tipo || tipoDoLog(l.acao) === tipo) &&
        (periodo === "1" ? chaveDoDia(l.criado_em) === hoje : new Date(l.criado_em).getTime() >= desde) &&
        (!termo || semAcento(`${l.descricao} ${l.perfis?.nome ?? ""} ${VERBOS[l.acao] ?? ""}`).includes(termo)),
    );
  }, [logs, pessoa, tipo, periodo, busca]);

  const visiveis = filtrados.slice(0, limite);
  const grupos: { dia: string; itens: typeof visiveis }[] = [];
  for (const l of visiveis) {
    const dia = diaPorExtenso(l.criado_em);
    if (grupos.at(-1)?.dia !== dia) grupos.push({ dia, itens: [] });
    grupos.at(-1)!.itens.push(l);
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        <div role="tablist" aria-label="Período" className="flex gap-1 rounded-xl border border-borda bg-painel p-1 sm:self-start">
          {PERIODOS.map((p) => (
            <button
              key={p.v}
              type="button"
              role="tab"
              aria-selected={periodo === p.v}
              onClick={() => setPeriodo(p.v)}
              className={`min-h-10 flex-1 rounded-lg px-4 text-sm sm:flex-none ${
                periodo === p.v ? "bg-trilho font-semibold text-ouro-claro" : "text-texto-2 hover:text-texto"
              }`}
            >
              {p.nome}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
          <label className="col-span-2 flex min-h-11 items-center gap-2 rounded-[10px] border border-[#3a3127] bg-painel-2 px-3 text-suave focus-within:border-ouro sm:basis-[280px]">
            <Icone nome="busca" tamanho={16} />
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar no histórico"
              aria-label="Buscar no histórico"
              className="min-w-0 flex-grow bg-transparent text-base text-texto outline-none"
            />
          </label>
          <select value={pessoa} onChange={(e) => setPessoa(e.target.value)} aria-label="Pessoa" className="campo sm:!w-auto">
            <option value="">Pessoas</option>
            {pessoas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
          <select value={tipo} onChange={(e) => setTipo(e.target.value as "" | TipoLog)} aria-label="Tipo" className="campo sm:!w-auto">
            <option value="">Tipo: tudo</option>
            {tipos.map((t) => (
              <option key={t} value={t}>
                {NOMES_TIPO[t]}
              </option>
            ))}
          </select>
        </div>
        <p className="text-[13px] text-suave">
          {filtrados.length} {filtrados.length === 1 ? "registro" : "registros"} · atualiza sozinho a cada 30 segundos
        </p>
      </div>

      {grupos.length === 0 ? (
        <p className="cartao p-8 text-center text-suave">Nenhum registro nesse período.</p>
      ) : (
        <div className="flex flex-col gap-5">
          {grupos.map((g) => (
            <section key={g.dia} className="flex flex-col gap-2">
              <h2 className="rotulo sticky top-14 z-10 -mx-1 bg-fundo/95 px-1 py-1.5 backdrop-blur lg:top-0">{g.dia}</h2>
              <ol className="cartao divide-y divide-trilho overflow-hidden">
                {g.itens.map((l) => {
                  const itens = mudancas(l);
                  return (
                    <li key={l.id} className="flex gap-3 px-4 py-3.5 sm:px-5">
                      <div className="flex w-12 shrink-0 flex-col items-start gap-1.5 pt-0.5">
                        <span className="num text-sm font-semibold text-texto-2">{horaBR(l.criado_em)}</span>
                        <span className={`h-1 w-5 rounded-full ${corDaAcao(l.acao)}`} aria-hidden="true" />
                      </div>
                      <div className="flex min-w-0 flex-grow flex-col gap-1.5">
                        <p className="text-[15px] leading-snug text-texto-2">
                          <strong className="text-texto">{l.perfis?.nome ?? "Sistema"}</strong> {VERBOS[l.acao] ?? l.acao}{" "}
                          {!l.acao.startsWith("sessao.") && <strong className="text-texto">“{l.descricao}”</strong>}
                          {mostrarEvento && l.evento_nome && <span className="text-suave"> · {l.evento_nome}</span>}
                        </p>
                        {itens.length > 0 && (
                          <ul className="flex flex-wrap gap-1.5">
                            {itens.map((m, i) => (
                              <li key={i} className="rounded-md border border-trilho bg-painel-2 px-2 py-1 text-xs text-texto-2">
                                <span className="text-suave">{m.campo}: </span>
                                {m.antes !== undefined ? (
                                  <>
                                    <span className="line-through decoration-suave/60">{m.antes}</span>
                                    <span className="px-1 text-ouro" aria-label="mudou para">→</span>
                                    <span className="font-semibold text-texto">{m.depois}</span>
                                  </>
                                ) : (
                                  <span className="font-semibold text-texto">{m.depois}</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <span className="hidden sm:block">
                        <Avatar nome={l.perfis?.nome} tamanho={32} />
                      </span>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
          {filtrados.length > limite && (
            <button type="button" onClick={() => setLimite((n) => n + 100)} className="btn btn-contorno self-center">
              Mostrar mais ({filtrados.length - limite})
            </button>
          )}
        </div>
      )}
    </>
  );
}
