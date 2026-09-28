"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { criarConta, type EstadoCadastro } from "./actions";
import { BotaoEnviar } from "@/components/Botoes";

export function FormCadastro() {
  const [estado, acao] = useActionState<EstadoCadastro, FormData>(criarConta, {});
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [repetir, setRepetir] = useState("");
  const [ver, setVer] = useState(false);

  // conta criada: pede ao navegador para guardar e-mail e senha, depois segue
  useEffect(() => {
    if (!estado.destino) return;
    try {
      localStorage.setItem("bss-email", email.trim().toLowerCase());
    } catch {}
    const seguir = () => window.location.assign(estado.destino!);
    const PC = (window as unknown as { PasswordCredential?: new (d: { id: string; password: string; name?: string }) => Credential }).PasswordCredential;
    if (PC && navigator.credentials) {
      navigator.credentials.store(new PC({ id: email, password: senha, name: nome })).catch(() => undefined).finally(seguir);
    } else {
      seguir();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado.destino]);

  if (estado.ok) {
    return (
      <div className="flex flex-col gap-4">
        <p className="aviso-ok">{estado.ok}</p>
        <Link href="/login" className="btn btn-contorno w-full">
          Voltar para a entrada
        </Link>
      </div>
    );
  }

  return (
    <form action={acao} className="flex flex-col gap-4" name="cadastro">
      <label htmlFor="nome">
        <span className="legenda-campo">Nome completo</span>
        <input id="nome" name="nome" required autoComplete="name" value={nome} onChange={(e) => setNome(e.target.value)} className="campo" placeholder="Seu nome" />
      </label>
      <label htmlFor="email">
        <span className="legenda-campo">E-mail</span>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="campo"
          placeholder="voce@email.com"
        />
      </label>
      <label htmlFor="senha">
        <span className="legenda-campo">Senha (mínimo 8 caracteres)</span>
        <span className="relative block">
          <input
            id="senha"
            name="senha"
            type={ver ? "text" : "password"}
            required
            minLength={8}
            autoComplete="new-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="campo pr-20"
          />
          <button
            type="button"
            onClick={() => setVer((v) => !v)}
            className="absolute inset-y-0 right-0 min-w-16 px-3 text-sm font-semibold text-ouro-claro"
            aria-label={ver ? "Esconder senha" : "Mostrar senha"}
          >
            {ver ? "Ocultar" : "Mostrar"}
          </button>
        </span>
      </label>
      <label htmlFor="repetir">
        <span className="legenda-campo">Repita a senha</span>
        <input
          id="repetir"
          name="repetir"
          type={ver ? "text" : "password"}
          required
          minLength={8}
          autoComplete="new-password"
          value={repetir}
          onChange={(e) => setRepetir(e.target.value)}
          className="campo"
        />
      </label>
      {estado.erro && <p className="aviso-erro">{estado.erro}</p>}
      <BotaoEnviar className="btn btn-ouro w-full" pendente="Criando conta…" disabled={!!estado.destino}>
        {estado.destino ? "Entrando…" : "Criar conta"}
      </BotaoEnviar>
      <p className="text-center text-sm text-suave">
        Já tem conta?{" "}
        <Link href="/login" className="font-semibold">
          Entrar
        </Link>
      </p>
    </form>
  );
}
