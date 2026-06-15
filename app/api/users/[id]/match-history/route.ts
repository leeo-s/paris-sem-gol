import { prisma } from "@/config/prisma";
import { createServerSupabaseClient } from "@/config/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Retorna o histórico de partidas de um jogador com suas estatísticas individuais
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

    // Busca todas as participações do jogador com dados da partida e votos MVP
    const participacoes = await prisma.match_players.findMany({
      where: { user_id: id },
      orderBy: { matches: { match_date: "desc" } },
      include: {
        matches: {
          include: {
            // Gols marcados pelo jogador nessa partida
            goals: { where: { scorer_user_id: id } },
            // Gols sofridos pelo jogador (caso seja goleiro)
            goals_conceded: { where: { conceder_user_id: id } },
            // Todos os votos MVP da partida para calcular quem foi o MVP
            mvp_votes: {
              include: {
                users_mvp_votes_voted_user_idTousers: {
                  select: {
                    id: true,
                    name: true,
                    nickname: true,
                    photo_url: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Formata cada participação com as estatísticas do jogador naquela partida
    const historico = participacoes.map(({ matches: partida, is_goalkeeper }) => {
      // Gols marcados (jogador de linha) ou sofridos (goleiro) na partida
      const gols = is_goalkeeper
        ? (partida.goals_conceded[0]?.amount ?? 0)
        : partida.goals.length;

      // Votos MVP que esse jogador recebeu nessa partida
      const votosRecebidos = partida.mvp_votes.filter(
        (voto) => voto.voted_user_id === id,
      ).length;

      // Conta votos por candidato para identificar o MVP da partida
      const contagemPorCandidato = partida.mvp_votes.reduce(
        (acumulador, voto) => {
          acumulador[voto.voted_user_id] =
            (acumulador[voto.voted_user_id] ?? 0) + 1;
          return acumulador;
        },
        {} as Record<string, number>,
      );

      // Encontra o candidato com mais votos
      let idMvp: string | null = null;
      let maximoVotos = 0;
      for (const [candidatoId, quantidadeVotos] of Object.entries(
        contagemPorCandidato,
      )) {
        if (quantidadeVotos > maximoVotos) {
          maximoVotos = quantidadeVotos;
          idMvp = candidatoId;
        }
      }

      // Monta o objeto do MVP com os dados do jogador vencedor
      let dadosMvp = null;
      if (idMvp) {
        const registroVoto = partida.mvp_votes.find(
          (voto) => voto.voted_user_id === idMvp,
        );
        const jogadorMvp = registroVoto?.users_mvp_votes_voted_user_idTousers;
        if (jogadorMvp) {
          dadosMvp = {
            id: jogadorMvp.id,
            name: jogadorMvp.name,
            nickname: jogadorMvp.nickname,
            photo_url: jogadorMvp.photo_url,
            votos: maximoVotos,
          };
        }
      }

      return {
        id: partida.id,
        match_date: partida.match_date.toISOString(),
        location: partida.location,
        status: partida.status,
        gols,
        votosRecebidos,
        mvp: dadosMvp,
        ehMvp: idMvp === id,
      };
    });

    return NextResponse.json(historico);
  } catch (error) {
    console.error("[GET /api/users/:id/match-history]", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
