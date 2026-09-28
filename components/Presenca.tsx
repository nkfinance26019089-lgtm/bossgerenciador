"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { descreverDispositivo, nomeDaTela } from "@/lib/dispositivo";
import { Icone } from "./Icone";

const CHAVE = "bss-sessao";
const INTERVALO = 30_000;

/** Identificador deste navegador (uma sessão por aparelho). */
export function chaveDaSessao() {
  try {
    let c = localStorage.getItem(CHAVE);
    if (!c) {
      c = crypto.randomUUID();
      localStorage.setItem(CHAVE, c);
    }
    return c;
  } catch {
    return "sem-armazenamento";
  }
}

export function esquecerSessao() {
  try {
    localStorage.removeItem(CHAVE);
  } catch {}
}

/** Garante um login renovado pelo servidor antes de ações feitas direto do navegador (ex.: enviar comprovante). */
export function renovarSessao() {
  return enviarSinal(document.title.replace(/ · BSS Eventos$/, ""));
}

function enviarSinal(pagina: string) {
  return fetch("/api/presenca", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chave: chaveDaSessao(), dispositivo: descreverDispositivo(navigator.userAgent), pagina }),
  }).then((r) => r.text()).then(() => undefined, () => undefined);
}

/**
 * Avisa o servidor a cada 30 s que a pessoa está usando o painel (e em qual tela).
 * É isso que alimenta "Equipe online" e o histórico de entrada/saída.
 */
export function Presenca({ evento }: { evento?: string }) {
  const pathname = usePathname();
  const tela = nomeDaTela(pathname) + (evento ? ` · ${evento}` : "");
  const telaRef = useRef(tela);
  telaRef.current = tela;

  useEffect(() => {
    const sinal = () => {
      if (document.visibilityState !== "visible") return;
      enviarSinal(telaRef.current);
    };
    const id = setInterval(sinal, INTERVALO);
    document.addEventListener("visibilitychange", sinal);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", sinal);
    };
  }, []);

  // mudou de tela → avisa na hora
  useEffect(() => {
    enviarSinal(tela);
  }, [tela]);

  return null;
}

/** Botão "Sair" que encerra a sessão deste aparelho no histórico. */
export function BotaoSair({ className = "btn btn-icone", comTexto = false }: { className?: string; comTexto?: boolean }) {
  return (
    <form
      action="/auth/sair"
      method="post"
      onSubmit={(e) => {
        const input = e.currentTarget.elements.namedItem("chave") as HTMLInputElement | null;
        if (input) input.value = chaveDaSessao();
        esquecerSessao();
      }}
    >
      <input type="hidden" name="chave" defaultValue="" />
      <button type="submit" className={className} aria-label="Sair">
        <Icone nome="sair" />
        {comTexto && "Sair"}
      </button>
    </form>
  );
}
