import { prisma } from '@/config/prisma'
import { createServerSupabaseClient } from '@/config/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { buscarPerfilUsuario, ehAdminOuCoAdmin } from '../../_lib/auth'
import { tratarErroPrisma } from '../../_lib/prisma-errors'

// PATCH /api/monthly-roster/:id — atualiza o status de um mensalista no mês (ativo/inativo)
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
        const { status } = body

        if (!status || !['active', 'inactive'].includes(status)) {
            return NextResponse.json({ error: 'Status inválido. Use: active ou inactive' }, { status: 400 })
        }

        const vagaAtualizada = await prisma.monthly_roster.update({
            where: { id },
            data: { status },
            include: {
                users: { select: { id: true, name: true, nickname: true } },
            },
        })

        return NextResponse.json(vagaAtualizada)
    } catch (error) {
        const respostaPrisma = tratarErroPrisma(error)
        if (respostaPrisma) return respostaPrisma

        console.error('[PATCH /api/monthly-roster/:id]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}

// DELETE /api/monthly-roster/:id — remove um jogador da lista de mensalistas do mês
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

        const vagaExistente = await prisma.monthly_roster.findUnique({ where: { id }, select: { id: true } })
        if (!vagaExistente) {
            return NextResponse.json({ error: 'Vaga não encontrada' }, { status: 404 })
        }

        await prisma.monthly_roster.delete({ where: { id } })

        return NextResponse.json({ message: 'Jogador removido da lista do mês' })
    } catch (error) {
        const respostaPrisma = tratarErroPrisma(error)
        if (respostaPrisma) return respostaPrisma

        console.error('[DELETE /api/monthly-roster/:id]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
