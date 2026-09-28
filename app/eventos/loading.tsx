export default function Carregando() {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="h-16 border-b border-trilho bg-lateral sm:h-[76px]" />
      <div className="mx-auto flex w-full max-w-[1280px] animate-pulse flex-col gap-6 px-4 py-8 sm:px-10" aria-busy="true" aria-label="Carregando">
        <div className="h-9 w-56 rounded-lg bg-trilho" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-11 w-28 rounded-full bg-painel" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-56 rounded-2xl bg-painel" />
          ))}
        </div>
      </div>
    </div>
  );
}
