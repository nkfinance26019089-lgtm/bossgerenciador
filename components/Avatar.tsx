import { iniciais } from "@/lib/formato";

export function Avatar({ nome, tamanho = 38, online }: { nome: string | null | undefined; tamanho?: number; online?: boolean }) {
  return (
    <span className="relative inline-flex shrink-0">
      <span
        style={{ width: tamanho, height: tamanho, fontSize: tamanho < 34 ? 11 : 13 }}
        className="flex items-center justify-center rounded-full border border-bronze bg-trilho font-semibold text-ouro-claro"
      >
        {iniciais(nome)}
      </span>
      {online && (
        <span
          className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-lateral bg-pago"
          aria-label="online"
          role="img"
        />
      )}
    </span>
  );
}
