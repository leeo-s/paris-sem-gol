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
    registrationId: string
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

// Seleção de colunas reutilizada nas consultas de inscrições do torneio
// Inclui os 6 atributos individuais para cálculo do overall efetivo no sorteio
const INCLUDE_INSCRICOES = {
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
    guest_players: { select: { id: true, name: true, position: true, overall: true } },
} as const

// Converte uma inscrição do Prisma para o tipo JogadorParaSorteio
// Atributos individuais são mapeados apenas para jogadores cadastrados (não convidados)
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
    guest_players?: { name: string; position: string | null; overall: number } | null
}): JogadorParaSorteio {
    const ratings = reg.users?.player_ratings ?? null

    return {
        registrationId: reg.id,
        userId: reg.user_id,
        guestPlayerId: reg.guest_player_id,
        nome: reg.users?.name ?? reg.guest_players?.name ?? 'Desconhecido',
        apelido: reg.users?.nickname ?? null,
        fotoUrl: reg.users?.photo_url ?? null,
        posicao: reg.users?.position ?? reg.guest_players?.position ?? null,
        // Overall do banco é usado na exibição; o overall efetivo é calculado no sorteio
        overall: ratings?.overall ?? reg.guest_players?.overall ?? 5,
        ehGoleiro: reg.is_goalkeeper || (reg.users?.is_goalkeeper ?? false),
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

        // Gera pesos aleatórios uma vez por sorteio — garante resultados diferentes a cada chamada
        const pesosDoSorteio = gerarPesosAleatorios()
        const timesDistribuidos = distribuirJogadoresEmTimes(jogadoresParaSorteio, jogadoresPorTime, pesosDoSorteio)
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
