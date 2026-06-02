import { prisma } from '@/config/prisma'
import { createServerSupabaseClient } from '@/config/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { buscarPerfilUsuario, ehAdminOuCoAdmin } from '../../_lib/auth'
import { tratarErroPrisma } from '../../_lib/prisma-errors'
import type { transaction_category } from '@/generated/prisma'

// GET /api/financial/transactions — lista transações com filtros opcionais de mês, ano, tipo e categoria
export async function GET(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        // Apenas admin e co-admin acessam o financeiro completo
        const perfilSolicitante = await buscarPerfilUsuario(user.id)
        if (!ehAdminOuCoAdmin(perfilSolicitante?.role)) {
            return NextResponse.json({ error: 'Sem permissão para realizar esta ação' }, { status: 403 })
        }

        const { searchParams } = request.nextUrl
        const mes = searchParams.get('month') ? parseInt(searchParams.get('month')!) : undefined
        const ano = searchParams.get('year') ? parseInt(searchParams.get('year')!) : undefined
        const tipo = searchParams.get('type') ?? undefined
        const categoria = searchParams.get('category') ?? undefined

        // Monta o filtro de data por intervalo mensal, quando informado
        let filtroData = {}
        if (mes && ano) {
            const dataInicio = new Date(ano, mes - 1, 1)
            const dataFim = new Date(ano, mes, 0)
            filtroData = { reference_date: { gte: dataInicio, lte: dataFim } }
        } else if (ano) {
            filtroData = { reference_date: { gte: new Date(ano, 0, 1), lte: new Date(ano, 11, 31) } }
        }

        const transacoes = await prisma.financial_transactions.findMany({
            where: {
                ...filtroData,
                ...(tipo && { type: tipo as 'income' | 'expense' }),
                ...(categoria && { category: categoria as transaction_category }),
            },
            include: {
                users_financial_transactions_user_idTousers: {
                    select: { id: true, name: true, nickname: true },
                },
                users_financial_transactions_created_byTousers: {
                    select: { id: true, name: true },
                },
                guest_players: { select: { id: true, name: true } },
            },
            orderBy: { reference_date: 'desc' },
        })

        return NextResponse.json(transacoes)
    } catch (error) {
        console.error('[GET /api/financial/transactions]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}

// POST /api/financial/transactions — registra uma nova movimentação financeira (entrada ou saída)
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
        const { type, category, amount, description, reference_date, user_id, guest_player_id } = body

        if (!type || !category || !amount || !description || !reference_date) {
            return NextResponse.json(
                { error: 'Campos obrigatórios: type, category, amount, description, reference_date' },
                { status: 400 }
            )
        }

        if (amount <= 0) {
            return NextResponse.json({ error: 'O valor deve ser maior que zero' }, { status: 400 })
        }

        const novaTransacao = await prisma.financial_transactions.create({
            data: {
                type,
                category,
                amount,
                description,
                reference_date: new Date(reference_date),
                user_id: user_id ?? null,
                guest_player_id: guest_player_id ?? null,
                // Registra o admin que lançou para auditoria
                created_by: user.id,
            },
            include: {
                users_financial_transactions_user_idTousers: {
                    select: { id: true, name: true, nickname: true },
                },
                users_financial_transactions_created_byTousers: {
                    select: { id: true, name: true },
                },
            },
        })

        return NextResponse.json(novaTransacao, { status: 201 })
    } catch (error) {
        const respostaPrisma = tratarErroPrisma(error)
        if (respostaPrisma) return respostaPrisma

        console.error('[POST /api/financial/transactions]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
