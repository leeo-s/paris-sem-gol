import { prisma } from '@/config/prisma'
import { createServerSupabaseClient } from '@/config/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { buscarPerfilUsuario, ehAdminOuCoAdmin } from '../../../../../_lib/auth'
import type { Prisma } from '@/generated/prisma'

// ─── helpers de geração de bracket ──────────────────────────────────────────

function proximaPotenciaDe2(n: number): number {
    let p = 1
    while (p < n) p *= 2
    return p
}

function labelRodadaBracket(indice: number, total: number): string {
    const dist = total - 1 - indice
    switch (dist) {
        case 0: return 'Final'
        case 1: return 'Semifinal'
        case 2: return 'Quartas de Final'
        case 3: return 'Oitavas de Final'
        default: return `Rodada ${indice + 1}`
    }
}

type JogosBracket = {
    casaId: string | null
    casaNome: string
    visitaId: string | null
    visitaNome: string
}

type RodadaBracket = { rodada: number; jogos: JogosBracket[] }

// Gera estrutura do bracket de classificação.
// Top seeds recebem bye; seeding padrão: 1° vs N°, 2° vs (N-1)°, etc.
function gerarBracketClassificacao(times: { id: string; team_name: string }[]): RodadaBracket[] {
    const n = times.length
    if (n < 2) return []

    if (n === 2) {
        return [{ rodada: 1, jogos: [{ casaId: times[0].id, casaNome: times[0].team_name, visitaId: times[1].id, visitaNome: times[1].team_name }] }]
    }

    if (n === 3) {
        // 1° tem bye direto à Final; 2° vs 3° na Semi
        return [
            { rodada: 1, jogos: [{ casaId: times[1].id, casaNome: times[1].team_name, visitaId: times[2].id, visitaNome: times[2].team_name }] },
            { rodada: 2, jogos: [{ casaId: times[0].id, casaNome: times[0].team_name, visitaId: null, visitaNome: 'Vencedor Semifinal' }] },
        ]
    }

    if (n === 4) {
        // 1° vs 4° e 2° vs 3° na Semi
        return [
            {
                rodada: 1,
                jogos: [
                    { casaId: times[0].id, casaNome: times[0].team_name, visitaId: times[3].id, visitaNome: times[3].team_name },
                    { casaId: times[1].id, casaNome: times[1].team_name, visitaId: times[2].id, visitaNome: times[2].team_name },
                ],
            },
            { rodada: 2, jogos: [{ casaId: null, casaNome: 'Vencedor Semi 1', visitaId: null, visitaNome: 'Vencedor Semi 2' }] },
        ]
    }

    // Para N > 4: top seeds com bye, demais jogam na primeira rodada
    const targetSize = proximaPotenciaDe2(n)
    const numByes = targetSize - n
    const byeTeams = times.slice(0, numByes)
    const playingTeams = times.slice(numByes)

    const r1Jogos: JogosBracket[] = []
    for (let i = 0; i < Math.floor(playingTeams.length / 2); i++) {
        r1Jogos.push({
            casaId: playingTeams[i].id, casaNome: playingTeams[i].team_name,
            visitaId: playingTeams[playingTeams.length - 1 - i].id, visitaNome: playingTeams[playingTeams.length - 1 - i].team_name,
        })
    }

    const rodadas: RodadaBracket[] = [{ rodada: 1, jogos: r1Jogos }]

    let advancing = r1Jogos.length + byeTeams.length
    let num = 2
    while (advancing >= 2) {
        const numJogos = Math.floor(advancing / 2)
        rodadas.push({
            rodada: num,
            jogos: Array.from({ length: numJogos }, (_, i) => ({
                casaId: null, casaNome: `Classificado ${num - 1}.${i * 2 + 1}`,
                visitaId: null, visitaNome: `Classificado ${num - 1}.${i * 2 + 2}`,
            })),
        })
        advancing = Math.ceil(advancing / 2)
        num++
    }

    // Pre-fill slots das rodadas 2+ com os times bye nas posições corretas
    // Para N=5: byeTeams=[1°,2°,3°], r1Jogos=[4°v5°] → R2: 1° e winner(R1), 2°v3°
    if (byeTeams.length > 0 && rodadas.length > 1) {
        const r2 = rodadas[1]
        // Coloca o bye team de maior seed no segundo slot do primeiro jogo de R2
        // (reserva slot 0 para o winner de R1)
        for (let i = 0; i < byeTeams.length && i < r2.jogos.length; i++) {
            r2.jogos[r2.jogos.length - 1 - i].visitaId = byeTeams[i].id
            r2.jogos[r2.jogos.length - 1 - i].visitaNome = byeTeams[i].team_name
        }
    }

    return rodadas
}

// ─── helper: calcula placar de uma partida a partir dos gols salvos ──────────

function calcularPlacarMatch(match: {
    goals: { scorer_user_id: string | null; scorer_guest_id: string | null }[]
    match_players: { user_id: string | null; guest_player_id: string | null; team_id: string | null }[]
    match_teams: { id: string; team_index: number }[]
}): { homeScore: number; awayScore: number } {
    const playerTeamId = new Map<string, string>()
    for (const mp of match.match_players) {
        const pid = mp.user_id ?? mp.guest_player_id
        if (pid && mp.team_id) playerTeamId.set(pid, mp.team_id)
    }
    const teamIndexMap = new Map<string, number>()
    for (const mt of match.match_teams) teamIndexMap.set(mt.id, mt.team_index)
    let homeScore = 0, awayScore = 0
    for (const g of match.goals) {
        const pid = g.scorer_user_id ?? g.scorer_guest_id
        if (!pid) continue
        const teamId = playerTeamId.get(pid)
        if (!teamId) continue
        if (teamIndexMap.get(teamId) === 0) homeScore++
        else if (teamIndexMap.get(teamId) === 1) awayScore++
    }
    return { homeScore, awayScore }
}

// ─── lógica de avanço de bracket ────────────────────────────────────────────

async function avancarVencedorBracket(
    tx: Prisma.TransactionClient,
    stageId: string,
    bracketKey: string,
    vencedorMatchTeam: { tournament_team_id: string | null; team_name: string },
    bracketLegs: number = 1,
) {
    // Suporta chaves de ida (R1_M1) e volta (R1_M1_V)
    const isVolta = bracketKey.endsWith('_V')
    const baseKey = isVolta ? bracketKey.slice(0, -2) : bracketKey
    const match = baseKey.match(/^R(\d+)_M(\d+)/)
    if (!match) return

    const r = parseInt(match[1], 10)
    const m = parseInt(match[2], 10)
    const nextKey = `R${r + 1}_M${Math.ceil(m / 2)}`

    const proximaPartida = await tx.matches.findFirst({
        where: { tournament_stage_id: stageId, bracket_key: nextKey },
        include: { match_teams: { orderBy: { team_index: 'asc' } } },
    })

    if (!proximaPartida) return // Era a Final — campeão declarado externamente

    const posicaoFormula = (m - 1) % 2 // 0 para m ímpar, 1 para m par
    const teams = proximaPartida.match_teams

    // Usa a posição formulada; se já estiver ocupada, usa a outra
    const slotPreferido = teams.find((t) => t.team_index === posicaoFormula)
    const targetSlot = !slotPreferido?.tournament_team_id ? posicaoFormula : 1 - posicaoFormula
    const teamToUpdate = teams.find((t) => t.team_index === targetSlot)
    if (!teamToUpdate) return

    await tx.match_teams.update({
        where: { id: teamToUpdate.id },
        data: {
            tournament_team_id: vencedorMatchTeam.tournament_team_id,
            team_name: vencedorMatchTeam.team_name,
        },
    })

    // Para dois jogos: preenche também a partida de volta da próxima fase (posição invertida)
    if (bracketLegs === 2) {
        const proximaVolta = await tx.matches.findFirst({
            where: { tournament_stage_id: stageId, bracket_key: `${nextKey}_V` },
            include: { match_teams: { orderBy: { team_index: 'asc' } } },
        })
        if (proximaVolta) {
            const voltaTargetSlot = 1 - targetSlot
            const voltaTeam = proximaVolta.match_teams.find((t) => t.team_index === voltaTargetSlot)
            if (voltaTeam) {
                await tx.match_teams.update({
                    where: { id: voltaTeam.id },
                    data: {
                        tournament_team_id: vencedorMatchTeam.tournament_team_id,
                        team_name: vencedorMatchTeam.team_name,
                    },
                })
            }
        }
    }
}

// ─── abertura da votação MVP do torneio ──────────────────────────────────────

async function abrirVotacaoMvpTorneio(tx: Prisma.TransactionClient, tournamentId: string) {
    const sessaoExistente = await tx.tournament_mvp_voting_sessions.findUnique({
        where: { tournament_id: tournamentId },
    })
    if (sessaoExistente) return

    const stages = await tx.tournament_stages.findMany({
        where: { tournament_id: tournamentId },
        select: { id: true },
    })
    const stageIds = stages.map((s) => s.id)

    const matchesDoTorneio = await tx.matches.findMany({
        where: { tournament_stage_id: { in: stageIds } },
        select: { id: true },
    })
    const matchIdsDoTorneio = matchesDoTorneio.map((m) => m.id)

    const elegiveisRaw = await tx.match_players.groupBy({
        by: ['user_id'],
        where: { match_id: { in: matchIdsDoTorneio }, user_id: { not: null } },
    })

    await tx.tournament_mvp_voting_sessions.create({
        data: {
            tournament_id: tournamentId,
            eligible_voters: elegiveisRaw.length,
            closes_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
    })
}

// ─── lógica de conclusão de fase ─────────────────────────────────────────────

async function verificarEConcluirFase(
    tx: Prisma.TransactionClient,
    stageId: string,
    userId: string,
) {
    const fase = await tx.tournament_stages.findUnique({
        where: { id: stageId },
        include: {
            matches: { select: { id: true, status: true, bracket_key: true } },
            tournaments: { select: { id: true, settings: true, tournament_teams: { orderBy: [{ points: 'desc' }, { goals_for: 'desc' }] } } },
        },
    })
    if (!fase) return

    const partidas = fase.matches
    const todasConcluidas = partidas.every((p) => p.status === 'completed' || p.status === 'cancelled')
    if (!todasConcluidas) return

    const torneio = fase.tournaments
    const settings = (torneio.settings ?? {}) as { format?: string; qualifying_teams?: number }
    const formato = settings.format ?? 'league_only'
    const times = torneio.tournament_teams

    await tx.tournament_stages.update({ where: { id: stageId }, data: { status: 'finished' } })

    if (fase.type === 'league') {
        if (formato === 'league_only') {
            // Campeão = primeiro colocado na classificação
            const campeao = times[0]
            if (campeao) {
                await tx.tournaments.update({
                    where: { id: torneio.id },
                    data: { champion_team_id: campeao.id, status: 'finished' },
                })
                await abrirVotacaoMvpTorneio(tx, torneio.id)
            }
        } else if (formato === 'league_and_bracket') {
            // Gera partidas da fase mata-mata com os classificados
            const numClassificados = settings.qualifying_teams ?? Math.min(times.length, 4)
            const classificados = times.slice(0, numClassificados).map((t) => ({ id: t.id, team_name: t.team_name }))

            const faseBracket = await tx.tournament_stages.findFirst({
                where: { tournament_id: torneio.id, type: 'bracket', status: 'pending' },
                orderBy: { order: 'asc' },
            })
            if (!faseBracket) return

            const bracketLegsLiga = (faseBracket.settings as { legs?: number })?.legs ?? 1
            const dataBase = new Date()
            const rodadas = gerarBracketClassificacao(classificados)
            const totalRodadas = rodadas.length

            for (const { rodada, jogos } of rodadas) {
                const label = labelRodadaBracket(rodada - 1, totalRodadas)
                const labelIda = bracketLegsLiga === 2 ? `${label} (Ida)` : label

                for (let ij = 0; ij < jogos.length; ij++) {
                    const jogo = jogos[ij]
                    const partida = await tx.matches.create({
                        data: {
                            tournament_stage_id: faseBracket.id,
                            match_date: dataBase,
                            status: 'scheduled',
                            bracket_key: `R${rodada}_M${ij + 1}`,
                            round_label: labelIda,
                            created_by: userId,
                        },
                    })
                    await tx.match_teams.createMany({
                        data: [
                            { match_id: partida.id, team_name: jogo.casaNome, team_index: 0, tournament_team_id: jogo.casaId },
                            { match_id: partida.id, team_name: jogo.visitaNome, team_index: 1, tournament_team_id: jogo.visitaId },
                        ],
                    })

                    if (bracketLegsLiga === 2) {
                        const volta = await tx.matches.create({
                            data: {
                                tournament_stage_id: faseBracket.id,
                                match_date: dataBase,
                                status: 'scheduled',
                                bracket_key: `R${rodada}_M${ij + 1}_V`,
                                round_label: `${label} (Volta)`,
                                created_by: userId,
                            },
                        })
                        await tx.match_teams.createMany({
                            data: [
                                { match_id: volta.id, team_name: jogo.visitaNome, team_index: 0, tournament_team_id: jogo.visitaId },
                                { match_id: volta.id, team_name: jogo.casaNome, team_index: 1, tournament_team_id: jogo.casaId },
                            ],
                        })
                    }
                }
            }

            await tx.tournament_stages.update({ where: { id: faseBracket.id }, data: { status: 'active' } })
        }
    } else if (fase.type === 'bracket') {
        const bracketLegs = (fase.settings as { legs?: number })?.legs ?? 1

        if (bracketLegs === 2) {
            // Para dois jogos: campeão determinado pelo saldo agregado (ida + volta)
            const finalVolta = partidas
                .filter((p) => p.status === 'completed' && /^R\d+_M\d+_V$/.test(p.bracket_key ?? ''))
                .sort((a, b) => {
                    const ra = parseInt(a.bracket_key?.match(/^R(\d+)/)?.[1] ?? '0', 10)
                    const rb = parseInt(b.bracket_key?.match(/^R(\d+)/)?.[1] ?? '0', 10)
                    return rb - ra
                })[0]

            if (finalVolta) {
                const idaKey = finalVolta.bracket_key!.slice(0, -2)
                const [finalVoltaComTimes, finalIdaComTimes] = await Promise.all([
                    tx.matches.findUnique({
                        where: { id: finalVolta.id },
                        include: {
                            match_teams: { orderBy: { team_index: 'asc' } },
                            goals: { select: { scorer_user_id: true, scorer_guest_id: true } },
                            match_players: { select: { user_id: true, guest_player_id: true, team_id: true } },
                        },
                    }),
                    tx.matches.findFirst({
                        where: { tournament_stage_id: stageId, bracket_key: idaKey },
                        include: {
                            goals: { select: { scorer_user_id: true, scorer_guest_id: true } },
                            match_players: { select: { user_id: true, guest_player_id: true, team_id: true } },
                            match_teams: { orderBy: { team_index: 'asc' } },
                        },
                    }),
                ])

                if (finalVoltaComTimes && finalIdaComTimes) {
                    const { homeScore: voltaHome, awayScore: voltaAway } = calcularPlacarMatch(finalVoltaComTimes)
                    const { homeScore: idaHome, awayScore: idaAway } = calcularPlacarMatch(finalIdaComTimes)

                    // Time A = mandante da ida (index 0 na ida, index 1 na volta)
                    // Time B = visitante da ida (index 1 na ida, index 0 na volta)
                    const agregadoA = idaHome + voltaAway
                    const agregadoB = idaAway + voltaHome

                    let vencedorIndex: 0 | 1
                    if (agregadoA > agregadoB) {
                        vencedorIndex = 1 // Time A é index 1 na volta
                    } else if (agregadoB > agregadoA) {
                        vencedorIndex = 0 // Time B é index 0 na volta
                    } else {
                        const ph = finalVoltaComTimes.penalty_home_score ?? 0
                        const pa = finalVoltaComTimes.penalty_away_score ?? 0
                        vencedorIndex = ph >= pa ? 0 : 1
                    }

                    const vencedorTeam = finalVoltaComTimes.match_teams.find((t) => t.team_index === vencedorIndex)
                    if (vencedorTeam?.tournament_team_id) {
                        await tx.tournaments.update({
                            where: { id: torneio.id },
                            data: { champion_team_id: vencedorTeam.tournament_team_id, status: 'finished' },
                        })
                        await abrirVotacaoMvpTorneio(tx, torneio.id)
                    }
                }
            }
        } else {
            // Jogo único: campeão é o vencedor da Final
            const partidaFinal = partidas
                .filter((p) => p.status === 'completed' && p.bracket_key?.startsWith('R') && !p.bracket_key.endsWith('_V'))
                .sort((a, b) => {
                    const ra = parseInt(a.bracket_key?.match(/^R(\d+)/)?.[1] ?? '0', 10)
                    const rb = parseInt(b.bracket_key?.match(/^R(\d+)/)?.[1] ?? '0', 10)
                    return rb - ra
                })[0]

            if (partidaFinal) {
                const finalComTimes = await tx.matches.findUnique({
                    where: { id: partidaFinal.id },
                    include: {
                        match_teams: { orderBy: { team_index: 'asc' } },
                        goals: { select: { scorer_user_id: true, scorer_guest_id: true, match_id: true } },
                        match_players: { select: { user_id: true, guest_player_id: true, team_id: true } },
                    },
                })

                if (finalComTimes) {
                    const { homeScore: homeGoals, awayScore: awayGoals } = calcularPlacarMatch(finalComTimes)

                    let vencedorIndex: 0 | 1
                    if (homeGoals !== awayGoals) {
                        vencedorIndex = homeGoals > awayGoals ? 0 : 1
                    } else {
                        const ph = finalComTimes.penalty_home_score ?? 0
                        const pa = finalComTimes.penalty_away_score ?? 0
                        vencedorIndex = ph >= pa ? 0 : 1
                    }
                    const vencedorTeam = finalComTimes.match_teams.find((t) => t.team_index === vencedorIndex)
                    if (vencedorTeam?.tournament_team_id) {
                        await tx.tournaments.update({
                            where: { id: torneio.id },
                            data: { champion_team_id: vencedorTeam.tournament_team_id, status: 'finished' },
                        })
                        await abrirVotacaoMvpTorneio(tx, torneio.id)
                    }
                }
            }
        }
    }
}

// ─── handler principal ───────────────────────────────────────────────────────

// POST /api/tournaments/:id/matches/:matchId/finalize
// Salva gols, atualiza estatísticas, avança fase/bracket e finaliza a partida
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; matchId: string }> },
) {
    try {
        const supabase = await createServerSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const perfil = await buscarPerfilUsuario(user.id)
        if (!ehAdminOuCoAdmin(perfil?.role)) {
            return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
        }

        const { id: tournamentId, matchId } = await params
        const body = await request.json()
        const goals = (body.goals ?? []) as { userId?: string; guestPlayerId?: string; quantity: number }[]
        const penaltyHomeScore: number | null = body.penaltyHomeScore ?? null
        const penaltyAwayScore: number | null = body.penaltyAwayScore ?? null

        const partida = await prisma.matches.findUnique({
            where: { id: matchId },
            include: {
                tournament_stages: { select: { id: true, type: true, tournament_id: true, settings: true } },
                match_teams: { orderBy: { team_index: 'asc' } },
                match_players: {
                    select: { id: true, user_id: true, guest_player_id: true, team_id: true, is_goalkeeper: true },
                },
            },
        })

        if (!partida) return NextResponse.json({ error: 'Partida não encontrada' }, { status: 404 })
        if (partida.tournament_stages?.tournament_id !== tournamentId) {
            return NextResponse.json({ error: 'Partida não pertence a este torneio' }, { status: 404 })
        }
        if (partida.status === 'completed') {
            return NextResponse.json({ error: 'Partida já foi finalizada' }, { status: 422 })
        }

        const stageId = partida.tournament_stages!.id
        const stageType = partida.tournament_stages!.type
        const stageSettings = (partida.tournament_stages!.settings ?? {}) as { legs?: number }
        const bracketLegs = stageType === 'bracket' ? (stageSettings.legs ?? 1) : 1
        const isVolta = partida.bracket_key?.endsWith('_V') ?? false

        // Mapa: userId/guestPlayerId → team_id
        const playerTeamId = new Map<string, string>()
        for (const mp of partida.match_players) {
            const pid = mp.user_id ?? mp.guest_player_id
            if (pid && mp.team_id) playerTeamId.set(pid, mp.team_id)
        }

        // Mapa: match_team.id → team_index
        const teamIndexMap = new Map<string, number>()
        for (const mt of partida.match_teams) teamIndexMap.set(mt.id, mt.team_index)

        // Calcula placar a partir dos gols recebidos
        let homeScore = 0
        let awayScore = 0
        const goalsToInsert: { match_id: string; scorer_user_id: string | null; scorer_guest_id: string | null }[] = []

        for (const g of goals) {
            const pid = g.userId ?? g.guestPlayerId
            if (!pid || g.quantity <= 0) continue
            const teamId = playerTeamId.get(pid)
            if (teamId) {
                const idx = teamIndexMap.get(teamId) ?? -1
                if (idx === 0) homeScore += g.quantity
                else if (idx === 1) awayScore += g.quantity
            }
            for (let i = 0; i < g.quantity; i++) {
                goalsToInsert.push({
                    match_id: matchId,
                    scorer_user_id: g.userId ?? null,
                    scorer_guest_id: g.guestPlayerId ?? null,
                })
            }
        }

        // Identifica goleiros de cada time
        const goleirosCasa = partida.match_players.filter((mp) => {
            if (!mp.is_goalkeeper || !mp.team_id) return false
            return teamIndexMap.get(mp.team_id) === 0
        })
        const goleirosVisita = partida.match_players.filter((mp) => {
            if (!mp.is_goalkeeper || !mp.team_id) return false
            return teamIndexMap.get(mp.team_id) === 1
        })

        // IDs do tournament_team para atualizar estatísticas
        const homeMatchTeam = partida.match_teams.find((t) => t.team_index === 0)
        const awayMatchTeam = partida.match_teams.find((t) => t.team_index === 1)
        const homeTournamentTeamId = homeMatchTeam?.tournament_team_id
        const awayTournamentTeamId = awayMatchTeam?.tournament_team_id

        // Determina vencedor
        let vencedorIndex: 0 | 1 | 'empate' = 'empate'

        if (bracketLegs === 2 && !isVolta) {
            // Jogo de ida: qualquer resultado é válido, não avança vencedor ainda
            vencedorIndex = 'empate'
        } else if (bracketLegs === 2 && isVolta) {
            // Jogo de volta: decide pelo saldo agregado (ida + volta)
            const idaKey = partida.bracket_key!.slice(0, -2)
            const jogoIda = await prisma.matches.findFirst({
                where: { tournament_stage_id: stageId, bracket_key: idaKey },
                include: {
                    goals: { select: { scorer_user_id: true, scorer_guest_id: true } },
                    match_players: { select: { user_id: true, guest_player_id: true, team_id: true } },
                    match_teams: { orderBy: { team_index: 'asc' } },
                },
            })
            const { homeScore: idaHome, awayScore: idaAway } = jogoIda ? calcularPlacarMatch(jogoIda) : { homeScore: 0, awayScore: 0 }

            // Time A = mandante da ida (index 0 na ida = index 1 na volta)
            // Time B = visitante da ida (index 1 na ida = index 0 na volta)
            const agregadoA = idaHome + awayScore
            const agregadoB = idaAway + homeScore

            if (agregadoA > agregadoB) {
                vencedorIndex = 1 // Time A é index 1 na volta
            } else if (agregadoB > agregadoA) {
                vencedorIndex = 0 // Time B é index 0 na volta
            } else {
                // Agregado empatado: pênaltis da volta decidem
                if (penaltyHomeScore !== null && penaltyAwayScore !== null && penaltyHomeScore !== penaltyAwayScore) {
                    vencedorIndex = penaltyHomeScore > penaltyAwayScore ? 0 : 1
                } else {
                    return NextResponse.json(
                        { error: 'Saldo igual no agregado — disputa de pênaltis obrigatória com vencedor definido.' },
                        { status: 422 },
                    )
                }
            }
        } else {
            // Jogo único (bracket_legs === 1)
            if (homeScore > awayScore) vencedorIndex = 0
            else if (awayScore > homeScore) vencedorIndex = 1
            else if (stageType === 'bracket') {
                if (penaltyHomeScore !== null && penaltyAwayScore !== null && penaltyHomeScore !== penaltyAwayScore) {
                    vencedorIndex = penaltyHomeScore > penaltyAwayScore ? 0 : 1
                } else {
                    return NextResponse.json(
                        { error: 'Partidas empatadas no mata-mata requerem disputa de pênaltis com vencedor definido.' },
                        { status: 422 },
                    )
                }
            }
        }

        await prisma.$transaction(async (tx) => {
            // Substitui gols existentes desta partida
            await tx.goals.deleteMany({ where: { match_id: matchId } })
            if (goalsToInsert.length > 0) {
                await tx.goals.createMany({ data: goalsToInsert })
            }

            // Substitui gols sofridos existentes
            await tx.goals_conceded.deleteMany({ where: { match_id: matchId } })

            // Registra gols sofridos para os goleiros
            const gcInserts: { match_id: string; conceder_user_id: string | null; conceder_guest_id: string | null; amount: number }[] = []
            for (const gk of goleirosCasa) {
                if (awayScore > 0) {
                    gcInserts.push({ match_id: matchId, conceder_user_id: gk.user_id, conceder_guest_id: gk.guest_player_id, amount: awayScore })
                }
            }
            for (const gk of goleirosVisita) {
                if (homeScore > 0) {
                    gcInserts.push({ match_id: matchId, conceder_user_id: gk.user_id, conceder_guest_id: gk.guest_player_id, amount: homeScore })
                }
            }
            if (gcInserts.length > 0) {
                // Filtra registros de goleiro user duplicados (unique constraint)
                const seen = new Set<string>()
                const unique = gcInserts.filter((gc) => {
                    const key = gc.conceder_user_id ?? gc.conceder_guest_id ?? Math.random().toString()
                    if (seen.has(key)) return false
                    seen.add(key)
                    return true
                })
                await tx.goals_conceded.createMany({ data: unique, skipDuplicates: true })
            }

            // Marca partida como concluída
            await tx.matches.update({
                where: { id: matchId },
                data: {
                    status: 'completed',
                    penalty_home_score: penaltyHomeScore,
                    penalty_away_score: penaltyAwayScore,
                },
            })

            // Atualiza estatísticas dos tournament_teams apenas na fase de grupos (liga)
            // Partidas de mata-mata não afetam a tabela de classificação
            if (stageType === 'league') {
                if (homeTournamentTeamId) {
                    const homeData: Prisma.tournament_teamsUpdateInput = {
                        goals_for: { increment: homeScore },
                        goals_against: { increment: awayScore },
                    }
                    if (vencedorIndex === 0) { homeData.wins = { increment: 1 }; homeData.points = { increment: 3 } }
                    else if (vencedorIndex === 1) { homeData.losses = { increment: 1 } }
                    else { homeData.draws = { increment: 1 }; homeData.points = { increment: 1 } }
                    await tx.tournament_teams.update({ where: { id: homeTournamentTeamId }, data: homeData })
                }

                if (awayTournamentTeamId) {
                    const awayData: Prisma.tournament_teamsUpdateInput = {
                        goals_for: { increment: awayScore },
                        goals_against: { increment: homeScore },
                    }
                    if (vencedorIndex === 1) { awayData.wins = { increment: 1 }; awayData.points = { increment: 3 } }
                    else if (vencedorIndex === 0) { awayData.losses = { increment: 1 } }
                    else { awayData.draws = { increment: 1 }; awayData.points = { increment: 1 } }
                    await tx.tournament_teams.update({ where: { id: awayTournamentTeamId }, data: awayData })
                }
            }

            // Avança vencedor no bracket (se fase bracket e vencedor definido)
            if (stageType === 'bracket' && partida.bracket_key && vencedorIndex !== 'empate') {
                const vencedorMatchTeam = vencedorIndex === 0 ? homeMatchTeam : awayMatchTeam
                if (vencedorMatchTeam) {
                    await avancarVencedorBracket(tx, stageId, partida.bracket_key, {
                        tournament_team_id: vencedorMatchTeam.tournament_team_id,
                        team_name: vencedorMatchTeam.team_name,
                    }, bracketLegs)
                }
            }

            // Verifica se a fase foi concluída e processa avanço
            await verificarEConcluirFase(tx, stageId, user.id)
        }, { timeout: 30000 })

        return NextResponse.json({ ok: true, homeScore, awayScore })
    } catch (error) {
        console.error('[POST /api/tournaments/:id/matches/:matchId/finalize]', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
