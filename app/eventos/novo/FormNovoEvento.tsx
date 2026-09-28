"use client";

import { useActionState, useState } from "react";
import { criarEvento, type EstadoForm } from "../actions";
import { BotaoEnviar } from "@/components/Botoes";
import { CamposEvento } from "@/components/CamposEvento";

export function FormNovoEvento({ eventos }: { eventos: { id: string; nome: string }[] }) {
  const [estado, acao] = useActionState<EstadoForm, FormData>(criarEvento, {});
  const [cats, setCats] = useState(eventos.length ? "copiar" : "padrao");

  return (
    <form action={acao} className="cartao flex flex-col gap-6 p-6 sm:p-8">
      <CamposEvento />

      <fieldset className="flex flex-col gap-3">
        <legend className="legenda-campo">Categorias iniciais</legend>
        {eventos.length > 0 && (
          <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[10px] border border-[#3a3127] px-3">
            <input type="radio" name="categorias" value="copiar" checked={cats === "copiar"} onChange={() => setCats("copiar")} className="size-[18px] accent-ouro" />
            Copiar de um evento anterior
          </label>
        )}
        {cats === "copiar" && eventos.length > 0 && (
          <div className="ml-8 flex flex-col gap-3">
            <select name="copiar_de" className="campo" aria-label="Evento de origem">
              {eventos.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </select>
            <label className="flex min-h-11 items-center gap-3 text-sm text-texto-2">
              <input type="checkbox" name="copiar_valores" className="size-[18px] accent-ouro" />
              Copiar também os valores previstos
            </label>
          </div>
        )}
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[10px] border border-[#3a3127] px-3">
          <input type="radio" name="categorias" value="padrao" checked={cats === "padrao"} onChange={() => setCats("padrao")} className="size-[18px] accent-ouro" />
          Usar as categorias padrão (Local, Buffet, Bebidas, Decoração, Som e DJ, Fotografia, Outros)
        </label>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[10px] border border-[#3a3127] px-3">
          <input type="radio" name="categorias" value="nenhuma" checked={cats === "nenhuma"} onChange={() => setCats("nenhuma")} className="size-[18px] accent-ouro" />
          Começar sem categorias
        </label>
      </fieldset>

      {estado.erro && <p className="aviso-erro">{estado.erro}</p>}
      <div className="flex justify-end border-t border-trilho pt-5">
        <BotaoEnviar pendente="Criando…">Criar evento</BotaoEnviar>
      </div>
    </form>
  );
}
