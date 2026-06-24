import { prisma } from '@/config/prisma'
import { createServerSupabaseClient } from '@/config/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { buscarPerfilUsuario, ehAdminOuCoAdmin } from '../../../_lib/auth'
import { tratarErroPrisma } from '../../../_lib/prisma-errors'

// POST /api/tournaments/:id/registrations
// Admin: body { user_id, guest_player_id, is_goalkeeper } — inscreve qualquer jogador
// Usuário comum: body vazio — inscreve o próprio usuário logado
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { id: tournament_id } = await params

        const campeonato = await prisma.tournaments.findUnique({
            where: { id: tournament_id },
            select: { status: true },
        })

        if (!campeonato) {
            return NextResponse.json({ error: 'Campeonato não encontrado' }, { status: 404 })
        }

        if (campeonato.status !== 'registration') {
            return NextResponse.json({ error: 'Inscrições encerradas para este campeonato' }, { status: 400 })
        }

        const body = await request.json().catch(() => ({}))
        const { user_id, guest_player_id, is_goalkeeper } = body as {
            user_id?: string
            guest_player_id?: string
            is_goalkeeper?: boolean
        }

        const perfilSolicitante = await buscarPerfilUsuario(user.id)
        const ehAdmin = ehAdminOuCoAdmin(perfilSolicitante?.role)

        // Operação admin: inscrever usuário ou avulso específico
        if (ehAdmin && (user_id || guest_player_id)) {
            if (!user_id && !guest_player_id) {
                return NextResponse.json({ error: 'Informe user_id ou guest_player_id' }, { status: 400 })
            }

            const inscricao = user_id
                ? await prisma.tournament_registrations.upsert({
                    where: { tournament_id_user_id: { tournament_id, user_id } },
                    create: { tournament_id, user_id, is_goalkeeper: is_goalkeeper ?? false },
                    update: { is_goalkeeper: is_goalkeeper ?? false },
                    include: {
                        users: { select: { id: true, name: true, nickname: true, photo_url: true, is_goalkeeper: true } },
                        guest_players: { select: { id: true, name: true, is_goalkeeper: true } },
                    },
                })
                : await prisma.tournament_registrations.create({
                    data: { tournament_id, guest_player_id: guest_player_id!, is_goalkeeper: is_goalkeeper ?? false },
                    include: {
                        users: { select: { id: true, name: true, nickname: true, photo_url: true, is_goalkeeper: true } },
                        guest_players: { select: { id: true, name: true, is_goalkeeper: true } },
                    },
                })

            return NextResponse.json(inscricao, { status: 201 })
        }

        // Auto-inscrição: usuário logado se inscreve
        const perfil = await prisma.users.findUnique({
            where: { id: user.id },
            select: { is_goalkeeper: true },
        })

        const inscricao = await prisma.tournament_registrations.create({
            data: {
                tournament_id,
                user_id: user.id,
                is_goalkeeper: perfil?.is_goalkeeper ?? false,
            },
        })

        return NextResponse.json(inscricao, { status: 201 })
    } catch (error: unknown) {
        const respostaPrisma = tratarErroPrisma(error as Error)
        if (respostaPrisma) return respostaPrisma

        if (
            typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            (error as { code: string }).code === 'P2002'
        ) {
            return NextResponse.json({ error: 'Jogador já está inscrito neste campeonato' }, { status: 409 })
        }

        console.error('[POST /api/tournaments/:id/registrations]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}

// DELETE /api/tournaments/:id/registrations
// Admin: body { registration_id } — remove inscrição específica
// Usuário comum: body vazio — cancela a própria inscrição
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { id: tournament_id } = await params

        const campeonato = await prisma.tournaments.findUnique({
            where: { id: tournament_id },
            select: { status: true },
        })

        if (!campeonato) {
            return NextResponse.json({ error: 'Campeonato não encontrado' }, { status: 404 })
        }

        if (campeonato.status !== 'registration') {
            return NextResponse.json({ error: 'Não é possível cancelar a inscrição após o início do campeonato' }, { status: 400 })
        }

        const body = await request.json().catch(() => ({}))
        const { registration_id } = body as { registration_id?: string }

        const perfilSolicitante = await buscarPerfilUsuario(user.id)
        const ehAdmin = ehAdminOuCoAdmin(perfilSolicitante?.role)

        if (ehAdmin && registration_id) {
            await prisma.tournament_registrations.delete({
                where: { id: registration_id, tournament_id },
            })
            return NextResponse.json({ message: 'Inscrição removida com sucesso' })
        }

        // Auto-cancelamento: usuário remove a própria inscrição
        await prisma.tournament_registrations.deleteMany({
            where: { tournament_id, user_id: user.id },
        })

        return NextResponse.json({ message: 'Inscrição cancelada com sucesso' })
    } catch (error) {
        const respostaPrisma = tratarErroPrisma(error)
        if (respostaPrisma) return respostaPrisma

        console.error('[DELETE /api/tournaments/:id/registrations]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
