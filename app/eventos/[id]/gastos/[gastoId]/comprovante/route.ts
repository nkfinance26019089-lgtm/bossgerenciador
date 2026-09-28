import { NextResponse, type NextRequest } from "next/server";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ehUuid } from "@/lib/dados";

/** Abre o comprovante com um link temporário (1 minuto). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; gastoId: string }> }) {
  const { id, gastoId } = await params;
  if (!ehUuid(id) || !ehUuid(gastoId)) return new NextResponse("Não encontrado", { status: 404 });

  const supabase = await criarClienteServidor();
  const { data: gasto } = await supabase
    .from("gastos")
    .select("comprovante_path")
    .eq("id", gastoId)
    .eq("evento_id", id)
    .maybeSingle();
  if (!gasto?.comprovante_path) return new NextResponse("Comprovante não encontrado", { status: 404 });

  const { data } = await supabase.storage.from("comprovantes").createSignedUrl(gasto.comprovante_path, 60);
  if (!data?.signedUrl) return new NextResponse("Comprovante não encontrado", { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
