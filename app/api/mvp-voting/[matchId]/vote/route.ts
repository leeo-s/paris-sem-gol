import { prisma } from '@/config/prisma'
import { createServerSupabaseClient } from '@/config/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { registrarVencedoresMvpPartida } from '../../../_lib/mvp-awards'
import { tratarErroPrisma } from '../../../_lib/prisma-errors'

// POST /api/mvp-voting/:matchId/vote — registra o voto do craque da pelada
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ matchId: string }> }
) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { matchId } = await params
        const body = await request.json()
        const { voted_user_id, voted_guest_player_id } = body

        if (!voted_user_id && !voted_guest_player_id) {
            return NextResponse.json(
                { error: 'voted_user_id ou voted_guest_player_id é obrigatório' },
                { status: 400 }
            )
        }

        if (voted_user_id && voted_guest_player_id) {
            return NextResponse.json(
                { error: 'Informe apenas voted_user_id ou voted_guest_player_id, não ambos' },
                { status: 400 }
            )
        }

        // Verifica se a sessão de votação existe e está aberta
        const sessao = await prisma.mvp_voting_sessions.findUnique({
            where: { match_id: matchId },
            select: { is_closed: true, closes_at: true },
        })

        if (!sessao) {
            return NextResponse.json({ error: 'Sessão de votação não encontrada' }, { status: 404 })
        }

        const votacaoExpirada = new Date() > sessao.closes_at
        if (sessao.is_closed || votacaoExpirada) {
            return NextResponse.json({ error: 'A votação já foi encerrada' }, { status: 422 })
        }

        // Verifica se o votante estava presente na partida
        const presencaDoVotante = await prisma.match_players.findUnique({
            where: { match_id_user_id: { match_id: matchId, user_id: user.id } },
        })

        if (!presencaDoVotante) {
            return NextResponse.json(
                { error: 'Apenas jogadores presentes na partida podem votar' },
                { status: 403 }
            )
        }

        // Verifica se o votado estava presente na partida (user ou guest)
        if (voted_user_id) {
            const presencaDoVotado = await prisma.match_players.findUnique({
                where: { match_id_user_id: { match_id: matchId, user_id: voted_user_id } },
            })
            if (!presencaDoVotado) {
                return NextResponse.json(
                    { error: 'O jogador votado não estava presente nesta partida' },
                    { status: 400 }
                )
            }
        } else {
            const presencaDoVotado = await prisma.match_players.findFirst({
                where: { match_id: matchId, guest_player_id: voted_guest_player_id },
            })
            if (!presencaDoVotado) {
                return NextResponse.json(
                    { error: 'O convidado votado não estava presente nesta partida' },
                    { status: 400 }
                )
            }
        }

        // Registra o voto e atualiza o contador da sessão em transação
        const novoVoto = await prisma.$transaction(async (tx) => {
            const voto = await tx.mvp_votes.create({
                data: {
                    match_id: matchId,
                    voter_user_id: user.id,
                    voted_user_id: voted_user_id ?? null,
                    voted_guest_player_id: voted_guest_player_id ?? null,
                },
            })

            const totalVotos = await tx.mvp_votes.count({ where: { match_id: matchId } })
            const sessaoAtualizada = await tx.mvp_voting_sessions.findUnique({
                where: { match_id: matchId },
                select: { eligible_voters: true },
            })

            const todosVotaram = sessaoAtualizada && totalVotos >= sessaoAtualizada.eligible_voters

            await tx.mvp_voting_sessions.update({
                where: { match_id: matchId },
                data: {
                    total_votes_cast: totalVotos,
                    ...(todosVotaram && { is_closed: true }),
                },
            })

            if (todosVotaram) {
                await registrarVencedoresMvpPartida(tx, matchId)
            }

            return voto
        })

        return NextResponse.json(novoVoto, { status: 201 })
    } catch (error) {
        const respostaPrisma = tratarErroPrisma(error)
        if (respostaPrisma) return respostaPrisma

        console.error('[POST /api/mvp-voting/:matchId/vote]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
