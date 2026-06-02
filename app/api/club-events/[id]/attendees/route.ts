import { prisma } from '@/config/prisma'
import { createServerSupabaseClient } from '@/config/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { buscarPerfilUsuario, ehAdminOuCoAdmin } from '../../../_lib/auth'
import { tratarErroPrisma } from '../../../_lib/prisma-errors'

// GET /api/club-events/:id/attendees — lista presenças confirmadas em um evento
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

        const { id } = await params

        const presencas = await prisma.event_attendees.findMany({
            where: { event_id: id },
            include: {
                users: { select: { id: true, name: true, nickname: true, photo_url: true } },
                guest_players: { select: { id: true, name: true } },
            },
            orderBy: { created_at: 'asc' },
        })

        return NextResponse.json(presencas)
    } catch (error) {
        console.error('[GET /api/club-events/:id/attendees]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}

// POST /api/club-events/:id/attendees — registra presença de um jogador ou avulso no evento
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

        const { id: eventId } = await params
        const body = await request.json()
        const { user_id, guest_player_id, is_member } = body

        if (!user_id && !guest_player_id) {
            return NextResponse.json({ error: 'Informe user_id ou guest_player_id' }, { status: 400 })
        }

        // Busca o evento para calcular o valor correto por tipo de participante
        const evento = await prisma.club_events.findUnique({
            where: { id: eventId },
            select: { member_fee: true, guest_fee: true },
        })

        if (!evento) {
            return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
        }

        // Goleiros participam do rateio de eventos e pagam o valor de mensalista (RN-08)
        const ehMensalista = is_member ?? true
        const valorCobrado = ehMensalista ? evento.member_fee : evento.guest_fee

        const novaPresenca = await prisma.event_attendees.create({
            data: {
                event_id: eventId,
                user_id: user_id ?? null,
                guest_player_id: guest_player_id ?? null,
                is_member: ehMensalista,
                amount: valorCobrado,
            },
            include: {
                users: { select: { id: true, name: true, nickname: true } },
                guest_players: { select: { id: true, name: true } },
            },
        })

        return NextResponse.json(novaPresenca, { status: 201 })
    } catch (error) {
        const respostaPrisma = tratarErroPrisma(error)
        if (respostaPrisma) return respostaPrisma

        console.error('[POST /api/club-events/:id/attendees]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
