import { prisma } from '@/config/prisma'
import { createServerSupabaseClient } from '@/config/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { buscarPerfilUsuario, ehAdmin } from '../_lib/auth'
import { tratarErroPrisma } from '../_lib/prisma-errors'

// GET /api/club-settings — retorna as configurações globais do clube
export async function GET(_request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const configuracoes = await prisma.club_settings.findFirst()

        if (!configuracoes) {
            return NextResponse.json({ error: 'Configurações do clube não encontradas' }, { status: 404 })
        }

        return NextResponse.json(configuracoes)
    } catch (error) {
        console.error('[GET /api/club-settings]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}

// PATCH /api/club-settings — atualiza as configurações do clube (exclusivo para admin)
export async function PATCH(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        // Apenas admin pode alterar as configurações globais do clube
        const perfilSolicitante = await buscarPerfilUsuario(user.id)
        if (!ehAdmin(perfilSolicitante?.role)) {
            return NextResponse.json({ error: 'Apenas o admin pode alterar as configurações do clube' }, { status: 403 })
        }

        const body = await request.json()
        const { club_name, monthly_fee, guest_fee, bbq_member_fee, bbq_guest_fee, jersey_price, local, time } = body

        const configuracoes = await prisma.club_settings.findFirst()
        if (!configuracoes) {
            return NextResponse.json({ error: 'Configurações do clube não encontradas' }, { status: 404 })
        }

        // Valida que os valores monetários são positivos
        const valoresMonetarios = { monthly_fee, guest_fee, bbq_member_fee, bbq_guest_fee, jersey_price }
        for (const [campo, valor] of Object.entries(valoresMonetarios)) {
            if (valor !== undefined && valor < 0) {
                return NextResponse.json({ error: `O campo '${campo}' não pode ser negativo` }, { status: 400 })
            }
        }

        // Converte "HH:MM" para um objeto Date com data epoch para o campo Time do Postgres
        function horarioParaDate(horario: string): Date {
            const [horas, minutos] = horario.split(':').map(Number)
            const data = new Date(0)
            data.setUTCHours(horas, minutos, 0, 0)
            return data
        }

        const dadosParaAtualizar: Record<string, unknown> = { updated_at: new Date() }
        if (club_name !== undefined) dadosParaAtualizar.club_name = club_name
        if (monthly_fee !== undefined) dadosParaAtualizar.monthly_fee = monthly_fee
        if (guest_fee !== undefined) dadosParaAtualizar.guest_fee = guest_fee
        if (bbq_member_fee !== undefined) dadosParaAtualizar.bbq_member_fee = bbq_member_fee
        if (bbq_guest_fee !== undefined) dadosParaAtualizar.bbq_guest_fee = bbq_guest_fee
        if (jersey_price !== undefined) dadosParaAtualizar.jersey_price = jersey_price
        if (local !== undefined) dadosParaAtualizar.local = local
        if (time !== undefined) dadosParaAtualizar.time = horarioParaDate(time)

        const configuracoesAtualizadas = await prisma.club_settings.update({
            where: { id: configuracoes.id },
            data: dadosParaAtualizar,
        })

        return NextResponse.json(configuracoesAtualizadas)
    } catch (error) {
        const respostaPrisma = tratarErroPrisma(error)
        if (respostaPrisma) return respostaPrisma

        console.error('[PATCH /api/club-settings]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
