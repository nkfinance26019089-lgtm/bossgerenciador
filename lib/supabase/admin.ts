import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./env";

/**
 * Cliente com a chave secreta — ignora as permissões do banco.
 * Usado SOMENTE para criar convites/links de acesso, depois de conferir
 * que quem pediu é administrador do evento.
 */
export function criarClienteAdmin() {
  const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Falta a variável SUPABASE_SECRET_KEY (veja o README).");
  return createClient(supabaseUrl(), secret, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
