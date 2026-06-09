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

    const totalVotos = await prisma.mvp_votes.count({
      where: {
        voted_user_id: id,
        matches: {
          match_date: {
            gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
          },
        },
      },
    });

    return NextResponse.json({
      votos: totalVotos,
    });
  } catch (error) {
    console.error("[GET /api/users/:id/votes]", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
