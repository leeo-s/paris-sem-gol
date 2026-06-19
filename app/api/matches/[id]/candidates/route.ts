import { prisma } from '@/config/prisma'
import { createServerSupabaseClient } from '@/config/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Retorna usuários ativos e avulsos que ainda não estão na lista de presentes da partida
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

        const { id: matchId } = await params

        // Busca apenas jogadores confirmados para excluir da listagem de candidatos
        // Jogadores que cancelaram (confirmed=false) podem ser re-adicionados
        const jogadoresPresentes = await prisma.match_players.findMany({
            where: { match_id: matchId, confirmed: true },
            select: { user_id: true, guest_player_id: true },
        })

        // Separa IDs de membros e avulsos já na partida
        const userIdsPresentes = jogadoresPresentes
            .filter(p => p.user_id)
            .map(p => p.user_id as string)

        const guestIdsPresentes = jogadoresPresentes
            .filter(p => p.guest_player_id)
            .map(p => p.guest_player_id as string)

        // Busca membros ativos que ainda não estão na partida
        const usuariosCandidatos = await prisma.users.findMany({
            where: {
                is_active: true,
                ...(userIdsPresentes.length > 0 && { id: { notIn: userIdsPresentes } }),
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

        // Busca avulsos que ainda não estão na partida
        const avulsosCandidatos = await prisma.guest_players.findMany({
            where: {
                ...(guestIdsPresentes.length > 0 && { id: { notIn: guestIdsPresentes } }),
            },
            select: {
                id: true,
                name: true,
                position: true,
                is_goalkeeper: true,
                overall: true,
            },
            orderBy: { name: 'asc' },
        })

        // Normaliza o retorno dos membros com o overall do player_ratings (padrão 5)
        const usuariosFormatados = usuariosCandidatos.map(u => ({
            id: u.id,
            name: u.name,
            nickname: u.nickname,
            position: u.position,
            is_goalkeeper: u.is_goalkeeper,
            overall: u.player_ratings?.overall ?? 5,
        }))

        return NextResponse.json({
            users: usuariosFormatados,
            guest_players: avulsosCandidatos,
        })
    } catch (error) {
        console.error('[GET /api/matches/:id/candidates]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
