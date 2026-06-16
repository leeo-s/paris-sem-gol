import { createServerSupabaseClient } from "@/config/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { buscarRankingArtilheirosAno, paginar } from "../../_lib/ranking";

// GET /api/highlights/season/scorers?year=2026&page=1 — lista paginada (5 por
// página) de todos os artilheiros do ano, na mesma ordem (com desempate) usada
// no pódio
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const ano = parseInt(
      searchParams.get("year") ?? String(new Date().getUTCFullYear()),
    );
    const pagina = parseInt(searchParams.get("page") ?? "1");

    const ranking = await buscarRankingArtilheirosAno(ano);

    return NextResponse.json(paginar(ranking, pagina));
  } catch (error) {
    console.error("[GET /api/highlights/season/scorers]", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
