import { prisma } from '@/config/prisma'
import { createServerSupabaseClient } from '@/config/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { buscarPerfilUsuario, ehAdminOuCoAdmin } from '../../../_lib/auth'
import { tratarErroPrisma } from '../../../_lib/prisma-errors'

const LETRAS_TIME = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

interface JogadorParaSorteio {
    matchPlayerId: string
    userId: string | null
    guestPlayerId: string | null
    nome: string
    apelido: string | null
    fotoUrl: string | null
    posicao: string | null
    overall: number
    ehGoleiro: boolean
}

function embaralharArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]
    }
}

function distribuirJogadoresEmTimes(
    jogadores: JogadorParaSorteio[],
    jogadoresPorTime: number
): JogadorParaSorteio[][] {
    const goleiros = jogadores.filter(j => j.ehGoleiro)
    const linhaOrdenada = [...jogadores.filter(j => !j.ehGoleiro)]
        .sort((a, b) => b.overall - a.overall)

    const totalDeLinha = linhaOrdenada.length
    if (totalDeLinha === 0) return []

    const quantidadeDeTimesCompletos = Math.floor(totalDeLinha / jogadoresPorTime)
    const quantidadeRestante = totalDeLinha % jogadoresPorTime

    const timesCompletos: JogadorParaSorteio[][] = Array.from({ length: quantidadeDeTimesCompletos }, () => [])

    for (let rodada = 0; rodada < jogadoresPorTime; rodada++) {
        const direcaoAFrente = rodada % 2 === 0
        for (let passo = 0; passo < quantidadeDeTimesCompletos; passo++) {
            const indiceTime = direcaoAFrente ? passo : quantidadeDeTimesCompletos - 1 - passo
            const indiceJogador = rodada * quantidadeDeTimesCompletos + passo
            timesCompletos[indiceTime].push(linhaOrdenada[indiceJogador])
        }
    }

    embaralharArray(timesCompletos)

    const times = [...timesCompletos]
    if (quantidadeRestante > 0) {
        times.push(linhaOrdenada.slice(quantidadeDeTimesCompletos * jogadoresPorTime))
    }

    goleiros.forEach((goleiro, indice) => {
        times[indice % times.length].push(goleiro)
    })

    return times
}

// GET /api/matches/:id/draw — retorna os times sorteados salvos no banco
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { id: matchId } = await params

        const times = await prisma.match_teams.findMany({
            where: { match_id: matchId },
            orderBy: { team_index: 'asc' },
        })

        if (times.length === 0) {
            return NextResponse.json({ times: [] })
        }

        const jogadores = await prisma.match_players.findMany({
            where: { match_id: matchId, team_id: { not: null } },
            include: {
                users: {
                    select: {
                        id: true,
                        name: true,
                        nickname: true,
                        photo_url: true,
                        position: true,
                        is_goalkeeper: true,
                        player_ratings: { select: { overall: true } },
                    },
                },
                guest_players: { select: { id: true, name: true, position: true } },
            },
        })

        const timesComJogadores = times.map(time => {
            const jogadoresDoTime = jogadores
                .filter(j => j.team_id === time.id)
                .map(mp => ({
                    matchPlayerId: mp.id,
                    userId: mp.user_id,
                    guestPlayerId: mp.guest_player_id,
                    nome: mp.users?.name ?? mp.guest_players?.name ?? 'Desconhecido',
                    apelido: mp.users?.nickname ?? null,
                    fotoUrl: mp.users?.photo_url ?? null,
                    posicao: mp.users?.position ?? mp.guest_players?.position ?? null,
                    overall: mp.users?.player_ratings?.overall ?? 5,
                    ehGoleiro: mp.is_goalkeeper || (mp.users?.is_goalkeeper ?? false),
                }))

            const jogadoresDeLinha = jogadoresDoTime.filter(j => !j.ehGoleiro)
            const somaOverall = jogadoresDeLinha.reduce((soma, j) => soma + j.overall, 0)
            const overallMedio = jogadoresDeLinha.length > 0 ? somaOverall / jogadoresDeLinha.length : 0

            return {
                nome: time.team_name,
                indice: time.team_index,
                overallMedio: Math.round(overallMedio * 10) / 10,
                jogadores: jogadoresDoTime,
            }
        })

        return NextResponse.json({ times: timesComJogadores })
    } catch (error) {
        const respostaPrisma = tratarErroPrisma(error)
        if (respostaPrisma) return respostaPrisma

        console.error('[GET /api/matches/:id/draw]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}

// POST /api/matches/:id/draw — sorteia times equilibrados por overall e salva no banco
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

        const jogadoresPorTime: number = body.players_per_team

        if (!jogadoresPorTime || jogadoresPorTime < 4 || jogadoresPorTime > 12) {
            return NextResponse.json(
                { error: 'Jogadores por time deve ser entre 4 e 12' },
                { status: 400 }
            )
        }

        const jogadoresConfirmados = await prisma.match_players.findMany({
            where: { match_id: matchId, confirmed: true },
            include: {
                users: {
                    select: {
                        id: true,
                        name: true,
                        nickname: true,
                        photo_url: true,
                        position: true,
                        is_goalkeeper: true,
                        player_ratings: { select: { overall: true } },
                    },
                },
                guest_players: { select: { id: true, name: true, position: true } },
            },
        })

        if (jogadoresConfirmados.length === 0) {
            return NextResponse.json({ error: 'Nenhum jogador confirmado para o sorteio' }, { status: 422 })
        }

        const totalJogadoresDeLinha = jogadoresConfirmados.filter(
            mp => !(mp.is_goalkeeper || (mp.users?.is_goalkeeper ?? false))
        ).length

        if (totalJogadoresDeLinha < jogadoresPorTime + 1) {
            return NextResponse.json({
                error: `São necessários ao menos ${jogadoresPorTime + 1} jogadores de campo para formar 2 times com esta configuração.`,
            }, { status: 422 })
        }

        const jogadoresParaSorteio: JogadorParaSorteio[] = jogadoresConfirmados.map(mp => ({
            matchPlayerId: mp.id,
            userId: mp.user_id,
            guestPlayerId: mp.guest_player_id,
            nome: mp.users?.name ?? mp.guest_players?.name ?? 'Desconhecido',
            apelido: mp.users?.nickname ?? null,
            fotoUrl: mp.users?.photo_url ?? null,
            posicao: mp.users?.position ?? mp.guest_players?.position ?? null,
            overall: mp.users?.player_ratings?.overall ?? 5,
            ehGoleiro: mp.is_goalkeeper || (mp.users?.is_goalkeeper ?? false),
        }))

        const timesDistribuidos = distribuirJogadoresEmTimes(jogadoresParaSorteio, jogadoresPorTime)
        const quantidadeDeTimes = timesDistribuidos.length

        const nomesDosTime: string[] = body.team_names ??
            Array.from({ length: quantidadeDeTimes }, (_, i) => `Time ${LETRAS_TIME[i] ?? String(i + 1)}`)

        // Remove times anteriores e cria os novos — team_id nos jogadores só é salvo ao iniciar
        const timesCreados = await prisma.$transaction(async (tx) => {
            await tx.match_teams.deleteMany({ where: { match_id: matchId } })

            const criados: { id: string; indice: number }[] = []
            for (let i = 0; i < quantidadeDeTimes; i++) {
                const time = await tx.match_teams.create({
                    data: { match_id: matchId, team_name: nomesDosTime[i], team_index: i },
                })
                criados.push({ id: time.id, indice: i })
            }

            return criados
        })

        const timesComEstatisticas = timesDistribuidos.map((jogadores, indice) => {
            const jogadoresDeLinha = jogadores.filter(j => !j.ehGoleiro)
            const somaOverall = jogadoresDeLinha.reduce((soma, j) => soma + j.overall, 0)
            const overallMedio = jogadoresDeLinha.length > 0 ? somaOverall / jogadoresDeLinha.length : 0

            return {
                nome: nomesDosTime[indice],
                indice,
                overallMedio: Math.round(overallMedio * 10) / 10,
                jogadores,
                teamId: timesCreados[indice].id,
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
