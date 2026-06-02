import { prisma } from '@/config/prisma'
import { createServerSupabaseClient } from '@/config/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { buscarPerfilUsuario, ehAdminOuCoAdmin } from '../../_lib/auth'
import { tratarErroPrisma } from '../../_lib/prisma-errors'

// GET /api/guest-players/:id — retorna dados de um avulso genérico
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

        const avulso = await prisma.guest_players.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                phone: true,
                linked_user_id: true,
                created_at: true,
                users: { select: { id: true, name: true, nickname: true } },
            },
        })

        if (!avulso) {
            return NextResponse.json({ error: 'Avulso não encontrado' }, { status: 404 })
        }

        return NextResponse.json(avulso)
    } catch (error) {
        console.error('[GET /api/guest-players/:id]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}

// PATCH /api/guest-players/:id — atualiza dados do avulso genérico ou vincula a um usuário cadastrado
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
        const avulsoExistente = await prisma.guest_players.findUnique({ where: { id }, select: { id: true } })
        if (!avulsoExistente) {
            return NextResponse.json({ error: 'Avulso não encontrado' }, { status: 404 })
        }

        const body = await request.json()
        const { name, phone, linked_user_id } = body

        const dadosParaAtualizar: Record<string, unknown> = {}
        if (name !== undefined) dadosParaAtualizar.name = name
        if (phone !== undefined) dadosParaAtualizar.phone = phone
        if (linked_user_id !== undefined) dadosParaAtualizar.linked_user_id = linked_user_id

        const avulsoAtualizado = await prisma.guest_players.update({
            where: { id },
            data: dadosParaAtualizar,
            select: { id: true, name: true, phone: true, linked_user_id: true },
        })

        return NextResponse.json(avulsoAtualizado)
    } catch (error) {
        const respostaPrisma = tratarErroPrisma(error)
        if (respostaPrisma) return respostaPrisma

        console.error('[PATCH /api/guest-players/:id]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}

// DELETE /api/guest-players/:id — remove permanentemente um avulso genérico (hard delete)
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

        const avulsoExistente = await prisma.guest_players.findUnique({ where: { id }, select: { id: true } })
        if (!avulsoExistente) {
            return NextResponse.json({ error: 'Avulso não encontrado' }, { status: 404 })
        }

        await prisma.guest_players.delete({ where: { id } })

        return NextResponse.json({ message: 'Avulso removido com sucesso' })
    } catch (error) {
        const respostaPrisma = tratarErroPrisma(error)
        if (respostaPrisma) return respostaPrisma

        console.error('[DELETE /api/guest-players/:id]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
