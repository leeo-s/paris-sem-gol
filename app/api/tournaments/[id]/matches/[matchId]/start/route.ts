import { prisma } from '@/config/prisma'
import { createServerSupabaseClient } from '@/config/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { buscarPerfilUsuario, ehAdminOuCoAdmin } from '../../../../../_lib/auth'

// POST /api/tournaments/:id/matches/:matchId/start
// Popula match_players a partir dos tournament_team_players e inicia a partida
export async function POST(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string; matchId: string }> },
) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const perfil = await buscarPerfilUsuario(user.id)
        if (!ehAdminOuCoAdmin(perfil?.role)) {
            return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
        }

        const { id: tournamentId, matchId } = await params

        const partida = await prisma.matches.findUnique({
            where: { id: matchId },
            include: {
                tournament_stages: { select: { id: true, tournament_id: true } },
                match_teams: {
                    orderBy: { team_index: 'asc' },
                    include: {
                        tournament_teams: {
                            include: {
                                tournament_team_players: {
                                    include: {
                                        users: { select: { id: true } },
                                        guest_players: { select: { id: true } },
                                    },
                                },
                            },
                        },
                    },
                },
                match_players: { select: { user_id: true, guest_player_id: true } },
            },
        })

        if (!partida) return NextResponse.json({ error: 'Partida não encontrada' }, { status: 404 })
        if (partida.tournament_stages?.tournament_id !== tournamentId) {
            return NextResponse.json({ error: 'Partida não pertence a este torneio' }, { status: 404 })
        }
        if (partida.status !== 'scheduled') {
            return NextResponse.json({ error: 'Partida já foi iniciada ou encerrada' }, { status: 422 })
        }

        // Jogo de volta só pode ser iniciado após o jogo de ida ser finalizado
        if (partida.bracket_key?.endsWith('_V') && partida.tournament_stages) {
            const idaKey = partida.bracket_key.slice(0, -2)
            const jogoIda = await prisma.matches.findFirst({
                where: { tournament_stage_id: partida.tournament_stages.id, bracket_key: idaKey },
                select: { status: true },
            })
            if (!jogoIda || jogoIda.status !== 'completed') {
                return NextResponse.json(
                    { error: 'O jogo de ida precisa ser finalizado antes de iniciar o jogo de volta.' },
                    { status: 422 },
                )
            }
        }

        // Jogadores já na partida (podem ser emprestados adicionados antes)
        const existingUserIds = new Set(partida.match_players.map((p) => p.user_id).filter(Boolean))
        const existingGuestIds = new Set(partida.match_players.map((p) => p.guest_player_id).filter(Boolean))

        // Adiciona os jogadores do elenco oficial de cada time como match_players
        const inserts: {
            match_id: string
            user_id: string | null
            guest_player_id: string | null
            is_goalkeeper: boolean
            confirmed: boolean
            team_id: string
        }[] = []

        for (const matchTeam of partida.match_teams) {
            if (!matchTeam.tournament_teams) continue
            for (const ttp of matchTeam.tournament_teams.tournament_team_players) {
                if (ttp.user_id && existingUserIds.has(ttp.user_id)) continue
                if (ttp.guest_player_id && existingGuestIds.has(ttp.guest_player_id)) continue
                inserts.push({
                    match_id: matchId,
                    user_id: ttp.user_id,
                    guest_player_id: ttp.guest_player_id,
                    is_goalkeeper: ttp.is_goalkeeper,
                    confirmed: true,
                    team_id: matchTeam.id,
                })
            }
        }

        await prisma.$transaction(async (tx) => {
            if (inserts.length > 0) {
                await tx.match_players.createMany({ data: inserts, skipDuplicates: true })
            }
            await tx.matches.update({ where: { id: matchId }, data: { status: 'started' } })
        })

        return NextResponse.json({ ok: true })
    } catch (error) {
        console.error('[POST /api/tournaments/:id/matches/:matchId/start]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
