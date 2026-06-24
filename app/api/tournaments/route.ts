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
                tournament_registrations: {
                    where: { user_id: user.id },
                    select: { id: true, user_id: true },
                },
                tournament_mvp_voting_sessions: {
                    select: { is_closed: true, closes_at: true, total_votes_cast: true, eligible_voters: true },
                },
                _count: {
                    select: { tournament_registrations: true },
                },
                users: { select: { id: true, name: true } },
            },
            orderBy: { created_at: 'desc' },
        })

        // IDs dos torneios em que o usuário está em algum time (para controle do botão de MVP)
        const timesDoUsuario = await prisma.tournament_team_players.findMany({
            where: { user_id: user.id },
            select: { tournament_teams: { select: { tournament_id: true } } },
        })
        const torneiosParticipados = new Set(
            timesDoUsuario.map((t) => t.tournament_teams.tournament_id),
        )

        const campeonatosComParticipacao = campeonatos.map((c) => ({
            ...c,
            userParticipated: torneiosParticipados.has(c.id),
        }))

        return NextResponse.json(campeonatosComParticipacao)
    } catch (error) {
        console.error('[GET /api/tournaments]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}

// POST /api/tournaments — cria um novo campeonato com configurações completas
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
        const {
            name,
            is_special_event,
            location,
            start_date,
            end_date,
            description,
            num_teams,
            squad_size,
            settings,
        } = body

        if (!name?.trim()) {
            return NextResponse.json({ error: 'Nome do campeonato é obrigatório' }, { status: 400 })
        }

        if (num_teams !== undefined && (num_teams < 2 || num_teams > 64)) {
            return NextResponse.json({ error: 'Número de times deve ser entre 2 e 64' }, { status: 400 })
        }

        if (squad_size !== undefined && (squad_size < 2 || squad_size > 20)) {
            return NextResponse.json({ error: 'Tamanho do elenco deve ser entre 2 e 20' }, { status: 400 })
        }

        const formato = settings?.format
        const timesClassificados = settings?.qualifying_teams

        if (
            formato === 'league_and_bracket' &&
            timesClassificados !== undefined &&
            num_teams !== undefined &&
            timesClassificados > num_teams
        ) {
            return NextResponse.json(
                { error: 'Times classificados para o mata-mata não pode ser maior que o total de times' },
                { status: 400 }
            )
        }

        const novoCampeonato = await prisma.tournaments.create({
            data: {
                name: name.trim(),
                is_special_event: is_special_event ?? false,
                location: location?.trim() || null,
                start_date: start_date ? new Date(start_date) : null,
                end_date: end_date ? new Date(end_date) : null,
                description: description?.trim() || null,
                num_teams: num_teams ?? 4,
                squad_size: squad_size ?? 7,
                settings: settings ?? {},
                created_by: user.id,
            },
            include: {
                tournament_teams: true,
            },
        })

        return NextResponse.json(novoCampeonato, { status: 201 })
    } catch (error) {
        const respostaPrisma = tratarErroPrisma(error)
        if (respostaPrisma) return respostaPrisma

        console.error('[POST /api/tournaments]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
