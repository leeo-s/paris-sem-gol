import { prisma } from "@/config/prisma";
import { createServerSupabaseClient } from "@/config/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Retorna as estatísticas de destaque do jogador (gols, votos/eleições de MVP
// e presença), sempre comparando total geral, ano atual e mês atual
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
      where: { id },
      select: { is_goalkeeper: true },
    });

    if (!userAlvo) {
      return NextResponse.json(
        { error: "Jogador não encontrado" },
        { status: 404 },
      );
    }

    // Limites de data para o ano e o mês corrente, sempre em UTC para
    // acompanhar como match_date é armazenado (coluna do tipo Date)
    const agora = new Date();
    const anoAtual = agora.getUTCFullYear();
    const mesAtual = agora.getUTCMonth() + 1;

    const inicioAno = new Date(Date.UTC(anoAtual, 0, 1));
    const fimAno = new Date(Date.UTC(anoAtual, 11, 31, 23, 59, 59, 999));
    const inicioMes = new Date(Date.UTC(anoAtual, mesAtual - 1, 1));
    const fimMes = new Date(
      Date.UTC(anoAtual, mesAtual, 0, 23, 59, 59, 999),
    );

    // ── Gols (marcados ou sofridos, dependendo da posição) ────────────────
    let golsTotal = 0;
    let golsAno = 0;
    let golsMes = 0;

    if (userAlvo.is_goalkeeper) {
      // Goleiro: soma o campo "amount" de goals_conceded, pois cada linha
      // representa o total de gols sofridos numa partida, não um gol único
      const [somaTotal, somaAno, somaMes] = await Promise.all([
        prisma.goals_conceded.aggregate({
          _sum: { amount: true },
          where: { conceder_user_id: id },
        }),
        prisma.goals_conceded.aggregate({
          _sum: { amount: true },
          where: {
            conceder_user_id: id,
            matches: { match_date: { gte: inicioAno, lte: fimAno } },
          },
        }),
        prisma.goals_conceded.aggregate({
          _sum: { amount: true },
          where: {
            conceder_user_id: id,
            matches: { match_date: { gte: inicioMes, lte: fimMes } },
          },
        }),
      ]);

      golsTotal = somaTotal._sum.amount ?? 0;
      golsAno = somaAno._sum.amount ?? 0;
      golsMes = somaMes._sum.amount ?? 0;
    } else {
      // Jogador de linha: cada linha de "goals" já é um gol individual
      [golsTotal, golsAno, golsMes] = await Promise.all([
        prisma.goals.count({ where: { scorer_user_id: id } }),
        prisma.goals.count({
          where: {
            scorer_user_id: id,
            matches: { match_date: { gte: inicioAno, lte: fimAno } },
          },
        }),
        prisma.goals.count({
          where: {
            scorer_user_id: id,
            matches: { match_date: { gte: inicioMes, lte: fimMes } },
          },
        }),
      ]);
    }

    // ── Votos de MVP recebidos ─────────────────────────────────────────────
    const [votosTotal, votosAno, votosMes] = await Promise.all([
      prisma.mvp_votes.count({ where: { voted_user_id: id } }),
      prisma.mvp_votes.count({
        where: {
          voted_user_id: id,
          matches: { match_date: { gte: inicioAno, lte: fimAno } },
        },
      }),
      prisma.mvp_votes.count({
        where: {
          voted_user_id: id,
          matches: { match_date: { gte: inicioMes, lte: fimMes } },
        },
      }),
    ]);

    // ── Partidas em que o jogador foi eleito o craque (mais votado) ────────
    // Busca todas as partidas com votação e calcula o vencedor de cada uma,
    // já trazendo a data para classificar em total/ano/mês numa só consulta
    const partidasComVotos = await prisma.matches.findMany({
      where: { mvp_votes: { some: {} } },
      select: {
        match_date: true,
        mvp_votes: { select: { voted_user_id: true } },
      },
    });

    let eleitoTotal = 0;
    let eleitoAno = 0;
    let eleitoMes = 0;

    for (const partida of partidasComVotos) {
      const contagemPorCandidato: Record<string, number> = {};
      for (const voto of partida.mvp_votes) {
        contagemPorCandidato[voto.voted_user_id] =
          (contagemPorCandidato[voto.voted_user_id] ?? 0) + 1;
      }

      let idMvp: string | null = null;
      let maximoVotos = 0;
      for (const [candidatoId, quantidade] of Object.entries(
        contagemPorCandidato,
      )) {
        if (quantidade > maximoVotos) {
          maximoVotos = quantidade;
          idMvp = candidatoId;
        }
      }

      if (idMvp === id) {
        eleitoTotal++;
        if (
          partida.match_date >= inicioAno &&
          partida.match_date <= fimAno
        ) {
          eleitoAno++;
          if (
            partida.match_date >= inicioMes &&
            partida.match_date <= fimMes
          ) {
            eleitoMes++;
          }
        }
      }
    }

    // ── Presença ─────────────────────────────────────────────────────────
    const [
      partidasClubeTotal,
      partidasClubeAno,
      partidasClubeMes,
      presencasTotal,
      presencasAno,
      presencasMes,
    ] = await Promise.all([
      prisma.matches.count({ where: { status: "completed" } }),
      prisma.matches.count({
        where: {
          status: "completed",
          match_date: { gte: inicioAno, lte: fimAno },
        },
      }),
      prisma.matches.count({
        where: {
          status: "completed",
          match_date: { gte: inicioMes, lte: fimMes },
        },
      }),
      prisma.match_players.count({
        where: { user_id: id, matches: { status: "completed" } },
      }),
      prisma.match_players.count({
        where: {
          user_id: id,
          matches: {
            status: "completed",
            match_date: { gte: inicioAno, lte: fimAno },
          },
        },
      }),
      prisma.match_players.count({
        where: {
          user_id: id,
          matches: {
            status: "completed",
            match_date: { gte: inicioMes, lte: fimMes },
          },
        },
      }),
    ]);

    // Calcula percentual de presença evitando divisão por zero
    const calcularPercentual = (presencas: number, totalPartidas: number) =>
      totalPartidas > 0 ? presencas / totalPartidas : 0;

    // ── Sequência atual de presença (partidas consecutivas sem falhar) ─────
    // Considera as últimas partidas encerradas, da mais recente para a mais
    // antiga, contando enquanto o jogador estiver presente
    const ultimasPartidas = await prisma.matches.findMany({
      where: { status: "completed" },
      orderBy: { match_date: "desc" },
      select: {
        match_players: { where: { user_id: id }, select: { id: true } },
      },
      take: 50,
    });

    let sequenciaPresenca = 0;
    for (const partida of ultimasPartidas) {
      if (partida.match_players.length > 0) {
        sequenciaPresenca++;
      } else {
        break;
      }
    }

    return NextResponse.json({
      ehGoleiro: userAlvo.is_goalkeeper,
      gols: { total: golsTotal, ano: golsAno, mes: golsMes },
      mvp: {
        votos: { total: votosTotal, ano: votosAno, mes: votosMes },
        eleito: { total: eleitoTotal, ano: eleitoAno, mes: eleitoMes },
      },
      presenca: {
        total: {
          partidas: presencasTotal,
          totalPartidas: partidasClubeTotal,
          percentual: calcularPercentual(presencasTotal, partidasClubeTotal),
        },
        ano: {
          partidas: presencasAno,
          totalPartidas: partidasClubeAno,
          percentual: calcularPercentual(presencasAno, partidasClubeAno),
        },
        mes: {
          partidas: presencasMes,
          totalPartidas: partidasClubeMes,
          percentual: calcularPercentual(presencasMes, partidasClubeMes),
        },
      },
      sequenciaPresenca,
    });
  } catch (error) {
    console.error("[GET /api/users/:id/highlights]", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
