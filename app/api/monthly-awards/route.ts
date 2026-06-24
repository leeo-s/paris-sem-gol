import { prisma } from '@/config/prisma'
import { createServerSupabaseClient } from '@/config/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { buscarPerfilUsuario, ehAdminOuCoAdmin } from '../_lib/auth'
import { tratarErroPrisma } from '../_lib/prisma-errors'

// GET /api/monthly-awards?month=6&year=2026 — retorna as premiações consolidadas do mês
export async function GET(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { searchParams } = request.nextUrl
        const mes = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1))
        const ano = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))

        const premiacao = await prisma.monthly_awards.findUnique({
            where: { month_year: { month: mes, year: ano } },
            include: {
                users_monthly_awards_mvp_user_idTousers: {
                    select: { id: true, name: true, nickname: true, photo_url: true },
                },
                users_monthly_awards_top_scorer_user_idTousers: {
                    select: { id: true, name: true, nickname: true, photo_url: true },
                },
                users_monthly_awards_best_gk_user_idTousers: {
                    select: { id: true, name: true, nickname: true, photo_url: true },
                },
                users_monthly_awards_most_present_user_idTousers: {
                    select: { id: true, name: true, nickname: true, photo_url: true },
                },
                users_monthly_awards_top_streak_user_idTousers: {
                    select: { id: true, name: true, nickname: true, photo_url: true },
                },
            },
        })

        if (!premiacao) {
            return NextResponse.json(
                { error: 'Premiação não encontrada para este mês' },
                { status: 404 }
            )
        }

        return NextResponse.json(premiacao)
    } catch (error) {
        console.error('[GET /api/monthly-awards]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}

// POST /api/monthly-awards — consolida e salva as premiações do mês (admin e co-admin)
export async function POST(request: NextRequest) {
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

        const body = await request.json()
        const { month, year } = body

        if (!month || !year) {
            return NextResponse.json({ error: 'month e year são obrigatórios' }, { status: 400 })
        }

        const inicioDoPeriodo = new Date(year, month - 1, 1)
        const fimDoPeriodo = new Date(year, month, 0)

        // Calcula automaticamente todos os vencedores do mês
        const [
            artilheiro,
            maisPresente,
            mvpPorVotos,
            goleiros,
        ] = await Promise.all([
            // Artilheiro — mais gols no mês
            prisma.goals.groupBy({
                by: ['scorer_user_id'],
                where: {
                    scorer_user_id: { not: null },
                    matches: { match_date: { gte: inicioDoPeriodo, lte: fimDoPeriodo }, status: 'completed' },
                },
                _count: { scorer_user_id: true },
                orderBy: { _count: { scorer_user_id: 'desc' } },
                take: 1,
            }),

            // Mais presente — mais partidas no mês
            prisma.match_players.groupBy({
                by: ['user_id'],
                where: {
                    user_id: { not: null },
                    matches: { match_date: { gte: inicioDoPeriodo, lte: fimDoPeriodo }, status: 'completed' },
                },
                _count: { match_id: true },
                orderBy: { _count: { match_id: 'desc' } },
                take: 1,
            }),

            // MVP — mais votos de craque (partidas + campeonatos) no mês
            Promise.all([
                prisma.mvp_votes.groupBy({
                    by: ['voted_user_id'],
                    where: { matches: { match_date: { gte: inicioDoPeriodo, lte: fimDoPeriodo } } },
                    _count: { voted_user_id: true },
                }),
                prisma.tournament_mvp_votes.groupBy({
                    by: ['voted_user_id'],
                    where: { created_at: { gte: inicioDoPeriodo, lte: fimDoPeriodo } },
                    _count: { voted_user_id: true },
                }),
            ]).then(([votosPartidas, votosTorneios]) => {
                const contagemMvp = new Map<string, number>()
                for (const v of votosPartidas) { const uid = v.voted_user_id; if (uid) contagemMvp.set(uid, (contagemMvp.get(uid) ?? 0) + v._count.voted_user_id) }
                for (const v of votosTorneios) { const uid = v.voted_user_id; if (uid) contagemMvp.set(uid, (contagemMvp.get(uid) ?? 0) + v._count.voted_user_id) }
                const topMvp = Array.from(contagemMvp.entries()).sort((a, b) => b[1] - a[1])[0]
                return topMvp ? [{ voted_user_id: topMvp[0] }] : []
            }),

            // Melhor goleiro — menos gols sofridos por partida
            prisma.goals_conceded.groupBy({
                by: ['conceder_user_id'],
                where: {
                    conceder_user_id: { not: null },
                    matches: { match_date: { gte: inicioDoPeriodo, lte: fimDoPeriodo }, status: 'completed' },
                },
                _sum: { amount: true },
                _count: { match_id: true },
                orderBy: { _sum: { amount: 'asc' } },
                take: 1,
            }),
        ])

        // Permite sobrescrever os calculados com indicações manuais do admin
        const dadosFinais = {
            month,
            year,
            mvp_user_id: body.mvp_user_id ?? mvpPorVotos[0]?.voted_user_id ?? null,
            top_scorer_user_id: body.top_scorer_user_id ?? artilheiro[0]?.scorer_user_id ?? null,
            best_gk_user_id: body.best_gk_user_id ?? goleiros[0]?.conceder_user_id ?? null,
            most_present_user_id: body.most_present_user_id ?? maisPresente[0]?.user_id ?? null,
            top_streak_user_id: body.top_streak_user_id ?? null,
        }

        // Upsert — cria ou atualiza se já existir para o mês
        const premiacao = await prisma.monthly_awards.upsert({
            where: { month_year: { month, year } },
            create: dadosFinais,
            update: dadosFinais,
            include: {
                users_monthly_awards_mvp_user_idTousers: {
                    select: { id: true, name: true, nickname: true, photo_url: true },
                },
                users_monthly_awards_top_scorer_user_idTousers: {
                    select: { id: true, name: true, nickname: true, photo_url: true },
                },
                users_monthly_awards_best_gk_user_idTousers: {
                    select: { id: true, name: true, nickname: true, photo_url: true },
                },
                users_monthly_awards_most_present_user_idTousers: {
                    select: { id: true, name: true, nickname: true, photo_url: true },
                },
            },
        })

        return NextResponse.json(premiacao, { status: 201 })
    } catch (error) {
        const respostaPrisma = tratarErroPrisma(error)
        if (respostaPrisma) return respostaPrisma

        console.error('[POST /api/monthly-awards]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}