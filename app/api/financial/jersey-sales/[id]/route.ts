import { prisma } from '@/config/prisma'
import { createServerSupabaseClient } from '@/config/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { buscarPerfilUsuario, ehAdminOuCoAdmin } from '../../../_lib/auth'
import { tratarErroPrisma } from '../../../_lib/prisma-errors'

// PATCH /api/financial/jersey-sales/:id — atualiza status de pagamento e/ou entrega da camisa
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
        const { payment_status, jersey_status, paid_at, delivered_at, amount, notes } = body

        const dadosParaAtualizar: Record<string, unknown> = {}
        if (payment_status !== undefined) dadosParaAtualizar.payment_status = payment_status
        if (jersey_status !== undefined) dadosParaAtualizar.jersey_status = jersey_status
        if (amount !== undefined) dadosParaAtualizar.amount = amount
        if (notes !== undefined) dadosParaAtualizar.notes = notes

        // Registra datas automáticas ao marcar como pago ou entregue
        if (payment_status === 'paid' && !paid_at) dadosParaAtualizar.paid_at = new Date()
        if (paid_at !== undefined) dadosParaAtualizar.paid_at = paid_at ? new Date(paid_at) : null

        if (jersey_status === 'delivered' && !delivered_at) dadosParaAtualizar.delivered_at = new Date()
        if (delivered_at !== undefined) dadosParaAtualizar.delivered_at = delivered_at ? new Date(delivered_at) : null

        const vendaAtualizada = await prisma.jersey_sales.update({
            where: { id },
            data: dadosParaAtualizar,
            include: {
                users: { select: { id: true, name: true, nickname: true } },
                guest_players: { select: { id: true, name: true } },
            },
        })

        return NextResponse.json(vendaAtualizada)
    } catch (error) {
        const respostaPrisma = tratarErroPrisma(error)
        if (respostaPrisma) return respostaPrisma

        console.error('[PATCH /api/financial/jersey-sales/:id]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
