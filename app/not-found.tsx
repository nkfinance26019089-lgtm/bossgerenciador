import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="titulo text-3xl">Página não encontrada</h1>
      <p className="max-w-md text-suave">Esse endereço não existe ou você não tem acesso a ele.</p>
      <Link href="/eventos" className="btn btn-ouro">
        Ir para os eventos
      </Link>
    </main>
  );
}
