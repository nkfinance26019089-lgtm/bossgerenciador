"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { dataHoraBR, duracao, haQuanto, horaBR } from "@/lib/formato";
import { ehCelular } from "@/lib/dispositivo";
import { useOnline } from "./OnlineAgora";
import { Avatar } from "./Avatar";
import { Icone } from "./Icone";

export type Sessao = {
  id: number;
  perfil_id: string;
  inicio: string;
  ultimo_sinal: string;
  fim: string | null;
  motivo_fim: string | null;
  dispositivo: string | null;
  pagina: string | null;
  perfis: { nome: string } | null;
};

const ONLINE_MS = 90_000;

function situacao(s: Sessao, agora: number) {
  if (!s.fim && agora - new Date(s.ultimo_sinal).getTime() < ONLINE_MS) {
    return { online: true, saida: null as string | null, como: "Online agora" };
  }
  if (s.motivo_fim === "saiu") return { online: false, saida: s.fim, como: "Clicou em Sair" };
  return { online: false, saida: s.fim ?? s.ultimo_sinal, como: "Fechou ou ficou inativo" };
}

export function PainelEquipe({ sessoes, pessoas, agoraServidor }: { sessoes: Sessao[]; pessoas: { id: string; nome: string }[]; agoraServidor: number }) {
  const router = useRouter();
  const inicial = sessoes
    .filter((s) => !s.fim && agoraServidor - new Date(s.ultimo_sinal).getTime() < ONLINE_MS)
    .filter((s, i, arr) => arr.findIndex((x) => x.perfil_id === s.perfil_id) === i)
    .map((s) => ({
      perfil_id: s.perfil_id,
      nome: s.perfis?.nome ?? "—",
      pagina: s.pagina,
      dispositivo: s.dispositivo,
      desde: s.inicio,
      ultimo_sinal: s.ultimo_sinal,
    }));
  const online = useOnline(undefined, inicial);
  const [agora, setAgora] = useState(agoraServidor);
  const [pessoa, setPessoa] = useState("");
  const [dias, setDias] = useState("7");

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 15_000);
    const r = setInterval(() => document.visibilityState === "visible" && router.refresh(), 30_000);
    return () => {
      clearInterval(t);
      clearInterval(r);
    };
  }, [router]);

  // último acesso de cada pessoa
  const ultimo = useMemo(() => {
    const m = new Map<string, Sessao>();
    for (const s of sessoes) {
      const atual = m.get(s.perfil_id);
      if (!atual || s.ultimo_sinal > atual.ultimo_sinal) m.set(s.perfil_id, s);
    }
    return m;
  }, [sessoes]);
  const onlineIds = new Set((online ?? []).map((o) => o.perfil_id));

  const historico = sessoes.filter(
    (s) => (!pessoa || s.perfil_id === pessoa) && (!dias || agora - new Date(s.inicio).getTime() < Number(dias) * 86_400_000),
  );

  const ordenadas = [...pessoas].sort((a, b) => {
    const oa = onlineIds.has(a.id) ? 1 : 0;
    const ob = onlineIds.has(b.id) ? 1 : 0;
    if (oa !== ob) return ob - oa;
    return (ultimo.get(b.id)?.ultimo_sinal ?? "").localeCompare(ultimo.get(a.id)?.ultimo_sinal ?? "");
  });

  return (
    <>
      {/* Online agora */}
      <section className="flex flex-col gap-3">
        <h2 className="rotulo flex items-center gap-2 !text-ouro-claro">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-pago opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex size-2.5 rounded-full bg-pago" />
          </span>
          Online agora {online ? `· ${online.length}` : ""}
        </h2>
        {online === null ? (
          <div className="cartao h-24 animate-pulse" />
        ) : online.length === 0 ? (
          <p className="cartao p-5 text-suave">Ninguém está usando o painel neste momento.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {online.map((o) => (
              <div key={o.perfil_id} className="cartao flex items-center gap-3 !rounded-[14px] p-4">
                <Avatar nome={o.nome} tamanho={42} online />
                <div className="flex min-w-0 flex-col gap-0.5 leading-snug">
                  <span className="truncate font-semibold">{o.nome}</span>
                  <span className="truncate text-sm text-texto-2">{o.pagina ?? "No painel"}</span>
                  <span className="flex items-center gap-1.5 text-xs text-suave">
                    <Icone nome={ehCelular(o.dispositivo) ? "celular" : "computador"} tamanho={13} />
                    {o.dispositivo ?? "—"}
                    {o.desde && <> · desde {horaBR(o.desde)}</>}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Equipe */}
      <section className="flex flex-col gap-3">
        <h2 className="rotulo !text-ouro-claro">Equipe · último acesso</h2>
        <ul className="cartao divide-y divide-trilho overflow-hidden">
          {ordenadas.map((p) => {
            const s = ultimo.get(p.id);
            const sit = s ? situacao(s, agora) : null;
            const on = onlineIds.has(p.id) || !!sit?.online;
            const pagina = online?.find((o) => o.perfil_id === p.id)?.pagina ?? s?.pagina;
            return (
              <li key={p.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                <Avatar nome={p.nome} tamanho={36} online={on} />
                <div className="flex min-w-0 flex-grow flex-col leading-snug">
                  <span className="truncate font-semibold">{p.nome}</span>
                  <span className="truncate text-xs text-suave">
                    {on
                      ? `Online · ${pagina ?? "no painel"}`
                      : s && sit?.saida
                        ? `Saiu ${dataHoraBR(sit.saida)} (${haQuanto(sit.saida)})`
                        : "Nenhum acesso registrado"}
                  </span>
                </div>
                {on ? (
                  <span className="pilula pilula-pago shrink-0">Online</span>
                ) : (
                  <span className="pilula pilula-neutra shrink-0">Offline</span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Histórico */}
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="rotulo !text-ouro-claro">Histórico de acessos</h2>
          <div className="grid w-full grid-cols-2 gap-2.5 sm:flex sm:w-auto">
            <select value={pessoa} onChange={(e) => setPessoa(e.target.value)} aria-label="Pessoa" className="campo sm:!w-auto">
              <option value="">Pessoas</option>
              {pessoas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
            <select value={dias} onChange={(e) => setDias(e.target.value)} aria-label="Período" className="campo sm:!w-auto">
              <option value="1">Últimas 24 h</option>
              <option value="7">Últimos 7 dias</option>
              <option value="30">Últimos 30 dias</option>
            </select>
          </div>
        </div>

        {historico.length === 0 ? (
          <p className="cartao p-6 text-center text-suave">Nenhum acesso nesse período.</p>
        ) : (
          <div className="cartao overflow-hidden">
            <div className="hidden grid-cols-[minmax(0,1.4fr)_150px_170px_120px_minmax(0,1fr)] gap-4 bg-painel-2 px-5 py-2.5 lg:grid">
              {["Pessoa", "Entrou", "Saiu", "Tempo", "Aparelho"].map((t) => (
                <span key={t} className="rotulo !text-xs">
                  {t}
                </span>
              ))}
            </div>
            <ul className="divide-y divide-trilho">
              {historico.map((s) => {
                const sit = situacao(s, agora);
                const fim = sit.online ? new Date(agora).toISOString() : (sit.saida ?? s.ultimo_sinal);
                return (
                  <li
                    key={s.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 px-4 py-3 text-sm sm:px-5 lg:grid-cols-[minmax(0,1.4fr)_150px_170px_120px_minmax(0,1fr)] lg:items-center lg:gap-4"
                  >
                    <span className="flex min-w-0 items-center gap-2.5 font-semibold">
                      <Avatar nome={s.perfis?.nome} tamanho={28} online={sit.online} />
                      <span className="truncate">{s.perfis?.nome ?? "—"}</span>
                    </span>
                    <span className="num text-right text-texto-2 lg:hidden">{duracao(s.inicio, fim)}</span>
                    <span className="num text-texto-2">
                      <span className="text-suave lg:hidden">Entrou </span>
                      {dataHoraBR(s.inicio)}
                    </span>
                    <span className="num col-span-2 lg:col-span-1">
                      {sit.online ? (
                        <span className="pilula pilula-pago">Online agora</span>
                      ) : (
                        <span className="text-texto-2">
                          <span className="text-suave lg:hidden">Saiu </span>
                          {horaBR(sit.saida)} <span className="text-xs text-suave">· {sit.como}</span>
                        </span>
                      )}
                    </span>
                    <span className="num hidden text-texto-2 lg:block">{duracao(s.inicio, fim)}</span>
                    <span className="col-span-2 flex items-center gap-1.5 truncate text-xs text-suave lg:col-span-1 lg:text-sm">
                      <Icone nome={ehCelular(s.dispositivo) ? "celular" : "computador"} tamanho={14} />
                      {s.dispositivo ?? "—"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        <p className="text-[13px] text-suave">
          “Fechou ou ficou inativo” = a pessoa fechou o navegador ou deixou o painel parado; a hora de saída é o último sinal (precisão de 30 segundos).
        </p>
      </section>
    </>
  );
}
