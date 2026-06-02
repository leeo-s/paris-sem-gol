import { prisma } from '@/config/prisma'
import { createServerSupabaseClient } from '@/config/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { buscarPerfilUsuario, ehAdminOuCoAdmin } from '../_lib/auth'
import { tratarErroPrisma } from '../_lib/prisma-errors'

// GET /api/users — lista jogadores com filtros opcionais por role, posição e status de goleiro
export async function GET(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        // Lê parâmetros de filtro opcionais da URL
        const { searchParams } = request.nextUrl
        const filtroRole = searchParams.get('role') ?? undefined
        const filtroPosition = searchParams.get('position') ?? undefined
        const filtroGoalkeeper = searchParams.get('is_goalkeeper')
        const incluirInativos = searchParams.get('includeInactive') === 'true'

        // Apenas admin/co-admin podem ver jogadores inativos
        const perfilSolicitante = await buscarPerfilUsuario(user.id)
        const deveIncluirInativos = ehAdminOuCoAdmin(perfilSolicitante?.role) && incluirInativos

        const jogadores = await prisma.users.findMany({
            where: {
                is_active: deveIncluirInativos ? undefined : true,
                ...(filtroRole && { role: filtroRole as 'admin' | 'co_admin' | 'player' }),
                ...(filtroPosition && { position: filtroPosition }),
                ...(filtroGoalkeeper !== null && { is_goalkeeper: filtroGoalkeeper === 'true' }),
            },
            select: {
                id: true,
                name: true,
                nickname: true,
                email: true,
                role: true,
                photo_url: true,
                birth_date: true,
                phone: true,
                position: true,
                is_goalkeeper: true,
                is_active: true,
                created_at: true,
            },
            orderBy: { name: 'asc' },
        })

        return NextResponse.json(jogadores)
    } catch (error) {
        console.error('[GET /api/users]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}

// POST /api/users — cria novo jogador com rating padrão e marca como convidado
export async function POST(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        // Apenas admin e co-admin podem criar jogadores
        const perfilSolicitante = await buscarPerfilUsuario(user.id)
        if (!perfilSolicitante || !ehAdminOuCoAdmin(perfilSolicitante.role)) {
            return NextResponse.json({ error: 'Sem permissão para realizar esta ação' }, { status: 403 })
        }

        const body = await request.json()
        const { name, nickname, email, role, birth_date, phone, position, is_goalkeeper } = body

        if (!name || !email) {
            return NextResponse.json({ error: 'Nome e email são obrigatórios' }, { status: 400 })
        }

        // Cria o jogador e o rating padrão em uma única transação atômica
        const novoJogador = await prisma.$transaction(async (tx) => {
            const jogadorCriado = await tx.users.create({
                data: {
                    name,
                    nickname,
                    email,
                    password_hash: 'supabase_auth',
                    role: role ?? 'player',
                    birth_date: birth_date ? new Date(birth_date) : null,
                    phone,
                    position,
                    is_goalkeeper: is_goalkeeper ?? false,
                    // Marca o timestamp de convite para o fluxo de primeiro acesso
                    invited_at: new Date(),
                },
                select: {
                    id: true,
                    name: true,
                    nickname: true,
                    email: true,
                    role: true,
                    position: true,
                    is_goalkeeper: true,
                    is_active: true,
                    invited_at: true,
                    created_at: true,
                },
            })

            // Cria rating inicial com todos os atributos em 5 (valor padrão)
            await tx.player_ratings.create({
                data: { user_id: jogadorCriado.id },
            })

            return jogadorCriado
        })

        return NextResponse.json(novoJogador, { status: 201 })
    } catch (error) {
        const respostaPrisma = tratarErroPrisma(error)
        if (respostaPrisma) return respostaPrisma

        console.error('[POST /api/users]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
