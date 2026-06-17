import { prisma } from "@/config/prisma";
import { createServerSupabaseClient } from "@/config/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { buscarRankingDestaques } from "../_lib/ranking";

type JogadorResumido = {
  id: string;
  name: string;
  nickname: string | null;
  photo_url: string | null;
  position: string | null;
};

// GET /api/highlights/season?year=2026 — retorna o pódio do ano (top 3
// destaques, ordenados por: MVPs → votos MVP → presenças → gols) e o top 5
// fixo de gols sofridos no ano (sem paginação — os demais destaques do ano,
// como artilharia e presença completas, têm endpoints próprios com paginação:
// /season/scorers e /season/presence)
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

    // Limites de data do ano, sempre em UTC para acompanhar como match_date
    // é armazenado (coluna do tipo Date)
    const inicioAno = new Date(Date.UTC(ano, 0, 1));
    const fimAno = new Date(Date.UTC(ano, 11, 31, 23, 59, 59, 999));
    const filtroPartidasAno = { match_date: { gte: inicioAno, lte: fimAno } };

    const [ranking, gruposSofridos] = await Promise.all([
      // Ranking de destaques do ano: MVP → votos → presenças → gols
      buscarRankingDestaques(ano),

      // Goleiros — top 5 fixo com menos gols sofridos no ano (mínimo 1 partida)
      prisma.goals_conceded.groupBy({
        by: ["conceder_user_id"],
        where: {
          conceder_user_id: { not: null },
          matches: { ...filtroPartidasAno, status: "completed" },
        },
        _sum: { amount: true },
        _count: { match_id: true },
        orderBy: { _sum: { amount: "asc" } },
        take: 5,
      }),
    ]);

    const idsGoleiros = gruposSofridos
      .map((g) => g.conceder_user_id)
      .filter((id): id is string => Boolean(id));

    const goleiros = await prisma.users.findMany({
      where: { id: { in: idsGoleiros } },
      select: { id: true, name: true, nickname: true, photo_url: true, position: true },
    });
    const mapaGoleiros = new Map<string, JogadorResumido>(
      goleiros.map((j) => [j.id, j]),
    );

    return NextResponse.json({
      ano,
      podium: ranking.slice(0, 3).map((c, i) => ({ ...c, rank: i + 1 })),
      topGoalsConceded: gruposSofridos
        .filter(
          (g) => g.conceder_user_id && mapaGoleiros.has(g.conceder_user_id),
        )
        .map((g) => ({
          ...mapaGoleiros.get(g.conceder_user_id as string)!,
          conceded: g._sum.amount ?? 0,
          matches: g._count.match_id,
        })),
    });
  } catch (error) {
    console.error("[GET /api/highlights/season]", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
