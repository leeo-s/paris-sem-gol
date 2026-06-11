import { prisma } from '@/config/prisma'
import { createServerSupabaseClient } from '@/config/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { buscarPerfilUsuario, ehAdminOuCoAdmin } from '../../_lib/auth'
import { tratarErroPrisma } from '../../_lib/prisma-errors'
import type { match_status } from '@/generated/prisma'

// GET /api/matches/:id — retorna detalhes completos de uma partida
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

        const partida = await prisma.matches.findUnique({
            where: { id },
            include: {
                users: { select: { id: true, name: true } },
                match_teams: { orderBy: { team_index: 'asc' } },
                match_players: {
                    include: {
                        users: { select: { id: true, name: true, nickname: true, photo_url: true, position: true, is_goalkeeper: true } },
                        guest_players: { select: { id: true, name: true } },
                    },
                },
                match_rounds: { orderBy: { round_number: 'asc' } },
                goals: {
                    include: {
                        users: { select: { id: true, name: true, nickname: true } },
                        guest_players: { select: { id: true, name: true } },
                    },
                },
                goals_conceded: {
                    include: {
                        users: { select: { id: true, name: true, nickname: true } },
                        guest_players: { select: { id: true, name: true } },
                    },
                },
                mvp_voting_sessions: true,
            },
        })

        if (!partida) {
            return NextResponse.json({ error: 'Partida não encontrada' }, { status: 404 })
        }

        return NextResponse.json(partida)
    } catch (error) {
        console.error('[GET /api/matches/:id]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}

// PATCH /api/matches/:id — atualiza status ou dados de uma partida
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
        const { status, location, match_date } = body

        const statusValidos = ['scheduled', 'completed', 'cancelled']
        if (status && !statusValidos.includes(status)) {
            return NextResponse.json({ error: `Status inválido. Use: ${statusValidos.join(', ')}` }, { status: 400 })
        }

        const dadosParaAtualizar: Record<string, unknown> = {}
        if (status !== undefined) dadosParaAtualizar.status = status as match_status
        if (location !== undefined) dadosParaAtualizar.location = location
        if (match_date !== undefined) dadosParaAtualizar.match_date = new Date(match_date)

        // Usa transação para garantir que a sessão MVP seja criada junto com a conclusão
        const partidaAtualizada = await prisma.$transaction(async (tx) => {
            const partida = await tx.matches.update({
                where: { id },
                data: dadosParaAtualizar,
            })

            // Ao concluir a partida, abre automaticamente a sessão de votação MVP por 24h
            if (status === 'completed') {
                // Verifica se já existe sessão para não criar duplicada (ressalvando ressortear)
                const sessaoExistente = await tx.mvp_voting_sessions.findUnique({
                    where: { match_id: id },
                })

                if (!sessaoExistente) {
                    // Conta apenas jogadores membros presentes — avulsos não votam
                    const totalElegiveis = await tx.match_players.count({
                        where: { match_id: id, user_id: { not: null } },
                    })

                    await tx.mvp_voting_sessions.create({
                        data: {
                            match_id: id,
                            eligible_voters: totalElegiveis,
                            closes_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
                        },
                    })
                }
            }

            return partida
        })

        return NextResponse.json(partidaAtualizada)
    } catch (error) {
        const respostaPrisma = tratarErroPrisma(error)
        if (respostaPrisma) return respostaPrisma

        console.error('[PATCH /api/matches/:id]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}

// DELETE /api/matches/:id — remove uma partida, mas apenas se ainda não foi iniciada
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

        // Verifica se a partida existe e se ainda não foi iniciada
        const partidaExistente = await prisma.matches.findUnique({
            where: { id },
            select: { id: true, status: true },
        })

        if (!partidaExistente) {
            return NextResponse.json({ error: 'Partida não encontrada' }, { status: 404 })
        }

        // Somente partidas com status "scheduled" (não iniciadas) podem ser excluídas
        if (partidaExistente.status !== 'scheduled') {
            return NextResponse.json(
                { error: 'Não é possível excluir uma partida que já foi iniciada ou encerrada' },
                { status: 422 }
            )
        }

        await prisma.matches.delete({ where: { id } })

        return NextResponse.json({ message: 'Partida removida com sucesso' })
    } catch (error) {
        const respostaPrisma = tratarErroPrisma(error)
        if (respostaPrisma) return respostaPrisma

        console.error('[DELETE /api/matches/:id]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
