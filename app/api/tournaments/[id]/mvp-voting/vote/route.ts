import { prisma } from '@/config/prisma'
import { createServerSupabaseClient } from '@/config/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { registrarVencedoresMvpTorneio } from '../../../../_lib/mvp-awards'
import { tratarErroPrisma } from '../../../../_lib/prisma-errors'

// POST /api/tournaments/:id/mvp-voting/vote — registra o voto de MVP do campeonato
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { id: tournamentId } = await params
        const body = await request.json()
        const { voted_user_id, voted_guest_player_id } = body

        if (!voted_user_id && !voted_guest_player_id) {
            return NextResponse.json(
                { error: 'voted_user_id ou voted_guest_player_id é obrigatório' },
                { status: 400 },
            )
        }

        if (voted_user_id && voted_guest_player_id) {
            return NextResponse.json(
                { error: 'Informe apenas voted_user_id ou voted_guest_player_id, não ambos' },
                { status: 400 },
            )
        }

        const sessao = await prisma.tournament_mvp_voting_sessions.findUnique({
            where: { tournament_id: tournamentId },
            select: { is_closed: true, closes_at: true, eligible_voters: true },
        })

        if (!sessao) {
            return NextResponse.json({ error: 'Sessão de votação não encontrada' }, { status: 404 })
        }

        const votacaoExpirada = new Date() > sessao.closes_at
        if (sessao.is_closed || votacaoExpirada) {
            return NextResponse.json({ error: 'A votação já foi encerrada' }, { status: 422 })
        }

        // Verifica se o votante participou de alguma partida do torneio
        const stages = await prisma.tournament_stages.findMany({
            where: { tournament_id: tournamentId },
            select: { id: true },
        })
        const stageIds = stages.map((s) => s.id)

        const matchesDoTorneio = await prisma.matches.findMany({
            where: { tournament_stage_id: { in: stageIds } },
            select: { id: true },
        })
        const matchIds = matchesDoTorneio.map((m) => m.id)

        const presencaVotante = await prisma.match_players.findFirst({
            where: { match_id: { in: matchIds }, user_id: user.id },
        })

        if (!presencaVotante) {
            return NextResponse.json(
                { error: 'Apenas jogadores que participaram do campeonato podem votar' },
                { status: 403 },
            )
        }

        // Verifica se o jogador votado participou do torneio (user ou guest)
        if (voted_user_id) {
            const presencaVotado = await prisma.match_players.findFirst({
                where: { match_id: { in: matchIds }, user_id: voted_user_id },
            })
            if (!presencaVotado) {
                return NextResponse.json(
                    { error: 'O jogador votado não participou deste campeonato' },
                    { status: 400 },
                )
            }
        } else {
            const presencaVotado = await prisma.match_players.findFirst({
                where: { match_id: { in: matchIds }, guest_player_id: voted_guest_player_id },
            })
            if (!presencaVotado) {
                return NextResponse.json(
                    { error: 'O convidado votado não participou deste campeonato' },
                    { status: 400 },
                )
            }
        }

        const novoVoto = await prisma.$transaction(async (tx) => {
            const voto = await tx.tournament_mvp_votes.create({
                data: {
                    tournament_id: tournamentId,
                    voter_user_id: user.id,
                    voted_user_id: voted_user_id ?? null,
                    voted_guest_player_id: voted_guest_player_id ?? null,
                },
            })

            const totalVotos = await tx.tournament_mvp_votes.count({ where: { tournament_id: tournamentId } })
            const todosVotaram = totalVotos >= sessao.eligible_voters

            await tx.tournament_mvp_voting_sessions.update({
                where: { tournament_id: tournamentId },
                data: {
                    total_votes_cast: totalVotos,
                    ...(todosVotaram && { is_closed: true }),
                },
            })

            if (todosVotaram) {
                await registrarVencedoresMvpTorneio(tx, tournamentId)
            }

            return voto
        })

        return NextResponse.json(novoVoto, { status: 201 })
    } catch (error) {
        const respostaPrisma = tratarErroPrisma(error)
        if (respostaPrisma) return respostaPrisma

        console.error('[POST /api/tournaments/:id/mvp-voting/vote]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
