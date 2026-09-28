import type { Metadata } from "next";
import Link from "next/link";
import { contextoEvento, sessaoAtual } from "@/lib/dados";
import { brl, dataBR, haQuanto } from "@/lib/formato";
import type { Categoria, Gasto } from "@/lib/tipos";
import { VERBOS, type Log } from "@/lib/logs";
import { Icone } from "@/components/Icone";
import { Avatar } from "@/components/Cabecalho";
import { BotaoEnviar } from "@/components/Botoes";
import { marcarComoPago } from "./gastos/actions";

export const metadata: Metadata = { title: "Visão geral" };

export default async function VisaoGeral({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await sessaoAtual();
  // dados da página em paralelo com a checagem do evento (uma espera a menos)
  const [ctx, { data: cats }, { data: gs }, { data: ats }] = await Promise.all([
    contextoEvento(id),
    supabase.from("categorias").select("*").eq("evento_id", id).order("ordem").order("nome"),
    supabase
      .from("gastos")
      .select("id, categoria_id, descricao, valor, status, vencimento, forma_pagamento, criado_por")
      .eq("evento_id", id),
    supabase
      .from("auditoria")
      .select("id, acao, descricao, detalhes, criado_em, perfis(nome)")
      .eq("evento_id", id)
      .like("acao", "gasto.%")
      .order("criado_em", { ascending: false })
      .limit(6),
  ]);
  const { evento } = ctx;

  const categorias = (cats ?? []) as Categoria[];
  const gastos = ((gs ?? []) as Gasto[]).map((g) => ({ ...g, valor: Number(g.valor) }));
  const atividades = (ats ?? []) as unknown as Log[];

  const total = gastos.reduce((s, g) => s + g.valor, 0);
  const pago = gastos.filter((g) => g.status === "pago").reduce((s, g) => s + g.valor, 0);
  const pendente = total - pago;
  const orcamento = evento.orcamento_total;
  const livre = orcamento - total;
  const base = Math.max(orcamento, total, 1);

  const porCategoria = new Map<string | null, number>();
  for (const g of gastos) porCategoria.set(g.categoria_id, (porCategoria.get(g.categoria_id) ?? 0) + g.valor);
  const semCategoria = porCategoria.get(null) ?? 0;

  const pendentes = gastos
    .filter((g) => g.status === "pendente")
    .sort((a, b) => (a.vencimento ?? "9999").localeCompare(b.vencimento ?? "9999"))
    .slice(0, 5);
  const nomeCat = new Map(categorias.map((c) => [c.id, c.nome]));

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="rotulo !text-ouro">
            {["Visão geral", evento.data_evento ? dataBR(evento.data_evento) : null, evento.local].filter(Boolean).join(" · ")}
          </span>
          <h1 className="titulo text-[30px] sm:text-[34px]">{evento.nome}</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <a href={`/eventos/${id}/gastos/exportar`} className="btn btn-contorno btn-pequeno sm:!min-h-11 sm:!px-[18px] sm:!text-sm">
            <Icone nome="baixar" tamanho={16} />
            Exportar planilha
          </a>
          {ctx.podeLancar && (
            <Link href={`/eventos/${id}/gastos/novo`} className="btn btn-ouro hidden lg:inline-flex">
              <Icone nome="mais" tamanho={16} />
              Novo gasto
            </Link>
          )}
        </div>
      </div>

      {/* Orçamento */}
      <section className="cartao flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="rotulo">Orçamento do evento</span>
            <span className="titulo num text-[28px] sm:text-[36px]">
              {brl(total)}{" "}
              <span className="font-corpo text-base font-medium text-suave">de {brl(orcamento)}</span>
            </span>
          </div>
          <div className="flex flex-col items-start gap-1.5 sm:items-end">
            <span className="rotulo">{livre >= 0 ? "Saldo livre" : "Acima do orçamento"}</span>
            <span className={`titulo num text-[26px] sm:text-[30px] ${livre >= 0 ? "text-ouro-claro" : "text-perigo"}`}>
              {brl(Math.abs(livre))}
            </span>
          </div>
        </div>
        <div
          className="flex h-3.5 gap-0.5 overflow-hidden rounded-full bg-trilho"
          role="img"
          aria-label={`Pago ${brl(pago)}, a pagar ${brl(pendente)}, livre ${brl(Math.max(livre, 0))}`}
        >
          <div className="bg-pago" style={{ width: `${(pago / base) * 100}%` }} />
          <div className="bg-pendente" style={{ width: `${(pendente / base) * 100}%` }} />
        </div>
        <div className="flex flex-wrap gap-x-7 gap-y-2 text-sm text-texto-2">
          <Legenda cor="bg-pago" nome="Pago" valor={pago} />
          <Legenda cor="bg-pendente" nome="A pagar" valor={pendente} />
          <Legenda cor="bg-trilho border border-borda-forte" nome="Livre" valor={Math.max(livre, 0)} />
        </div>
        {orcamento === 0 && ctx.ehAdmin && (
          <p className="text-sm text-suave">
            O orçamento total ainda não foi definido.{" "}
            <Link href={`/eventos/${id}/configurar`} className="font-semibold">
              Definir agora
            </Link>
          </p>
        )}
      </section>

      {/* Categorias */}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="titulo text-[22px]">Categorias</h2>
        <span className="text-[13px] text-suave">Clique numa categoria para ver os gastos dela</span>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 xl:grid-cols-4">
        {categorias.map((c) => (
          <CartaoCategoria
            key={c.id}
            href={`/eventos/${id}/gastos?categoria=${c.id}`}
            nome={c.nome}
            cor={c.cor}
            gasto={porCategoria.get(c.id) ?? 0}
            previsto={Number(c.orcamento_previsto)}
          />
        ))}
        {semCategoria > 0 && (
          <CartaoCategoria
            href={`/eventos/${id}/gastos?categoria=sem`}
            nome="Sem categoria"
            cor="#6b635b"
            gasto={semCategoria}
            previsto={0}
          />
        )}
        {ctx.ehAdmin && (
          <Link
            href={`/eventos/${id}/categorias`}
            className="flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-dashed border-borda-forte p-3 text-center text-sm font-semibold text-ouro no-underline hover:border-bronze"
          >
            <Icone nome="mais" tamanho={20} />
            {categorias.length ? "Editar categorias" : "Criar categorias"}
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* A pagar */}
        <section className="cartao flex flex-col px-5 py-4">
          <h3 className="rotulo mb-2 !text-base !text-ouro-claro">A pagar</h3>
          {pendentes.length === 0 && <p className="py-3 text-sm text-suave">Nenhuma conta pendente.</p>}
          {pendentes.map((g) => (
            <div key={g.id} className="flex flex-wrap items-center gap-3 border-t border-trilho py-2.5">
              <div className="flex min-w-0 flex-grow flex-col leading-snug">
                <span className="truncate text-sm font-semibold">{g.descricao}</span>
                <span className="text-xs text-suave">
                  {[
                    g.categoria_id ? nomeCat.get(g.categoria_id) : "Sem categoria",
                    g.forma_pagamento,
                    g.vencimento ? `vence ${dataBR(g.vencimento, true)}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
              <span className="num text-sm font-semibold">{brl(g.valor)}</span>
              {ctx.podeEditar(g) && (
                <form action={marcarComoPago}>
                  <input type="hidden" name="evento_id" value={id} />
                  <input type="hidden" name="gasto_id" value={g.id} />
                  <BotaoEnviar className="btn btn-pago btn-pequeno" pendente="…">
                    Marcar como pago
                  </BotaoEnviar>
                </form>
              )}
            </div>
          ))}
          {gastos.some((g) => g.status === "pendente") && (
            <Link href={`/eventos/${id}/gastos?status=pendente`} className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold no-underline">
              Ver todas as contas a pagar
              <Icone nome="seta" tamanho={14} />
            </Link>
          )}
        </section>

        {/* Atividade */}
        <section className="cartao flex flex-col px-5 py-4">
          <h3 className="rotulo mb-2 !text-base !text-ouro-claro">Atividade recente</h3>
          {atividades.length === 0 && <p className="py-3 text-sm text-suave">Nada registrado ainda.</p>}
          {ctx.ehAdmin && atividades.length > 0 && (
            <Link href={`/eventos/${id}/logs`} className="order-last mt-1 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold no-underline">
              Ver todos os logs
              <Icone nome="seta" tamanho={14} />
            </Link>
          )}
          {atividades.map((a) => (
            <div key={a.id} className="flex items-center gap-3 border-t border-trilho py-2.5">
              <Avatar nome={a.perfis?.nome} tamanho={30} />
              <span className="flex-grow text-[13px] leading-snug text-texto-2">
                <strong className="text-texto">{a.perfis?.nome ?? "Alguém"}</strong> {VERBOS[a.acao] ?? a.acao} “{a.descricao}”
                {a.acao === "gasto.criado" && a.detalhes?.valor != null ? ` · ${brl(Number(a.detalhes.valor))}` : ""}
              </span>
              <span className="whitespace-nowrap text-xs text-suave">{haQuanto(a.criado_em)}</span>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}

function Legenda({ cor, nome, valor }: { cor: string; nome: string; valor: number }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`size-3 rounded-[3px] ${cor}`} />
      {nome} <strong className="num text-texto">{brl(valor)}</strong>
    </span>
  );
}

function CartaoCategoria({
  href,
  nome,
  cor,
  gasto,
  previsto,
}: {
  href: string;
  nome: string;
  cor: string;
  gasto: number;
  previsto: number;
}) {
  const pct = previsto > 0 ? Math.round((gasto / previsto) * 100) : null;
  const acima = previsto > 0 && gasto > previsto;
  let nota: string;
  if (previsto === 0) nota = gasto > 0 ? "Sem valor previsto" : "Nenhum gasto ainda";
  else if (acima) nota = `Acima do previsto em ${brl(gasto - previsto)}`;
  else if (gasto === previsto) nota = "Orçamento usado por completo";
  else if (gasto === 0) nota = "Nenhum gasto ainda";
  else nota = `Restam ${brl(previsto - gasto)}`;

  return (
    <Link
      href={href}
      className="cartao flex min-w-0 flex-col gap-2 !rounded-[14px] p-3 text-texto no-underline transition-colors hover:border-bronze sm:gap-2.5 sm:p-4"
    >
      <span className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 text-sm font-semibold sm:text-[15px]">
          <span className="size-2.5 shrink-0 rounded-full" style={{ background: cor }} />
          <span className="truncate">{nome}</span>
        </span>
        {pct !== null && <span className="num font-rotulo text-[15px] font-semibold text-suave">{pct}%</span>}
      </span>
      <span className="flex flex-col text-xs text-suave sm:block sm:text-[13px]">
        <span className="titulo num text-[17px] text-texto sm:text-[21px]">{brl(gasto)}</span>
        {previsto > 0 && <span className="sm:inline"> de {brl(previsto)}</span>}
      </span>
      <span className="trilho block">
        <span
          className="block h-2"
          style={{ width: `${pct === null ? (gasto > 0 ? 100 : 0) : Math.min(pct, 100)}%`, background: acima ? "var(--color-perigo)" : cor }}
        />
      </span>
      {acima ? (
        <span className="flex items-start gap-1.5 text-xs font-semibold leading-snug text-perigo">
          <Icone nome="alerta" tamanho={14} className="mt-px shrink-0" />
          {nota}
        </span>
      ) : (
        <span className="text-xs leading-snug text-suave">{nota}</span>
      )}
    </Link>
  );
}
