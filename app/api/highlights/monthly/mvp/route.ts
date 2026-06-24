import { prisma } from "@/config/prisma";
import { createServerSupabaseClient } from "@/config/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { paginar } from "../../_lib/ranking";

// GET /api/highlights/monthly/mvp?month=6&year=2026&page=1
// Lista paginada (5 por página) dos jogadores que mais vezes foram MVP no mês,
// usando a tabela mvp_awards como fonte autoritativa de premiações encerradas
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

    const premiacoes = await prisma.mvp_awards.findMany({
      where: { month: mes, year: ano },
      select: { user_id: true, guest_player_id: true },
    });

    // Conta premiações por jogador (pode aparecer mais de uma vez no mês em caso de empate ou várias partidas)
    const contagem = new Map<string, { userId: string | null; guestId: string | null; awards: number }>()
    for (const p of premiacoes) {
      const chave = p.user_id ?? `g:${p.guest_player_id}`
      const entrada = contagem.get(chave) ?? { userId: p.user_id, guestId: p.guest_player_id, awards: 0 }
      entrada.awards++
      contagem.set(chave, entrada)
    }

    const listaOrdenada = Array.from(contagem.values()).sort((a, b) => b.awards - a.awards);

    const { items: grupoPagina, page, totalPages, total } = paginar(listaOrdenada, pagina);

    const items = await Promise.all(
      grupoPagina.map(async (item) => {
        if (item.userId) {
          const jogador = await prisma.users.findUnique({
            where: { id: item.userId },
            select: { id: true, name: true, nickname: true, photo_url: true, position: true },
          });
          if (!jogador) return null;
          return { ...jogador, votes: item.awards };
        }

        if (item.guestId) {
          const guest = await prisma.guest_players.findUnique({
            where: { id: item.guestId },
            select: { id: true, name: true, position: true },
          });
          if (!guest) return null;
          return { ...guest, nickname: null, votes: item.awards };
        }

        return null;
      }),
    );

    return NextResponse.json({
      page,
      totalPages,
      total,
      items: items.filter(Boolean),
    });
  } catch (error) {
    console.error("[GET /api/highlights/monthly/mvp]", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
