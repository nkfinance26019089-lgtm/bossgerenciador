const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** 1234.5 → "R$ 1.234,50" */
export function brl(valor: number | string | null | undefined) {
  return moeda.format(Number(valor ?? 0));
}

/** "2026-09-24" → "24/09/2026" (sem problemas de fuso horário) */
export function dataBR(iso: string | null | undefined, curta = false) {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return curta ? `${d}/${m}` : `${d}/${m}/${a}`;
}

/** Data de hoje (fuso de São Paulo) no formato do banco: "2026-09-28" */
export function hojeISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

const relativo = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

/** "há 3 dias", "há 2 horas"… */
export function haQuanto(iso: string | null | undefined) {
  if (!iso) return "nunca";
  const seg = (new Date(iso).getTime() - Date.now()) / 1000;
  const abs = Math.abs(seg);
  if (abs < 60) return "agora";
  if (abs < 3600) return relativo.format(Math.round(seg / 60), "minute");
  if (abs < 86400) return relativo.format(Math.round(seg / 3600), "hour");
  if (abs < 86400 * 30) return relativo.format(Math.round(seg / 86400), "day");
  if (abs < 86400 * 365) return relativo.format(Math.round(seg / (86400 * 30)), "month");
  return relativo.format(Math.round(seg / (86400 * 365)), "year");
}

/** Aceita "1.234,56", "1234,56", "1234.56", "R$ 50" → número (ou NaN) */
export function lerValor(texto: FormDataEntryValue | null) {
  let s = String(texto ?? "").replace(/[R$\s]/g, "");
  if (!s) return NaN;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if ((s.match(/\./g) ?? []).length > 1) s = s.replace(/\./g, "");
  else if (/^\d{1,3}\.\d{3}$/.test(s)) s = s.replace(".", "");
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
}

/** Número → texto para campo de formulário: 1234.5 → "1.234,50" */
export function valorParaCampo(valor: number | null | undefined) {
  if (valor === null || valor === undefined) return "";
  return Number(valor).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function iniciais(nome: string | null | undefined) {
  const partes = String(nome ?? "?").trim().split(/\s+/).filter(Boolean);
  const ini = (partes[0]?.[0] ?? "?") + (partes.length > 1 ? partes[partes.length - 1][0] : "");
  return ini.toUpperCase();
}

export function texto(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

const FUSO = "America/Sao_Paulo";
const fmtHora = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" });
const fmtDiaHora = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const fmtDia = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, weekday: "long", day: "2-digit", month: "long" });
const fmtChaveDia = new Intl.DateTimeFormat("en-CA", { timeZone: FUSO });

/** "14:32" no horário de Brasília */
export function horaBR(iso: string | null | undefined) {
  return iso ? fmtHora.format(new Date(iso)) : "—";
}

/** "28/09, 14:32" no horário de Brasília */
export function dataHoraBR(iso: string | null | undefined) {
  return iso ? fmtDiaHora.format(new Date(iso)).replace(",", " às") : "—";
}

/** "segunda-feira, 28 de setembro" / "Hoje" / "Ontem" */
export function diaPorExtenso(iso: string) {
  const d = fmtChaveDia.format(new Date(iso));
  const hoje = fmtChaveDia.format(new Date());
  const ontem = fmtChaveDia.format(new Date(Date.now() - 86_400_000));
  if (d === hoje) return "Hoje";
  if (d === ontem) return "Ontem";
  const s = fmtDia.format(new Date(iso));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function chaveDoDia(iso: string) {
  return fmtChaveDia.format(new Date(iso));
}

/** 95 min → "1 h 35 min" */
export function duracao(inicio: string, fim: string) {
  const min = Math.max(0, Math.round((new Date(fim).getTime() - new Date(inicio).getTime()) / 60_000));
  if (min < 1) return "menos de 1 min";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const r = min % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}
