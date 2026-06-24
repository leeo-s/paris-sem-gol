import { prisma } from '@/config/prisma'
import { createServerSupabaseClient } from '@/config/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { buscarPerfilUsuario, ehAdminOuCoAdmin } from '../../_lib/auth'
import { tratarErroPrisma } from '../../_lib/prisma-errors'

// GET /api/club-events/:id — retorna detalhes de um evento com lista de presença
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

        const evento = await prisma.club_events.findUnique({
            where: { id },
            include: {
                users: { select: { id: true, name: true } },
                event_attendees: {
                    include: {
                        users: { select: { id: true, name: true, nickname: true, photo_url: true } },
                        guest_players: { select: { id: true, name: true } },
                    },
                },
            },
        })

        if (!evento) {
            return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })
        }

        return NextResponse.json(evento)
    } catch (error) {
        console.error('[GET /api/club-events/:id]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}

// PATCH /api/club-events/:id — atualiza dados de um evento existente
export async function PATCH(
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

        const { id } = await params
        const body = await request.json()
        const { name, event_date, event_time, location, member_fee, guest_fee, description } = body

        const dadosParaAtualizar: Record<string, unknown> = {}
        if (name !== undefined) dadosParaAtualizar.name = name
        if (event_date !== undefined) dadosParaAtualizar.event_date = new Date(event_date)
        if (event_time !== undefined) dadosParaAtualizar.event_time = event_time
        if (location !== undefined) dadosParaAtualizar.location = location
        if (member_fee !== undefined) dadosParaAtualizar.member_fee = member_fee
        if (guest_fee !== undefined) dadosParaAtualizar.guest_fee = guest_fee
        if (description !== undefined) dadosParaAtualizar.description = description

        const eventoAtualizado = await prisma.club_events.update({
            where: { id },
            data: dadosParaAtualizar,
        })

        return NextResponse.json(eventoAtualizado)
    } catch (error) {
        const respostaPrisma = tratarErroPrisma(error)
        if (respostaPrisma) return respostaPrisma

        console.error('[PATCH /api/club-events/:id]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}

// DELETE /api/club-events/:id — remove um evento e suas presenças (cascade no banco)
export async function DELETE(
    _request: NextRequest,
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

        const { id } = await params

        await prisma.club_events.delete({ where: { id } })

        return NextResponse.json({ message: 'Evento removido com sucesso' })
    } catch (error) {
        const respostaPrisma = tratarErroPrisma(error)
        if (respostaPrisma) return respostaPrisma

        console.error('[DELETE /api/club-events/:id]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
