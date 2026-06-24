import { prisma } from '@/config/prisma'
import { createServerSupabaseClient } from '@/config/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// GET /api/tournaments/:id/registrations/candidates
// Retorna membros ativos e avulsos que ainda não estão inscritos no torneio
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { id: tournamentId } = await params

        const inscritos = await prisma.tournament_registrations.findMany({
            where: { tournament_id: tournamentId },
            select: { user_id: true, guest_player_id: true },
        })

        const userIdsInscritos = inscritos
            .filter((i) => i.user_id)
            .map((i) => i.user_id as string)

        const guestIdsInscritos = inscritos
            .filter((i) => i.guest_player_id)
            .map((i) => i.guest_player_id as string)

        const usuarios = await prisma.users.findMany({
            where: {
                is_active: true,
                ...(userIdsInscritos.length > 0 && { id: { notIn: userIdsInscritos } }),
            },
            select: {
                id: true,
                name: true,
                nickname: true,
                position: true,
                is_goalkeeper: true,
                player_ratings: { select: { overall: true } },
            },
            orderBy: { name: 'asc' },
        })

        const avulsos = await prisma.guest_players.findMany({
            where: {
                ...(guestIdsInscritos.length > 0 && { id: { notIn: guestIdsInscritos } }),
            },
            select: { id: true, name: true, position: true, is_goalkeeper: true, overall: true },
            orderBy: { name: 'asc' },
        })

        return NextResponse.json({
            users: usuarios.map((u) => ({
                id: u.id,
                name: u.name,
                nickname: u.nickname,
                position: u.position,
                is_goalkeeper: u.is_goalkeeper,
                overall: u.player_ratings?.overall ?? 5,
            })),
            guest_players: avulsos,
        })
    } catch (error) {
        console.error('[GET /api/tournaments/:id/registrations/candidates]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
