import { prisma } from '@/config/prisma'
import { createServerSupabaseClient } from '@/config/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { buscarPerfilUsuario, ehAdminOuCoAdmin } from '../../../_lib/auth'
import { registrarVencedoresMvpTorneio } from '../../../_lib/mvp-awards'
import { tratarErroPrisma } from '../../../_lib/prisma-errors'

// GET /api/tournaments/:id/mvp-voting — retorna sessão, elegíveis e resultados
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { id: tournamentId } = await params

        const sessao = await prisma.tournament_mvp_voting_sessions.findUnique({
            where: { tournament_id: tournamentId },
        })

        if (!sessao) {
            return NextResponse.json({ error: 'Sessão de votação não encontrada para este campeonato' }, { status: 404 })
        }

        const perfil = await buscarPerfilUsuario(user.id)
        const isAdmin = ehAdminOuCoAdmin(perfil?.role)

        const votoDoUsuario = await prisma.tournament_mvp_votes.findUnique({
            where: { tournament_id_voter_user_id: { tournament_id: tournamentId, voter_user_id: user.id } },
            select: { voted_user_id: true },
        })

        // Lista de jogadores elegíveis: membros cadastrados que participaram de alguma partida do torneio
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

        const participantesRaw = await prisma.match_players.groupBy({
            by: ['user_id'],
            where: { match_id: { in: matchIds }, user_id: { not: null } },
        })
        const userIds = participantesRaw.map((p) => p.user_id as string)

        const jogadores = await prisma.users.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, nickname: true, photo_url: true, position: true },
        })

        // Admins sempre veem contagens; não-admins só veem após encerramento
        let resultados = null
        if (sessao.is_closed || isAdmin) {
            const todosVotos = await prisma.tournament_mvp_votes.findMany({
                where: { tournament_id: tournamentId },
                select: { voted_user_id: true, voted_guest_player_id: true },
            })

            const contagem = new Map<string, { userId: string | null; guestId: string | null; count: number }>()
            for (const voto of todosVotos) {
                const chave = voto.voted_user_id ?? `g:${voto.voted_guest_player_id}`
                const entrada = contagem.get(chave) ?? { userId: voto.voted_user_id, guestId: voto.voted_guest_player_id, count: 0 }
                entrada.count++
                contagem.set(chave, entrada)
            }

            const lista = Array.from(contagem.values()).sort((a, b) => b.count - a.count)

            resultados = await Promise.all(
                lista.map(async (item) => {
                    let jogador = null
                    if (item.userId) {
                        jogador = await prisma.users.findUnique({
                            where: { id: item.userId },
                            select: { id: true, name: true, nickname: true, photo_url: true, position: true },
                        })
                    } else if (item.guestId) {
                        const guest = await prisma.guest_players.findUnique({
                            where: { id: item.guestId },
                            select: { id: true, name: true, position: true },
                        })
                        if (guest) jogador = { ...guest, nickname: null, photo_url: null }
                    }
                    return { jogador, votos: item.count }
                }),
            )
        }

        return NextResponse.json({
            sessao,
            jaVotou: !!votoDoUsuario,
            votadoEm: votoDoUsuario?.voted_user_id ?? null,
            resultados,
            isAdmin,
            jogadores,
            ehElegivelParaVotar: userIds.includes(user.id),
        })
    } catch (error) {
        const respostaPrisma = tratarErroPrisma(error)
        if (respostaPrisma) return respostaPrisma

        console.error('[GET /api/tournaments/:id/mvp-voting]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}

// PATCH /api/tournaments/:id/mvp-voting — encerra manualmente a votação (admin)
export async function PATCH(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const perfil = await buscarPerfilUsuario(user.id)
        if (!ehAdminOuCoAdmin(perfil?.role)) {
            return NextResponse.json({ error: 'Sem permissão para realizar esta ação' }, { status: 403 })
        }

        const { id: tournamentId } = await params

        const sessaoAtual = await prisma.tournament_mvp_voting_sessions.findUnique({
            where: { tournament_id: tournamentId },
            select: { is_closed: true },
        })

        if (!sessaoAtual) {
            return NextResponse.json({ error: 'Sessão de votação não encontrada' }, { status: 404 })
        }

        if (sessaoAtual.is_closed) {
            return NextResponse.json({ error: 'A votação já foi encerrada' }, { status: 422 })
        }

        const sessaoAtualizada = await prisma.$transaction(async (tx) => {
            const sessao = await tx.tournament_mvp_voting_sessions.update({
                where: { tournament_id: tournamentId },
                data: { is_closed: true },
            })
            await registrarVencedoresMvpTorneio(tx, tournamentId)
            return sessao
        })

        return NextResponse.json(sessaoAtualizada)
    } catch (error) {
        const respostaPrisma = tratarErroPrisma(error)
        if (respostaPrisma) return respostaPrisma

        console.error('[PATCH /api/tournaments/:id/mvp-voting]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
