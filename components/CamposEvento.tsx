import { CampoMoeda } from "./CampoMoeda";
import type { Evento } from "@/lib/tipos";
import { NOMES_STATUS_EVENTO } from "@/lib/tipos";

/** Campos compartilhados entre "Novo evento" e "Configurar evento". */
export function CamposEvento({ evento }: { evento?: Evento }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <label className="sm:col-span-2">
        <span className="legenda-campo">Nome do evento *</span>
        <input name="nome" required defaultValue={evento?.nome} className="campo" placeholder="Ex.: Réveillon 2027" />
      </label>
      <label>
        <span className="legenda-campo">Data</span>
        <input name="data_evento" type="date" defaultValue={evento?.data_evento ?? ""} className="campo" />
      </label>
      <label>
        <span className="legenda-campo">Local</span>
        <input name="local" defaultValue={evento?.local ?? ""} className="campo" placeholder="Ex.: Espaço Jardim" />
      </label>
      <label>
        <span className="legenda-campo">Orçamento total (R$)</span>
        <CampoMoeda name="orcamento_total" valorInicial={evento?.orcamento_total} placeholder="30.000,00" />
      </label>
      <label>
        <span className="legenda-campo">Situação</span>
        <select name="status" defaultValue={evento?.status ?? "planejamento"} className="campo">
          {Object.entries(NOMES_STATUS_EVENTO).map(([v, n]) => (
            <option key={v} value={v}>
              {n}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
