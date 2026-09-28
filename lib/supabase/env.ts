export function supabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("Falta a variável NEXT_PUBLIC_SUPABASE_URL (veja o README).");
  return url;
}

export function supabaseKey() {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!key) throw new Error("Falta a variável NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (veja o README).");
  return key;
}
