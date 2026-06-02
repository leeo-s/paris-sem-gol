import { prisma } from '@/config/prisma'
import { createServerSupabaseClient } from '@/config/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { buscarPerfilUsuario, ehAdminOuCoAdmin } from '../../../_lib/auth'
import { tratarErroPrisma } from '../../../_lib/prisma-errors'

// PATCH /api/financial/monthly-fees/:id — atualiza status ou dados de uma mensalidade
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
        const { status, paid_at, amount, notes } = body

        const statusValidos = ['pending', 'paid', 'late', 'cancelled']
        if (status && !statusValidos.includes(status)) {
            return NextResponse.json({ error: `Status inválido. Use: ${statusValidos.join(', ')}` }, { status: 400 })
        }

        // Ao marcar como pago, registra a data do pagamento automaticamente
        const dadosParaAtualizar: Record<string, unknown> = {}
        if (status !== undefined) dadosParaAtualizar.status = status
        if (status === 'paid' && !paid_at) dadosParaAtualizar.paid_at = new Date()
        if (paid_at !== undefined) dadosParaAtualizar.paid_at = paid_at ? new Date(paid_at) : null
        if (amount !== undefined) dadosParaAtualizar.amount = amount
        if (notes !== undefined) dadosParaAtualizar.notes = notes

        const mensalidadeAtualizada = await prisma.monthly_fees.update({
            where: { id },
            data: dadosParaAtualizar,
            include: {
                users: { select: { id: true, name: true, nickname: true } },
            },
        })

        return NextResponse.json(mensalidadeAtualizada)
    } catch (error) {
        const respostaPrisma = tratarErroPrisma(error)
        if (respostaPrisma) return respostaPrisma

        console.error('[PATCH /api/financial/monthly-fees/:id]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}

// DELETE /api/financial/monthly-fees/:id — remove uma cobrança de mensalidade
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

        await prisma.monthly_fees.delete({ where: { id } })

        return NextResponse.json({ message: 'Mensalidade removida com sucesso' })
    } catch (error) {
        const respostaPrisma = tratarErroPrisma(error)
        if (respostaPrisma) return respostaPrisma

        console.error('[DELETE /api/financial/monthly-fees/:id]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
