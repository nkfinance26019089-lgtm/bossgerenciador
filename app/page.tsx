import { redirect } from "next/navigation";

export default async function Inicio({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  // Links de e-mail que caem na raiz do site são repassados para a confirmação.
  if (sp.code || sp.token_hash) {
    const qs = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]);
    redirect(`/auth/confirm?${qs}`);
  }
  redirect("/eventos");
}
