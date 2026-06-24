import { prisma } from "@/config/prisma";

// ─── tipos ─────────────────────────────────────────────────────────────────────

type JogadorResumido = {
  id: string;
  name: string;
  nickname: string | null;
  photo_url: string | null;
  position: string | null;
};

export type ArtilheiroAno = JogadorResumido & {
  goals: number;
  mvpAwards: number;
  votes: number;
  presences: number;
};

export type ResultadoPaginado<T> = {
  items: T[];
  page: number;
  totalPages: number;
  total: number;
};

// ─── ranking de destaques da temporada (pódio) ──────────────────────────────────

// Monta o ranking completo (sem limite) de todos os participantes do ano, ordenado
// pelos critérios do pódio: +vezes eleito MVP (mvp_awards) → +votos totais
// (mvp_votes + tournament_mvp_votes, inclui votos de quem não venceu) →
// +presenças (match_players) → +gols (goals).
export async function buscarRankingDestaques(
  ano: number,
): Promise<ArtilheiroAno[]> {
  const inicioAno = new Date(Date.UTC(ano, 0, 1));
  const fimAno = new Date(Date.UTC(ano, 11, 31, 23, 59, 59, 999));
  const filtroPartidasAno = { match_date: { gte: inicioAno, lte: fimAno } };
  // Filtro para votos de torneio — usa created_at pois tournament_mvp_votes
  // não tem relação direta com match_date
  const filtroVotosTorneioAno = { created_at: { gte: inicioAno, lte: fimAno } };

  // Base: todos os jogadores com pelo menos uma partida comum concluída no ano
  // (bracket_key: null exclui partidas de torneio)
  const gruposParticipacoes = await prisma.match_players.groupBy({
    by: ["user_id"],
    where: {
      user_id: { not: null },
      matches: { status: "completed", bracket_key: null, ...filtroPartidasAno },
    },
    _count: { match_id: true },
  });

  // Para cada participante, busca em paralelo os dados das quatro fontes
  const candidatos = await Promise.all(
    gruposParticipacoes.map(async (participacao) => {
      const candidatoId = participacao.user_id as string;

      const [vezesEleitoMvp, votosEmPartidas, votosEmTorneios, totalGols] =
        await Promise.all([
          // mvp_awards: fonte definitiva de quantas vezes o jogador foi eleito MVP
          prisma.mvp_awards.count({
            where: { user_id: candidatoId, year: ano },
          }),
          // mvp_votes: todos os votos recebidos em partidas no ano,
          // incluindo partidas onde o jogador não venceu a eleição
          prisma.mvp_votes.count({
            where: { voted_user_id: candidatoId, matches: filtroPartidasAno },
          }),
          // tournament_mvp_votes: votos recebidos em torneios no ano
          prisma.tournament_mvp_votes.count({
            where: { voted_user_id: candidatoId, ...filtroVotosTorneioAno },
          }),
          // goals: gols marcados em partidas concluídas no ano
          prisma.goals.count({
            where: {
              scorer_user_id: candidatoId,
              matches: { ...filtroPartidasAno, status: "completed" },
            },
          }),
        ]);

      return {
        id: candidatoId,
        goals: totalGols,
        vezesEleito: vezesEleitoMvp,
        // Soma votos de partidas e torneios para capturar jogadores que
        // receberam muitos votos mesmo sem vencer a eleição
        totalVotos: votosEmPartidas + votosEmTorneios,
        // match_players já consultado na query base
        presencas: participacao._count.match_id,
      };
    }),
  );

  // Critérios em cascata: vezes eleito MVP → total de votos → presenças → gols
  candidatos.sort(
    (a, b) =>
      b.vezesEleito - a.vezesEleito ||
      b.totalVotos - a.totalVotos ||
      b.presencas - a.presencas ||
      b.goals - a.goals,
  );

  const jogadores = await prisma.users.findMany({
    where: { id: { in: candidatos.map((c) => c.id) } },
    select: { id: true, name: true, nickname: true, photo_url: true, position: true },
  });
  const mapaJogadores = new Map<string, JogadorResumido>(
    jogadores.map((j) => [j.id, j]),
  );

  return candidatos
    .filter((c) => mapaJogadores.has(c.id))
    .map((c) => ({
      ...mapaJogadores.get(c.id)!,
      goals: c.goals,
      mvpAwards: c.vezesEleito,
      votes: c.totalVotos,
      presences: c.presencas,
    }));
}

// ─── ranking de artilheiros do ano ──────────────────────────────────────────────

// Monta o ranking completo (sem limite) de artilheiros do ano, ordenado por gols
// com desempate por: +premiações MVP, +votos MVP, +participações.
// Usado exclusivamente pela lista paginada de artilharia (/season/scorers).
export async function buscarRankingArtilheirosAno(
  ano: number,
): Promise<ArtilheiroAno[]> {
  const inicioAno = new Date(Date.UTC(ano, 0, 1));
  const fimAno = new Date(Date.UTC(ano, 11, 31, 23, 59, 59, 999));
  const filtroPartidasAno = { match_date: { gte: inicioAno, lte: fimAno } };

  // Base: apenas jogadores que marcaram pelo menos um gol no ano
  const gruposGols = await prisma.goals.groupBy({
    by: ["scorer_user_id"],
    where: {
      scorer_user_id: { not: null },
      matches: { ...filtroPartidasAno, status: "completed" },
    },
    _count: { scorer_user_id: true },
    orderBy: { _count: { scorer_user_id: "desc" } },
  });

  const filtroVotosTorneioAno = { created_at: { gte: inicioAno, lte: fimAno } };

  // Para cada artilheiro, busca em paralelo os dados de desempate
  const candidatosComDesempate = await Promise.all(
    gruposGols.map(async (g) => {
      const candidatoId = g.scorer_user_id as string;
      const [premiacoesMvp, votosPartida, votosTorneio, participacoes] = await Promise.all([
        prisma.mvp_awards.count({
          where: { user_id: candidatoId, year: ano },
        }),
        prisma.mvp_votes.count({
          where: { voted_user_id: candidatoId, matches: filtroPartidasAno },
        }),
        prisma.tournament_mvp_votes.count({
          where: { voted_user_id: candidatoId, ...filtroVotosTorneioAno },
        }),
        prisma.match_players.count({
          where: {
            user_id: candidatoId,
            matches: { status: "completed", bracket_key: null, ...filtroPartidasAno },
          },
        }),
      ]);

      return {
        id: candidatoId,
        goals: g._count.scorer_user_id,
        premiacoesMvp,
        votos: votosPartida + votosTorneio,
        participacoes,
      };
    }),
  );

  // Critérios em cascata: gols → MVPs → votos → presenças
  candidatosComDesempate.sort(
    (a, b) =>
      b.goals - a.goals ||
      b.premiacoesMvp - a.premiacoesMvp ||
      b.votos - a.votos ||
      b.participacoes - a.participacoes,
  );

  const jogadores = await prisma.users.findMany({
    where: { id: { in: candidatosComDesempate.map((c) => c.id) } },
    select: { id: true, name: true, nickname: true, photo_url: true, position: true },
  });
  const mapaJogadores = new Map<string, JogadorResumido>(
    jogadores.map((j) => [j.id, j]),
  );

  return candidatosComDesempate
    .filter((c) => mapaJogadores.has(c.id))
    .map((c) => ({
      ...mapaJogadores.get(c.id)!,
      goals: c.goals,
      mvpAwards: c.premiacoesMvp,
      votes: c.votos,
      presences: c.participacoes,
    }));
}

// ─── paginação genérica ──────────────────────────────────────────────────────

// Recorta uma lista já ordenada em páginas de tamanho fixo (5 por padrão),
// protegendo contra números de página inválidos ou fora do intervalo
export function paginar<T>(
  itens: T[],
  pagina: number,
  porPagina = 5,
): ResultadoPaginado<T> {
  const total = itens.length;
  const totalPaginas = Math.max(1, Math.ceil(total / porPagina));
  const paginaValida = Math.min(Math.max(1, pagina || 1), totalPaginas);
  const inicio = (paginaValida - 1) * porPagina;

  return {
    items: itens.slice(inicio, inicio + porPagina),
    page: paginaValida,
    totalPages: totalPaginas,
    total,
  };
}
