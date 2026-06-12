import { prisma } from '@/config/prisma'
import { createServerSupabaseClient } from '@/config/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { buscarPerfilUsuario, ehAdminOuCoAdmin } from '../../_lib/auth'
import { tratarErroPrisma } from '../../_lib/prisma-errors'

// GET /api/mvp-voting/:matchId — retorna sessão de votação; admins veem contagens em tempo real
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ matchId: string }> }
) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { matchId } = await params

        const sessao = await prisma.mvp_voting_sessions.findUnique({
            where: { match_id: matchId },
        })

        if (!sessao) {
            return NextResponse.json({ error: 'Sessão de votação não encontrada para esta partida' }, { status: 404 })
        }

        const perfil = await buscarPerfilUsuario(user.id)
        const isAdmin = ehAdminOuCoAdmin(perfil?.role)

        const votoDoUsuario = await prisma.mvp_votes.findUnique({
            where: { match_id_voter_user_id: { match_id: matchId, voter_user_id: user.id } },
            select: { voted_user_id: true },
        })

        // Admins sempre veem contagens; não-admins só veem após encerramento
        let resultados = null
        if (sessao.is_closed || isAdmin) {
            const votos = await prisma.mvp_votes.groupBy({
                by: ['voted_user_id'],
                where: { match_id: matchId },
                _count: { voted_user_id: true },
                orderBy: { _count: { voted_user_id: 'desc' } },
            })

            resultados = await Promise.all(
                votos.map(async (voto) => {
                    const jogador = await prisma.users.findUnique({
                        where: { id: voto.voted_user_id },
                        select: { id: true, name: true, nickname: true, photo_url: true, position: true },
                    })
                    return { jogador, votos: voto._count.voted_user_id }
                })
            )
        }

        return NextResponse.json({
            sessao,
            jaVotou: !!votoDoUsuario,
            votadoEm: votoDoUsuario?.voted_user_id ?? null,
            resultados,
            isAdmin,
        })
    } catch (error) {
        const respostaPrisma = tratarErroPrisma(error)
        if (respostaPrisma) return respostaPrisma

        console.error('[GET /api/mvp-voting/:matchId]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}

// PATCH /api/mvp-voting/:matchId — encerra manualmente a sessão de votação (apenas admin)
export async function PATCH(
    _request: NextRequest,
    { params }: { params: Promise<{ matchId: string }> }
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

        const { matchId } = await params

        const sessaoAtualizada = await prisma.mvp_voting_sessions.update({
            where: { match_id: matchId },
            data: { is_closed: true },
        })

        return NextResponse.json(sessaoAtualizada)
    } catch (error) {
        const respostaPrisma = tratarErroPrisma(error)
        if (respostaPrisma) return respostaPrisma

        console.error('[PATCH /api/mvp-voting/:matchId]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
