import { prisma } from '@/config/prisma'
import { createServerSupabaseClient } from '@/config/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { buscarPerfilUsuario, ehAdminOuCoAdmin } from '../../../_lib/auth'
import { tratarErroPrisma } from '../../../_lib/prisma-errors'

// GET /api/matches/:id/rounds — lista os confrontos da partida em ordem de rodada
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

        const confrontos = await prisma.match_rounds.findMany({
            where: { match_id: matchId },
            include: {
                match_teams_match_rounds_home_team_idTomatch_teams: true,
                match_teams_match_rounds_away_team_idTomatch_teams: true,
                match_teams_match_rounds_winner_team_idTomatch_teams: true,
            },
            orderBy: { round_number: 'asc' },
        })

        return NextResponse.json(confrontos)
    } catch (error) {
        console.error('[GET /api/matches/:id/rounds]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}

// POST /api/matches/:id/rounds — registra um confronto entre dois times na partida
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
        const { round_number, home_team_id, away_team_id, winner_team_id } = body

        if (!round_number || !home_team_id || !away_team_id) {
            return NextResponse.json(
                { error: 'round_number, home_team_id e away_team_id são obrigatórios' },
                { status: 400 }
            )
        }

        const novoConfronto = await prisma.match_rounds.create({
            data: {
                match_id: matchId,
                round_number,
                home_team_id,
                away_team_id,
                winner_team_id: winner_team_id ?? null,
            },
            include: {
                match_teams_match_rounds_home_team_idTomatch_teams: true,
                match_teams_match_rounds_away_team_idTomatch_teams: true,
                match_teams_match_rounds_winner_team_idTomatch_teams: true,
            },
        })

        return NextResponse.json(novoConfronto, { status: 201 })
    } catch (error) {
        const respostaPrisma = tratarErroPrisma(error)
        if (respostaPrisma) return respostaPrisma

        console.error('[POST /api/matches/:id/rounds]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
