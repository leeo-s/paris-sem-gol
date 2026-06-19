import { prisma } from "@/config/prisma";
import { createServerSupabaseClient } from "@/config/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// GET /api/dashboard — retorna todos os dados de destaques, rankings e aniversariantes do mês
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
    const mes = parseInt(
      searchParams.get("month") ?? String(new Date().getMonth() + 1),
    );
    const ano = parseInt(
      searchParams.get("year") ?? String(new Date().getFullYear()),
    );

    const inicioDoPeriodo = new Date(ano, mes - 1, 1);
    const fimDoPeriodo = new Date(ano, mes, 0);

    // Busca em paralelo para otimizar o tempo de resposta
    const [
      artilheirosDoMes,
      artilheirosTemporada,
      goleirosComGolsSofridos,
      presencasDoMes,
      mvpDoMes,
      proximaPartida,
      aniversariantesDoMes,
      saldoFinanceiro,
      partidasComMvpDoMes,
      totalPartidasDoMes,
    ] = await Promise.all([
      // Artilheiros do mês — top 5 por gols marcados
      prisma.goals.groupBy({
        by: ["scorer_user_id"],
        where: {
          scorer_user_id: { not: null },
          matches: {
            match_date: { gte: inicioDoPeriodo, lte: fimDoPeriodo },
            status: "completed",
          },
        },
        _count: { scorer_user_id: true },
        orderBy: { _count: { scorer_user_id: "desc" } },
        take: 5,
      }),

      // Artilheiros da temporada — top 5 acumulado no ano
      prisma.goals.groupBy({
        by: ["scorer_user_id"],
        where: {
          scorer_user_id: { not: null },
          matches: {
            match_date: {
              gte: new Date(ano, 0, 1),
              lte: new Date(ano, 11, 31),
            },
            status: "completed",
          },
        },
        _count: { scorer_user_id: true },
        orderBy: { _count: { scorer_user_id: "desc" } },
        take: 5,
      }),

      // Goleiros menos vazados — média de gols sofridos por partida no mês
      prisma.goals_conceded.groupBy({
        by: ["conceder_user_id"],
        where: {
          conceder_user_id: { not: null },
          matches: {
            match_date: { gte: inicioDoPeriodo, lte: fimDoPeriodo },
            status: "completed",
          },
        },
        _sum: { amount: true },
        _count: { match_id: true },
        orderBy: { _sum: { amount: "asc" } },
        take: 5,
      }),

      // Mais presentes do mês — top 10
      prisma.match_players.groupBy({
        by: ["user_id"],
        where: {
          user_id: { not: null },
          matches: {
            match_date: { gte: inicioDoPeriodo, lte: fimDoPeriodo },
            status: "completed",
          },
        },
        _count: { match_id: true },
        orderBy: { _count: { match_id: "desc" } },
        take: 10,
      }),

      // MVP do mês consolidado — jogador com mais votos somados em todas as partidas do mês
      prisma.mvp_votes.groupBy({
        by: ["voted_user_id"],
        where: {
          matches: { match_date: { gte: inicioDoPeriodo, lte: fimDoPeriodo } },
        },
        _count: { voted_user_id: true },
        orderBy: { _count: { voted_user_id: "desc" } },
        take: 1,
      }),

      // Próxima partida agendada — inclui presença do usuário logado, se já confirmada
      prisma.matches.findFirst({
        where: { status: "scheduled", match_date: { gte: new Date() } },
        orderBy: { match_date: "asc" },
        include: {
          match_players: {
            where: { user_id: user.id, confirmed: true },
            select: { id: true },
          },
        },
      }),

      // Aniversariantes do mês com destaque para o dia atual
      prisma.users.findMany({
        where: {
          is_active: true,
          birth_date: { not: null },
        },
        select: {
          id: true,
          name: true,
          nickname: true,
          photo_url: true,
          birth_date: true,
        },
      }),

      // Saldo atual do caixa + breakdown mensal
      Promise.all([
        prisma.financial_transactions.aggregate({
          _sum: { amount: true },
          where: { type: "income" },
        }),
        prisma.financial_transactions.aggregate({
          _sum: { amount: true },
          where: { type: "expense" },
        }),
        prisma.financial_transactions.aggregate({
          _sum: { amount: true },
          where: {
            type: "income",
            reference_date: { gte: inicioDoPeriodo, lte: fimDoPeriodo },
          },
        }),
        prisma.financial_transactions.aggregate({
          _sum: { amount: true },
          where: {
            type: "expense",
            reference_date: { gte: inicioDoPeriodo, lte: fimDoPeriodo },
          },
        }),
      ]).then(([entradas, saidas, entradasMes, saidasMes]) => ({
        totalEntradas: Number(entradas._sum.amount ?? 0),
        totalSaidas: Number(saidas._sum.amount ?? 0),
        saldo:
          Number(entradas._sum.amount ?? 0) - Number(saidas._sum.amount ?? 0),
        entradasMes: Number(entradasMes._sum.amount ?? 0),
        saidasMes: Number(saidasMes._sum.amount ?? 0),
      })),

      // Partidas completas do mês e seus votos MVP para calcular o vencedor de cada uma
      prisma.matches.findMany({
        where: {
          status: "completed",
          match_date: { gte: inicioDoPeriodo, lte: fimDoPeriodo },
        },
        select: {
          id: true,
          match_date: true,
          location: true,
          mvp_votes: {
            select: {
              voted_user_id: true,
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
        orderBy: { match_date: "asc" },
      }),

      // Total de partidas encerradas no mês (para calcular % de presença)
      prisma.matches.count({
        where: {
          status: "completed",
          match_date: { gte: inicioDoPeriodo, lte: fimDoPeriodo },
        },
      }),
    ]);

    // Determina se o usuário logado pode confirmar presença e se já confirmou
    let usuarioPodeConfirmar = false
    const usuarioJaConfirmou = !!(proximaPartida?.match_players?.[0])

    if (proximaPartida) {
      const dataPartida = new Date(proximaPartida.match_date)
      const mesPartida = dataPartida.getUTCMonth() + 1
      const anoPartida = dataPartida.getUTCFullYear()

      // Busca perfil e convocatória do usuário para o mês da partida em paralelo
      const [perfilUsuario, entradaConvocatoria] = await Promise.all([
        prisma.users.findUnique({
          where: { id: user.id },
          select: { is_goalkeeper: true },
        }),
        prisma.monthly_roster.findFirst({
          where: { user_id: user.id, month: mesPartida, year: anoPartida, status: 'active' },
        }),
      ])

      // Goleiros podem participar de qualquer partida; os demais precisam da convocatória ativa
      usuarioPodeConfirmar = perfilUsuario?.is_goalkeeper === true || !!entradaConvocatoria
    }

    // Calcula o top 3 de MVPs de cada partida do mês, ordenados por votos
    const mvpsPorPartida = partidasComMvpDoMes.map((partida) => {
      const contagemVotos: Record<
        string,
        {
          votos: number;
          jogador: {
            id: string;
            name: string;
            nickname: string | null;
            photo_url: string | null;
          };
        }
      > = {};

      // Agrupa os votos por jogador votado
      partida.mvp_votes.forEach((voto) => {
        const id = voto.voted_user_id;
        if (!contagemVotos[id]) {
          contagemVotos[id] = {
            votos: 0,
            jogador: voto.users_mvp_votes_voted_user_idTousers,
          };
        }
        contagemVotos[id].votos++;
      });

      // Ordena por votos decrescente e pega os 3 primeiros
      const rankingMvps = Object.values(contagemVotos)
        .sort((a, b) => b.votos - a.votos)
        .slice(0, 3)
        .map((entrada) => ({
          jogador: entrada.jogador,
          votos: entrada.votos,
        }));

      return {
        data: partida.match_date,
        local: partida.location,
        top3Mvps: rankingMvps,
      };
    });

    // Busca nomes dos jogadores para os rankings
    const todosOsUserIds = [
      ...artilheirosDoMes.map((a) => a.scorer_user_id!),
      ...artilheirosTemporada.map((a) => a.scorer_user_id!),
      ...goleirosComGolsSofridos.map((g) => g.conceder_user_id!),
      ...presencasDoMes.map((p) => p.user_id!),
      ...(mvpDoMes[0] ? [mvpDoMes[0].voted_user_id] : []),
    ];

    const perfisDeJogadores = await prisma.users.findMany({
      where: { id: { in: [...new Set(todosOsUserIds)] } },
      select: { id: true, name: true, nickname: true, photo_url: true },
    });

    const mapaDePerfis = Object.fromEntries(
      perfisDeJogadores.map((p) => [p.id, p]),
    );

    // Filtra aniversariantes do mês atual e marca quem faz aniversário hoje
    const hoje = new Date();
    const aniversariantesDoMesAtual = aniversariantesDoMes
      .filter(
        (j) => j.birth_date && new Date(j.birth_date).getMonth() === mes - 1,
      )
      .map((j) => ({
        ...j,
        ehHoje: j.birth_date
          ? new Date(j.birth_date).getDate() === hoje.getDate() &&
            new Date(j.birth_date).getMonth() === hoje.getMonth()
          : false,
      }))
      .sort((a, b) => {
        const diaA = a.birth_date ? new Date(a.birth_date).getDate() : 0;
        const diaB = b.birth_date ? new Date(b.birth_date).getDate() : 0;
        return diaA - diaB;
      });

    return NextResponse.json({
      periodo: { mes, ano },
      artilheirosDoMes: artilheirosDoMes.map((a) => ({
        jogador: mapaDePerfis[a.scorer_user_id!],
        gols: a._count.scorer_user_id,
      })),
      artilheirosTemporada: artilheirosTemporada.map((a) => ({
        jogador: mapaDePerfis[a.scorer_user_id!],
        gols: a._count.scorer_user_id,
      })),
      goleirosComMenosGols: goleirosComGolsSofridos.map((g) => ({
        jogador: mapaDePerfis[g.conceder_user_id!],
        totalGolsSofridos: Number(g._sum.amount ?? 0),
        partidas: g._count.match_id,
        mediaPorPartida:
          g._count.match_id > 0
            ? Math.round(
                (Number(g._sum.amount ?? 0) / g._count.match_id) * 10,
              ) / 10
            : 0,
      })),
      maisPresentesDoMes: presencasDoMes.map((p) => ({
        jogador: mapaDePerfis[p.user_id!],
        presencas: p._count.match_id,
      })),
      totalPartidasDoMes,
      mvpDoMes: mvpDoMes[0]
        ? {
            jogador: mapaDePerfis[mvpDoMes[0].voted_user_id],
            votos: mvpDoMes[0]._count.voted_user_id,
          }
        : null,
      mvpsPorPartida,
      // Enriquece a próxima partida com dados de elegibilidade do usuário logado
      proximaPartida: proximaPartida
        ? {
            id: proximaPartida.id,
            match_date: proximaPartida.match_date,
            location: proximaPartida.location,
            status: proximaPartida.status,
            usuarioPodeConfirmar,
            usuarioJaConfirmou,
          }
        : null,
      aniversariantesDoMes: aniversariantesDoMesAtual,
      caixa: saldoFinanceiro,
    });
  } catch (error) {
    console.error("[GET /api/dashboard]", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
