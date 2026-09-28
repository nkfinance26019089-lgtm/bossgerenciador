import type { Metadata } from "next";
import Link from "next/link";
import { contextoEvento, sessaoAtual } from "@/lib/dados";
import { brl } from "@/lib/formato";
import { CampoMoeda } from "@/components/CampoMoeda";
import { CORES_CATEGORIA, type Categoria } from "@/lib/tipos";
import { BotaoEnviar } from "@/components/Botoes";
import { Icone } from "@/components/Icone";
import { Mensagem } from "@/components/Mensagem";
import { criarCategoria, excluirCategoria, salvarCategoria } from "./actions";

export const metadata: Metadata = { title: "Categorias" };

export default async function Categorias({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; erro?: string; novo?: string }>;
}) {
  const { id } = await params;
  const { ok, erro, novo } = await searchParams;
  const { supabase } = await sessaoAtual();
  // dados da página em paralelo com a checagem do evento (uma espera a menos)
  const [ctx, { data: cats }, { data: gs }] = await Promise.all([
    contextoEvento(id),
    supabase.from("categorias").select("*").eq("evento_id", id).order("ordem").order("nome"),
    supabase.from("gastos").select("categoria_id, valor").eq("evento_id", id),
  ]);
  const categorias = (cats ?? []) as Categoria[];
  const gastoPor = new Map<string, number>();
  for (const g of gs ?? []) if (g.categoria_id) gastoPor.set(g.categoria_id, (gastoPor.get(g.categoria_id) ?? 0) + Number(g.valor));

  const somaPrevista = categorias.reduce((s, c) => s + Number(c.orcamento_previsto), 0);
  const orcamento = ctx.evento.orcamento_total;
  const diferenca = orcamento - somaPrevista;

  return (
    <div className="flex w-full max-w-[980px] flex-col gap-6">
      <div className="flex flex-col gap-1">
        <span className="rotulo !text-ouro">{ctx.evento.nome}</span>
        <h1 className="titulo text-[30px] sm:text-[34px]">Categorias</h1>
        <p className="text-[15px] text-suave">
          Divida o orçamento em partes (buffet, bebidas, decoração…) para saber onde o dinheiro está indo.
        </p>
      </div>

      {novo === "1" && (
        <p className="aviso-ok">
          Evento criado! Defina quanto pretende gastar em cada categoria e depois convide a equipe em{" "}
          <Link href={`/eventos/${id}/responsaveis`} className="font-semibold">
            Responsáveis
          </Link>
          .
        </p>
      )}
      <Mensagem ok={ok} erro={erro} />

      <section className="cartao flex flex-wrap items-center gap-x-8 gap-y-3 p-5">
        <Resumo nome="Orçamento total do evento" valor={brl(orcamento)} />
        <Resumo nome="Soma do previsto nas categorias" valor={brl(somaPrevista)} />
        <Resumo
          nome={diferenca >= 0 ? "Ainda sem categoria" : "Previsto acima do orçamento"}
          valor={brl(Math.abs(diferenca))}
          alerta={diferenca < 0}
        />
        {ctx.ehAdmin && (
          <Link href={`/eventos/${id}/configurar`} className="ml-auto text-sm font-semibold">
            Alterar orçamento total
          </Link>
        )}
      </section>

      <section className="cartao overflow-hidden">
        <div className="hidden grid-cols-[56px_minmax(0,1fr)_180px_150px_140px] gap-4 bg-painel-2 px-5 py-2.5 md:grid">
          {["Cor", "Nome", "Previsto (R$)", "Gasto até agora", ""].map((t, i) => (
            <span key={i} className="rotulo !text-xs">
              {t}
            </span>
          ))}
        </div>
        {categorias.length === 0 && <p className="p-6 text-suave">Nenhuma categoria ainda.</p>}
        <ul>
          {categorias.map((c) => {
            const gasto = gastoPor.get(c.id) ?? 0;
            const acima = Number(c.orcamento_previsto) > 0 && gasto > Number(c.orcamento_previsto);
            return (
              <li key={c.id} className="border-t border-trilho px-5 py-3 first:border-t-0">
                {ctx.ehAdmin ? (
                  <div className="grid grid-cols-[48px_minmax(0,1fr)] items-center gap-3 md:grid-cols-[56px_minmax(0,1fr)_180px_150px_140px] md:gap-4">
                    <form id={`cat-${c.id}`} action={salvarCategoria} className="contents">
                      <input type="hidden" name="evento_id" value={id} />
                      <input type="hidden" name="categoria_id" value={c.id} />
                      <input
                        type="color"
                        name="cor"
                        defaultValue={c.cor}
                        aria-label={`Cor de ${c.nome}`}
                        className="h-11 w-12 cursor-pointer rounded-lg border border-[#3a3127] bg-painel-2 p-1"
                      />
                      <input name="nome" defaultValue={c.nome} required aria-label="Nome da categoria" className="campo" />
                      <CampoMoeda
                        name="orcamento_previsto"
                        valorInicial={Number(c.orcamento_previsto)}
                        aria-label={`Valor previsto para ${c.nome}`}
                        className="col-span-2 md:col-span-1"
                      />
                    </form>
                    <span className={`num col-span-2 text-sm md:col-span-1 ${acima ? "font-semibold text-perigo" : "text-texto-2"}`}>
                      <span className="md:hidden text-suave">Gasto: </span>
                      {brl(gasto)}
                      {acima && " (acima)"}
                    </span>
                    <div className="col-span-2 flex justify-end gap-1 md:col-span-1">
                      <BotaoEnviar form={`cat-${c.id}`} className="btn btn-contorno btn-pequeno" pendente="…">
                        Salvar
                      </BotaoEnviar>
                      <form action={excluirCategoria}>
                        <input type="hidden" name="evento_id" value={id} />
                        <input type="hidden" name="categoria_id" value={c.id} />
                        <BotaoEnviar
                          className="btn btn-icone hover:!text-perigo"
                          pendente="…"
                          confirmar={`Excluir a categoria “${c.nome}”? Os gastos dela ficam como “Sem categoria”.`}
                          aria-label={`Excluir ${c.nome}`}
                          title="Excluir"
                        >
                          <Icone nome="lixo" />
                        </BotaoEnviar>
                      </form>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="size-3 rounded-full" style={{ background: c.cor }} />
                    <span className="flex-grow font-semibold">{c.nome}</span>
                    <span className="num text-sm text-texto-2">
                      {brl(gasto)} de {brl(Number(c.orcamento_previsto))}
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {ctx.ehAdmin && (
        <section className="cartao flex flex-col gap-4 p-5">
          <h2 className="rotulo !text-ouro-claro">Nova categoria</h2>
          <form action={criarCategoria} className="grid grid-cols-[48px_minmax(0,1fr)] items-end gap-3 md:grid-cols-[56px_minmax(0,1fr)_180px_auto] md:gap-4">
            <input type="hidden" name="evento_id" value={id} />
            <input
              type="color"
              name="cor"
              defaultValue={CORES_CATEGORIA[categorias.length % CORES_CATEGORIA.length]}
              aria-label="Cor"
              className="h-11 w-12 cursor-pointer rounded-lg border border-[#3a3127] bg-painel-2 p-1"
            />
            <label>
              <span className="legenda-campo">Nome</span>
              <input name="nome" required className="campo" placeholder="Ex.: Segurança" />
            </label>
            <label className="col-span-2 md:col-span-1">
              <span className="legenda-campo">Previsto (R$)</span>
              <CampoMoeda name="orcamento_previsto" />
            </label>
            <BotaoEnviar className="btn btn-ouro col-span-2 md:col-span-1" pendente="Criando…">
              <Icone nome="mais" tamanho={16} />
              Adicionar
            </BotaoEnviar>
          </form>
        </section>
      )}
    </div>
  );
}

function Resumo({ nome, valor, alerta }: { nome: string; valor: string; alerta?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="rotulo !text-xs">{nome}</span>
      <span className={`titulo num text-xl ${alerta ? "text-perigo" : ""}`}>{valor}</span>
    </div>
  );
}
