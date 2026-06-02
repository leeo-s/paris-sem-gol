import { prisma } from '@/config/prisma'
import { createServerSupabaseClient } from '@/config/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { buscarPerfilUsuario, ehAdminOuCoAdmin } from '../_lib/auth'
import { tratarErroPrisma } from '../_lib/prisma-errors'
import type { tournament_status } from '@/generated/prisma'

// GET /api/tournaments — lista todos os campeonatos com times e status
export async function GET(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { searchParams } = request.nextUrl
        const filtroStatus = searchParams.get('status') ?? undefined

        const campeonatos = await prisma.tournaments.findMany({
            where: {
                ...(filtroStatus && { status: filtroStatus as tournament_status }),
            },
            include: {
                tournament_teams: {
                    orderBy: { points: 'desc' },
                },
                users: { select: { id: true, name: true } },
            },
            orderBy: { created_at: 'desc' },
        })

        return NextResponse.json(campeonatos)
    } catch (error) {
        console.error('[GET /api/tournaments]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}

// POST /api/tournaments — cria um novo campeonato interno ou evento especial
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
        const { name, format, is_special_event, start_date, end_date, description, teams } = body

        if (!name) {
            return NextResponse.json({ error: 'Nome do campeonato é obrigatório' }, { status: 400 })
        }

        const formatosValidos = ['round_robin', 'knockout']
        if (format && !formatosValidos.includes(format)) {
            return NextResponse.json({ error: `Formato inválido. Use: ${formatosValidos.join(', ')}` }, { status: 400 })
        }

        // Cria o campeonato e os times em uma transação
        const novoCampeonato = await prisma.$transaction(async (tx) => {
            const campeonato = await tx.tournaments.create({
                data: {
                    name,
                    format: format ?? 'round_robin',
                    is_special_event: is_special_event ?? false,
                    start_date: start_date ? new Date(start_date) : null,
                    end_date: end_date ? new Date(end_date) : null,
                    description,
                    created_by: user.id,
                },
            })

            // Cria os times do campeonato se informados
            if (Array.isArray(teams) && teams.length > 0) {
                await tx.tournament_teams.createMany({
                    data: teams.map((nomeDoTime: string) => ({
                        tournament_id: campeonato.id,
                        team_name: nomeDoTime,
                    })),
                })
            }

            return tx.tournaments.findUnique({
                where: { id: campeonato.id },
                include: { tournament_teams: true },
            })
        })

        return NextResponse.json(novoCampeonato, { status: 201 })
    } catch (error) {
        const respostaPrisma = tratarErroPrisma(error)
        if (respostaPrisma) return respostaPrisma

        console.error('[POST /api/tournaments]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
