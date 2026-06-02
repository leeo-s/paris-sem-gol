import { prisma } from '@/config/prisma'
import { createServerSupabaseClient } from '@/config/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { buscarPerfilUsuario, ehAdminOuCoAdmin } from '../../../_lib/auth'
import { tratarErroPrisma } from '../../../_lib/prisma-errors'

// GET /api/matches/:id/goals-conceded — retorna gols sofridos na partida (tela 2 pós-partida)
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

        const golsSofridos = await prisma.goals_conceded.findMany({
            where: { match_id: matchId },
            include: {
                users: { select: { id: true, name: true, nickname: true, photo_url: true } },
                guest_players: { select: { id: true, name: true } },
            },
        })

        return NextResponse.json(golsSofridos)
    } catch (error) {
        console.error('[GET /api/matches/:id/goals-conceded]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}

// POST /api/matches/:id/goals-conceded — lança gols sofridos e encerra a partida se ambas as telas foram preenchidas
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

        // Recebe array de { user_id?, guest_player_id?, amount } onde amount = total de gols sofridos
        const body = await request.json()
        const { golsSofridos }: { golsSofridos: Array<{ user_id?: string; guest_player_id?: string; amount: number }> } = body

        if (!Array.isArray(golsSofridos) || golsSofridos.length === 0) {
            return NextResponse.json(
                { error: 'Envie um array "golsSofridos" com os goleiros e quantidades' },
                { status: 400 }
            )
        }

        // Remove lançamentos anteriores para permitir relançamento
        await prisma.goals_conceded.deleteMany({ where: { match_id: matchId } })

        await prisma.goals_conceded.createMany({
            data: golsSofridos.map(({ user_id, guest_player_id, amount }) => ({
                match_id: matchId,
                conceder_user_id: user_id ?? null,
                conceder_guest_id: guest_player_id ?? null,
                amount,
            })),
        })

        // Verifica se a tela de gols feitos já foi registrada para encerrar a partida
        const totalGolsFeitos = await prisma.goals.count({ where: { match_id: matchId } })
        const deveEncerrarPartida = totalGolsFeitos > 0 && partida.status === 'scheduled'

        if (deveEncerrarPartida) {
            // Encerra a partida e o trigger no banco cria automaticamente a sessão de votação do craque
            await prisma.matches.update({
                where: { id: matchId },
                data: { status: 'completed' },
            })
        }

        const resultado = await prisma.goals_conceded.findMany({
            where: { match_id: matchId },
            include: {
                users: { select: { id: true, name: true, nickname: true } },
                guest_players: { select: { id: true, name: true } },
            },
        })

        return NextResponse.json({ golsSofridos: resultado, partidaEncerrada: deveEncerrarPartida }, { status: 201 })
    } catch (error) {
        const respostaPrisma = tratarErroPrisma(error)
        if (respostaPrisma) return respostaPrisma

        console.error('[POST /api/matches/:id/goals-conceded]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
