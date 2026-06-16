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

// GET /api/highlights/monthly/presence?month=6&year=2026&page=1 — lista
// paginada (5 por página) de presença de todos os jogadores que disputaram
// partidas no mês
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

    const [totalPartidasMes, gruposPresenca] = await Promise.all([
      // Total de partidas encerradas no mês — usado para calcular % de presença
      prisma.matches.count({
        where: { status: "completed", ...filtroPartidasMes },
      }),

      // Todos os jogadores com presença no mês — sem limite, pois a paginação
      // precisa percorrer a lista completa, não só os 5 primeiros
      prisma.match_players.groupBy({
        by: ["user_id"],
        where: {
          user_id: { not: null },
          matches: { status: "completed", ...filtroPartidasMes },
        },
        _count: { match_id: true },
        orderBy: { _count: { match_id: "desc" } },
      }),
    ]);

    const { items: grupoPagina, page, totalPages, total } = paginar(
      gruposPresenca,
      pagina,
    );

    const ids = grupoPagina
      .map((g) => g.user_id)
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
        .filter((g) => g.user_id && mapaJogadores.has(g.user_id))
        .map((g) => ({
          ...mapaJogadores.get(g.user_id as string)!,
          matches: g._count.match_id,
          totalMatches: totalPartidasMes,
          percentage:
            totalPartidasMes > 0 ? g._count.match_id / totalPartidasMes : 0,
        })),
    });
  } catch (error) {
    console.error("[GET /api/highlights/monthly/presence]", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
