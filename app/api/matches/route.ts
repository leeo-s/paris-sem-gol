import { prisma } from '@/config/prisma'
import { createServerSupabaseClient } from '@/config/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { buscarPerfilUsuario, ehAdminOuCoAdmin } from '../_lib/auth'
import { tratarErroPrisma } from '../_lib/prisma-errors'
import type { match_status } from '@/generated/prisma'

// GET /api/matches — lista partidas com filtros opcionais de status e período
export async function GET(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { searchParams } = request.nextUrl
        const status = searchParams.get('status') ?? undefined
        const mes = searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined
        const ano = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined

        // Monta filtro de data quando informado
        let filtroData = {}
        if (mes && ano) {
            filtroData = {
                match_date: {
                    gte: new Date(ano, mes - 1, 1),
                    lte: new Date(ano, mes, 0),
                },
            }
        }

        const partidas = await prisma.matches.findMany({
            where: {
                ...(status && { status: status as match_status }),
                ...filtroData,
            },
            include: {
                users: { select: { id: true, name: true } },
                match_players: {
                    select: { id: true, user_id: true, guest_player_id: true, is_goalkeeper: true, confirmed: true },
                },
                mvp_voting_sessions: { select: { id: true, is_closed: true, closes_at: true } },
            },
            orderBy: { match_date: 'desc' },
        })

        return NextResponse.json(partidas)
    } catch (error) {
        console.error('[GET /api/matches]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}

// POST /api/matches — cria uma nova partida (pelada do sábado ou evento especial)
export async function POST(request: NextRequest) {
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
        const { match_date, location, tournament_id } = body

        if (!match_date) {
            return NextResponse.json({ error: 'Data da partida é obrigatória' }, { status: 400 })
        }

        const novaPartida = await prisma.matches.create({
            data: {
                match_date: new Date(match_date),
                location,
                tournament_id: tournament_id ?? null,
                created_by: user.id,
            },
        })

        return NextResponse.json(novaPartida, { status: 201 })
    } catch (error) {
        const respostaPrisma = tratarErroPrisma(error)
        if (respostaPrisma) return respostaPrisma

        console.error('[POST /api/matches]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
