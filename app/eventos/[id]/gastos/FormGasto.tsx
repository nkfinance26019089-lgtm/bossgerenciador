"use client";

import { useActionState, useRef, useState } from "react";
import { salvarGasto, type EstadoGasto } from "./actions";
import { BotaoEnviar } from "@/components/Botoes";
import { Icone } from "@/components/Icone";
import { criarClienteNavegador } from "@/lib/supabase/client";
import { renovarSessao } from "@/components/Presenca";
import { CampoMoeda } from "@/components/CampoMoeda";
import { FORMAS_PAGAMENTO, type Gasto } from "@/lib/tipos";

type Opcao = { id: string; nome: string };

const LIMITE = 5 * 1024 * 1024;

/** Reduz fotos grandes do celular antes de enviar (máx. 1800px, JPEG). */
async function prepararArquivo(arquivo: File): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp)$/.test(arquivo.type) || arquivo.size < 700_000) return arquivo;
  try {
    const bmp = await createImageBitmap(arquivo);
    const escala = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * escala);
    canvas.height = Math.round(bmp.height * escala);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.82));
    return blob && blob.size < arquivo.size ? blob : arquivo;
  } catch {
    return arquivo;
  }
}

export function FormGasto({
  eventoId,
  gasto,
  categorias,
  pessoas,
  usuarioId,
  hoje,
  urlComprovante,
}: {
  eventoId: string;
  gasto?: Gasto;
  categorias: Opcao[];
  pessoas: Opcao[];
  usuarioId: string;
  hoje: string;
  urlComprovante?: string;
}) {
  const [estado, acao] = useActionState<EstadoGasto, FormData>(salvarGasto, {});
  const [status, setStatus] = useState<"pago" | "pendente">(gasto?.status ?? "pago");
  const [comprovante, setComprovante] = useState<string | null>(gasto?.comprovante_path ?? null);
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(gasto?.comprovante_path ? "Comprovante anexado" : null);
  const [enviando, setEnviando] = useState(false);
  const [erroArquivo, setErroArquivo] = useState<string | null>(null);
  const inputArquivo = useRef<HTMLInputElement>(null);

  async function aoEscolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setErroArquivo(null);
    setEnviando(true);
    try {
      const blob = await prepararArquivo(arquivo);
      if (blob.size > LIMITE) throw new Error("O arquivo passa de 5 MB. Tire uma foto menor ou envie um PDF mais leve.");
      const tipo = blob.type || arquivo.type;
      const ext = tipo === "application/pdf" ? "pdf" : tipo === "image/png" ? "png" : tipo === "image/webp" ? "webp" : tipo === "image/heic" ? "heic" : "jpg";
      const caminho = `${eventoId}/${crypto.randomUUID()}.${ext}`;
      await renovarSessao(); // o formulário pode ter ficado aberto por muito tempo
      const supabase = criarClienteNavegador();
      const { error } = await supabase.storage.from("comprovantes").upload(caminho, blob, { contentType: tipo, upsert: false });
      if (error) throw new Error("Não foi possível enviar o arquivo. Use foto (JPG/PNG) ou PDF de até 5 MB.");
      // se já havia um arquivo enviado nesta tela (e ainda não salvo), apaga
      if (comprovante && comprovante !== gasto?.comprovante_path) {
        await supabase.storage.from("comprovantes").remove([comprovante]);
      }
      setComprovante(caminho);
      setNomeArquivo(arquivo.name);
    } catch (err) {
      setErroArquivo(err instanceof Error ? err.message : "Falha ao enviar o arquivo.");
    } finally {
      setEnviando(false);
      if (inputArquivo.current) inputArquivo.current.value = "";
    }
  }

  return (
    <form action={acao} className="cartao flex flex-col gap-6 p-5 sm:p-8">
      <input type="hidden" name="evento_id" value={eventoId} />
      {gasto && <input type="hidden" name="gasto_id" value={gasto.id} />}
      <input type="hidden" name="comprovante_path" value={comprovante ?? ""} />

      <div className="grid grid-cols-1 gap-x-5 gap-y-[18px] sm:grid-cols-2">
        <label className="sm:col-span-2">
          <span className="legenda-campo">Descrição *</span>
          <input name="descricao" required defaultValue={gasto?.descricao} className="campo" placeholder="Ex.: Aluguel das mesas e cadeiras" />
        </label>
        <label>
          <span className="legenda-campo">Valor (R$) *</span>
          <CampoMoeda name="valor" required valorInicial={gasto?.valor} />
        </label>
        <label>
          <span className="legenda-campo">Data do gasto *</span>
          <input name="data_gasto" type="date" required defaultValue={gasto?.data_gasto ?? hoje} className="campo" />
        </label>
        <label>
          <span className="legenda-campo">Categoria</span>
          <select name="categoria_id" defaultValue={gasto?.categoria_id ?? ""} className="campo">
            <option value="">Sem categoria</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="legenda-campo">Fornecedor</span>
          <input name="fornecedor" defaultValue={gasto?.fornecedor ?? ""} className="campo" placeholder="Empresa ou pessoa" />
        </label>
        <label>
          <span className="legenda-campo">Forma de pagamento</span>
          <select name="forma_pagamento" defaultValue={gasto?.forma_pagamento ?? "Pix"} className="campo">
            <option value="">Não informada</option>
            {FORMAS_PAGAMENTO.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="legenda-campo">Responsável</span>
          <select name="responsavel_id" defaultValue={gasto?.responsavel_id ?? usuarioId} className="campo">
            <option value="">Ninguém</option>
            {pessoas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.id === usuarioId ? `${p.nome} (você)` : p.nome}
              </option>
            ))}
          </select>
        </label>

        <fieldset>
          <legend className="legenda-campo">Status *</legend>
          <div className="flex gap-2.5">
            {(["pago", "pendente"] as const).map((s) => (
              <label
                key={s}
                className={`flex min-h-[46px] flex-1 cursor-pointer items-center gap-2 rounded-[10px] border px-3 text-[15px] ${
                  status === s ? "border-ouro bg-trilho font-semibold text-ouro-claro" : "border-[#3a3127]"
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value={s}
                  checked={status === s}
                  onChange={() => setStatus(s)}
                  className="size-[18px] accent-ouro"
                />
                {s === "pago" ? "Pago" : "Pendente"}
              </label>
            ))}
          </div>
        </fieldset>
        {status === "pendente" ? (
          <label>
            <span className="legenda-campo">Vencimento</span>
            <input name="vencimento" type="date" defaultValue={gasto?.vencimento ?? ""} className="campo" />
          </label>
        ) : (
          <p className="self-end pb-3 text-[13px] text-suave">Marque “Pendente” para informar o vencimento.</p>
        )}

        <div className="sm:col-span-2">
          <span className="legenda-campo">Comprovante</span>
          {comprovante ? (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#3a3127] bg-painel-2 px-4 py-3">
              <Icone nome="clipe" className="text-ouro" />
              <span className="min-w-0 flex-grow truncate text-sm">{nomeArquivo}</span>
              {urlComprovante && comprovante === gasto?.comprovante_path && (
                <a href={urlComprovante} target="_blank" rel="noopener" className="btn btn-pequeno btn-contorno">
                  Ver
                </a>
              )}
              <button type="button" className="btn btn-pequeno btn-contorno" onClick={() => inputArquivo.current?.click()} disabled={enviando}>
                Trocar
              </button>
              <button
                type="button"
                className="btn btn-pequeno btn-perigo"
                onClick={() => {
                  setComprovante(null);
                  setNomeArquivo(null);
                }}
              >
                Remover
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputArquivo.current?.click()}
              disabled={enviando}
              className="flex min-h-24 w-full flex-col items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-borda-forte bg-painel-2 px-4 py-4 text-suave hover:border-bronze"
            >
              <Icone nome="camera" tamanho={22} className="text-ouro" />
              <span className="font-medium">
                {enviando ? "Enviando…" : (
                  <>
                    Tirar foto ou <span className="font-semibold text-ouro-claro">escolher arquivo</span>
                  </>
                )}
              </span>
              <span className="text-xs">Foto (JPG/PNG) ou PDF · até 5 MB</span>
            </button>
          )}
          <input
            ref={inputArquivo}
            type="file"
            accept="image/*,application/pdf"
            className="sr-only"
            tabIndex={-1}
            aria-label="Arquivo do comprovante"
            onChange={aoEscolherArquivo}
          />
          {erroArquivo && <p className="aviso-erro mt-2">{erroArquivo}</p>}
        </div>

        <label className="sm:col-span-2">
          <span className="legenda-campo">Observações</span>
          <textarea name="observacoes" rows={3} defaultValue={gasto?.observacoes ?? ""} className="campo" placeholder="Ex.: pagamento em 2x, falta a 2ª parcela" />
        </label>
      </div>

      {estado.erro && <p className="aviso-erro">{estado.erro}</p>}

      <div className="flex flex-col-reverse gap-3 border-t border-trilho pt-5 sm:flex-row sm:justify-end">
        <a href={`/eventos/${eventoId}/gastos`} className="btn text-texto">
          Cancelar
        </a>
        {!gasto && (
          <BotaoEnviar className="btn btn-contorno" name="depois" value="outro" disabled={enviando}>
            Salvar e registrar outro
          </BotaoEnviar>
        )}
        <BotaoEnviar disabled={enviando}>{gasto ? "Salvar alterações" : "Salvar gasto"}</BotaoEnviar>
      </div>
    </form>
  );
}
