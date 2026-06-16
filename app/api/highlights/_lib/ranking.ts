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

// ─── ranking de artilheiros do ano ──────────────────────────────────────────────

// Monta o ranking completo (sem limite) de artilheiros do ano, já ordenado com o
// desempate usado tanto no pódio quanto na lista paginada de artilharia: +gols,
// +premiações de MVP no ano, +votos de MVP no ano, +participações
export async function buscarRankingArtilheirosAno(
  ano: number,
): Promise<ArtilheiroAno[]> {
  const inicioAno = new Date(Date.UTC(ano, 0, 1));
  const fimAno = new Date(Date.UTC(ano, 11, 31, 23, 59, 59, 999));
  const filtroPartidasAno = { match_date: { gte: inicioAno, lte: fimAno } };

  const gruposGols = await prisma.goals.groupBy({
    by: ["scorer_user_id"],
    where: {
      scorer_user_id: { not: null },
      matches: { ...filtroPartidasAno, status: "completed" },
    },
    _count: { scorer_user_id: true },
    orderBy: { _count: { scorer_user_id: "desc" } },
  });

  const candidatosComDesempate = await Promise.all(
    gruposGols.map(async (g) => {
      const candidatoId = g.scorer_user_id as string;
      const [premiacoesMvp, votos, participacoes] = await Promise.all([
        prisma.monthly_awards.count({
          where: { mvp_user_id: candidatoId, year: ano },
        }),
        prisma.mvp_votes.count({
          where: { voted_user_id: candidatoId, matches: filtroPartidasAno },
        }),
        prisma.match_players.count({
          where: {
            user_id: candidatoId,
            matches: { status: "completed", ...filtroPartidasAno },
          },
        }),
      ]);

      return {
        id: candidatoId,
        goals: g._count.scorer_user_id,
        premiacoesMvp,
        votos,
        participacoes,
      };
    }),
  );

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
