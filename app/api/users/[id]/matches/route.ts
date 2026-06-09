import { prisma } from "@/config/prisma";
import { createServerSupabaseClient } from "@/config/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const partidasAno = await prisma.matches.count({
      where: {
        status: "completed",
        match_date: {
          gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
        },
      },
    });

    const totalPartidas = await prisma.match_players.count({
      where: {
        user_id: id,
        matches: {
          match_date: {
            gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
          },
        },
      },
    });

    return NextResponse.json({
      partidas: totalPartidas,
      presença: totalPartidas / partidasAno,
    });
  } catch (error) {
    console.error("[GET /api/users/:id/matches]", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
