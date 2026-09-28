"use client";

import { useFormStatus } from "react-dom";

/** Botão de envio que se desativa enquanto o formulário é processado. */
export function BotaoEnviar({
  children,
  className = "btn btn-ouro",
  pendente = "Salvando…",
  confirmar,
  ...resto
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { pendente?: string; confirmar?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      {...resto}
      type="submit"
      className={className}
      disabled={pending || resto.disabled}
      onClick={(e) => {
        if (confirmar && !window.confirm(confirmar)) e.preventDefault();
      }}
    >
      {pending ? pendente : children}
    </button>
  );
}
