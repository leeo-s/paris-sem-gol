import { prisma } from '@/config/prisma'
import { createServerSupabaseClient } from '@/config/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// GET /api/tournaments/:id/matches/:matchId
// Retorna detalhes da partida do torneio com elencos e gols atuais
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string; matchId: string }> },
) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { id: tournamentId, matchId } = await params

        const partida = await prisma.matches.findUnique({
            where: { id: matchId },
            include: {
                tournament_stages: {
                    include: {
                        tournaments: {
                            select: { id: true, name: true, settings: true },
                        },
                    },
                },
                match_teams: {
                    orderBy: { team_index: 'asc' },
                    include: {
                        tournament_teams: {
                            include: {
                                tournament_team_players: {
                                    include: {
                                        users: {
                                            select: {
                                                id: true, name: true, nickname: true,
                                                photo_url: true, is_goalkeeper: true, position: true,
                                                player_ratings: { select: { overall: true } },
                                            },
                                        },
                                        guest_players: {
                                            select: { id: true, name: true, is_goalkeeper: true, position: true, overall: true },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                match_players: {
                    include: {
                        users: {
                            select: {
                                id: true, name: true, nickname: true,
                                photo_url: true, is_goalkeeper: true, position: true,
                            },
                        },
                        guest_players: { select: { id: true, name: true } },
                    },
                },
                goals: {
                    select: { scorer_user_id: true, scorer_guest_id: true },
                },
            },
        })

        if (!partida) return NextResponse.json({ error: 'Partida não encontrada' }, { status: 404 })

        const stage = partida.tournament_stages
        if (!stage || stage.tournament_id !== tournamentId) {
            return NextResponse.json({ error: 'Partida não pertence a este torneio' }, { status: 404 })
        }

        // Busca resultado do jogo de ida para partidas de volta (bracket_key termina em _V)
        const isVolta = (partida.bracket_key ?? '').endsWith('_V')
        let firstLeg: { homeScore: number; awayScore: number; status: string } | null = null

        if (isVolta) {
            const idaKey = partida.bracket_key!.slice(0, -2)
            const jogoIda = await prisma.matches.findFirst({
                where: { tournament_stage_id: stage.id, bracket_key: idaKey },
                include: {
                    goals: { select: { scorer_user_id: true, scorer_guest_id: true } },
                    match_players: { select: { user_id: true, guest_player_id: true, team_id: true } },
                    match_teams: { orderBy: { team_index: 'asc' } },
                },
            })
            if (jogoIda) {
                const pidToTeam = new Map<string, string>()
                for (const mp of jogoIda.match_players) {
                    const pid = mp.user_id ?? mp.guest_player_id
                    if (pid && mp.team_id) pidToTeam.set(pid, mp.team_id)
                }
                const teamToIndex = new Map<string, number>()
                for (const mt of jogoIda.match_teams) teamToIndex.set(mt.id, mt.team_index)
                let idaHome = 0, idaAway = 0
                for (const g of jogoIda.goals) {
                    const pid = g.scorer_user_id ?? g.scorer_guest_id
                    if (!pid) continue
                    const teamId = pidToTeam.get(pid)
                    if (!teamId) continue
                    if (teamToIndex.get(teamId) === 0) idaHome++
                    else if (teamToIndex.get(teamId) === 1) idaAway++
                }
                firstLeg = { homeScore: idaHome, awayScore: idaAway, status: jogoIda.status }
            }
        }

        // Monta contagem de gols por jogador nesta partida
        const golsPorJogador = new Map<string, number>()
        for (const g of partida.goals) {
            const chave = g.scorer_user_id ?? g.scorer_guest_id
            if (chave) golsPorJogador.set(chave, (golsPorJogador.get(chave) ?? 0) + 1)
        }

        // Monta estrutura de times com jogadores
        const times = partida.match_teams.map((mt) => {
            const registeredPlayers = mt.tournament_teams?.tournament_team_players.map((ttp) => {
                const nome = ttp.users?.nickname ?? ttp.users?.name ?? ttp.guest_players?.name ?? 'Desconhecido'
                const overall = ttp.users?.player_ratings?.overall ?? ttp.guest_players?.overall ?? 5
                return {
                    tournamentTeamPlayerId: ttp.id,
                    userId: ttp.user_id,
                    guestPlayerId: ttp.guest_player_id,
                    nome,
                    ehGoleiro: ttp.is_goalkeeper || (ttp.users?.is_goalkeeper ?? false) || (ttp.guest_players?.is_goalkeeper ?? false),
                    fotoUrl: ttp.users?.photo_url ?? null,
                    posicao: ttp.users?.position ?? ttp.guest_players?.position ?? null,
                    overall,
                }
            }) ?? []

            const matchPlayers = partida.match_players
                .filter((mp) => mp.team_id === mt.id)
                .map((mp) => {
                    const nome = mp.users?.nickname ?? mp.users?.name ?? mp.guest_players?.name ?? 'Desconhecido'
                    const scorerId = mp.user_id ?? mp.guest_player_id
                    return {
                        matchPlayerId: mp.id,
                        userId: mp.user_id,
                        guestPlayerId: mp.guest_player_id,
                        nome,
                        ehGoleiro: mp.is_goalkeeper || (mp.users?.is_goalkeeper ?? false),
                        fotoUrl: mp.users?.photo_url ?? null,
                        posicao: mp.users?.position ?? null,
                        isOnLoan: mp.is_on_loan,
                        gols: scorerId ? (golsPorJogador.get(scorerId) ?? 0) : 0,
                    }
                })

            return {
                matchTeamId: mt.id,
                tournamentTeamId: mt.tournament_team_id,
                teamName: mt.team_name,
                teamIndex: mt.team_index,
                registeredPlayers,
                matchPlayers,
            }
        })

        return NextResponse.json({
            matchId: partida.id,
            status: partida.status,
            title: partida.title,
            roundLabel: partida.round_label,
            bracketKey: partida.bracket_key,
            matchDate: partida.match_date,
            location: partida.location,
            penaltyHomeScore: partida.penalty_home_score,
            penaltyAwayScore: partida.penalty_away_score,
            isVolta,
            firstLeg,
            stage: {
                id: stage.id,
                type: stage.type,
                order: stage.order,
                status: stage.status,
            },
            tournament: {
                id: stage.tournaments.id,
                name: stage.tournaments.name,
                settings: stage.tournaments.settings,
            },
            teams: times,
        })
    } catch (error) {
        console.error('[GET /api/tournaments/:id/matches/:matchId]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
