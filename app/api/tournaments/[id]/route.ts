import { prisma } from "@/config/prisma";
import { createServerSupabaseClient } from "@/config/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { buscarPerfilUsuario, ehAdminOuCoAdmin } from "../../_lib/auth";
import { tratarErroPrisma } from "../../_lib/prisma-errors";

// ─── Geração de fases e partidas ─────────────────────────────────────────────

function labelDaRodadaBracket(
  indiceRodada: number,
  totalRodadas: number,
): string {
  const distanciaDoFinal = totalRodadas - 1 - indiceRodada;
  switch (distanciaDoFinal) {
    case 0:
      return "Final";
    case 1:
      return "Semifinal";
    case 2:
      return "Quartas de Final";
    case 3:
      return "Oitavas de Final";
    default:
      return `Rodada ${indiceRodada + 1}`;
  }
}

// Algoritmo círculo/polígono: gera rodadas de round-robin para N times.
// Retorna arrays de pares [idCasa, idVisita] por rodada.
function gerarRodadasRoundRobin(timeIds: string[]): [string, string][][] {
  const lista = timeIds.length % 2 === 0 ? [...timeIds] : [...timeIds, "BYE"];
  const n = lista.length;
  const rodadas: [string, string][][] = [];

  for (let r = 0; r < n - 1; r++) {
    const jogos: [string, string][] = [];
    for (let i = 0; i < n / 2; i++) {
      const h = lista[i];
      const a = lista[n - 1 - i];
      if (h !== "BYE" && a !== "BYE") jogos.push([h, a]);
    }
    rodadas.push(jogos);
    // Rotaciona: fixa índice 0, move o restante
    const ultimo = lista.pop()!;
    lista.splice(1, 0, ultimo);
  }

  return rodadas;
}

// Gera as rodadas do mata-mata. Primeira rodada tem times reais; demais usam placeholders.
function gerarRodadasMataMata(times: { id: string; team_name: string }[]): {
  rodada: number;
  jogos: {
    casaId: string | null;
    casaNome: string;
    visitaId: string | null;
    visitaNome: string;
  }[];
}[] {
  if (times.length < 2) return [];

  const n = times.length;
  const metade = Math.floor(n / 2);
  const primeiraRodada: {
    casaId: string | null;
    casaNome: string;
    visitaId: string | null;
    visitaNome: string;
  }[] = Array.from({ length: metade }, (_, i) => ({
    casaId: times[i].id as string | null,
    casaNome: times[i].team_name,
    visitaId: times[n - 1 - i].id as string | null,
    visitaNome: times[n - 1 - i].team_name,
  }));

  const rodadas = [{ rodada: 1, jogos: primeiraRodada }];

  // Times que avançam da rodada 1: vencedores + eventual bye (N ímpar)
  let avancando = Math.ceil(n / 2);
  let numRodada = 2;

  while (avancando >= 2) {
    const numJogos = Math.floor(avancando / 2);
    rodadas.push({
      rodada: numRodada,
      jogos: Array.from({ length: numJogos }, (_, i) => ({
        casaId: null,
        casaNome: `Classificado ${numRodada - 1}.${i * 2 + 1}`,
        visitaId: null,
        visitaNome: `Classificado ${numRodada - 1}.${i * 2 + 2}`,
      })),
    });
    avancando = Math.ceil(avancando / 2);
    numRodada++;
  }

  return rodadas;
}

async function gerarFasesEPartidas(
  tournamentId: string,
  campeonato: {
    start_date: Date | null;
    location: string | null;
    settings: unknown;
    name: string;
    tournament_teams: { id: string; team_name: string; seed: number | null }[];
  },
  userId: string,
) {
  const settings = (campeonato.settings ?? {}) as {
    format?: string;
    league_legs?: number;
    bracket_legs?: number;
    qualifying_teams?: number;
  };

  const formato = settings.format ?? "league_only";
  const leagueLegs = settings.league_legs ?? 1;
  const dataBase = campeonato.start_date ?? new Date();
  const times = campeonato.tournament_teams;

  if (times.length < 2) return;

  await prisma.$transaction(
    async (tx) => {
      let ordemFase = 1;

      if (formato === "league_only" || formato === "league_and_bracket") {
        const fase = await tx.tournament_stages.create({
          data: {
            tournament_id: tournamentId,
            order: ordemFase,
            type: "league",
            status: "active",
            settings: { legs: leagueLegs },
          },
        });

        const rodadas = gerarRodadasRoundRobin(times.map((t) => t.id));
        const timePorId = new Map(times.map((t) => [t.id, t.team_name]));

        // Ida: todas as rodadas primeiro
        for (const [ir, jogos] of rodadas.entries()) {
          for (const [ij, [casaId, visitaId]] of jogos.entries()) {
            const partida = await tx.matches.create({
              data: {
                tournament_stage_id: fase.id,
                match_date: dataBase,
                location: campeonato.location,
                status: "scheduled",
                title: campeonato.name,
                bracket_key: `R${ir + 1}_M${ij + 1}`,
                round_label: `Rodada ${ir + 1}`,
                created_by: userId,
              },
            });
            await tx.match_teams.createMany({
              data: [
                {
                  match_id: partida.id,
                  team_name: timePorId.get(casaId) ?? casaId,
                  team_index: 0,
                  tournament_team_id: casaId,
                },
                {
                  match_id: partida.id,
                  team_name: timePorId.get(visitaId) ?? visitaId,
                  team_index: 1,
                  tournament_team_id: visitaId,
                },
              ],
            });
          }
        }

        // Volta: numeração sequencial após as rodadas de ida
        if (leagueLegs === 2) {
          const offsetVolta = rodadas.length;
          for (const [ir, jogos] of rodadas.entries()) {
            for (const [ij, [casaId, visitaId]] of jogos.entries()) {
              const partida = await tx.matches.create({
                data: {
                  tournament_stage_id: fase.id,
                  match_date: dataBase,
                  location: campeonato.location,
                  status: "scheduled",
                  title: campeonato.name,
                  bracket_key: `R${offsetVolta + ir + 1}_M${ij + 1}`,
                  round_label: `Rodada ${offsetVolta + ir + 1}`,
                  created_by: userId,
                },
              });
              await tx.match_teams.createMany({
                data: [
                  {
                    match_id: partida.id,
                    team_name: timePorId.get(visitaId) ?? visitaId,
                    team_index: 0,
                    tournament_team_id: visitaId,
                  },
                  {
                    match_id: partida.id,
                    team_name: timePorId.get(casaId) ?? casaId,
                    team_index: 1,
                    tournament_team_id: casaId,
                  },
                ],
              });
            }
          }
        }

        ordemFase++;
      }

      if (formato === "bracket_only" || formato === "league_and_bracket") {
        // Para league_and_bracket: fase criada como pendente (sem partidas);
        // partidas do mata-mata são geradas quando a classificação encerra.
        const statusFase = formato === "bracket_only" ? "active" : "pending";
        const bracketLegs = settings.bracket_legs ?? 1;

        const fase = await tx.tournament_stages.create({
          data: {
            tournament_id: tournamentId,
            order: ordemFase,
            type: "bracket",
            status: statusFase,
            settings: { legs: bracketLegs },
          },
        });

        if (formato === "bracket_only") {
          const timesOrdenados = [...times].sort((a, b) => {
            if (a.seed !== null && b.seed !== null) return a.seed - b.seed;
            if (a.seed !== null) return -1;
            if (b.seed !== null) return 1;
            return a.team_name.localeCompare(b.team_name);
          });

          const rodadas = gerarRodadasMataMata(timesOrdenados);
          const totalRodadas = rodadas.length;

          for (const { rodada, jogos } of rodadas) {
            const label = labelDaRodadaBracket(rodada - 1, totalRodadas);
            const labelIda = bracketLegs === 2 ? `${label} (Ida)` : label;

            for (const [ij, jogo] of jogos.entries()) {
              const partida = await tx.matches.create({
                data: {
                  tournament_stage_id: fase.id,
                  match_date: dataBase,
                  location: campeonato.location,
                  title: campeonato.name,
                  status: "scheduled",
                  bracket_key: `R${rodada}_M${ij + 1}`,
                  round_label: labelIda,
                  created_by: userId,
                },
              });
              await tx.match_teams.createMany({
                data: [
                  {
                    match_id: partida.id,
                    team_name: jogo.casaNome,
                    team_index: 0,
                    tournament_team_id: jogo.casaId,
                  },
                  {
                    match_id: partida.id,
                    team_name: jogo.visitaNome,
                    team_index: 1,
                    tournament_team_id: jogo.visitaId,
                  },
                ],
              });

              if (bracketLegs === 2) {
                const volta = await tx.matches.create({
                  data: {
                    tournament_stage_id: fase.id,
                    match_date: dataBase,
                    location: campeonato.location,
                    title: campeonato.name,
                    status: "scheduled",
                    bracket_key: `R${rodada}_M${ij + 1}_V`,
                    round_label: `${label} (Volta)`,
                    created_by: userId,
                  },
                });
                // Visitante da ida é mandante da volta
                await tx.match_teams.createMany({
                  data: [
                    {
                      match_id: volta.id,
                      team_name: jogo.visitaNome,
                      team_index: 0,
                      tournament_team_id: jogo.visitaId,
                    },
                    {
                      match_id: volta.id,
                      team_name: jogo.casaNome,
                      team_index: 1,
                      tournament_team_id: jogo.casaId,
                    },
                  ],
                });
              }
            }
          }
        }
      }
    },
    { timeout: 60000 },
  );
}

// GET /api/tournaments/:id — retorna detalhes do campeonato com classificação, partidas,
// jogadores inscritos, elencos dos times e artilharia calculada
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

    const campeonato = await prisma.tournaments.findUnique({
      where: { id },
      include: {
        tournament_teams: {
          orderBy: [{ points: "desc" }, { goals_for: "desc" }],
          include: {
            tournament_team_players: {
              include: {
                users: {
                  select: {
                    id: true,
                    name: true,
                    nickname: true,
                    photo_url: true,
                    is_goalkeeper: true,
                    position: true,
                    player_ratings: { select: { overall: true } },
                  },
                },
                guest_players: {
                  select: {
                    id: true,
                    name: true,
                    is_goalkeeper: true,
                    position: true,
                    overall: true,
                  },
                },
              },
            },
          },
        },
        tournament_stages: {
          include: {
            matches: {
              include: { match_teams: true },
              orderBy: { match_date: "asc" },
            },
          },
          orderBy: { order: "asc" },
        },
        // Jogadores inscritos antes da formação dos times
        tournament_registrations: {
          include: {
            users: {
              select: {
                id: true,
                name: true,
                nickname: true,
                photo_url: true,
                is_goalkeeper: true,
              },
            },
            guest_players: {
              select: { id: true, name: true, is_goalkeeper: true },
            },
          },
          orderBy: { registered_at: "asc" },
        },
        users: { select: { id: true, name: true } },
        champion_team: { select: { id: true, team_name: true } },
      },
    });

    if (!campeonato) {
      return NextResponse.json(
        { error: "Campeonato não encontrado" },
        { status: 404 },
      );
    }

    // Calcula estatísticas: artilharia, placar por partida e goleiros menos vazados
    const matchIds = campeonato.tournament_stages.flatMap((s) =>
      s.matches.map((m) => m.id),
    );

    // Pré-inicializa placar zerado para todas as partidas (inclui pênaltis já salvos no banco)
    const matchScores: Record<
      string,
      {
        homeScore: number;
        awayScore: number;
        penaltyHomeScore: number | null;
        penaltyAwayScore: number | null;
      }
    > = {};
    for (const stage of campeonato.tournament_stages) {
      for (const match of stage.matches) {
        matchScores[match.id] = {
          homeScore: 0,
          awayScore: 0,
          penaltyHomeScore: match.penalty_home_score ?? null,
          penaltyAwayScore: match.penalty_away_score ?? null,
        };
      }
    }

    let artilharia: {
      id: string;
      nome: string;
      gols: number;
      ehGuest: boolean;
    }[] = [];
    let goleiros: {
      id: string;
      nome: string;
      golsSofridos: number;
      partidas: number;
      ehGuest: boolean;
    }[] = [];

    if (matchIds.length > 0) {
      const [goalsRaw, matchPlayersRaw, gcRaw] = await Promise.all([
        prisma.goals.findMany({
          where: { match_id: { in: matchIds } },
          include: {
            users: { select: { id: true, name: true, nickname: true } },
            guest_players: { select: { id: true, name: true } },
          },
        }),
        prisma.match_players.findMany({
          where: { match_id: { in: matchIds } },
          select: {
            match_id: true,
            user_id: true,
            guest_player_id: true,
            team_id: true,
            is_goalkeeper: true,
            users: { select: { id: true, name: true, nickname: true } },
            guest_players: { select: { id: true, name: true } },
          },
        }),
        prisma.goals_conceded.findMany({
          where: { match_id: { in: matchIds } },
          include: {
            users: { select: { id: true, name: true, nickname: true } },
            guest_players: { select: { id: true, name: true } },
          },
        }),
      ]);

      // Artilharia
      const byPlayer = new Map<
        string,
        { nome: string; gols: number; ehGuest: boolean }
      >();
      for (const goal of goalsRaw) {
        if (goal.scorer_user_id && goal.users) {
          const key = `user:${goal.scorer_user_id}`;
          const entry = byPlayer.get(key) ?? {
            nome: goal.users.nickname ?? goal.users.name,
            gols: 0,
            ehGuest: false,
          };
          entry.gols++;
          byPlayer.set(key, entry);
        } else if (goal.scorer_guest_id && goal.guest_players) {
          const key = `guest:${goal.scorer_guest_id}`;
          const entry = byPlayer.get(key) ?? {
            nome: goal.guest_players.name,
            gols: 0,
            ehGuest: true,
          };
          entry.gols++;
          byPlayer.set(key, entry);
        }
      }
      artilharia = Array.from(byPlayer.entries())
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => b.gols - a.gols)
        .slice(0, 20);

      // Placar por partida: mapeia jogador → time via match_players, depois conta gols por time
      const scorerToTeamId = new Map<string, string>(); // "matchId:playerId" → match_teams.id
      for (const mp of matchPlayersRaw) {
        const playerId = mp.user_id ?? mp.guest_player_id;
        if (playerId && mp.team_id) {
          scorerToTeamId.set(`${mp.match_id}:${playerId}`, mp.team_id);
        }
      }
      // Índice de times por partida para evitar busca linear no loop de gols
      const teamIndexByMatch = new Map<
        string,
        { homeId: string | undefined; awayId: string | undefined }
      >();
      for (const stage of campeonato.tournament_stages) {
        for (const match of stage.matches) {
          teamIndexByMatch.set(match.id, {
            homeId: match.match_teams.find((t) => t.team_index === 0)?.id,
            awayId: match.match_teams.find((t) => t.team_index === 1)?.id,
          });
        }
      }
      for (const goal of goalsRaw) {
        const scorerId = goal.scorer_user_id ?? goal.scorer_guest_id;
        if (!scorerId) continue;
        const teamId = scorerToTeamId.get(`${goal.match_id}:${scorerId}`);
        if (!teamId) continue;
        const { homeId, awayId } = teamIndexByMatch.get(goal.match_id) ?? {};
        if (teamId === homeId) matchScores[goal.match_id].homeScore++;
        else if (teamId === awayId) matchScores[goal.match_id].awayScore++;
      }

      // Goleiros: ranking por menor número de gols sofridos.
      // Partimos de todos que jogaram como goleiro (mesmo sem tomar gol), para que
      // goleiros com 0 gols sofridos apareçam no topo da lista.
      const byGk = new Map<
        string,
        {
          nome: string;
          golsSofridos: number;
          partidasSet: Set<string>;
          ehGuest: boolean;
        }
      >();
      for (const mp of matchPlayersRaw) {
        if (!mp.is_goalkeeper) continue;
        if (mp.user_id && mp.users) {
          const key = `user:${mp.user_id}`;
          const entry = byGk.get(key) ?? {
            nome: mp.users.nickname ?? mp.users.name,
            golsSofridos: 0,
            partidasSet: new Set<string>(),
            ehGuest: false,
          };
          entry.partidasSet.add(mp.match_id);
          byGk.set(key, entry);
        } else if (mp.guest_player_id && mp.guest_players) {
          const key = `guest:${mp.guest_player_id}`;
          const entry = byGk.get(key) ?? {
            nome: mp.guest_players.name,
            golsSofridos: 0,
            partidasSet: new Set<string>(),
            ehGuest: true,
          };
          entry.partidasSet.add(mp.match_id);
          byGk.set(key, entry);
        }
      }
      for (const gc of gcRaw) {
        if (gc.conceder_user_id && gc.users) {
          const key = `user:${gc.conceder_user_id}`;
          const entry = byGk.get(key) ?? {
            nome: gc.users.nickname ?? gc.users.name,
            golsSofridos: 0,
            partidasSet: new Set<string>(),
            ehGuest: false,
          };
          entry.golsSofridos += gc.amount;
          entry.partidasSet.add(gc.match_id);
          byGk.set(key, entry);
        } else if (gc.conceder_guest_id && gc.guest_players) {
          const key = `guest:${gc.conceder_guest_id}`;
          const entry = byGk.get(key) ?? {
            nome: gc.guest_players.name,
            golsSofridos: 0,
            partidasSet: new Set<string>(),
            ehGuest: true,
          };
          entry.golsSofridos += gc.amount;
          entry.partidasSet.add(gc.match_id);
          byGk.set(key, entry);
        }
      }
      goleiros = Array.from(byGk.entries())
        .map(([id, v]) => ({
          id,
          nome: v.nome,
          golsSofridos: v.golsSofridos,
          partidas: v.partidasSet.size,
          ehGuest: v.ehGuest,
        }))
        .sort((a, b) => a.golsSofridos - b.golsSofridos)
        .slice(0, 10);
    }

    return NextResponse.json({
      ...campeonato,
      artilharia,
      goleiros,
      match_scores: matchScores,
    });
  } catch (error) {
    console.error("[GET /api/tournaments/:id]", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

// PATCH /api/tournaments/:id — atualiza dados ou status do campeonato
export async function PATCH(
  request: NextRequest,
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

    const perfilSolicitante = await buscarPerfilUsuario(user.id);
    if (!ehAdminOuCoAdmin(perfilSolicitante?.role)) {
      return NextResponse.json(
        { error: "Sem permissão para realizar esta ação" },
        { status: 403 },
      );
    }

    const { id } = await params;
    const body = await request.json();
    const {
      name,
      status,
      location,
      start_date,
      end_date,
      description,
      num_teams,
      squad_size,
      settings,
      champion_team_id,
    } = body;

    const dadosParaAtualizar: Record<string, unknown> = {};
    if (name !== undefined) dadosParaAtualizar.name = name;
    if (status !== undefined) dadosParaAtualizar.status = status;
    if (location !== undefined) dadosParaAtualizar.location = location;
    if (start_date !== undefined)
      dadosParaAtualizar.start_date = start_date ? new Date(start_date) : null;
    if (end_date !== undefined)
      dadosParaAtualizar.end_date = end_date ? new Date(end_date) : null;
    if (description !== undefined) dadosParaAtualizar.description = description;
    if (num_teams !== undefined) dadosParaAtualizar.num_teams = num_teams;
    if (squad_size !== undefined) dadosParaAtualizar.squad_size = squad_size;
    if (settings !== undefined) dadosParaAtualizar.settings = settings;
    if (champion_team_id !== undefined)
      dadosParaAtualizar.champion_team_id = champion_team_id;

    const campeonatoAtualizado = await prisma.tournaments.update({
      where: { id },
      data: dadosParaAtualizar,
      include: { tournament_teams: { orderBy: { points: "desc" } } },
    });

    // Ao ativar o campeonato, gera as fases e partidas se ainda não existirem
    if (status === "active") {
      const stagesExistentes = await prisma.tournament_stages.count({
        where: { tournament_id: id },
      });

      if (stagesExistentes === 0) {
        const campeonatoParaGerar = await prisma.tournaments.findUnique({
          where: { id },
          include: {
            tournament_teams: {
              orderBy: [{ seed: "asc" }, { team_name: "asc" }],
            },
          },
        });

        if (
          campeonatoParaGerar &&
          campeonatoParaGerar.tournament_teams.length >= 2
        ) {
          await gerarFasesEPartidas(id, campeonatoParaGerar, user.id);
        }
      }
    }

    return NextResponse.json(campeonatoAtualizado);
  } catch (error) {
    const respostaPrisma = tratarErroPrisma(error);
    if (respostaPrisma) return respostaPrisma;

    console.error("[PATCH /api/tournaments/:id]", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}

// DELETE /api/tournaments/:id — remove o campeonato e todos os times e partidas associados
export async function DELETE(
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

    const perfilSolicitante = await buscarPerfilUsuario(user.id);
    if (!ehAdminOuCoAdmin(perfilSolicitante?.role)) {
      return NextResponse.json(
        { error: "Sem permissão para realizar esta ação" },
        { status: 403 },
      );
    }

    const { id } = await params;

    await prisma.tournaments.delete({ where: { id } });

    return NextResponse.json({ message: "Campeonato removido com sucesso" });
  } catch (error) {
    const respostaPrisma = tratarErroPrisma(error);
    if (respostaPrisma) return respostaPrisma;

    console.error("[DELETE /api/tournaments/:id]", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 },
    );
  }
}
