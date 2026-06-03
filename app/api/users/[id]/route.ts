import { prisma } from '@/config/prisma'
import { createServerSupabaseClient } from '@/config/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { buscarPerfilUsuario, ehAdminOuCoAdmin, ehAdmin } from '../../_lib/auth'
import { tratarErroPrisma } from '../../_lib/prisma-errors'

// GET /api/users/:id — retorna perfil completo do jogador incluindo rating
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

        const jogador = await prisma.users.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                nickname: true,
                email: true,
                role: true,
                photo_url: true,
                birth_date: true,
                phone: true,
                position: true,
                is_goalkeeper: true,
                is_active: true,
                invited_at: true,
                first_login_at: true,
                created_at: true,
                player_ratings: true,
            },
        })

        if (!jogador) {
            return NextResponse.json({ error: 'Jogador não encontrado' }, { status: 404 })
        }

        return NextResponse.json(jogador)
    } catch (error) {
        console.error('[GET /api/users/:id]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}

// PATCH /api/users/:id — atualiza dados do jogador respeitando permissões por role
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

        const { id } = await params

        const perfilSolicitante = await buscarPerfilUsuario(user.id)
        const ehProprioJogador = user.id === id
        const temPrivilegioDeAdmin = ehAdminOuCoAdmin(perfilSolicitante?.role)

        // Jogador comum só pode editar o próprio perfil
        if (!ehProprioJogador && !temPrivilegioDeAdmin) {
            return NextResponse.json({ error: 'Sem permissão para realizar esta ação' }, { status: 403 })
        }

        // Verifica se o jogador alvo existe
        const jogadorExistente = await prisma.users.findUnique({ where: { id }, select: { id: true } })
        if (!jogadorExistente) {
            return NextResponse.json({ error: 'Jogador não encontrado' }, { status: 404 })
        }

        const body = await request.json()
        const { name, nickname, phone, position, is_goalkeeper, birth_date, photo_url, role, is_active } = body

        // Campos editáveis por qualquer jogador sobre si mesmo
        const dadosParaAtualizar: Record<string, unknown> = {
            updated_at: new Date(),
        }

        if (name !== undefined) dadosParaAtualizar.name = name
        if (nickname !== undefined) dadosParaAtualizar.nickname = nickname
        if (phone !== undefined) dadosParaAtualizar.phone = phone
        if (position !== undefined) dadosParaAtualizar.position = position
        if (photo_url !== undefined) dadosParaAtualizar.photo_url = photo_url
        if (birth_date !== undefined) dadosParaAtualizar.birth_date = birth_date ? new Date(birth_date) : null

        // Campos restritos a admin/co-admin
        if (temPrivilegioDeAdmin) {
            if (is_goalkeeper !== undefined) dadosParaAtualizar.is_goalkeeper = is_goalkeeper
            if (role !== undefined) dadosParaAtualizar.role = role
            if (is_active !== undefined) dadosParaAtualizar.is_active = is_active
        }

        const jogadorAtualizado = await prisma.users.update({
            where: { id },
            data: dadosParaAtualizar,
            select: {
                id: true,
                name: true,
                nickname: true,
                email: true,
                role: true,
                photo_url: true,
                position: true,
                is_goalkeeper: true,
                is_active: true,
                updated_at: true,
            },
        })

        return NextResponse.json(jogadorAtualizado)
    } catch (error) {
        const respostaPrisma = tratarErroPrisma(error)
        if (respostaPrisma) return respostaPrisma

        console.error('[PATCH /api/users/:id]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}

// DELETE /api/users/:id — desativa um jogador (soft delete), exclusivo para admin
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
        if (!ehAdmin(perfilSolicitante?.role)) {
            return NextResponse.json({ error: 'Sem permissão para realizar esta ação' }, { status: 403 })
        }

        const { id } = await params

        // Verifica existência antes de desativar para retornar 404 em vez de 500
        const jogadorExistente = await prisma.users.findUnique({ where: { id }, select: { id: true } })
        if (!jogadorExistente) {
            return NextResponse.json({ error: 'Jogador não encontrado' }, { status: 404 })
        }

        await prisma.users.update({
            where: { id },
            data: { is_active: false, updated_at: new Date() },
        })

        return NextResponse.json({ message: 'Jogador desativado com sucesso' })
    } catch (error) {
        const respostaPrisma = tratarErroPrisma(error)
        if (respostaPrisma) return respostaPrisma

        console.error('[DELETE /api/users/:id]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}

// PUT alterar a foto de perfil do usuário
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try{
        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }



    } catch (error) {
        const respostaPrisma = tratarErroPrisma(error)
        if(respostaPrisma) return respostaPrisma

        console.error('[PUT /api/users]', error)
        return NextResponse.json({error: 'Error interno do servidor'}, {status: 500})
    }
}