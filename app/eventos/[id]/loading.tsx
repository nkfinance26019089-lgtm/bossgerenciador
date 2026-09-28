/** Esqueleto mostrado na hora ao trocar de tela, enquanto os dados chegam. */
export default function Carregando() {
  return (
    <div className="flex animate-pulse flex-col gap-5" aria-busy="true" aria-label="Carregando">
      <div className="flex flex-col gap-2">
        <div className="h-3 w-40 rounded bg-trilho" />
        <div className="h-8 w-64 max-w-full rounded-lg bg-trilho" />
      </div>
      <div className="h-36 rounded-2xl bg-painel" />
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 rounded-[14px] bg-painel" />
        ))}
      </div>
      <div className="h-48 rounded-2xl bg-painel" />
    </div>
  );
}
