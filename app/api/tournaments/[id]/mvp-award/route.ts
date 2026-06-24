import { prisma } from '@/config/prisma'
import { createServerSupabaseClient } from '@/config/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { tratarErroPrisma } from '../../../_lib/prisma-errors'

// GET /api/tournaments/:id/mvp-award
// Retorna o(s) MVP(s) do torneio registrados em mvp_awards.
// Em caso de empate, retorna múltiplos vencedores.
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

        const premios = await prisma.mvp_awards.findMany({
            where: { tournament_id: tournamentId },
            include: {
                users: { select: { id: true, name: true, nickname: true, photo_url: true, position: true } },
                guest_players: { select: { id: true, name: true, position: true } },
            },
        })

        const mvps = premios.map((p) => ({
            nome: p.users?.nickname ?? p.users?.name ?? p.guest_players?.name ?? '?',
            fotoUrl: p.users?.photo_url ?? null,
            posicao: p.users?.position ?? p.guest_players?.position ?? null,
            votos: p.vote_count,
        }))

        return NextResponse.json({ mvps })
    } catch (error) {
        const respostaPrisma = tratarErroPrisma(error)
        if (respostaPrisma) return respostaPrisma

        console.error('[GET /api/tournaments/:id/mvp-award]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
