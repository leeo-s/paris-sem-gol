import { prisma } from '@/config/prisma'
import { createServerSupabaseClient } from '@/config/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { buscarPerfilUsuario, ehAdminOuCoAdmin } from '../_lib/auth'
import { tratarErroPrisma } from '../_lib/prisma-errors'

// GET /api/club-events — lista todos os eventos do clube (churrascos e eventos especiais)
export async function GET(_request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const eventos = await prisma.club_events.findMany({
            include: {
                users: { select: { id: true, name: true } },
                // Inclui contagem de confirmados por evento
                event_attendees: {
                    select: { id: true, user_id: true, guest_player_id: true, is_member: true, status: true },
                },
            },
            orderBy: { event_date: 'desc' },
        })

        return NextResponse.json(eventos)
    } catch (error) {
        console.error('[GET /api/club-events]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}

// POST /api/club-events — cria um novo evento (churrasco ou evento especial)
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
        const { name, event_date, member_fee, guest_fee, description } = body

        if (!name || !event_date) {
            return NextResponse.json({ error: 'Nome e data do evento são obrigatórios' }, { status: 400 })
        }

        const novoEvento = await prisma.club_events.create({
            data: {
                name,
                event_date: new Date(event_date),
                member_fee: member_fee ?? 0,
                guest_fee: guest_fee ?? 0,
                description,
                created_by: user.id,
            },
            include: {
                users: { select: { id: true, name: true } },
            },
        })

        return NextResponse.json(novoEvento, { status: 201 })
    } catch (error) {
        const respostaPrisma = tratarErroPrisma(error)
        if (respostaPrisma) return respostaPrisma

        console.error('[POST /api/club-events]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
