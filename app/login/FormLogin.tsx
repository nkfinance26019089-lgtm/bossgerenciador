"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { entrar, recuperarSenha, type EstadoLogin } from "./actions";
import { BotaoEnviar } from "@/components/Botoes";

const EMAIL_SALVO = "bss-email";

function lerEmailSalvo() {
  try {
    return localStorage.getItem(EMAIL_SALVO) ?? "";
  } catch {
    return "";
  }
}

export function FormLogin({ voltar, erroLink }: { voltar?: string; erroLink?: boolean }) {
  const [modo, setModo] = useState<"entrar" | "recuperar">("entrar");
  const [estLogin, acaoLogin] = useActionState<EstadoLogin, FormData>(entrar, {});
  const [estRec, acaoRec] = useActionState<EstadoLogin, FormData>(recuperarSenha, {});
  const [verSenha, setVerSenha] = useState(false);
  const [lembrar, setLembrar] = useState(true);
  // campos controlados: não são apagados se a senha estiver errada
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const senhaRef = useRef<HTMLInputElement>(null);

  // preenche o e-mail usado da última vez neste aparelho
  useEffect(() => {
    const salvo = lerEmailSalvo();
    if (salvo) {
      setEmail((atual) => atual || salvo);
      senhaRef.current?.focus();
    }
  }, []);

  // login feito: pede ao navegador para guardar e-mail e senha, depois entra
  useEffect(() => {
    if (!estLogin.destino) return;
    const seguir = () => window.location.assign(estLogin.destino!);
    const PC = (window as unknown as { PasswordCredential?: new (d: { id: string; password: string; name?: string }) => Credential }).PasswordCredential;
    if (lembrar && PC && navigator.credentials && email && senha) {
      navigator.credentials
        .store(new PC({ id: email, password: senha, name: email }))
        .catch(() => undefined)
        .finally(seguir);
    } else {
      seguir();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estLogin.destino]);

  if (modo === "recuperar") {
    return (
      <form action={acaoRec} className="flex flex-col gap-4">
        <p className="text-[15px] leading-relaxed text-suave">
          Digite seu e-mail. Enviaremos um link para você criar uma nova senha.
        </p>
        <label>
          <span className="legenda-campo">E-mail</span>
          <input
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            inputMode="email"
            autoCapitalize="none"
            className="campo"
            placeholder="voce@email.com"
          />
        </label>
        {estRec.erro && <p className="aviso-erro">{estRec.erro}</p>}
        {estRec.ok && <p className="aviso-ok">{estRec.ok}</p>}
        <BotaoEnviar className="btn btn-ouro w-full" pendente="Enviando…">
          Enviar link
        </BotaoEnviar>
        <button type="button" className="btn btn-contorno w-full" onClick={() => setModo("entrar")}>
          Voltar para o login
        </button>
      </form>
    );
  }

  const entrando = !!estLogin.destino;

  return (
    <form
      action={acaoLogin}
      method="post"
      className="flex flex-col gap-4"
      id="form-login"
      name="login"
      onSubmit={() => {
        try {
          if (lembrar) localStorage.setItem(EMAIL_SALVO, email.trim().toLowerCase());
          else localStorage.removeItem(EMAIL_SALVO);
        } catch {}
      }}
    >
      <input type="hidden" name="voltar" value={voltar ?? ""} />
      {erroLink && (
        <p className="aviso-erro">
          Esse link de acesso expirou ou já foi usado. Peça um novo ao administrador ou use “Esqueci minha senha”.
        </p>
      )}
      <label htmlFor="email">
        <span className="legenda-campo">E-mail</span>
        <input
          id="email"
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="username"
          inputMode="email"
          autoCapitalize="none"
          spellCheck={false}
          className="campo"
          placeholder="voce@email.com"
        />
      </label>
      <label htmlFor="senha">
        <span className="legenda-campo">Senha</span>
        <span className="relative block">
          <input
            ref={senhaRef}
            id="senha"
            name="senha"
            type={verSenha ? "text" : "password"}
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete="current-password"
            className="campo pr-20"
          />
          <button
            type="button"
            onClick={() => setVerSenha((v) => !v)}
            className="absolute inset-y-0 right-0 min-w-16 px-3 text-sm font-semibold text-ouro-claro"
            aria-label={verSenha ? "Esconder senha" : "Mostrar senha"}
          >
            {verSenha ? "Ocultar" : "Mostrar"}
          </button>
        </span>
      </label>
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px] text-texto-2">
        <input type="checkbox" checked={lembrar} onChange={(e) => setLembrar(e.target.checked)} className="size-5 accent-ouro" />
        Lembrar meu e-mail e senha neste aparelho
      </label>
      {estLogin.erro && <p className="aviso-erro">{estLogin.erro}</p>}
      <BotaoEnviar className="btn btn-ouro w-full" pendente="Entrando…" disabled={entrando}>
        {entrando ? "Entrando…" : "Entrar"}
      </BotaoEnviar>
      <button
        type="button"
        className="min-h-11 self-center text-sm font-semibold text-ouro-claro underline-offset-4 hover:underline"
        onClick={() => setModo("recuperar")}
      >
        Esqueci minha senha
      </button>
      <p className="text-center text-[13px] text-suave">Depois de entrar, você continua conectado neste aparelho até clicar em Sair.</p>
      <div className="flex flex-col gap-2 border-t border-trilho pt-4 text-center">
        <span className="text-sm text-suave">Ainda não tem conta?</span>
        <a href="/cadastro" className="btn btn-contorno w-full">
          Criar conta
        </a>
      </div>
    </form>
  );
}
