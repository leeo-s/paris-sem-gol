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

// GET /api/highlights/season/presence?year=2026&page=1 — lista paginada (5 por
// página) de presença de todos os jogadores que disputaram partidas no ano
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

    // Limites de data do ano, sempre em UTC para acompanhar como match_date
    // é armazenado (coluna do tipo Date)
    const inicioAno = new Date(Date.UTC(ano, 0, 1));
    const fimAno = new Date(Date.UTC(ano, 11, 31, 23, 59, 59, 999));
    const filtroPartidasAno = { match_date: { gte: inicioAno, lte: fimAno } };

    const [totalPartidasAno, gruposPresenca] = await Promise.all([
      // Total de partidas comuns encerradas no ano (sem torneios)
      prisma.matches.count({
        where: { status: "completed", bracket_key: null, ...filtroPartidasAno },
      }),

      // Todos os jogadores com presença em partidas comuns no ano
      prisma.match_players.groupBy({
        by: ["user_id"],
        where: {
          user_id: { not: null },
          matches: { status: "completed", bracket_key: null, ...filtroPartidasAno },
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
          totalMatches: totalPartidasAno,
          percentage:
            totalPartidasAno > 0 ? g._count.match_id / totalPartidasAno : 0,
        })),
    });
  } catch (error) {
    console.error("[GET /api/highlights/season/presence]", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
