import { prisma } from '@/config/prisma'
import { createServerSupabaseClient } from '@/config/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { buscarPerfilUsuario, ehAdminOuCoAdmin } from '../../../_lib/auth'
import { tratarErroPrisma } from '../../../_lib/prisma-errors'

const LETRAS_TIME = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

interface JogadorParaSorteio {
    registrationId: string
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

// Distribui jogadores de campo em times equilibrados por overall (snake draft),
// depois distribui os goleiros sequencialmente pelos times formados
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

const INCLUDE_INSCRICOES = {
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
    guest_players: { select: { id: true, name: true, position: true, overall: true } },
} as const

function mapearInscricao(reg: {
    id: string
    user_id: string | null
    guest_player_id: string | null
    is_goalkeeper: boolean
    users?: {
        name: string
        nickname: string | null
        photo_url: string | null
        position: string | null
        is_goalkeeper: boolean
        player_ratings: { overall: number | null } | null
    } | null
    guest_players?: { name: string; position: string | null; overall: number } | null
}): JogadorParaSorteio {
    return {
        registrationId: reg.id,
        userId: reg.user_id,
        guestPlayerId: reg.guest_player_id,
        nome: reg.users?.name ?? reg.guest_players?.name ?? 'Desconhecido',
        apelido: reg.users?.nickname ?? null,
        fotoUrl: reg.users?.photo_url ?? null,
        posicao: reg.users?.position ?? reg.guest_players?.position ?? null,
        overall: reg.users?.player_ratings?.overall ?? reg.guest_players?.overall ?? 5,
        ehGoleiro: reg.is_goalkeeper || (reg.users?.is_goalkeeper ?? false),
    }
}

function montarEstatisticasTime(
    jogadores: JogadorParaSorteio[],
    indice: number,
    nome: string,
    teamId: string,
) {
    const jogadoresDeLinha = jogadores.filter(j => !j.ehGoleiro)
    const somaOverall = jogadoresDeLinha.reduce((soma, j) => soma + j.overall, 0)
    const overallMedio = jogadoresDeLinha.length > 0 ? somaOverall / jogadoresDeLinha.length : 0
    return {
        nome,
        indice,
        overallMedio: Math.round(overallMedio * 10) / 10,
        jogadores,
        teamId,
    }
}

// Recria todos os times do torneio em uma única transação, incluindo os jogadores de cada time
async function recriarEquipasNoBanco(
    tournamentId: string,
    nomesDosTime: string[],
    timesDistribuidos: JogadorParaSorteio[][],
) {
    return prisma.$transaction(async (tx) => {
        await tx.tournament_teams.deleteMany({ where: { tournament_id: tournamentId } })

        const resultado = []
        for (let i = 0; i < nomesDosTime.length; i++) {
            const time = await tx.tournament_teams.create({
                data: { tournament_id: tournamentId, team_name: nomesDosTime[i] },
            })

            const jogadores = timesDistribuidos[i] ?? []
            if (jogadores.length > 0) {
                await tx.tournament_team_players.createMany({
                    data: jogadores.map(jogador => ({
                        tournament_team_id: time.id,
                        user_id: jogador.userId,
                        guest_player_id: jogador.guestPlayerId,
                        is_goalkeeper: jogador.ehGoleiro,
                    })),
                })
            }

            resultado.push(montarEstatisticasTime(jogadores, i, nomesDosTime[i], time.id))
        }

        return resultado
    }, { timeout: 30000 })
}

// GET /api/tournaments/:id/draw — retorna inscrições formatadas para o modo manual
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

        const { id: tournamentId } = await params

        const inscricoes = await prisma.tournament_registrations.findMany({
            where: { tournament_id: tournamentId },
            include: INCLUDE_INSCRICOES,
            orderBy: { registered_at: 'asc' },
        })

        return NextResponse.json({ jogadores: inscricoes.map(mapearInscricao) })
    } catch (error) {
        console.error('[GET /api/tournaments/:id/draw]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}

// POST /api/tournaments/:id/draw — sorteia ou atribui manualmente os times do torneio
// Salva tournament_teams e tournament_team_players; não ativa o campeonato
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

        const { id: tournamentId } = await params
        const body = await request.json().catch(() => ({}))

        const campeonato = await prisma.tournaments.findUnique({
            where: { id: tournamentId },
            select: { status: true, squad_size: true },
        })

        if (!campeonato) {
            return NextResponse.json({ error: 'Campeonato não encontrado' }, { status: 404 })
        }

        if (campeonato.status !== 'registration') {
            return NextResponse.json({ error: 'O campeonato já foi iniciado' }, { status: 400 })
        }

        const inscricoes = await prisma.tournament_registrations.findMany({
            where: { tournament_id: tournamentId },
            include: INCLUDE_INSCRICOES,
        })

        if (inscricoes.length === 0) {
            return NextResponse.json({ error: 'Nenhum jogador inscrito no campeonato' }, { status: 422 })
        }

        const jogadoresParaSorteio = inscricoes.map(mapearInscricao)

        if (Array.isArray(body.manual_assignments) && body.manual_assignments.length > 0) {
            return await processarAtribuicaoManual(
                tournamentId,
                jogadoresParaSorteio,
                body.manual_assignments as { registrationId: string; teamIndex: number }[],
            )
        }

        const jogadoresPorTime = campeonato.squad_size
        const totalDeLinha = jogadoresParaSorteio.filter(j => !j.ehGoleiro).length

        if (totalDeLinha < jogadoresPorTime + 1) {
            return NextResponse.json({
                error: `São necessários ao menos ${jogadoresPorTime + 1} jogadores de campo para formar 2 times com ${jogadoresPorTime} por time.`,
            }, { status: 422 })
        }

        const timesDistribuidos = distribuirJogadoresEmTimes(jogadoresParaSorteio, jogadoresPorTime)
        const quantidadeDeTimes = timesDistribuidos.length

        const nomesDosTime = Array.from(
            { length: quantidadeDeTimes },
            (_, i) => `Time ${LETRAS_TIME[i] ?? String(i + 1)}`
        )

        const timesComEstatisticas = await recriarEquipasNoBanco(tournamentId, nomesDosTime, timesDistribuidos)

        return NextResponse.json({ times: timesComEstatisticas })
    } catch (error) {
        const respostaPrisma = tratarErroPrisma(error)
        if (respostaPrisma) return respostaPrisma

        console.error('[POST /api/tournaments/:id/draw]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}

async function processarAtribuicaoManual(
    tournamentId: string,
    todasInscricoes: JogadorParaSorteio[],
    atribuicoes: { registrationId: string; teamIndex: number }[],
): Promise<NextResponse> {
    const inscricaoPorId = new Map(todasInscricoes.map(j => [j.registrationId, j]))

    const indicesUnicos = [...new Set(atribuicoes.map(a => a.teamIndex))].sort((a, b) => a - b)
    const quantidadeDeTimes = indicesUnicos.length
    const mapaDeIndices = new Map(indicesUnicos.map((original, sequencial) => [original, sequencial]))

    const nomesDosTime = Array.from(
        { length: quantidadeDeTimes },
        (_, i) => `Time ${LETRAS_TIME[i] ?? String(i + 1)}`,
    )

    const timesDistribuidos: JogadorParaSorteio[][] = Array.from({ length: quantidadeDeTimes }, () => [])

    for (const atribuicao of atribuicoes) {
        const jogador = inscricaoPorId.get(atribuicao.registrationId)
        if (!jogador) continue

        const indiceSequencial = mapaDeIndices.get(atribuicao.teamIndex)
        if (indiceSequencial === undefined) continue

        timesDistribuidos[indiceSequencial].push(jogador)
    }

    const timesComEstatisticas = await recriarEquipasNoBanco(tournamentId, nomesDosTime, timesDistribuidos)

    return NextResponse.json({ times: timesComEstatisticas })
}
