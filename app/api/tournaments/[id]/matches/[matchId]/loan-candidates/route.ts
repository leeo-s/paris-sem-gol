import { prisma } from '@/config/prisma'
import { createServerSupabaseClient } from '@/config/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// GET /api/tournaments/:id/matches/:matchId/loan-candidates?teamIndex=0
// Retorna jogadores disponíveis para adicionar ao time indicado.
// Regra: excluir qualquer jogador que já esteja em algum dos dois times desta partida.
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; matchId: string }> },
) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { matchId } = await params

        // Jogadores já presentes como match_players desta partida
        const matchPlayers = await prisma.match_players.findMany({
            where: { match_id: matchId },
            select: { user_id: true, guest_player_id: true },
        })

        // Jogadores registrados nos elencos oficiais dos dois times desta partida
        const matchTeams = await prisma.match_teams.findMany({
            where: { match_id: matchId },
            include: {
                tournament_teams: {
                    include: {
                        tournament_team_players: {
                            select: { user_id: true, guest_player_id: true },
                        },
                    },
                },
            },
        })

        const registeredPlayers = matchTeams.flatMap(
            (mt) => mt.tournament_teams?.tournament_team_players ?? [],
        )

        const blockedUserIds = [
            ...matchPlayers.map((p) => p.user_id),
            ...registeredPlayers.map((p) => p.user_id),
        ].filter((id): id is string => id !== null)

        const blockedGuestIds = [
            ...matchPlayers.map((p) => p.guest_player_id),
            ...registeredPlayers.map((p) => p.guest_player_id),
        ].filter((id): id is string => id !== null)

        const uniqueBlockedUserIds = [...new Set(blockedUserIds)]
        const uniqueBlockedGuestIds = [...new Set(blockedGuestIds)]

        const [usuarios, avulsos] = await Promise.all([
            prisma.users.findMany({
                where: {
                    is_active: true,
                    ...(uniqueBlockedUserIds.length > 0 && { id: { notIn: uniqueBlockedUserIds } }),
                },
                select: {
                    id: true,
                    name: true,
                    nickname: true,
                    photo_url: true,
                    is_goalkeeper: true,
                    position: true,
                    player_ratings: { select: { overall: true } },
                },
                orderBy: { name: 'asc' },
            }),
            prisma.guest_players.findMany({
                where: {
                    ...(uniqueBlockedGuestIds.length > 0 && { id: { notIn: uniqueBlockedGuestIds } }),
                },
                select: { id: true, name: true, is_goalkeeper: true, position: true, overall: true },
                orderBy: { name: 'asc' },
            }),
        ])

        return NextResponse.json({
            users: usuarios.map((u) => ({
                tipo: 'user' as const,
                id: u.id,
                nome: u.nickname ?? u.name,
                posicao: u.position,
                ehGoleiro: u.is_goalkeeper,
                overall: u.player_ratings?.overall ?? 5,
                fotoUrl: u.photo_url,
            })),
            guests: avulsos.map((g) => ({
                tipo: 'guest' as const,
                id: g.id,
                nome: g.name,
                posicao: g.position,
                ehGoleiro: g.is_goalkeeper,
                overall: g.overall,
                fotoUrl: null,
            })),
        })
    } catch (error) {
        console.error('[GET /api/tournaments/:id/matches/:matchId/loan-candidates]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
