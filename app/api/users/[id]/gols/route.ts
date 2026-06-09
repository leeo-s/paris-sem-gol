import { prisma } from "@/config/prisma";
import { createServerSupabaseClient } from "@/config/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { tratarErroPrisma } from "../../../_lib/prisma-errors";

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

    const userAlvo = await prisma.users.findUnique({
      where: { id: id },
      select: { is_goalkeeper: true },
    });

    var totalGols = 0;

    if (userAlvo?.is_goalkeeper) {
      totalGols = await prisma.goals_conceded.count({
        where: {
          conceder_user_id: id,
          matches: {
            match_date: {
              gte: new Date(
                new Date().setFullYear(new Date().getFullYear() - 1),
              ),
            },
          },
        },
      });
    } else {
      // Conta o total de gols do usuário no último ano
      totalGols = await prisma.goals.count({
        where: {
          scorer_user_id: id,
          matches: {
            match_date: {
              gte: new Date(
                new Date().setFullYear(new Date().getFullYear() - 1),
              ),
            },
          },
        },
      });
    }

    return NextResponse.json({ gols: totalGols });
  } catch (error) {
    console.error("[GET /api/users/:id/gols]", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
