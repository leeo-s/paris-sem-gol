import { prisma } from '@/config/prisma'
import { createServerSupabaseClient } from '@/config/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// GET /api/financial/summary?year=2026 — resumo financeiro público do ano para o portal de transparência
export async function GET(request: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { searchParams } = request.nextUrl
        const ano = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))

        const inicioDoAno = new Date(ano, 0, 1)
        const fimDoAno = new Date(ano, 11, 31)

        const [
            totaisGerais,
            totaisGlobais,
            entradasPorCategoria,
            saidasPorCategoria,
            mensalidadesPendentes,
            resumoPorMes,
        ] = await Promise.all([
            // Totais gerais de entrada e saída no ano
            prisma.financial_transactions.groupBy({
                by: ['type'],
                where: { reference_date: { gte: inicioDoAno, lte: fimDoAno } },
                _sum: { amount: true },
                _count: { id: true },
            }),

            // Totais globais sem restrição de ano (saldo total histórico do clube)
            prisma.financial_transactions.groupBy({
                by: ['type'],
                _sum: { amount: true },
            }),

            // Entradas detalhadas por categoria
            prisma.financial_transactions.groupBy({
                by: ['category'],
                where: {
                    type: 'income',
                    reference_date: { gte: inicioDoAno, lte: fimDoAno },
                },
                _sum: { amount: true },
                _count: { id: true },
                orderBy: { _sum: { amount: 'desc' } },
            }),

            // Saídas detalhadas por categoria
            prisma.financial_transactions.groupBy({
                by: ['category'],
                where: {
                    type: 'expense',
                    reference_date: { gte: inicioDoAno, lte: fimDoAno },
                },
                _sum: { amount: true },
                _count: { id: true },
                orderBy: { _sum: { amount: 'desc' } },
            }),

            // Total de mensalidades pendentes no ano
            prisma.monthly_fees.aggregate({
                where: {
                    year: ano,
                    status: { in: ['pending', 'late'] },
                },
                _sum: { amount: true },
                _count: { id: true },
            }),

            // Saldo mês a mês para gráfico de evolução
            prisma.financial_transactions.groupBy({
                by: ['type', 'reference_date'],
                where: { reference_date: { gte: inicioDoAno, lte: fimDoAno } },
                _sum: { amount: true },
            }),
        ])

        // Calcula totais de entrada e saída no ano
        const totalEntradas = Number(
            totaisGerais.find(t => t.type === 'income')?._sum.amount ?? 0
        )
        const totalSaidas = Number(
            totaisGerais.find(t => t.type === 'expense')?._sum.amount ?? 0
        )

        // Calcula saldo histórico total (todos os anos)
        const totalEntradasGlobal = Number(
            totaisGlobais.find(t => t.type === 'income')?._sum.amount ?? 0
        )
        const totalSaidasGlobal = Number(
            totaisGlobais.find(t => t.type === 'expense')?._sum.amount ?? 0
        )
        const saldoGlobal = totalEntradasGlobal - totalSaidasGlobal

        // Agrupa o resumo mês a mês
        const saldoPorMes: Record<number, { entradas: number; saidas: number; saldo: number }> = {}
        for (let m = 1; m <= 12; m++) {
            saldoPorMes[m] = { entradas: 0, saidas: 0, saldo: 0 }
        }

        resumoPorMes.forEach(item => {
            const mes = new Date(item.reference_date).getMonth() + 1
            const valor = Number(item._sum.amount ?? 0)
            if (item.type === 'income') {
                saldoPorMes[mes].entradas += valor
            } else {
                saldoPorMes[mes].saidas += valor
            }
            saldoPorMes[mes].saldo = saldoPorMes[mes].entradas - saldoPorMes[mes].saidas
        })

        return NextResponse.json({
            ano,
            totalEntradas,
            totalSaidas,
            saldoAtual: totalEntradas - totalSaidas,
            saldoGlobal,
            inadimplencia: {
                total: Number(mensalidadesPendentes._sum.amount ?? 0),
                quantidadeJogadores: mensalidadesPendentes._count.id,
            },
            entradasPorCategoria: entradasPorCategoria.map(e => ({
                categoria: e.category,
                total: Number(e._sum.amount ?? 0),
                transacoes: e._count.id,
            })),
            saidasPorCategoria: saidasPorCategoria.map(s => ({
                categoria: s.category,
                total: Number(s._sum.amount ?? 0),
                transacoes: s._count.id,
            })),
            evolucaoMensal: Object.entries(saldoPorMes).map(([mes, valores]) => ({
                mes: parseInt(mes),
                ...valores,
            })),
        })
    } catch (error) {
        console.error('[GET /api/financial/summary]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}