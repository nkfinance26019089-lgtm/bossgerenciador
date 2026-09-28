export type Papel = "admin" | "editor" | "leitor";
export type StatusGasto = "pago" | "pendente";
export type StatusEvento = "planejamento" | "andamento" | "encerrado";

export type Perfil = {
  id: string;
  nome: string;
  email: string;
  super_admin: boolean;
  aprovado: boolean;
  ultimo_acesso: string | null;
};

export type Evento = {
  id: string;
  nome: string;
  data_evento: string | null;
  local: string | null;
  orcamento_total: number;
  status: StatusEvento;
  criado_em: string;
};

export type Categoria = {
  id: string;
  evento_id: string;
  nome: string;
  cor: string;
  orcamento_previsto: number;
  ordem: number;
};

export type Gasto = {
  id: string;
  evento_id: string;
  categoria_id: string | null;
  descricao: string;
  valor: number;
  data_gasto: string;
  fornecedor: string | null;
  forma_pagamento: string | null;
  status: StatusGasto;
  vencimento: string | null;
  responsavel_id: string | null;
  comprovante_path: string | null;
  observacoes: string | null;
  criado_por: string | null;
  criado_em: string;
};

export type Membro = {
  evento_id: string;
  perfil_id: string;
  papel: Papel;
  perfis: Pick<Perfil, "id" | "nome" | "email" | "ultimo_acesso"> | null;
};

export const FORMAS_PAGAMENTO = [
  "Pix",
  "Cartão de crédito",
  "Cartão de débito",
  "Dinheiro",
  "Boleto",
  "Transferência",
] as const;

export const NOMES_PAPEL: Record<Papel, string> = {
  admin: "Administrador",
  editor: "Editor",
  leitor: "Leitor",
};

export const NOMES_STATUS_EVENTO: Record<StatusEvento, string> = {
  planejamento: "Planejamento",
  andamento: "Em andamento",
  encerrado: "Encerrado",
};

/** Cores das categorias (legíveis sobre o fundo escuro). */
export const CORES_CATEGORIA = [
  "#A493E0",
  "#E88A4A",
  "#5FBFA8",
  "#E07A9E",
  "#6FA0EA",
  "#CDB75A",
  "#9A9EA3",
  "#C98B6B",
] as const;

export const CATEGORIAS_PADRAO = [
  "Local",
  "Buffet",
  "Bebidas",
  "Decoração",
  "Som e DJ",
  "Fotografia",
  "Outros",
];
