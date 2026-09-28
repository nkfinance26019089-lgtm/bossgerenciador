import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { administraAlgo, usuarioAtual } from "@/lib/dados";
import { Cabecalho } from "@/components/Cabecalho";
import { Icone } from "@/components/Icone";
import { Mensagem } from "@/components/Mensagem";
import { PainelEquipe, type Sessao } from "@/components/PainelEquipe";
import { GestaoContas, type Conta } from "@/components/GestaoContas";

export const metadata: Metadata = { title: "Equipe online" };

export default async function Equipe({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const [{ ok, erro }, { supabase, perfil, userId }, veEquipe] = await Promise.all([searchParams, usuarioAtual(), administraAlgo()]);
  if (!veEquipe) redirect("/eventos");
  const superAdmin = !!perfil?.super_admin;

  const trintaDias = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [{ data: sess }, { data: pfs }] = await Promise.all([
    supabase
      .from("sessoes")
      .select("id, perfil_id, inicio, ultimo_sinal, fim, motivo_fim, dispositivo, pagina, perfis(nome)")
      .gte("ultimo_sinal", trintaDias)
      .order("inicio", { ascending: false })
      .limit(800),
    supabase.from("perfis").select("id, nome, email, super_admin, aprovado, criado_em, ultimo_acesso").order("nome"),
  ]);
  const sessoes = (sess ?? []) as unknown as Sessao[];
  const contas = (pfs ?? []) as Conta[];
  // pessoas que você administra (as que aparecem no histórico) + você
  const visiveis = new Set([userId, ...sessoes.map((s) => s.perfil_id)]);
  const pessoas = contas
    .filter((p) => p.aprovado !== false && (superAdmin || visiveis.has(p.id)))
    .map((p) => ({ id: p.id, nome: p.nome }));

  return (
    <>
      <Cabecalho />
      <main className="mx-auto flex max-w-[1180px] flex-col gap-7 px-4 py-6 sm:px-10 sm:py-8">
        <Link href="/eventos" className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-semibold no-underline">
          <Icone nome="voltar" tamanho={16} />
          Voltar aos eventos
        </Link>
        <div className="flex flex-col gap-1.5">
          <h1 className="titulo text-[30px] sm:text-[34px]">Equipe</h1>
          <p className="text-[15px] text-suave">
            {superAdmin ? "Aprovação de contas, " : ""}quem está usando o painel agora e o histórico de entradas e saídas. Atualiza sozinho.
          </p>
        </div>
        <Mensagem ok={ok} erro={erro} />
        {superAdmin && <GestaoContas contas={contas} euId={userId} />}
        <PainelEquipe sessoes={sessoes} pessoas={pessoas} agoraServidor={Date.now()} />
      </main>
    </>
  );
}
