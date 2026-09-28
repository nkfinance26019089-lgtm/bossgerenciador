import type { Metadata } from "next";
import Image from "next/image";
import { FormCadastro } from "./FormCadastro";

export const metadata: Metadata = { title: "Criar conta" };

export default function Cadastro() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-[400px] flex-col gap-6">
        <Image src="/logo-bss.webp" alt="BSS Eventos" width={480} height={457} priority className="h-auto w-[140px] self-center rounded-2xl" />
        <div className="flex flex-col gap-2 text-center">
          <span className="rotulo !text-ouro">Painel de custos</span>
          <h1 className="titulo text-3xl">Criar conta</h1>
          <p className="text-[15px] leading-relaxed text-suave">
            Depois de criar, sua conta fica aguardando a aprovação de um administrador da BSS Eventos.
          </p>
        </div>
        <FormCadastro />
      </div>
    </main>
  );
}
