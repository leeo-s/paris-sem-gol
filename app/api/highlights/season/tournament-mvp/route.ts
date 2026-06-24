import { prisma } from "@/config/prisma";
import { createServerSupabaseClient } from "@/config/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { paginar } from "../../_lib/ranking";

// GET /api/highlights/season/tournament-mvp?year=2026&page=1
// Lista paginada de torneios encerrados no ano, com o time campeão e o
// jogador eleito MVP do campeonato (mvp_awards com tournament_id e match_id nulo)
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

    const torneios = await prisma.tournaments.findMany({
      where: {
        status: "finished",
        end_date: {
          gte: new Date(`${ano}-01-01`),
          lt: new Date(`${ano + 1}-01-01`),
        },
      },
      select: {
        id: true,
        name: true,
        champion_team: { select: { team_name: true } },
        mvp_awards: {
          where: { match_id: null },
          select: {
            users: {
              select: { id: true, name: true, nickname: true, photo_url: true },
            },
            guest_players: {
              select: { id: true, name: true },
            },
          },
          take: 1,
        },
      },
      orderBy: [{ end_date: "desc" }, { start_date: "desc" }, { created_at: "desc" }],
    });

    const { items: grupoPagina, page, totalPages, total } = paginar(torneios, pagina);

    const items = grupoPagina.map((t) => {
      const award = t.mvp_awards[0] ?? null;
      let mvp: { id: string; name: string; nickname: string | null; photo_url: string | null } | null = null;

      if (award?.users) {
        mvp = { ...award.users };
      } else if (award?.guest_players) {
        mvp = { ...award.guest_players, nickname: null, photo_url: null };
      }

      return {
        id: t.id,
        name: t.name,
        champion: t.champion_team?.team_name ?? null,
        mvp,
      };
    });

    return NextResponse.json({ page, totalPages, total, items });
  } catch (error) {
    console.error("[GET /api/highlights/season/tournament-mvp]", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
