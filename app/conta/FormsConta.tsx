"use client";

import { useActionState } from "react";
import { salvarNome, salvarSenha, type EstadoConta } from "./actions";
import { BotaoEnviar } from "@/components/Botoes";

export function FormNome({ nome }: { nome: string }) {
  const [estado, acao] = useActionState<EstadoConta, FormData>(salvarNome, {});
  return (
    <form action={acao} className="flex flex-col gap-4">
      <label>
        <span className="legenda-campo">Nome</span>
        <input name="nome" defaultValue={nome} required className="campo" autoComplete="name" />
      </label>
      {estado.erro && <p className="aviso-erro">{estado.erro}</p>}
      {estado.ok && <p className="aviso-ok">{estado.ok}</p>}
      <BotaoEnviar className="btn btn-contorno self-start">Salvar nome</BotaoEnviar>
    </form>
  );
}

export function FormSenha({ bemvindo, email }: { bemvindo: boolean; email: string }) {
  const [estado, acao] = useActionState<EstadoConta, FormData>(salvarSenha, {});
  return (
    <form action={acao} className="flex flex-col gap-4">
      {bemvindo && <input type="hidden" name="bemvindo" value="1" />}
      {/* ajuda o navegador a salvar a nova senha junto com o e-mail */}
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
      <label>
        <span className="legenda-campo">Nova senha (mínimo 8 caracteres)</span>
        <input name="senha" type="password" required minLength={8} className="campo" autoComplete="new-password" />
      </label>
      <label>
        <span className="legenda-campo">Repita a nova senha</span>
        <input name="repetir" type="password" required minLength={8} className="campo" autoComplete="new-password" />
      </label>
      {estado.erro && <p className="aviso-erro">{estado.erro}</p>}
      {estado.ok && <p className="aviso-ok">{estado.ok}</p>}
      <BotaoEnviar className={bemvindo ? "btn btn-ouro self-start" : "btn btn-contorno self-start"}>
        {bemvindo ? "Criar senha e entrar" : "Alterar senha"}
      </BotaoEnviar>
    </form>
  );
}
