"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { brl, dataBR } from "@/lib/formato";
import type { Gasto, Papel } from "@/lib/tipos";
import { Icone } from "@/components/Icone";
import { BotaoEnviar } from "@/components/Botoes";
import { excluirGasto, marcarComoPago } from "./actions";

type Opcao = { id: string; nome: string; cor?: string };
type Filtros = { status: string; categoria: string; responsavel: string; busca: string };

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Lista de gastos com filtros instantâneos (sem recarregar a página). */
export function ListaGastos({
  eventoId,
  gastos,
  categorias,
  pessoas,
  inicial,
  userId,
  papel,
  podeLancar,
}: {
  eventoId: string;
  gastos: Gasto[];
  categorias: Opcao[];
  pessoas: Opcao[];
  inicial: Partial<Filtros>;
  userId: string;
  papel: Papel;
  podeLancar: boolean;
}) {
  const [f, setF] = useState<Filtros>({ status: "", categoria: "", responsavel: "", busca: "", ...inicial });
  const cat = useMemo(() => new Map(categorias.map((c) => [c.id, c])), [categorias]);
  const nomePessoa = useMemo(() => new Map(pessoas.map((p) => [p.id, p.nome])), [pessoas]);
  const temSemCategoria = gastos.some((g) => !g.categoria_id);

  const mudar = (campo: keyof Filtros, valor: string) => {
    const novo = { ...f, [campo]: valor };
    setF(novo);
    const qs = new URLSearchParams(Object.entries(novo).filter(([, v]) => v) as [string, string][]).toString();
    window.history.replaceState(null, "", `/eventos/${eventoId}/gastos${qs ? `?${qs}` : ""}`);
  };

  const lista = useMemo(() => {
    const termo = semAcento(f.busca.trim());
    return gastos.filter(
      (g) =>
        (!f.status || g.status === f.status) &&
        (!f.categoria || (f.categoria === "sem" ? !g.categoria_id : g.categoria_id === f.categoria)) &&
        (!f.responsavel || g.responsavel_id === f.responsavel) &&
        (!termo || semAcento(`${g.descricao} ${g.fornecedor ?? ""}`).includes(termo)),
    );
  }, [gastos, f]);

  const total = lista.reduce((s, g) => s + g.valor, 0);
  const totalPago = lista.filter((g) => g.status === "pago").reduce((s, g) => s + g.valor, 0);
  const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]).toString();
  const temFiltro = qs.length > 0;
  const podeEditar = (g: Gasto) => papel === "admin" || (papel === "editor" && g.criado_por === userId);

  const contagem = {
    "": gastos.length,
    pago: gastos.filter((g) => g.status === "pago").length,
    pendente: gastos.filter((g) => g.status === "pendente").length,
  };

  return (
    <>
      <div className="flex flex-col gap-3">
        {/* Status: abas rápidas */}
        <div role="tablist" aria-label="Status" className="flex gap-1 rounded-xl border border-borda bg-painel p-1 sm:self-start">
          {(
            [
              ["", "Todos"],
              ["pendente", "A pagar"],
              ["pago", "Pagos"],
            ] as const
          ).map(([v, nome]) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={f.status === v}
              onClick={() => mudar("status", v)}
              className={`flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg px-4 text-sm sm:flex-none ${
                f.status === v ? "bg-trilho font-semibold text-ouro-claro" : "text-texto-2 hover:text-texto"
              }`}
            >
              {nome}
              <span className={`num text-xs ${f.status === v ? "text-ouro" : "text-suave"}`}>{contagem[v]}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:items-center sm:gap-3" role="search">
          <label className="col-span-2 flex min-h-11 items-center gap-2 rounded-[10px] border border-[#3a3127] bg-painel-2 px-3 text-suave focus-within:border-ouro sm:basis-[300px]">
            <Icone nome="busca" tamanho={16} />
            <input
              type="search"
              value={f.busca}
              onChange={(e) => mudar("busca", e.target.value)}
              placeholder="Buscar descrição ou fornecedor"
              aria-label="Buscar gasto"
              className="min-w-0 flex-grow bg-transparent text-base text-texto outline-none"
            />
          </label>
          <select value={f.categoria} onChange={(e) => mudar("categoria", e.target.value)} aria-label="Categoria" className="campo sm:!w-auto">
            <option value="">Categorias</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
            {temSemCategoria && <option value="sem">Sem categoria</option>}
          </select>
          <select value={f.responsavel} onChange={(e) => mudar("responsavel", e.target.value)} aria-label="Responsável" className="campo sm:!w-auto">
            <option value="">Pessoas</option>
            {pessoas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
          {temFiltro && (
            <button type="button" onClick={() => { setF({ status: "", categoria: "", responsavel: "", busca: "" }); window.history.replaceState(null, "", `/eventos/${eventoId}/gastos`); }} className="btn btn-contorno col-span-2 sm:col-span-1">
              <Icone nome="fechar" tamanho={16} />
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      <section className="cartao overflow-hidden">
        {lista.length === 0 ? (
          <div className="flex flex-col items-center gap-3 p-8 text-center sm:p-10">
            <Icone nome="recibo" tamanho={30} className="text-ouro" />
            <p className="text-suave">{temFiltro ? "Nenhum gasto encontrado com esses filtros." : "Nenhum gasto registrado ainda."}</p>
            {!temFiltro && podeLancar && (
              <Link href={`/eventos/${eventoId}/gastos/novo`} className="btn btn-ouro">
                Registrar o primeiro gasto
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="hidden grid-cols-[76px_minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1fr)_120px_130px_132px] items-center gap-4 bg-painel-2 px-5 py-2.5 lg:grid">
              {["Data", "Descrição", "Categoria", "Responsável", "Status", "Valor", ""].map((t, i) => (
                <span key={i} className={`rotulo !text-xs ${t === "Valor" ? "text-right" : ""}`}>
                  {t}
                </span>
              ))}
            </div>
            <ul>
              {lista.map((g) => (
                <Linha
                  key={g.id}
                  g={g}
                  eventoId={eventoId}
                  categoria={g.categoria_id ? cat.get(g.categoria_id) : undefined}
                  responsavel={g.responsavel_id ? nomePessoa.get(g.responsavel_id) : undefined}
                  podeEditar={podeEditar(g)}
                  podeExcluir={papel === "admin"}
                />
              ))}
            </ul>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-borda bg-painel-2 px-4 py-3.5 text-sm sm:px-5">
              <span className="text-suave">
                {lista.length} {lista.length === 1 ? "lançamento" : "lançamentos"} · pago {brl(totalPago)} · a pagar {brl(total - totalPago)}
              </span>
              <span className="font-semibold">
                Total <span className="titulo num ml-2 text-lg">{brl(total)}</span>
              </span>
            </div>
          </>
        )}
      </section>

      <a href={`/eventos/${eventoId}/gastos/exportar${qs ? `?${qs}` : ""}`} className="btn btn-contorno self-start">
        <Icone nome="baixar" tamanho={16} />
        Exportar planilha {temFiltro ? "(com filtros)" : ""}
      </a>
    </>
  );
}

function Linha({
  g,
  eventoId,
  categoria,
  responsavel,
  podeEditar,
  podeExcluir,
}: {
  g: Gasto;
  eventoId: string;
  categoria?: Opcao;
  responsavel?: string;
  podeEditar: boolean;
  podeExcluir: boolean;
}) {
  const pilula =
    g.status === "pago" ? (
      <span className="pilula pilula-pago">
        <Icone nome="check" tamanho={13} />
        Pago
      </span>
    ) : (
      <span className="pilula pilula-pendente">
        <Icone nome="relogio" tamanho={13} />
        {g.vencimento ? `Vence ${dataBR(g.vencimento, true)}` : "A pagar"}
      </span>
    );

  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5 border-t border-trilho px-4 py-3.5 first:border-t-0 sm:px-5 lg:grid-cols-[76px_minmax(0,2.4fr)_minmax(0,1fr)_minmax(0,1fr)_120px_130px_132px] lg:items-center lg:gap-x-4 lg:py-3">
      <span className="num hidden text-sm text-suave lg:block">{dataBR(g.data_gasto, true)}</span>
      <div className="flex min-w-0 flex-col leading-snug">
        <span className="truncate text-[15px] font-semibold">{g.descricao}</span>
        <span className="truncate text-xs text-suave">
          <span className="lg:hidden">{dataBR(g.data_gasto)} · </span>
          {[g.fornecedor, g.forma_pagamento].filter(Boolean).join(" · ") || "—"}
        </span>
      </div>
      <span className="num text-right text-[15px] font-semibold lg:hidden">{brl(g.valor)}</span>
      <span className="flex min-w-0 items-center gap-2 text-sm">
        <span className="size-2 shrink-0 rounded-full" style={{ background: categoria?.cor ?? "#6b635b" }} />
        <span className="truncate">{categoria?.nome ?? "Sem categoria"}</span>
        <span className="truncate text-suave lg:hidden">· {responsavel ?? "—"}</span>
      </span>
      <span className="hidden truncate text-sm lg:block">{responsavel ?? "—"}</span>
      <span className="justify-self-end lg:justify-self-start">{pilula}</span>
      <span className="num hidden text-right text-[15px] font-semibold lg:block">{brl(g.valor)}</span>
      <div className="col-span-2 -mb-1 -mr-2 flex items-center justify-end gap-0.5 lg:col-span-1 lg:m-0">
        {g.status === "pendente" && podeEditar && (
          <form action={marcarComoPago}>
            <input type="hidden" name="evento_id" value={eventoId} />
            <input type="hidden" name="gasto_id" value={g.id} />
            <BotaoEnviar className="btn btn-icone !text-pago-claro" pendente="…" aria-label={`Marcar “${g.descricao}” como pago`} title="Marcar como pago">
              <Icone nome="check" />
            </BotaoEnviar>
          </form>
        )}
        {g.comprovante_path && (
          <a
            href={`/eventos/${eventoId}/gastos/${g.id}/comprovante`}
            target="_blank"
            rel="noopener"
            className="btn btn-icone"
            aria-label={`Ver comprovante de “${g.descricao}”`}
            title="Ver comprovante"
          >
            <Icone nome="clipe" />
          </a>
        )}
        <Link
          href={`/eventos/${eventoId}/gastos/${g.id}`}
          className="btn btn-icone"
          aria-label={`${podeEditar ? "Editar" : "Ver"} “${g.descricao}”`}
          title={podeEditar ? "Editar" : "Ver detalhes"}
        >
          <Icone nome={podeEditar ? "lapis" : "seta"} />
        </Link>
        {podeExcluir && (
          <form action={excluirGasto}>
            <input type="hidden" name="evento_id" value={eventoId} />
            <input type="hidden" name="gasto_id" value={g.id} />
            <BotaoEnviar
              className="btn btn-icone hover:!text-perigo"
              pendente="…"
              confirmar={`Excluir o gasto “${g.descricao}”? Isso não pode ser desfeito.`}
              aria-label={`Excluir “${g.descricao}”`}
              title="Excluir"
            >
              <Icone nome="lixo" />
            </BotaoEnviar>
          </form>
        )}
      </div>
    </li>
  );
}
