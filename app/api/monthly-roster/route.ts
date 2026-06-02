import { prisma } from '@/config/prisma'
import { createServerSupabaseClient } from '@/config/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { buscarPerfilUsuario, ehAdminOuCoAdmin } from '../_lib/auth'
import { tratarErroPrisma } from '../_lib/prisma-errors'

// GET /api/monthly-roster?month=6&year=2026 — retorna a lista de mensalistas do mês informado
export async function GET(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { searchParams } = request.nextUrl
        const mes = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1))
        const ano = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))

        if (isNaN(mes) || isNaN(ano) || mes < 1 || mes > 12) {
            return NextResponse.json({ error: 'Mês ou ano inválidos' }, { status: 400 })
        }

        const mensalistas = await prisma.monthly_roster.findMany({
            where: { month: mes, year: ano },
            include: {
                users: {
                    select: {
                        id: true,
                        name: true,
                        nickname: true,
                        photo_url: true,
                        position: true,
                        is_goalkeeper: true,
                    },
                },
            },
            orderBy: { users: { name: 'asc' } },
        })

        return NextResponse.json({ month: mes, year: ano, total: mensalistas.length, players: mensalistas })
    } catch (error) {
        console.error('[GET /api/monthly-roster]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}

// POST /api/monthly-roster — adiciona um jogador à lista de mensalistas do mês (limite de 20 via trigger)
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
        const { user_id, month, year } = body

        if (!user_id || !month || !year) {
            return NextResponse.json({ error: 'user_id, month e year são obrigatórios' }, { status: 400 })
        }

        // Verifica se o jogador existe
        const jogador = await prisma.users.findUnique({
            where: { id: user_id },
            select: { id: true, is_active: true },
        })

        if (!jogador || !jogador.is_active) {
            return NextResponse.json({ error: 'Jogador não encontrado ou inativo' }, { status: 404 })
        }

        // Valida o limite máximo de 20 mensalistas por mês
        const totalAtual = await prisma.monthly_roster.count({ where: { month, year } })
        if (totalAtual >= 20) {
            return NextResponse.json(
                { error: 'Limite de 20 mensalistas por mês atingido' },
                { status: 422 }
            )
        }

        const novaVaga = await prisma.monthly_roster.create({
            data: { user_id, month, year },
            include: {
                users: { select: { id: true, name: true, nickname: true, is_goalkeeper: true } },
            },
        })

        return NextResponse.json(novaVaga, { status: 201 })
    } catch (error) {
        const respostaPrisma = tratarErroPrisma(error)
        if (respostaPrisma) return respostaPrisma

        console.error('[POST /api/monthly-roster]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
