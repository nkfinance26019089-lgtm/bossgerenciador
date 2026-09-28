"use client";

import { useEffect, useState } from "react";
import { Icone } from "./Icone";

type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const DISPENSADO = "bss-instalar-dispensado";

// o evento do Android pode chegar antes do React montar: guarda aqui
let promptGuardado: EventoInstalar | null = null;
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    promptGuardado = e as EventoInstalar;
  });
}

function jaInstalado() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function ehIphone() {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

function ehCelular() {
  return /Android|iPhone|iPad|iPod/.test(navigator.userAgent) || navigator.maxTouchPoints > 1;
}

/**
 * Convite para instalar o painel como aplicativo.
 * - Android/Chrome: botão "Instalar app" (instala de verdade, com ícone na gaveta de apps).
 * - iPhone/iPad: passo a passo "Compartilhar › Adicionar à Tela de Início".
 * variante "banner": aparece só no celular e pode ser dispensado; "cartao": sempre visível (Minha conta).
 */
export function InstalarApp({ variante = "banner" }: { variante?: "banner" | "cartao" }) {
  const [modo, setModo] = useState<"nada" | "android" | "iphone" | "instalado">("nada");
  const [evento, setEvento] = useState<EventoInstalar | null>(null);
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    if (jaInstalado()) return setModo(variante === "cartao" ? "instalado" : "nada");
    if (variante === "banner") {
      try {
        if (localStorage.getItem(DISPENSADO)) return;
      } catch {}
      if (!ehCelular()) return;
    }
    if (ehIphone()) return setModo("iphone");
    if (promptGuardado) {
      setEvento(promptGuardado);
      setModo("android");
    }
    const aoPoder = (e: Event) => {
      e.preventDefault();
      promptGuardado = e as EventoInstalar;
      setEvento(promptGuardado);
      setModo("android");
    };
    const aoInstalar = () => setModo(variante === "cartao" ? "instalado" : "nada");
    window.addEventListener("beforeinstallprompt", aoPoder);
    window.addEventListener("appinstalled", aoInstalar);
    return () => {
      window.removeEventListener("beforeinstallprompt", aoPoder);
      window.removeEventListener("appinstalled", aoInstalar);
    };
  }, [variante]);

  const dispensar = () => {
    try {
      localStorage.setItem(DISPENSADO, "1");
    } catch {}
    setModo("nada");
  };

  const instalar = async () => {
    if (!evento) return;
    await evento.prompt();
    const escolha = await evento.userChoice.catch(() => null);
    promptGuardado = null;
    if (escolha?.outcome === "accepted") setModo(variante === "cartao" ? "instalado" : "nada");
  };

  if (modo === "nada") {
    return variante === "cartao" ? (
      <p className="text-sm text-suave">
        Abra o painel no celular (Chrome no Android ou Safari no iPhone) para instalar como aplicativo.
      </p>
    ) : null;
  }
  if (modo === "instalado") {
    return (
      <p className="flex items-center gap-2 text-sm text-pago-claro">
        <Icone nome="check" tamanho={16} />
        Você está usando o painel como aplicativo.
      </p>
    );
  }

  const envoltorio =
    variante === "banner"
      ? "relative flex flex-col gap-3 rounded-2xl border border-bronze bg-painel p-4 pr-12"
      : "flex flex-col gap-3";

  return (
    <div className={envoltorio} role="region" aria-label="Instalar o aplicativo">
      {variante === "banner" && (
        <button type="button" onClick={dispensar} aria-label="Dispensar" className="btn btn-icone absolute right-1 top-1">
          <Icone nome="fechar" tamanho={18} />
        </button>
      )}
      <div className="flex items-center gap-3">
        <img src="/icone-192.png" alt="" width={44} height={44} className="size-11 shrink-0 rounded-xl" />
        <div className="flex flex-col leading-snug">
          <span className="font-semibold">Instale o BSS Painel no celular</span>
          <span className="text-[13px] text-suave">Abre em tela cheia, direto do ícone, já conectado.</span>
        </div>
      </div>

      {modo === "android" && (
        <button type="button" onClick={instalar} className="btn btn-ouro w-full">
          <Icone nome="baixar" tamanho={16} />
          Instalar app
        </button>
      )}

      {modo === "iphone" &&
        (aberto || variante === "cartao" ? (
          <ol className="flex flex-col gap-2 text-sm text-texto-2">
            <li className="flex items-center gap-2">
              <span className="num flex size-6 shrink-0 items-center justify-center rounded-full bg-trilho text-xs font-bold text-ouro-claro">1</span>
              <span>
                No Safari, toque em <strong className="text-texto">Compartilhar</strong>{" "}
                <svg className="inline size-4 align-[-2px] text-ouro-claro" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="ícone compartilhar">
                  <path d="M12 3v12" />
                  <path d="m8 7 4-4 4 4" />
                  <path d="M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8" />
                </svg>{" "}
                (na barra de baixo).
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="num flex size-6 shrink-0 items-center justify-center rounded-full bg-trilho text-xs font-bold text-ouro-claro">2</span>
              <span>
                Role e toque em <strong className="text-texto">Adicionar à Tela de Início</strong>.
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="num flex size-6 shrink-0 items-center justify-center rounded-full bg-trilho text-xs font-bold text-ouro-claro">3</span>
              <span>
                Toque em <strong className="text-texto">Adicionar</strong>. Pronto: o ícone da BSS aparece na tela do iPhone.
              </span>
            </li>
          </ol>
        ) : (
          <button type="button" onClick={() => setAberto(true)} className="btn btn-ouro w-full">
            Como instalar no iPhone
          </button>
        ))}
    </div>
  );
}
