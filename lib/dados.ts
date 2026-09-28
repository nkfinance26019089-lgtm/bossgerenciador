import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import type { Evento, Gasto, Papel, Perfil } from "@/lib/tipos";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const ehUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

/** Lê o "sub" (id do usuário) de dentro do token, sem ir ao servidor. */
function idDoToken(token: string | undefined) {
  try {
    const payload = JSON.parse(Buffer.from(String(token).split(".")[1], "base64url").toString("utf8"));
    return typeof payload.sub === "string" && ehUuid(payload.sub) ? (payload.sub as string) : null;
  } catch {
    return null;
  }
}

/**
 * Sessão do usuário — sem ida extra ao servidor de login.
 * O proxy (proxy.ts) já conferiu o token nesta mesma requisição, e todas as consultas
 * ao banco conferem o token de novo (as regras de acesso usam só o que o banco valida).
 */
export const sessaoAtual = cache(async () => {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.auth.getSession();
  const userId = idDoToken(data.session?.access_token);
  if (!userId) redirect("/login");
  return { supabase, userId };
});

export const perfilAtual = cache(async () => {
  const { supabase, userId } = await sessaoAtual();
  const { data, error } = await supabase
    .from("perfis")
    .select("id, nome, email, super_admin, aprovado, ultimo_acesso")
    .eq("id", userId)
    .maybeSingle<Perfil>();
  if (error?.code === "42703") {
    // banco ainda sem a atualização 003 (coluna "aprovado"): trata todos como aprovados
    const { data: antigo } = await supabase
      .from("perfis")
      .select("id, nome, email, super_admin, ultimo_acesso")
      .eq("id", userId)
      .maybeSingle<Omit<Perfil, "aprovado">>();
    return antigo ? { ...antigo, aprovado: true } : null;
  }
  return data;
});

/** Usuário logado + perfil. Redireciona para /login se não houver sessão. */
export const usuarioAtual = cache(async () => {
  const [sessao, perfil] = await Promise.all([sessaoAtual(), perfilAtual()]);
  if (!perfil?.aprovado) redirect("/aguardando");
  return { ...sessao, perfil };
});

/** Evento + papel do usuário nele. 404 se o evento não existe ou não é visível. */
export const contextoEvento = cache(async (eventoId: string) => {
  if (!ehUuid(eventoId)) notFound();
  const { supabase, userId } = await sessaoAtual();

  const [perfil, { data: evento }, { data: membro }] = await Promise.all([
    perfilAtual(),
    supabase.from("eventos").select("*").eq("id", eventoId).maybeSingle<Evento>(),
    supabase
      .from("evento_membros")
      .select("papel")
      .eq("evento_id", eventoId)
      .eq("perfil_id", userId)
      .maybeSingle<{ papel: Papel }>(),
  ]);
  if (!perfil?.aprovado) redirect("/aguardando");
  if (!evento) notFound();

  const superAdmin = !!perfil?.super_admin;
  const papel: Papel = superAdmin ? "admin" : (membro?.papel ?? "leitor");
  const ehAdmin = papel === "admin";
  const podeLancar = papel === "admin" || papel === "editor";

  return {
    supabase,
    userId,
    perfil,
    superAdmin,
    evento: { ...evento, orcamento_total: Number(evento.orcamento_total) },
    papel,
    ehAdmin,
    podeLancar,
    /** Editor só mexe no que ele mesmo lançou; admin mexe em tudo. */
    podeEditar: (g: Pick<Gasto, "criado_por">) => ehAdmin || (papel === "editor" && g.criado_por === userId),
  };
});

/** Eventos visíveis para o usuário (para a lista e o seletor). */
export const eventosDoUsuario = cache(async () => {
  const { supabase } = await sessaoAtual();
  const { data } = await supabase
    .from("eventos")
    .select("id, nome, data_evento, local, orcamento_total, status, criado_em")
    .order("data_evento", { ascending: false, nullsFirst: true })
    .order("criado_em", { ascending: false });
  return (data ?? []) as Evento[];
});

/** O usuário administra algum evento (ou é admin geral)? Libera "Equipe online". */
export const administraAlgo = cache(async () => {
  const { supabase, userId } = await sessaoAtual();
  const [perfil, { count }] = await Promise.all([
    perfilAtual(),
    supabase
      .from("evento_membros")
      .select("evento_id", { count: "exact", head: true })
      .eq("perfil_id", userId)
      .eq("papel", "admin"),
  ]);
  return !!perfil?.super_admin || (count ?? 0) > 0;
});

/** Quantas contas aguardam aprovação (só para administradores gerais; 0 para os demais). */
export const pedidosPendentes = cache(async () => {
  const { supabase } = await sessaoAtual();
  const [perfil, { count, error }] = await Promise.all([
    perfilAtual(),
    supabase.from("perfis").select("id", { count: "exact", head: true }).eq("aprovado", false),
  ]);
  if (!perfil?.super_admin || error) return 0;
  return count ?? 0;
});
