import { prisma } from "@/config/prisma";
import { createServerSupabaseClient } from "@/config/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type JogadorResumido = {
  id: string;
  name: string;
  nickname: string | null;
  photo_url: string | null;
  position: string | null;
};

// GET /api/highlights/monthly?month=6&year=2026 — retorna o top 5 fixo (sem
// paginação) de gols sofridos no mês; os demais destaques do mês (MVP,
// artilharia e presença completas) têm endpoints próprios com paginação:
// /monthly/mvp, /monthly/scorers e /monthly/presence
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

    // Limites de data do mês, sempre em UTC para acompanhar como match_date
    // é armazenado (coluna do tipo Date)
    const inicioMes = new Date(Date.UTC(ano, mes - 1, 1));
    const fimMes = new Date(Date.UTC(ano, mes, 0, 23, 59, 59, 999));
    const filtroPartidasMes = { match_date: { gte: inicioMes, lte: fimMes } };

    // Goleiros — top 5 fixo com menos gols sofridos no mês (mínimo 1 partida)
    const gruposSofridos = await prisma.goals_conceded.groupBy({
      by: ["conceder_user_id"],
      where: {
        conceder_user_id: { not: null },
        matches: { ...filtroPartidasMes, status: "completed" },
      },
      _sum: { amount: true },
      _count: { match_id: true },
      orderBy: { _sum: { amount: "asc" } },
      take: 5,
    });

    const ids = gruposSofridos
      .map((g) => g.conceder_user_id)
      .filter((id): id is string => Boolean(id));

    const jogadores = await prisma.users.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, nickname: true, photo_url: true, position: true },
    });
    const mapaJogadores = new Map<string, JogadorResumido>(
      jogadores.map((j) => [j.id, j]),
    );

    return NextResponse.json({
      mes,
      ano,
      goalsConceded: gruposSofridos
        .filter(
          (g) => g.conceder_user_id && mapaJogadores.has(g.conceder_user_id),
        )
        .map((g) => ({
          ...mapaJogadores.get(g.conceder_user_id as string)!,
          conceded: g._sum.amount ?? 0,
          matches: g._count.match_id,
        })),
    });
  } catch (error) {
    console.error("[GET /api/highlights/monthly]", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
