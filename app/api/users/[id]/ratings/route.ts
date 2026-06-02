import { prisma } from '@/config/prisma'
import { createServerSupabaseClient } from '@/config/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { buscarPerfilUsuario, ehAdminOuCoAdmin } from '../../../_lib/auth'
import { tratarErroPrisma } from '../../../_lib/prisma-errors'

// GET /api/users/:id/ratings — retorna os atributos de habilidade do jogador
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

        const rating = await prisma.player_ratings.findUnique({
            where: { user_id: id },
        })

        if (!rating) {
            return NextResponse.json({ error: 'Rating não encontrado para este jogador' }, { status: 404 })
        }

        return NextResponse.json(rating)
    } catch (error) {
        console.error('[GET /api/users/:id/ratings]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}

// PATCH /api/users/:id/ratings — atualiza atributos de habilidade; overall é recalculado pelo banco
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

        // Apenas admin e co-admin podem editar ratings
        const perfilSolicitante = await buscarPerfilUsuario(user.id)
        if (!ehAdminOuCoAdmin(perfilSolicitante?.role)) {
            return NextResponse.json({ error: 'Sem permissão para realizar esta ação' }, { status: 403 })
        }

        const { id } = await params
        const body = await request.json()
        const { speed, finishing, passing, dribbling, defense } = body

        // Valida que os atributos estão no intervalo permitido (1 a 10)
        const atributos = { speed, finishing, passing, dribbling, defense }
        for (const [nome, valor] of Object.entries(atributos)) {
            if (valor !== undefined && (valor < 1 || valor > 10 || !Number.isInteger(valor))) {
                return NextResponse.json(
                    { error: `Atributo '${nome}' deve ser um inteiro entre 1 e 10` },
                    { status: 400 }
                )
            }
        }

        // Monta apenas os campos que foram enviados na requisição
        const dadosParaAtualizar: Record<string, unknown> = { updated_at: new Date() }
        if (speed !== undefined) dadosParaAtualizar.speed = speed
        if (finishing !== undefined) dadosParaAtualizar.finishing = finishing
        if (passing !== undefined) dadosParaAtualizar.passing = passing
        if (dribbling !== undefined) dadosParaAtualizar.dribbling = dribbling
        if (defense !== undefined) dadosParaAtualizar.defense = defense

        const ratingAtualizado = await prisma.player_ratings.update({
            where: { user_id: id },
            data: dadosParaAtualizar,
        })

        return NextResponse.json(ratingAtualizado)
    } catch (error) {
        const respostaPrisma = tratarErroPrisma(error)
        if (respostaPrisma) return respostaPrisma

        console.error('[PATCH /api/users/:id/ratings]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
