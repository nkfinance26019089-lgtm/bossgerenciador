"use client";

import { useActionState, useState } from "react";
import { convidar, gerarLink, type EstadoConvite } from "./actions";
import { BotaoEnviar } from "@/components/Botoes";
import { Icone } from "@/components/Icone";

/** Mostra o link de acesso com botões para copiar e mandar pelo WhatsApp. */
function CaixaLink({ link, nome }: { link: string; nome?: string }) {
  const [copiado, setCopiado] = useState(false);
  const texto = `Olá${nome ? `, ${nome.split(" ")[0]}` : ""}! Este é o seu acesso ao painel de custos da BSS Eventos. Abra o link e crie sua senha: ${link}`;
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-bronze bg-painel-2 p-4">
      <p className="text-sm text-texto-2">
        Envie este link para a pessoa. Ele funciona <strong>uma única vez</strong> e expira em algumas horas.
      </p>
      <input readOnly value={link} className="campo num text-sm" aria-label="Link de acesso" onFocus={(e) => e.currentTarget.select()} />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-contorno btn-pequeno"
          onClick={async () => {
            await navigator.clipboard.writeText(link);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2500);
          }}
        >
          <Icone nome="copiar" tamanho={16} />
          {copiado ? "Copiado!" : "Copiar link"}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(texto)}`}
          target="_blank"
          rel="noopener"
          className="btn btn-pago btn-pequeno"
        >
          Enviar pelo WhatsApp
        </a>
      </div>
    </div>
  );
}

export function FormConvite({ eventoId }: { eventoId: string }) {
  const [estado, acao] = useActionState<EstadoConvite, FormData>(convidar, {});
  return (
    <div className="flex flex-col gap-4">
      <form action={acao} className="grid grid-cols-1 items-end gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_170px_auto]">
        <input type="hidden" name="evento_id" value={eventoId} />
        <label>
          <span className="legenda-campo">Nome</span>
          <input name="nome" required className="campo" placeholder="Nome da pessoa" />
        </label>
        <label>
          <span className="legenda-campo">E-mail</span>
          <input name="email" type="email" required className="campo" placeholder="pessoa@email.com" />
        </label>
        <label>
          <span className="legenda-campo">Papel</span>
          <select name="papel" defaultValue="editor" className="campo">
            <option value="editor">Editor</option>
            <option value="leitor">Leitor</option>
            <option value="admin">Administrador</option>
          </select>
        </label>
        <BotaoEnviar pendente="Criando…">
          <Icone nome="link" tamanho={16} />
          Gerar convite
        </BotaoEnviar>
      </form>
      {estado.erro && <p className="aviso-erro">{estado.erro}</p>}
      {estado.ok && <p className="aviso-ok">{estado.ok}</p>}
      {estado.link && <CaixaLink link={estado.link} nome={estado.nome} />}
    </div>
  );
}

export function BotaoNovoLink({ eventoId, perfilId, nome }: { eventoId: string; perfilId: string; nome: string }) {
  const [estado, acao] = useActionState<EstadoConvite, FormData>(gerarLink, {});
  return (
    <div className="flex flex-col items-end gap-2">
      <form action={acao}>
        <input type="hidden" name="evento_id" value={eventoId} />
        <input type="hidden" name="perfil_id" value={perfilId} />
        <BotaoEnviar className="btn btn-contorno btn-pequeno" pendente="Gerando…" title={`Gerar novo link de acesso para ${nome}`}>
          <Icone nome="link" tamanho={14} />
          Link de acesso
        </BotaoEnviar>
      </form>
      {estado.erro && <p className="aviso-erro max-w-[420px] text-left">{estado.erro}</p>}
      {estado.link && (
        <div className="w-full max-w-[520px] text-left">
          <CaixaLink link={estado.link} nome={estado.nome} />
        </div>
      )}
    </div>
  );
}
