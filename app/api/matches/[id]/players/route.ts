import { prisma } from '@/config/prisma'
import { createServerSupabaseClient } from '@/config/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { buscarPerfilUsuario, ehAdminOuCoAdmin } from '../../../_lib/auth'
import { tratarErroPrisma } from '../../../_lib/prisma-errors'

// GET /api/matches/:id/players — lista todos os jogadores presentes na partida
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

        const jogadoresPresentes = await prisma.match_players.findMany({
            where: { match_id: matchId },
            include: {
                users: {
                    select: {
                        id: true,
                        name: true,
                        nickname: true,
                        photo_url: true,
                        position: true,
                        is_goalkeeper: true,
                        player_ratings: { select: { overall: true } },
                    },
                },
                guest_players: { select: { id: true, name: true } },
            },
        })

        return NextResponse.json(jogadoresPresentes)
    } catch (error) {
        console.error('[GET /api/matches/:id/players]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}

// POST /api/matches/:id/players — adiciona um jogador ou avulso à lista de presentes na partida
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const perfilSolicitante = await buscarPerfilUsuario(user.id)
        if (!ehAdminOuCoAdmin(perfilSolicitante?.role)) {
            return NextResponse.json({ error: 'Sem permissão para realizar esta ação' }, { status: 403 })
        }

        const { id: matchId } = await params
        const body = await request.json()
        const { user_id, guest_player_id, is_goalkeeper, confirmed } = body

        if (!user_id && !guest_player_id) {
            return NextResponse.json({ error: 'Informe user_id ou guest_player_id' }, { status: 400 })
        }

        // Verifica se a partida existe e está no status correto para receber presença
        const partida = await prisma.matches.findUnique({
            where: { id: matchId },
            select: { status: true },
        })

        if (!partida) {
            return NextResponse.json({ error: 'Partida não encontrada' }, { status: 404 })
        }

        if (partida.status === 'completed' || partida.status === 'cancelled') {
            return NextResponse.json(
                { error: 'Não é possível alterar presenças em uma partida encerrada ou cancelada' },
                { status: 422 }
            )
        }

        // Para membros usa upsert para lidar com a unique constraint (match_id, user_id)
        const novaPresenca = user_id
            ? await prisma.match_players.upsert({
                where: { match_id_user_id: { match_id: matchId, user_id } },
                create: {
                    match_id: matchId,
                    user_id,
                    is_goalkeeper: is_goalkeeper ?? false,
                    confirmed: confirmed ?? false,
                },
                update: {
                    confirmed: confirmed ?? false,
                    is_goalkeeper: is_goalkeeper ?? false,
                },
                include: {
                    users: { select: { id: true, name: true, nickname: true, is_goalkeeper: true } },
                    guest_players: { select: { id: true, name: true } },
                },
            })
            : await prisma.match_players.create({
                data: {
                    match_id: matchId,
                    guest_player_id: guest_player_id ?? null,
                    is_goalkeeper: is_goalkeeper ?? false,
                    confirmed: confirmed ?? false,
                },
                include: {
                    users: { select: { id: true, name: true, nickname: true, is_goalkeeper: true } },
                    guest_players: { select: { id: true, name: true } },
                },
            })

        return NextResponse.json(novaPresenca, { status: 201 })
    } catch (error) {
        const respostaPrisma = tratarErroPrisma(error)
        if (respostaPrisma) return respostaPrisma

        console.error('[POST /api/matches/:id/players]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}

// DELETE /api/matches/:id/players — remove um jogador da lista de presentes (body: { match_player_id })
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const perfilSolicitante = await buscarPerfilUsuario(user.id)
        if (!ehAdminOuCoAdmin(perfilSolicitante?.role)) {
            return NextResponse.json({ error: 'Sem permissão para realizar esta ação' }, { status: 403 })
        }

        const body = await request.json()
        const { match_player_id } = body

        if (!match_player_id) {
            return NextResponse.json({ error: 'match_player_id é obrigatório' }, { status: 400 })
        }

        await prisma.match_players.delete({ where: { id: match_player_id } })

        return NextResponse.json({ message: 'Jogador removido da lista de presentes' })
    } catch (error) {
        const respostaPrisma = tratarErroPrisma(error)
        if (respostaPrisma) return respostaPrisma

        console.error('[DELETE /api/matches/:id/players]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
