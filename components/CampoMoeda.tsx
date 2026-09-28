"use client";

import { useRef, useState } from "react";

/**
 * Formata enquanto digita, no padrão brasileiro:
 *   "10000"    → "10.000"
 *   "10000,5"  → "10.000,5"
 *   "1234.56"  → "1.234,56"   (ponto digitado vira vírgula de centavos)
 * Ao sair do campo completa os centavos: "10.000" → "10.000,00".
 */
export function formatarDigitando(bruto: string) {
  let s = bruto.replace(/[^\d.,]/g, "");
  // o primeiro "," (ou o último "." seguido de até 2 dígitos no fim) é a separação dos centavos
  let idx = s.indexOf(",");
  if (idx === -1) {
    const ult = s.lastIndexOf(".");
    if (ult !== -1 && s.length - ult - 1 <= 2 && /\.\d{0,2}$/.test(s) && !/^\d{1,3}(\.\d{3})+$/.test(s)) idx = ult;
  }
  let inteiro = idx === -1 ? s : s.slice(0, idx);
  let centavos: string | null = idx === -1 ? null : s.slice(idx + 1).replace(/\D/g, "");
  // 3 dígitos depois do separador = era separador de milhar ("1.000" digitado à mão)
  if (centavos !== null && centavos.length >= 3) {
    inteiro += centavos;
    centavos = null;
  }
  inteiro = inteiro.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 12);
  if (!inteiro && centavos !== null) inteiro = "0";
  const comPontos = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  s = centavos === null ? comPontos : `${comPontos},${centavos}`;
  return s;
}

export function completarCentavos(v: string) {
  if (!v) return v;
  const [i, c = ""] = v.split(",");
  return `${i || "0"},${(c + "00").slice(0, 2)}`;
}

function paraTexto(valor: number | null | undefined) {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return "";
  return Number(valor).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function CampoMoeda({
  name,
  valorInicial,
  required,
  id,
  form,
  placeholder = "0,00",
  className = "",
  "aria-label": ariaLabel,
}: {
  name: string;
  valorInicial?: number | null;
  required?: boolean;
  id?: string;
  form?: string;
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
}) {
  const [valor, setValor] = useState(paraTexto(valorInicial));
  const ref = useRef<HTMLInputElement>(null);

  function aoDigitar(e: React.ChangeEvent<HTMLInputElement>) {
    const el = e.target;
    const cursor = el.selectionStart ?? el.value.length;
    // quantos dígitos/vírgula existem depois do cursor → mantém o cursor no lugar certo
    const depois = el.value.slice(cursor).replace(/[^\d,]/g, "").length;
    const novo = formatarDigitando(el.value);
    setValor(novo);
    requestAnimationFrame(() => {
      const input = ref.current;
      if (!input || document.activeElement !== input) return;
      let pos = novo.length;
      let conta = 0;
      while (pos > 0 && conta < depois) {
        if (/[\d,]/.test(novo[pos - 1])) conta++;
        pos--;
      }
      input.setSelectionRange(pos, pos);
    });
  }

  return (
    <span className={`campo flex items-center gap-2 focus-within:border-ouro focus-within:shadow-[0_0_0_3px_rgba(212,162,76,0.2)] ${className}`}>
      <span className="select-none text-suave" aria-hidden="true">
        R$
      </span>
      <input
        ref={ref}
        id={id}
        form={form}
        name={name}
        value={valor}
        onChange={aoDigitar}
        onBlur={() => setValor((v) => completarCentavos(v))}
        onFocus={(e) => e.currentTarget.select()}
        required={required}
        inputMode="decimal"
        autoComplete="off"
        enterKeyHint="next"
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="num min-w-0 flex-grow bg-transparent text-base text-texto outline-none placeholder:text-[#8a8174]"
      />
    </span>
  );
}
