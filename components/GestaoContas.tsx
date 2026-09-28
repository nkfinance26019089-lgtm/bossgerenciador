import { dataHoraBR, haQuanto } from "@/lib/formato";
import { Avatar } from "./Avatar";
import { BotaoEnviar } from "./Botoes";
import { Icone } from "./Icone";
import { aprovarConta, definirAdminGeral, recusarConta } from "@/app/equipe/actions";

export type Conta = {
  id: string;
  nome: string;
  email: string;
  super_admin: boolean;
  aprovado: boolean;
  criado_em: string;
  ultimo_acesso: string | null;
};

/** Pedidos de acesso e administradores gerais (só administradores gerais veem). */
export function GestaoContas({ contas, euId }: { contas: Conta[]; euId: string }) {
  const pendentes = contas.filter((c) => !c.aprovado).sort((a, b) => b.criado_em.localeCompare(a.criado_em));
  const aprovadas = contas
    .filter((c) => c.aprovado)
    .sort((a, b) => Number(b.super_admin) - Number(a.super_admin) || a.nome.localeCompare(b.nome, "pt-BR"));
  const totalAdmins = aprovadas.filter((c) => c.super_admin).length;

  return (
    <>
      <section id="pedidos" className="flex scroll-mt-24 flex-col gap-3">
        <h2 className="rotulo flex items-center gap-2 !text-ouro-claro">
          Pedidos de acesso
          {pendentes.length > 0 && (
            <span className="num rounded-full bg-pendente px-2 py-0.5 text-xs font-bold normal-case tracking-normal text-tinta-ouro">
              {pendentes.length}
            </span>
          )}
        </h2>
        {pendentes.length === 0 ? (
          <p className="cartao p-5 text-suave">Nenhuma conta aguardando aprovação.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {pendentes.map((c) => (
              <li key={c.id} className="cartao flex flex-col gap-4 !rounded-[14px] border-[#6b4a1e] p-4 sm:flex-row sm:items-center sm:p-5">
                <div className="flex min-w-0 flex-grow items-center gap-3">
                  <Avatar nome={c.nome} tamanho={42} />
                  <div className="flex min-w-0 flex-col leading-snug">
                    <span className="truncate font-semibold">{c.nome}</span>
                    <span className="truncate text-sm text-texto-2">{c.email}</span>
                    <span className="text-xs text-suave">Criou a conta {haQuanto(c.criado_em)} · {dataHoraBR(c.criado_em)}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                  <form action={aprovarConta} className="col-span-2 sm:col-span-1">
                    <input type="hidden" name="perfil_id" value={c.id} />
                    <input type="hidden" name="admin_geral" value="1" />
                    <BotaoEnviar className="btn btn-ouro w-full" pendente="Aprovando…">
                      <Icone nome="check" tamanho={16} />
                      Aprovar como administrador
                    </BotaoEnviar>
                  </form>
                  <form action={aprovarConta}>
                    <input type="hidden" name="perfil_id" value={c.id} />
                    <BotaoEnviar className="btn btn-contorno w-full" pendente="Aprovando…" title="Vê só os eventos em que for adicionado">
                      Aprovar como membro
                    </BotaoEnviar>
                  </form>
                  <form action={recusarConta}>
                    <input type="hidden" name="perfil_id" value={c.id} />
                    <BotaoEnviar
                      className="btn btn-perigo w-full"
                      pendente="Recusando…"
                      confirmar={`Recusar e apagar o cadastro de ${c.nome} (${c.email})?`}
                    >
                      Recusar
                    </BotaoEnviar>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="text-[13px] text-suave">
          <strong className="text-texto-2">Administrador</strong> = administrador geral: vê todos os eventos, todos os logs e a equipe online.{" "}
          <strong className="text-texto-2">Membro</strong> = vê só os eventos em que for adicionado (em Responsáveis).
        </p>
      </section>

      <section id="contas" className="flex scroll-mt-24 flex-col gap-3">
        <h2 className="rotulo !text-ouro-claro">
          Contas aprovadas · {totalAdmins} {totalAdmins === 1 ? "administrador geral" : "administradores gerais"}
        </h2>
        <ul className="cartao divide-y divide-trilho overflow-hidden">
          {aprovadas.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
              <Avatar nome={c.nome} tamanho={36} />
              <div className="flex min-w-0 flex-grow flex-col leading-snug">
                <span className="truncate font-semibold">
                  {c.nome} {c.id === euId && <span className="font-normal text-suave">(você)</span>}
                </span>
                <span className="truncate text-xs text-suave">
                  {c.email} · {c.ultimo_acesso ? `último acesso ${haQuanto(c.ultimo_acesso)}` : "nunca entrou"}
                </span>
              </div>
              {c.super_admin ? <span className="pilula pilula-ouro">Administrador geral</span> : <span className="pilula pilula-neutra">Membro</span>}
              <form action={definirAdminGeral}>
                <input type="hidden" name="perfil_id" value={c.id} />
                <input type="hidden" name="valor" value={c.super_admin ? "0" : "1"} />
                <BotaoEnviar
                  className="btn btn-contorno btn-pequeno"
                  pendente="…"
                  disabled={c.super_admin && totalAdmins <= 1}
                  confirmar={
                    c.super_admin
                      ? `${c.nome} deixará de ver todos os eventos e logs. Continuar?`
                      : `${c.nome} passará a ver todos os eventos, logs e a equipe online. Continuar?`
                  }
                >
                  {c.super_admin ? "Tornar membro" : "Tornar administrador"}
                </BotaoEnviar>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
