import type { Metadata } from "next";
import { contextoEvento, sessaoAtual } from "@/lib/dados";
import { brl, haQuanto } from "@/lib/formato";
import { NOMES_PAPEL, type Membro, type Papel } from "@/lib/tipos";
import { Avatar } from "@/components/Cabecalho";
import { BotaoEnviar } from "@/components/Botoes";
import { Icone } from "@/components/Icone";
import { Mensagem } from "@/components/Mensagem";
import { alterarPapel, removerMembro } from "./actions";
import { BotaoNovoLink, FormConvite } from "./Convite";

export const metadata: Metadata = { title: "Responsáveis" };

const DESCRICAO_PAPEL: Record<Papel, string> = {
  admin: "Define orçamento e categorias, convida e remove pessoas. Registra, edita e exclui qualquer gasto.",
  editor: "Registra gastos, anexa comprovantes e edita os gastos que ele mesmo lançou.",
  leitor: "Só visualiza o painel, a lista de gastos e a planilha. Não altera nada.",
};

const PILULA_PAPEL: Record<Papel, string> = {
  admin: "pilula pilula-ouro",
  editor: "pilula bg-[#1d2a3d] text-[#9fc0f0]",
  leitor: "pilula pilula-neutra",
};

export default async function Responsaveis({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const { id } = await params;
  const { ok, erro } = await searchParams;
  const { supabase } = await sessaoAtual();
  // dados da página em paralelo com a checagem do evento (uma espera a menos)
  const [ctx, { data: mbs }, { data: gs }] = await Promise.all([
    contextoEvento(id),
    supabase.from("evento_membros").select("evento_id, perfil_id, papel, perfis(id, nome, email, ultimo_acesso)").eq("evento_id", id),
    supabase.from("gastos").select("criado_por, valor").eq("evento_id", id),
  ]);
  const ordem: Record<Papel, number> = { admin: 0, editor: 1, leitor: 2 };
  const membros = ((mbs ?? []) as unknown as Membro[]).sort(
    (a, b) => ordem[a.papel] - ordem[b.papel] || (a.perfis?.nome ?? "").localeCompare(b.perfis?.nome ?? "", "pt-BR"),
  );
  const lancados = new Map<string, { n: number; total: number }>();
  for (const g of gs ?? []) {
    if (!g.criado_por) continue;
    const atual = lancados.get(g.criado_por) ?? { n: 0, total: 0 };
    lancados.set(g.criado_por, { n: atual.n + 1, total: atual.total + Number(g.valor) });
  }
  const contagem = (p: Papel) => membros.filter((m) => m.papel === p).length;

  return (
    <div className="flex w-full max-w-[1200px] flex-col gap-6">
      <div className="flex flex-col gap-1">
        <span className="rotulo !text-ouro">{ctx.evento.nome}</span>
        <h1 className="titulo text-[30px] sm:text-[34px]">Responsáveis</h1>
        <p className="text-[15px] text-suave">Quem pode entrar no painel deste evento e o que cada pessoa pode fazer.</p>
      </div>

      <Mensagem ok={ok} erro={erro} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {(["admin", "editor", "leitor"] as Papel[]).map((p) => (
          <div key={p} className="cartao flex flex-col gap-2 !rounded-[14px] px-5 py-4">
            <div className="flex items-center justify-between">
              <span className={PILULA_PAPEL[p]}>{NOMES_PAPEL[p]}</span>
              <span className="text-[13px] text-suave">
                {contagem(p)} {contagem(p) === 1 ? "pessoa" : "pessoas"}
              </span>
            </div>
            <span className="text-sm leading-relaxed text-texto-2">{DESCRICAO_PAPEL[p]}</span>
          </div>
        ))}
      </div>

      {ctx.ehAdmin && (
        <section className="cartao flex flex-col gap-3 p-5">
          <h2 className="rotulo !text-ouro-claro">Convidar pessoa</h2>
          <p className="text-sm text-suave">
            O painel gera um link de acesso para você mandar pelo WhatsApp. A pessoa abre o link, cria a senha e já entra.
          </p>
          <FormConvite eventoId={id} />
        </section>
      )}

      <section className="cartao overflow-hidden">
        <div className="hidden grid-cols-[minmax(0,2fr)_190px_170px_150px_minmax(0,1.3fr)] gap-4 bg-painel-2 px-5 py-2.5 lg:grid">
          {["Pessoa", "Papel", "Gastos lançados", "Último acesso", ""].map((t, i) => (
            <span key={i} className="rotulo !text-xs">
              {t}
            </span>
          ))}
        </div>
        <ul>
          {membros.map((m) => {
            const eu = m.perfil_id === ctx.userId;
            const l = lancados.get(m.perfil_id);
            const pendente = !m.perfis?.ultimo_acesso;
            return (
              <li
                key={m.perfil_id}
                className="grid grid-cols-1 gap-3 border-t border-trilho px-5 py-3.5 first:border-t-0 lg:grid-cols-[minmax(0,2fr)_190px_170px_150px_minmax(0,1.3fr)] lg:items-center lg:gap-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar nome={m.perfis?.nome} tamanho={36} />
                  <div className="flex min-w-0 flex-col leading-snug">
                    <span className="truncate font-semibold">
                      {m.perfis?.nome ?? "—"} {eu && <span className="font-normal text-suave">(você)</span>}
                    </span>
                    <span className="truncate text-xs text-suave">{m.perfis?.email}</span>
                  </div>
                </div>

                <div>
                  {ctx.ehAdmin ? (
                    <form action={alterarPapel} className="flex items-center gap-2">
                      <input type="hidden" name="evento_id" value={id} />
                      <input type="hidden" name="perfil_id" value={m.perfil_id} />
                      <select name="papel" defaultValue={m.papel} aria-label={`Papel de ${m.perfis?.nome}`} className="campo !min-h-10 !w-auto">
                        <option value="admin">Administrador</option>
                        <option value="editor">Editor</option>
                        <option value="leitor">Leitor</option>
                      </select>
                      <BotaoEnviar className="btn btn-icone" pendente="…" aria-label="Salvar papel" title="Salvar papel">
                        <Icone nome="check" />
                      </BotaoEnviar>
                    </form>
                  ) : (
                    <span className={PILULA_PAPEL[m.papel]}>{NOMES_PAPEL[m.papel]}</span>
                  )}
                </div>

                <div className="flex flex-col leading-snug text-sm">
                  <span className="num font-semibold">{brl(l?.total ?? 0)}</span>
                  <span className="text-xs text-suave">
                    {l?.n ?? 0} {(l?.n ?? 0) === 1 ? "lançamento" : "lançamentos"}
                  </span>
                </div>

                <div>
                  {pendente ? (
                    <span className="pilula pilula-pendente">Convite pendente</span>
                  ) : (
                    <span className="text-sm text-texto-2">{haQuanto(m.perfis?.ultimo_acesso)}</span>
                  )}
                </div>

                <div className="flex flex-wrap items-start justify-start gap-2 lg:justify-end">
                  {ctx.ehAdmin && !eu && (pendente || ctx.superAdmin) && (
                    <BotaoNovoLink eventoId={id} perfilId={m.perfil_id} nome={m.perfis?.nome ?? ""} />
                  )}
                  {ctx.ehAdmin && !eu && (
                    <form action={removerMembro}>
                      <input type="hidden" name="evento_id" value={id} />
                      <input type="hidden" name="perfil_id" value={m.perfil_id} />
                      <BotaoEnviar
                        className="btn btn-icone hover:!text-perigo"
                        pendente="…"
                        confirmar={`Remover ${m.perfis?.nome} deste evento?`}
                        aria-label={`Remover ${m.perfis?.nome}`}
                        title="Remover do evento"
                      >
                        <Icone nome="lixo" />
                      </BotaoEnviar>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
