/** Aviso de sucesso/erro vindo da URL (?ok=… ou ?erro=…). */
export function Mensagem({ ok, erro }: { ok?: string; erro?: string }) {
  if (erro) return <p className="aviso-erro" role="alert">{erro}</p>;
  if (ok) return <p className="aviso-ok" role="status">{ok}</p>;
  return null;
}
