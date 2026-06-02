import { prisma } from '@/config/prisma'
import { createServerSupabaseClient } from '@/config/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { buscarPerfilUsuario, ehAdminOuCoAdmin } from '../../_lib/auth'
import { tratarErroPrisma } from '../../_lib/prisma-errors'

// GET /api/tournaments/:id — retorna detalhes do campeonato com classificação e partidas
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

        const campeonato = await prisma.tournaments.findUnique({
            where: { id },
            include: {
                tournament_teams: {
                    orderBy: [{ points: 'desc' }, { goals_for: 'desc' }],
                },
                matches: {
                    include: { match_teams: true },
                    orderBy: { match_date: 'asc' },
                },
                users: { select: { id: true, name: true } },
            },
        })

        if (!campeonato) {
            return NextResponse.json({ error: 'Campeonato não encontrado' }, { status: 404 })
        }

        return NextResponse.json(campeonato)
    } catch (error) {
        console.error('[GET /api/tournaments/:id]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}

// PATCH /api/tournaments/:id — atualiza dados ou status do campeonato
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
        const { name, status, start_date, end_date, description } = body

        const dadosParaAtualizar: Record<string, unknown> = {}
        if (name !== undefined) dadosParaAtualizar.name = name
        if (status !== undefined) dadosParaAtualizar.status = status
        if (start_date !== undefined) dadosParaAtualizar.start_date = start_date ? new Date(start_date) : null
        if (end_date !== undefined) dadosParaAtualizar.end_date = end_date ? new Date(end_date) : null
        if (description !== undefined) dadosParaAtualizar.description = description

        const campeonatoAtualizado = await prisma.tournaments.update({
            where: { id },
            data: dadosParaAtualizar,
            include: { tournament_teams: { orderBy: { points: 'desc' } } },
        })

        return NextResponse.json(campeonatoAtualizado)
    } catch (error) {
        const respostaPrisma = tratarErroPrisma(error)
        if (respostaPrisma) return respostaPrisma

        console.error('[PATCH /api/tournaments/:id]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}

// DELETE /api/tournaments/:id — remove o campeonato e todos os times e partidas associados
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

        await prisma.tournaments.delete({ where: { id } })

        return NextResponse.json({ message: 'Campeonato removido com sucesso' })
    } catch (error) {
        const respostaPrisma = tratarErroPrisma(error)
        if (respostaPrisma) return respostaPrisma

        console.error('[DELETE /api/tournaments/:id]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
