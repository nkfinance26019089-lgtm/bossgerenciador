"use client";

export default function Erro({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="titulo text-3xl">Algo deu errado</h1>
      <p className="max-w-md text-suave">Não foi possível carregar esta página. Verifique sua conexão e tente de novo.</p>
      <button type="button" onClick={reset} className="btn btn-ouro">
        Tentar de novo
      </button>
    </main>
  );
}
