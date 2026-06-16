import { prisma } from '@/config/prisma'
import { createServerSupabaseClient } from '@/config/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { buscarPerfilUsuario, ehAdminOuCoAdmin } from '../../../_lib/auth'

// GET /api/financial/monthly-fees/roster-pending
// Retorna todos os usuários que possuem ao menos uma mensalidade pendente ou atrasada,
// junto com a lista de suas fees não quitadas (qualquer mês/ano)
export async function GET(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        // Apenas admin e co-admin acessam dados financeiros
        const perfilSolicitante = await buscarPerfilUsuario(user.id)
        if (!ehAdminOuCoAdmin(perfilSolicitante?.role)) {
            return NextResponse.json({ error: 'Sem permissão para realizar esta ação' }, { status: 403 })
        }

        // Busca usuários que têm alguma mensalidade pendente ou atrasada em qualquer mês
        const usuariosComFeesPendentes = await prisma.users.findMany({
            where: {
                monthly_fees: {
                    some: {
                        status: { in: ['pending', 'late'] },
                    },
                },
            },
            select: {
                id: true,
                name: true,
                nickname: true,
                // Inclui apenas as mensalidades não quitadas, em ordem cronológica
                monthly_fees: {
                    where: {
                        status: { in: ['pending', 'late'] },
                    },
                    select: {
                        id: true,
                        month: true,
                        year: true,
                        amount: true,
                        status: true,
                    },
                    orderBy: [{ year: 'asc' }, { month: 'asc' }],
                },
            },
            orderBy: { name: 'asc' },
        })

        // Renomeia monthly_fees para fees, mantendo nome completo e apelido separados
        const resposta = usuariosComFeesPendentes.map((usuario) => ({
            id: usuario.id,
            name: usuario.name,
            nickname: usuario.nickname,
            fees: usuario.monthly_fees,
        }))

        return NextResponse.json(resposta)
    } catch (error) {
        console.error('[GET /api/financial/monthly-fees/roster-pending]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
