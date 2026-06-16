import { prisma } from "@/config/prisma";
import { createServerSupabaseClient } from "@/config/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { paginar } from "../../_lib/ranking";

type JogadorResumido = {
  id: string;
  name: string;
  nickname: string | null;
  photo_url: string | null;
  position: string | null;
};

// GET /api/highlights/monthly/scorers?month=6&year=2026&page=1 — lista
// paginada (5 por página) de todos os artilheiros do mês
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
    const agora = new Date();
    const mes = parseInt(
      searchParams.get("month") ?? String(agora.getUTCMonth() + 1),
    );
    const ano = parseInt(searchParams.get("year") ?? String(agora.getUTCFullYear()));
    const pagina = parseInt(searchParams.get("page") ?? "1");

    // Limites de data do mês, sempre em UTC para acompanhar como match_date
    // é armazenado (coluna do tipo Date)
    const inicioMes = new Date(Date.UTC(ano, mes - 1, 1));
    const fimMes = new Date(Date.UTC(ano, mes, 0, 23, 59, 59, 999));
    const filtroPartidasMes = { match_date: { gte: inicioMes, lte: fimMes } };

    // Todos os artilheiros do mês — sem limite, pois a paginação precisa
    // percorrer a lista completa, não só os 5 primeiros
    const gruposGols = await prisma.goals.groupBy({
      by: ["scorer_user_id"],
      where: {
        scorer_user_id: { not: null },
        matches: { ...filtroPartidasMes, status: "completed" },
      },
      _count: { scorer_user_id: true },
      orderBy: { _count: { scorer_user_id: "desc" } },
    });

    const { items: grupoPagina, page, totalPages, total } = paginar(
      gruposGols,
      pagina,
    );

    const ids = grupoPagina
      .map((g) => g.scorer_user_id)
      .filter((id): id is string => Boolean(id));

    const jogadores = await prisma.users.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, nickname: true, photo_url: true, position: true },
    });
    const mapaJogadores = new Map<string, JogadorResumido>(
      jogadores.map((j) => [j.id, j]),
    );

    return NextResponse.json({
      page,
      totalPages,
      total,
      items: grupoPagina
        .filter((g) => g.scorer_user_id && mapaJogadores.has(g.scorer_user_id))
        .map((g) => ({
          ...mapaJogadores.get(g.scorer_user_id as string)!,
          goals: g._count.scorer_user_id,
        })),
    });
  } catch (error) {
    console.error("[GET /api/highlights/monthly/scorers]", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
