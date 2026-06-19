import { prisma } from '@/config/prisma'
import { createServerSupabaseClient } from '@/config/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// POST /api/matches/:id/attendance — confirma a presença do usuário logado na partida
export async function POST(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { id: matchId } = await params

        // Verifica se a partida existe e está disponível para confirmação
        const partida = await prisma.matches.findUnique({
            where: { id: matchId },
            select: { match_date: true, status: true },
        })

        if (!partida) {
            return NextResponse.json({ error: 'Partida não encontrada' }, { status: 404 })
        }

        if (partida.status === 'completed' || partida.status === 'cancelled') {
            return NextResponse.json(
                { error: 'Não é possível confirmar presença em uma partida encerrada ou cancelada' },
                { status: 422 }
            )
        }

        // Extrai mês e ano da partida para checar a convocatória mensal
        const dataPartida = new Date(partida.match_date)
        const mesPartida = dataPartida.getUTCMonth() + 1
        const anoPartida = dataPartida.getUTCFullYear()

        // Busca o perfil do usuário e a entrada na convocatória do mês em paralelo
        const [perfilUsuario, entradaConvocatoria] = await Promise.all([
            prisma.users.findUnique({
                where: { id: user.id },
                select: { is_goalkeeper: true },
            }),
            prisma.monthly_roster.findFirst({
                where: { user_id: user.id, month: mesPartida, year: anoPartida, status: 'active' },
            }),
        ])

        // Goleiros podem participar de qualquer partida; demais precisam estar na convocatória do mês
        const usuarioPodeConfirmar = perfilUsuario?.is_goalkeeper === true || !!entradaConvocatoria
        if (!usuarioPodeConfirmar) {
            return NextResponse.json(
                { error: 'Você não está na convocatória deste mês' },
                { status: 403 }
            )
        }

        // Insere ou atualiza a presença com confirmed = true
        const presencaConfirmada = await prisma.match_players.upsert({
            where: { match_id_user_id: { match_id: matchId, user_id: user.id } },
            create: {
                match_id: matchId,
                user_id: user.id,
                is_goalkeeper: perfilUsuario?.is_goalkeeper ?? false,
                confirmed: true,
            },
            update: { confirmed: true, unconfirmed_at: null },
        })

        return NextResponse.json(presencaConfirmada, { status: 201 })
    } catch (error) {
        console.error('[POST /api/matches/:id/attendance]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}

// DELETE /api/matches/:id/attendance — cancela a presença do usuário logado na partida
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

        const { id: matchId } = await params

        // Localiza a entrada de presença do usuário para esta partida
        const presencaExistente = await prisma.match_players.findUnique({
            where: { match_id_user_id: { match_id: matchId, user_id: user.id } },
        })

        if (!presencaExistente) {
            return NextResponse.json({ error: 'Presença não encontrada' }, { status: 404 })
        }

        await prisma.match_players.update({
            where: { id: presencaExistente.id },
            data: { confirmed: false, unconfirmed_at: new Date() },
        })

        return NextResponse.json({ message: 'Presença cancelada com sucesso' })
    } catch (error) {
        console.error('[DELETE /api/matches/:id/attendance]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
