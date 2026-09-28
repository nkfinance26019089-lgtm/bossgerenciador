import type { Metadata } from "next";
import Image from "next/image";
import { InstalarApp } from "@/components/InstalarApp";
import { FormLogin } from "./FormLogin";

export const metadata: Metadata = { title: "Entrar" };

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ voltar?: string; erro?: string }>;
}) {
  const { voltar, erro } = await searchParams;
  // quem já está conectado é levado aos eventos pelo proxy (proxy.ts)

  return (
    <main className="min-h-dvh flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[400px] flex flex-col gap-6">
        <Image
          src="/logo-bss.webp"
          alt="BSS Eventos"
          width={480}
          height={457}
          priority
          className="w-[180px] h-auto self-center rounded-2xl"
        />
        <div className="text-center flex flex-col gap-2">
          <span className="rotulo !text-ouro">Painel de custos</span>
          <h1 className="titulo text-3xl">Entrar</h1>
        </div>
        <FormLogin voltar={voltar} erroLink={erro === "link"} />
        <InstalarApp />
        <p className="rounded-[10px] border border-trilho bg-painel px-4 py-3 text-center text-[13px] leading-relaxed text-suave">
          Contas novas só entram depois de aprovadas por um administrador da BSS Eventos.
        </p>
      </div>
    </main>
  );
}
