import { prisma } from '@/config/prisma'
import { createServerSupabaseClient } from '@/config/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { buscarPerfilUsuario, ehAdminOuCoAdmin } from '../_lib/auth'
import { tratarErroPrisma } from '../_lib/prisma-errors'

// GET /api/guest-players — lista todos os jogadores avulsos genéricos cadastrados
export async function GET(_request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const avulsos = await prisma.guest_players.findMany({
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
                phone: true,
                position: true,
                is_goalkeeper: true,
                overall: true,
                linked_user_id: true,
                created_at: true,
            },
        })

        return NextResponse.json(avulsos)
    } catch (error) {
        console.error('[GET /api/guest-players]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}

// POST /api/guest-players — cadastra novo jogador avulso genérico (sem login no sistema)
export async function POST(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        // Apenas admin e co-admin podem cadastrar avulsos
        const perfilSolicitante = await buscarPerfilUsuario(user.id)
        if (!ehAdminOuCoAdmin(perfilSolicitante?.role)) {
            return NextResponse.json({ error: 'Sem permissão para realizar esta ação' }, { status: 403 })
        }

        const body = await request.json()
        const { name, phone, position, is_goalkeeper, overall, linked_user_id } = body

        if (!name) {
            return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
        }

        const novoAvulso = await prisma.guest_players.create({
            data: {
                name,
                phone: phone ?? null,
                position: position ?? null,
                is_goalkeeper: is_goalkeeper ?? false,
                overall: overall ?? 5,
                linked_user_id: linked_user_id ?? null,
            },
            select: {
                id: true,
                name: true,
                phone: true,
                position: true,
                is_goalkeeper: true,
                overall: true,
                linked_user_id: true,
                created_at: true,
            },
        })

        return NextResponse.json(novoAvulso, { status: 201 })
    } catch (error) {
        const respostaPrisma = tratarErroPrisma(error)
        if (respostaPrisma) return respostaPrisma

        console.error('[POST /api/guest-players]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
