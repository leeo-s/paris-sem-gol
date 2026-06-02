import { prisma } from '@/config/prisma'
import { createServerSupabaseClient } from '@/config/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { buscarPerfilUsuario, ehAdminOuCoAdmin } from '../../../_lib/auth'
import { tratarErroPrisma } from '../../../_lib/prisma-errors'

// GET /api/matches/:id/goals — retorna todos os gols registrados na partida (tela 1 pós-partida)
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

        const gols = await prisma.goals.findMany({
            where: { match_id: matchId },
            include: {
                users: { select: { id: true, name: true, nickname: true, photo_url: true } },
                guest_players: { select: { id: true, name: true } },
            },
        })

        return NextResponse.json(gols)
    } catch (error) {
        console.error('[GET /api/matches/:id/goals]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}

// POST /api/matches/:id/goals — lança gols feitos no dia (aceita array de jogadores com quantidade)
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

        const partida = await prisma.matches.findUnique({
            where: { id: matchId },
            select: { status: true },
        })

        if (!partida) {
            return NextResponse.json({ error: 'Partida não encontrada' }, { status: 404 })
        }

        // Recebe array de { user_id?, guest_player_id?, quantity }
        const body = await request.json()
        const { gols }: { gols: Array<{ user_id?: string; guest_player_id?: string; quantity: number }> } = body

        if (!Array.isArray(gols) || gols.length === 0) {
            return NextResponse.json(
                { error: 'Envie um array "gols" com os marcadores e quantidades' },
                { status: 400 }
            )
        }

        // Remove registros anteriores da partida para permitir relançamento completo
        await prisma.goals.deleteMany({ where: { match_id: matchId } })

        // Cria um registro por gol individual (cada gol = uma linha na tabela)
        const registrosDeGol = gols.flatMap(({ user_id, guest_player_id, quantity }) =>
            Array.from({ length: quantity }, () => ({
                match_id: matchId,
                scorer_user_id: user_id ?? null,
                scorer_guest_id: guest_player_id ?? null,
            }))
        )

        await prisma.goals.createMany({ data: registrosDeGol })

        const golsRegistrados = await prisma.goals.findMany({
            where: { match_id: matchId },
            include: {
                users: { select: { id: true, name: true, nickname: true } },
                guest_players: { select: { id: true, name: true } },
            },
        })

        return NextResponse.json(golsRegistrados, { status: 201 })
    } catch (error) {
        const respostaPrisma = tratarErroPrisma(error)
        if (respostaPrisma) return respostaPrisma

        console.error('[POST /api/matches/:id/goals]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
