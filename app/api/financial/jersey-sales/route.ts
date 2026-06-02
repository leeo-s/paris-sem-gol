import { prisma } from '@/config/prisma'
import { createServerSupabaseClient } from '@/config/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { buscarPerfilUsuario, ehAdminOuCoAdmin } from '../../_lib/auth'
import { tratarErroPrisma } from '../../_lib/prisma-errors'
import type { payment_status, jersey_status } from '@/generated/prisma'

// GET /api/financial/jersey-sales — lista vendas de camisas com filtros de status de pagamento e entrega
export async function GET(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const perfilSolicitante = await buscarPerfilUsuario(user.id)
        const ehGestor = ehAdminOuCoAdmin(perfilSolicitante?.role)

        const { searchParams } = request.nextUrl
        const filtroPaymentStatus = searchParams.get('payment_status') ?? undefined
        const filtroJerseyStatus = searchParams.get('jersey_status') ?? undefined

        // Jogador comum só vê a própria venda de camisa
        const filtroUserId = ehGestor ? undefined : user.id

        const vendas = await prisma.jersey_sales.findMany({
            where: {
                ...(filtroUserId && { user_id: filtroUserId }),
                ...(filtroPaymentStatus && { payment_status: filtroPaymentStatus as payment_status }),
                ...(filtroJerseyStatus && { jersey_status: filtroJerseyStatus as jersey_status }),
            },
            include: {
                users: { select: { id: true, name: true, nickname: true } },
                guest_players: { select: { id: true, name: true } },
            },
            orderBy: { created_at: 'desc' },
        })

        return NextResponse.json(vendas)
    } catch (error) {
        console.error('[GET /api/financial/jersey-sales]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}

// POST /api/financial/jersey-sales — registra uma venda de camisa para jogador ou avulso
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
        const { user_id, guest_player_id, amount, notes } = body

        if (!user_id && !guest_player_id) {
            return NextResponse.json(
                { error: 'Informe user_id ou guest_player_id' },
                { status: 400 }
            )
        }

        if (!amount || amount <= 0) {
            return NextResponse.json({ error: 'Valor da camisa deve ser maior que zero' }, { status: 400 })
        }

        const novaVenda = await prisma.jersey_sales.create({
            data: {
                user_id: user_id ?? null,
                guest_player_id: guest_player_id ?? null,
                amount,
                notes,
            },
            include: {
                users: { select: { id: true, name: true, nickname: true } },
                guest_players: { select: { id: true, name: true } },
            },
        })

        return NextResponse.json(novaVenda, { status: 201 })
    } catch (error) {
        const respostaPrisma = tratarErroPrisma(error)
        if (respostaPrisma) return respostaPrisma

        console.error('[POST /api/financial/jersey-sales]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
