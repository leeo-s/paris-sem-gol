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
      mvpAwardsRaw,
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

      // Mais presentes do mês — top 10 (apenas partidas comuns, sem bracket_key)
      prisma.match_players.groupBy({
        by: ["user_id"],
        where: {
          user_id: { not: null },
          matches: {
            match_date: { gte: inicioDoPeriodo, lte: fimDoPeriodo },
            status: "completed",
            bracket_key: null,
          },
        },
        _count: { match_id: true },
        orderBy: { _count: { match_id: "desc" } },
        take: 10,
      }),

      // MVP awards do mês — partidas regulares (sem bracket_key) + torneios encerrados no mês
      prisma.mvp_awards.findMany({
        where: {
          month: mes,
          year: ano,
          OR: [
            { match_id: { not: null }, matches: { bracket_key: null } },
            { tournament_id: { not: null } },
          ],
        },
        select: {
          user_id: true,
          guest_player_id: true,
          vote_count: true,
        },
      }),

      // Próxima partida agendada — inclui presença do usuário logado, se já confirmada
      prisma.matches.findFirst({
        where: {
          status: "scheduled",
          match_date: { gte: new Date() },
        },
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

      // Partidas regulares (bracket_key null) completas do mês e seus votos MVP
      prisma.matches.findMany({
        where: {
          status: "completed",
          bracket_key: null,
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

      // Total de partidas comuns encerradas no mês (para calcular % de presença)
      prisma.matches.count({
        where: {
          status: "completed",
          bracket_key: null,
          match_date: { gte: inicioDoPeriodo, lte: fimDoPeriodo },
        },
      }),
    ]);

    // Busca perfil do usuário logado para checar se é goleiro (usado tanto na elegibilidade quanto no dashboard)
    const perfilDoUsuarioLogado = await prisma.users.findUnique({
      where: { id: user.id },
      select: { is_goalkeeper: true },
    });

    const isGoleiro = perfilDoUsuarioLogado?.is_goalkeeper === true;

    // Determina se o usuário logado pode confirmar presença e se já confirmou
    let usuarioPodeConfirmar = false;
    const usuarioJaConfirmou = !!proximaPartida?.match_players?.[0];

    if (proximaPartida) {
      const dataPartida = new Date(proximaPartida.match_date);
      const mesPartida = dataPartida.getUTCMonth() + 1;
      const anoPartida = dataPartida.getUTCFullYear();

      const entradaConvocatoria = await prisma.monthly_roster.findFirst({
        where: {
          user_id: user.id,
          month: mesPartida,
          year: anoPartida,
          status: "active",
        },
      });

      // Goleiros podem participar de qualquer partida; os demais precisam da convocatória ativa
      usuarioPodeConfirmar = isGoleiro || !!entradaConvocatoria;
    }

    // Agrupa os awards por jogador para contar quantas vezes cada um foi eleito e total de votos
    const awardsPorJogador = new Map<
      string,
      {
        userId: string | null;
        guestId: string | null;
        vezesEleito: number;
        totalVotos: number;
      }
    >();

    for (const award of mvpAwardsRaw) {
      const chave = award.user_id ?? `guest_${award.guest_player_id}`;
      const entrada = awardsPorJogador.get(chave);
      if (entrada) {
        entrada.vezesEleito++;
        entrada.totalVotos += award.vote_count;
      } else {
        awardsPorJogador.set(chave, {
          userId: award.user_id,
          guestId: award.guest_player_id,
          vezesEleito: 1,
          totalVotos: award.vote_count,
        });
      }
    }

    const candidatosMvp = Array.from(awardsPorJogador.values());
    const idsDosUsuariosCandidatos = candidatosMvp
      .filter((c) => c.userId)
      .map((c) => c.userId!);

    // Busca presenças e gols dos candidatos a MVP para aplicar os desempates
    const [presencasCandidatosMvp, golsCandidatosMvp] = await Promise.all([
      idsDosUsuariosCandidatos.length > 0
        ? prisma.match_players.groupBy({
            by: ["user_id"],
            where: {
              user_id: { in: idsDosUsuariosCandidatos },
              matches: {
                match_date: { gte: inicioDoPeriodo, lte: fimDoPeriodo },
                status: "completed",
                bracket_key: null,
              },
            },
            _count: { match_id: true },
          })
        : Promise.resolve([]),
      idsDosUsuariosCandidatos.length > 0
        ? prisma.goals.groupBy({
            by: ["scorer_user_id"],
            where: {
              scorer_user_id: { in: idsDosUsuariosCandidatos },
              matches: {
                match_date: { gte: inicioDoPeriodo, lte: fimDoPeriodo },
                status: "completed",
                bracket_key: null,
              },
            },
            _count: { scorer_user_id: true },
          })
        : Promise.resolve([]),
    ]);

    const mapaPresencasCandidatosMvp = new Map(
      presencasCandidatosMvp.map((p) => [p.user_id!, p._count.match_id]),
    );
    const mapaGolsCandidatosMvp = new Map(
      golsCandidatosMvp.map((g) => [
        g.scorer_user_id!,
        g._count.scorer_user_id,
      ]),
    );

    // Ordena candidatos pelos critérios de desempate: vezes eleito → votos → presenças → gols
    const mvpVencedor =
      [...candidatosMvp].sort((candidatoA, candidatoB) => {
        if (candidatoB.vezesEleito !== candidatoA.vezesEleito)
          return candidatoB.vezesEleito - candidatoA.vezesEleito;
        if (candidatoB.totalVotos !== candidatoA.totalVotos)
          return candidatoB.totalVotos - candidatoA.totalVotos;
        const presencasA = candidatoA.userId
          ? (mapaPresencasCandidatosMvp.get(candidatoA.userId) ?? 0)
          : 0;
        const presencasB = candidatoB.userId
          ? (mapaPresencasCandidatosMvp.get(candidatoB.userId) ?? 0)
          : 0;
        if (presencasB !== presencasA) return presencasB - presencasA;
        const golsA = candidatoA.userId
          ? (mapaGolsCandidatosMvp.get(candidatoA.userId) ?? 0)
          : 0;
        const golsB = candidatoB.userId
          ? (mapaGolsCandidatosMvp.get(candidatoB.userId) ?? 0)
          : 0;
        return golsB - golsA;
      })[0] ?? null;

    // Busca perfil do guest player caso o MVP vencedor seja um convidado (guest_players não tem nickname/photo_url)
    let perfilGuestMvp: {
      id: string;
      name: string;
      nickname: null;
      photo_url: null;
    } | null = null;
    if (mvpVencedor?.guestId && !mvpVencedor.userId) {
      const guestEncontrado = await prisma.guest_players.findUnique({
        where: { id: mvpVencedor.guestId },
        select: { id: true, name: true },
      });
      if (guestEncontrado) {
        perfilGuestMvp = {
          ...guestEncontrado,
          nickname: null,
          photo_url: null,
        };
      }
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

      // Agrupa os votos por jogador votado (ignora votos sem user_id ou perfil)
      partida.mvp_votes.forEach((voto) => {
        const id = voto.voted_user_id;
        const perfil = voto.users_mvp_votes_voted_user_idTousers;
        if (!id || !perfil) return;
        if (!contagemVotos[id]) {
          contagemVotos[id] = { votos: 0, jogador: perfil };
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

    // Busca nomes dos jogadores para os rankings e para o MVP do mês
    const todosOsUserIds = [
      ...artilheirosDoMes.map((a) => a.scorer_user_id!),
      ...artilheirosTemporada.map((a) => a.scorer_user_id!),
      ...goleirosComGolsSofridos.map((g) => g.conceder_user_id!),
      ...presencasDoMes.map((p) => p.user_id!),
      ...(mvpVencedor?.userId ? [mvpVencedor.userId] : []),
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
      // MVP calculado somando awards de partidas regulares + torneios do mês, com desempate por vezes eleito, votos, presenças e gols
      mvpDoMes: mvpVencedor
        ? {
            jogador: mvpVencedor.userId
              ? (mapaDePerfis[mvpVencedor.userId] ?? null)
              : perfilGuestMvp,
            vezesEleito: mvpVencedor.vezesEleito,
            totalVotos: mvpVencedor.totalVotos,
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
            title: proximaPartida.title,
            usuarioPodeConfirmar,
            usuarioJaConfirmou,
          }
        : null,
      aniversariantesDoMes: aniversariantesDoMesAtual,
      caixa: saldoFinanceiro,
      isGoleiro,
    });
  } catch (error) {
    console.error("[GET /api/dashboard]", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
