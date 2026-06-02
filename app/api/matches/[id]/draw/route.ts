import { prisma } from '@/config/prisma'
import { createServerSupabaseClient } from '@/config/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { buscarPerfilUsuario, ehAdminOuCoAdmin } from '../../../_lib/auth'
import { tratarErroPrisma } from '../../../_lib/prisma-errors'

interface JogadorParaSorteio {
    matchPlayerId: string
    userId: string | null
    guestPlayerId: string | null
    nome: string
    apelido: string | null
    fotoUrl: string | null
    overall: number
    ehGoleiro: boolean
}

// Distribui jogadores em times equilibrados usando snake draft por overall
function distribuirJogadoresEmTimes(
    jogadores: JogadorParaSorteio[],
    quantidadeDeTimes: number
): JogadorParaSorteio[][] {
    // Separa goleiros dos demais para distribuição especial
    const goleiros = jogadores.filter(j => j.ehGoleiro)
    const jogadoresDeLinha = jogadores.filter(j => !j.ehGoleiro)

    // Ordena por overall decrescente para o snake draft
    const linhaOrdenada = [...jogadoresDeLinha].sort((a, b) => b.overall - a.overall)

    const times: JogadorParaSorteio[][] = Array.from({ length: quantidadeDeTimes }, () => [])

    // Snake draft: T1, T2, T3, T4, T4, T3, T2, T1, T1, T2...
    linhaOrdenada.forEach((jogador, indice) => {
        const ciclo = Math.floor(indice / quantidadeDeTimes)
        const posicaoNoCiclo = indice % quantidadeDeTimes
        const indiceDoTime = ciclo % 2 === 0 ? posicaoNoCiclo : quantidadeDeTimes - 1 - posicaoNoCiclo
        times[indiceDoTime].push(jogador)
    })

    // Distribui os goleiros sequencialmente um por time
    goleiros.forEach((goleiro, indice) => {
        times[indice % quantidadeDeTimes].push(goleiro)
    })

    return times
}

// POST /api/matches/:id/draw — executa o sorteio de times equilibrado por rating e salva no banco
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

        const perfilSolicitante = await buscarPerfilUsuario(user.id)
        if (!ehAdminOuCoAdmin(perfilSolicitante?.role)) {
            return NextResponse.json({ error: 'Sem permissão para realizar esta ação' }, { status: 403 })
        }

        const { id: matchId } = await params
        const body = await request.json()

        // Quantidade de times padrão é 4 (A, B, C, D); configurável pelo admin
        const quantidadeDeTimes: number = body.team_count ?? 4
        const nomesDosTime: string[] = body.team_names ?? ['Time A', 'Time B', 'Time C', 'Time D'].slice(0, quantidadeDeTimes)

        if (quantidadeDeTimes < 2 || quantidadeDeTimes > 4) {
            return NextResponse.json({ error: 'Quantidade de times deve ser entre 2 e 4' }, { status: 400 })
        }

        // Busca jogadores presentes com seus ratings
        const jogadoresPresentes = await prisma.match_players.findMany({
            where: { match_id: matchId },
            include: {
                users: {
                    select: {
                        id: true,
                        name: true,
                        nickname: true,
                        photo_url: true,
                        is_goalkeeper: true,
                        player_ratings: { select: { overall: true } },
                    },
                },
                guest_players: { select: { id: true, name: true } },
            },
        })

        if (jogadoresPresentes.length === 0) {
            return NextResponse.json({ error: 'Nenhum jogador na lista de presentes' }, { status: 422 })
        }

        // Mapeia para estrutura uniforme de sorteio
        const jogadoresParaSorteio: JogadorParaSorteio[] = jogadoresPresentes.map(mp => ({
            matchPlayerId: mp.id,
            userId: mp.user_id,
            guestPlayerId: mp.guest_player_id,
            nome: mp.users?.name ?? mp.guest_players?.name ?? 'Desconhecido',
            apelido: mp.users?.nickname ?? null,
            fotoUrl: mp.users?.photo_url ?? null,
            overall: mp.users?.player_ratings?.overall ?? 5,
            ehGoleiro: mp.is_goalkeeper || mp.users?.is_goalkeeper || false,
        }))

        const timesDistribuidos = distribuirJogadoresEmTimes(jogadoresParaSorteio, quantidadeDeTimes)

        // Remove times anteriores do sorteio e recria (permite ressortear)
        await prisma.$transaction(async (tx) => {
            await tx.match_teams.deleteMany({ where: { match_id: matchId } })

            for (let i = 0; i < quantidadeDeTimes; i++) {
                await tx.match_teams.create({
                    data: {
                        match_id: matchId,
                        team_name: nomesDosTime[i],
                        team_index: i,
                    },
                })
            }
        })

        // Calcula o overall médio de cada time para exibição de equilíbrio
        const timesComEstatisticas = timesDistribuidos.map((jogadores, indice) => {
            const overallTotal = jogadores.reduce((soma, j) => soma + j.overall, 0)
            const overallMedio = jogadores.length > 0 ? overallTotal / jogadores.length : 0

            return {
                nome: nomesDosTime[indice],
                indice,
                overallMedio: Math.round(overallMedio * 10) / 10,
                jogadores,
            }
        })

        return NextResponse.json({ times: timesComEstatisticas })
    } catch (error) {
        const respostaPrisma = tratarErroPrisma(error)
        if (respostaPrisma) return respostaPrisma

        console.error('[POST /api/matches/:id/draw]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
