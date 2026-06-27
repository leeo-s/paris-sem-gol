import { prisma } from '@/config/prisma'
import { createServerSupabaseClient } from '@/config/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { buscarPerfilUsuario, ehAdminOuCoAdmin } from '../../../_lib/auth'
import { tratarErroPrisma } from '../../../_lib/prisma-errors'

const LETRAS_TIME = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

// Atributos individuais do jogador (ausentes em jogadores convidados)
interface AtributosJogador {
    velocidade: number
    finalizacao: number
    passe: number
    drible: number
    defesa: number
    fisico: number
}

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
    // Atributos detalhados — ausentes para convidados, que só têm overall
    atributos: AtributosJogador | null
}

// Pesos aleatórios para cada atributo, gerados uma vez por chamada de sorteio
interface PesosAtributos {
    velocidade: number
    finalizacao: number
    passe: number
    drible: number
    defesa: number
    fisico: number
}

// Embaralhamento in-place usando Fisher-Yates
function embaralharArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]
    }
}

// Gera pesos aleatórios entre 0.5 e 1.5 para cada atributo do sorteio
function gerarPesosAleatorios(): PesosAtributos {
    return {
        velocidade: 0.5 + Math.random(),
        finalizacao: 0.5 + Math.random(),
        passe: 0.5 + Math.random(),
        drible: 0.5 + Math.random(),
        defesa: 0.5 + Math.random(),
        fisico: 0.5 + Math.random(),
    }
}

// Calcula o overall efetivo do jogador aplicando os pesos do sorteio
// Jogadores convidados não têm atributos individuais: escala o overall pelo peso médio
function calcularOverallEfetivo(jogador: JogadorParaSorteio, pesos: PesosAtributos): number {
    if (!jogador.atributos) {
        const mediaDePesos = (
            pesos.velocidade + pesos.finalizacao + pesos.passe +
            pesos.drible + pesos.defesa + pesos.fisico
        ) / 6
        return jogador.overall * mediaDePesos
    }

    return (
        jogador.atributos.velocidade * pesos.velocidade +
        jogador.atributos.finalizacao * pesos.finalizacao +
        jogador.atributos.passe * pesos.passe +
        jogador.atributos.drible * pesos.drible +
        jogador.atributos.defesa * pesos.defesa +
        jogador.atributos.fisico * pesos.fisico
    )
}

// Distribui jogadores em times usando tier shuffle + snake draft
// Os pesos do sorteio determinam o overall efetivo (apenas para ordenação; exibição usa overall do banco)
function distribuirJogadoresEmTimes(
    jogadores: JogadorParaSorteio[],
    jogadoresPorTime: number,
    pesos: PesosAtributos,
): JogadorParaSorteio[][] {
    const goleiros = jogadores.filter(j => j.ehGoleiro)

    // Ordena jogadores de campo pelo overall efetivo (float, sem arredondar)
    const jogadoresDeLinha = [...jogadores.filter(j => !j.ehGoleiro)]
        .sort((a, b) => calcularOverallEfetivo(b, pesos) - calcularOverallEfetivo(a, pesos))

    const totalDeLinha = jogadoresDeLinha.length
    if (totalDeLinha === 0) return []

    const numTimesCompletos = Math.floor(totalDeLinha / jogadoresPorTime)
    const quantidadeRestante = totalDeLinha % jogadoresPorTime

    // Tier shuffle: embaralha dentro de cada faixa de overall antes do snake draft
    // Cada tier tem exatamente numTimesCompletos jogadores (um por time por rodada)
    for (let inicio = 0; inicio < numTimesCompletos * jogadoresPorTime; inicio += numTimesCompletos) {
        const tier = jogadoresDeLinha.slice(inicio, inicio + numTimesCompletos)
        embaralharArray(tier)
        for (let k = 0; k < tier.length; k++) {
            jogadoresDeLinha[inicio + k] = tier[k]
        }
    }

    const timesCompletos: JogadorParaSorteio[][] = Array.from({ length: numTimesCompletos }, () => [])

    // Snake draft: alterna direção a cada rodada para equilibrar os times
    for (let rodada = 0; rodada < jogadoresPorTime; rodada++) {
        const direcaoAFrente = rodada % 2 === 0
        for (let passo = 0; passo < numTimesCompletos; passo++) {
            const indiceTime = direcaoAFrente ? passo : numTimesCompletos - 1 - passo
            const indiceJogador = rodada * numTimesCompletos + passo
            timesCompletos[indiceTime].push(jogadoresDeLinha[indiceJogador])
        }
    }

    // Time extra com os jogadores restantes (quando totalDeLinha não é divisível)
    const times = [...timesCompletos]
    if (quantidadeRestante > 0) {
        times.push(jogadoresDeLinha.slice(numTimesCompletos * jogadoresPorTime))
    }

    // Distribui goleiros ciclicamente pelos times
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

// Seleção de colunas reutilizada nas consultas de jogadores confirmados
// Inclui os 6 atributos individuais para cálculo do overall efetivo no sorteio
const INCLUDE_JOGADORES = {
    users: {
        select: {
            id: true,
            name: true,
            nickname: true,
            photo_url: true,
            position: true,
            is_goalkeeper: true,
            player_ratings: {
                select: {
                    overall: true,
                    speed: true,
                    finishing: true,
                    passing: true,
                    dribbling: true,
                    defense: true,
                    physical: true,
                },
            },
        },
    },
    guest_players: { select: { id: true, name: true, position: true } },
} as const

// Converte um match_player do Prisma para o tipo JogadorParaSorteio
// Atributos individuais são mapeados apenas para jogadores cadastrados (não convidados)
function mapearMatchPlayer(mp: {
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
        player_ratings: {
            overall: number | null
            speed: number
            finishing: number
            passing: number
            dribbling: number
            defense: number
            physical: number
        } | null
    } | null
    guest_players?: { name: string; position: string | null } | null
}): JogadorParaSorteio {
    const ratings = mp.users?.player_ratings ?? null

    return {
        matchPlayerId: mp.id,
        userId: mp.user_id,
        guestPlayerId: mp.guest_player_id,
        nome: mp.users?.name ?? mp.guest_players?.name ?? 'Desconhecido',
        apelido: mp.users?.nickname ?? null,
        fotoUrl: mp.users?.photo_url ?? null,
        posicao: mp.users?.position ?? mp.guest_players?.position ?? null,
        // Overall do banco é usado na exibição; o overall efetivo é calculado no sorteio
        overall: ratings?.overall ?? 5,
        ehGoleiro: mp.is_goalkeeper || (mp.users?.is_goalkeeper ?? false),
        // Convidados não têm atributos individuais; calcularOverallEfetivo trata o null
        atributos: ratings
            ? {
                velocidade: ratings.speed,
                finalizacao: ratings.finishing,
                passe: ratings.passing,
                drible: ratings.dribbling,
                defesa: ratings.defense,
                fisico: ratings.physical,
            }
            : null,
    }
}

// Calcula o overall médio de jogadores de campo e monta o objeto de retorno de um time
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

// Cria os registros de match_teams no banco, apagando os anteriores
async function recriarTimesNoBanco(matchId: string, nomesDosTime: string[]) {
    return prisma.$transaction(async (tx) => {
        await tx.match_teams.deleteMany({ where: { match_id: matchId } })

        const criados: { id: string; indice: number }[] = []
        for (let i = 0; i < nomesDosTime.length; i++) {
            const time = await tx.match_teams.create({
                data: { match_id: matchId, team_name: nomesDosTime[i], team_index: i },
            })
            criados.push({ id: time.id, indice: i })
        }
        return criados
    })
}

// POST /api/matches/:id/draw — sorteia times equilibrados por overall e salva no banco
// Aceita manual_assignments para pular o sorteio e usar uma distribuição definida pelo usuário
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

        // Quando o usuário escolheu os times manualmente, pula o algoritmo de sorteio
        if (Array.isArray(body.manual_assignments) && body.manual_assignments.length > 0) {
            return await processarAtribuicaoManual(
                matchId,
                body.manual_assignments as { matchPlayerId: string; teamIndex: number }[],
            )
        }

        const jogadoresPorTime: number = body.players_per_team

        if (!jogadoresPorTime || jogadoresPorTime < 4 || jogadoresPorTime > 12) {
            return NextResponse.json(
                { error: 'Jogadores por time deve ser entre 4 e 12' },
                { status: 400 }
            )
        }

        const jogadoresConfirmados = await prisma.match_players.findMany({
            where: { match_id: matchId, confirmed: true },
            include: INCLUDE_JOGADORES,
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

        const jogadoresParaSorteio = jogadoresConfirmados.map(mapearMatchPlayer)

        // Gera pesos aleatórios uma vez por sorteio — garante resultados diferentes a cada chamada
        const pesosDoSorteio = gerarPesosAleatorios()
        const timesDistribuidos = distribuirJogadoresEmTimes(jogadoresParaSorteio, jogadoresPorTime, pesosDoSorteio)
        const quantidadeDeTimes = timesDistribuidos.length

        const nomesDosTime: string[] = body.team_names ??
            Array.from({ length: quantidadeDeTimes }, (_, i) => `Time ${LETRAS_TIME[i] ?? String(i + 1)}`)

        const timesCreados = await recriarTimesNoBanco(matchId, nomesDosTime)

        const timesComEstatisticas = timesDistribuidos.map((jogadores, indice) =>
            montarEstatisticasTime(jogadores, indice, nomesDosTime[indice], timesCreados[indice].id)
        )

        return NextResponse.json({ times: timesComEstatisticas })
    } catch (error) {
        const respostaPrisma = tratarErroPrisma(error)
        if (respostaPrisma) return respostaPrisma

        console.error('[POST /api/matches/:id/draw]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}

// Processa a distribuição manual: cria os times a partir das atribuições enviadas pelo cliente
async function processarAtribuicaoManual(
    matchId: string,
    atribuicoes: { matchPlayerId: string; teamIndex: number }[],
): Promise<NextResponse> {
    const jogadoresConfirmados = await prisma.match_players.findMany({
        where: { match_id: matchId, confirmed: true },
        include: INCLUDE_JOGADORES,
    })

    const jogadorPorId = new Map(jogadoresConfirmados.map(mp => [mp.id, mp]))

    // Determina quantos times existem a partir dos índices únicos enviados
    const indicesUnicos = [...new Set(atribuicoes.map(a => a.teamIndex))].sort((a, b) => a - b)
    const quantidadeDeTimes = indicesUnicos.length

    // Mapeia o índice original para um índice sequencial (0, 1, 2...)
    const mapaDeIndices = new Map(indicesUnicos.map((original, sequencial) => [original, sequencial]))

    const nomesDosTime = Array.from(
        { length: quantidadeDeTimes },
        (_, i) => `Time ${LETRAS_TIME[i] ?? String(i + 1)}`,
    )

    const timesCreados = await recriarTimesNoBanco(matchId, nomesDosTime)

    // Distribui cada jogador ao time correspondente
    const timesDistribuidos: JogadorParaSorteio[][] = Array.from({ length: quantidadeDeTimes }, () => [])

    for (const atribuicao of atribuicoes) {
        const mp = jogadorPorId.get(atribuicao.matchPlayerId)
        if (!mp) continue

        const indiceSequencial = mapaDeIndices.get(atribuicao.teamIndex)
        if (indiceSequencial === undefined) continue

        timesDistribuidos[indiceSequencial].push(mapearMatchPlayer(mp))
    }

    const timesComEstatisticas = timesDistribuidos.map((jogadores, indice) =>
        montarEstatisticasTime(jogadores, indice, nomesDosTime[indice], timesCreados[indice].id)
    )

    return NextResponse.json({ times: timesComEstatisticas })
}
