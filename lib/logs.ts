import { brl, dataBR } from "./formato";
import { NOMES_PAPEL, NOMES_STATUS_EVENTO, type Papel, type StatusEvento } from "./tipos";

export type Log = {
  id: number;
  evento_id: string | null;
  perfil_id: string | null;
  acao: string;
  descricao: string;
  detalhes: Record<string, unknown> | null;
  criado_em: string;
  perfis: { nome: string } | null;
};

export type TipoLog = "gastos" | "categorias" | "equipe" | "evento" | "acessos" | "usuarios";

export function tipoDoLog(acao: string): TipoLog {
  if (acao.startsWith("gasto.")) return "gastos";
  if (acao.startsWith("categoria.")) return "categorias";
  if (acao.startsWith("membro.")) return "equipe";
  if (acao.startsWith("sessao.")) return "acessos";
  if (acao.startsWith("usuario.")) return "usuarios";
  return "evento";
}

export const NOMES_TIPO: Record<TipoLog, string> = {
  gastos: "Gastos",
  categorias: "Categorias",
  equipe: "Equipe",
  evento: "Evento",
  acessos: "Entradas e saídas",
  usuarios: "Contas e administradores",
};

/** Verbo da ação: “Marina Costa <verbo> <descrição>” */
export const VERBOS: Record<string, string> = {
  "gasto.criado": "registrou o gasto",
  "gasto.editado": "editou o gasto",
  "gasto.pago": "marcou como pago",
  "gasto.comprovante": "alterou o comprovante de",
  "gasto.excluido": "excluiu o gasto",
  "categoria.criada": "criou a categoria",
  "categoria.editada": "editou a categoria",
  "categoria.excluida": "excluiu a categoria",
  "membro.adicionado": "adicionou à equipe",
  "membro.papel": "alterou o papel de",
  "membro.removido": "removeu da equipe",
  "evento.criado": "criou o evento",
  "evento.editado": "editou o evento",
  "evento.excluido": "excluiu o evento",
  "sessao.login": "entrou no painel",
  "sessao.logout": "saiu do painel",
  "usuario.aprovado": "aprovou a conta de",
  "usuario.recusado": "recusou o cadastro de",
  "usuario.admin_geral": "alterou o acesso de administrador geral de",
};

/** Cor da marca da ação (o texto do verbo também diz o que foi feito). */
export function corDaAcao(acao: string) {
  if (acao.endsWith("excluido") || acao.endsWith("excluida") || acao === "membro.removido") return "bg-perigo";
  if (acao === "gasto.pago") return "bg-pago";
  if (acao.endsWith("criado") || acao.endsWith("criada") || acao === "membro.adicionado") return "bg-ouro";
  if (acao.startsWith("sessao.")) return "bg-[#6fa0ea]";
  if (acao === "usuario.recusado") return "bg-perigo";
  if (acao.startsWith("usuario.")) return "bg-[#a493e0]";
  return "bg-texto-2";
}

const ROTULOS: Record<string, string> = {
  descricao: "Descrição",
  valor: "Valor",
  data_gasto: "Data",
  categoria: "Categoria",
  fornecedor: "Fornecedor",
  forma_pagamento: "Pagamento",
  status: "Status",
  vencimento: "Vencimento",
  responsavel: "Responsável",
  comprovante: "Comprovante",
  observacoes: "Observações",
  orcamento_previsto: "Previsto",
  orcamento_total: "Orçamento",
  nome: "Nome",
  cor: "Cor",
  papel: "Papel",
  data_evento: "Data do evento",
  local: "Local",
  dispositivo: "Aparelho",
  via: "Entrou com",
  admin_geral: "Administrador geral",
  email: "E-mail",
};

function formatar(chave: string, v: unknown): string {
  if (v === null || v === undefined || v === "") return "vazio";
  if (chave === "valor" || chave === "orcamento_previsto" || chave === "orcamento_total") return brl(Number(v));
  if (chave === "data_gasto" || chave === "vencimento" || chave === "data_evento") return dataBR(String(v));
  if (chave === "status") return v === "pago" ? "Pago" : v === "pendente" ? "A pagar" : (NOMES_STATUS_EVENTO[v as StatusEvento] ?? String(v));
  if (chave === "papel") return NOMES_PAPEL[v as Papel] ?? String(v);
  if (chave === "comprovante") return v ? "anexado" : "sem comprovante";
  if (chave === "via") return v === "link" ? "link de acesso" : v === "cadastro" ? "conta recém-criada" : v === "supabase" ? "direto no Supabase" : "senha";
  if (chave === "admin_geral") return v ? "sim" : "não";
  return String(v);
}

/** Lista legível de mudanças: [{campo, antes?, depois}] */
export function mudancas(log: Pick<Log, "acao" | "detalhes">) {
  const d = log.detalhes ?? {};
  const itens: { campo: string; antes?: string; depois: string }[] = [];
  // no cadastro, mostra só o essencial
  const essenciais = log.acao === "gasto.criado" || log.acao === "gasto.excluido" ? ["valor", "categoria", "status", "vencimento", "responsavel"] : null;
  for (const [k, v] of Object.entries(d)) {
    if (essenciais && !essenciais.includes(k)) continue;
    if (essenciais && (v === null || v === undefined)) continue;
    const campo = ROTULOS[k] ?? k;
    if (Array.isArray(v) && v.length === 2) itens.push({ campo, antes: formatar(k, v[0]), depois: formatar(k, v[1]) });
    else itens.push({ campo, depois: formatar(k, v) });
  }
  return itens;
}
