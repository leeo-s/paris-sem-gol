import { prisma } from "@/config/prisma";
import { createServerSupabaseClient } from "@/config/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { paginar } from "../../_lib/ranking";

// GET /api/highlights/monthly/goals-conceded?month=6&year=2026&page=1 — lista
// paginada (5 por página) de gols sofridos no mês, restrita a goleiros (position = "Goleiro")
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

    const inicioMes = new Date(Date.UTC(ano, mes - 1, 1));
    const fimMes = new Date(Date.UTC(ano, mes, 0, 23, 59, 59, 999));
    const filtroPartidasMes = { match_date: { gte: inicioMes, lte: fimMes } };

    // Busca apenas IDs de usuários com posição "Goleiro"
    const goleiros = await prisma.users.findMany({
      where: { position: "Goleiro" },
      select: { id: true },
    });
    const idsGoleiros = goleiros.map((g) => g.id);

    const gruposSofridos = await prisma.goals_conceded.groupBy({
      by: ["conceder_user_id"],
      where: {
        conceder_user_id: { in: idsGoleiros },
        matches: { ...filtroPartidasMes, status: "completed" },
      },
      _sum: { amount: true },
      _count: { match_id: true },
      orderBy: { _sum: { amount: "asc" } },
    });

    const { items: grupoPagina, page, totalPages, total } = paginar(
      gruposSofridos,
      pagina,
    );

    const ids = grupoPagina
      .map((g) => g.conceder_user_id)
      .filter((id): id is string => Boolean(id));

    const jogadores = await prisma.users.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, nickname: true, photo_url: true, position: true },
    });
    const mapaJogadores = new Map(jogadores.map((j) => [j.id, j]));

    return NextResponse.json({
      page,
      totalPages,
      total,
      items: grupoPagina
        .filter((g) => g.conceder_user_id && mapaJogadores.has(g.conceder_user_id))
        .map((g) => ({
          ...mapaJogadores.get(g.conceder_user_id as string)!,
          conceded: g._sum.amount ?? 0,
          matches: g._count.match_id,
        })),
    });
  } catch (error) {
    console.error("[GET /api/highlights/monthly/goals-conceded]", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
