import { prisma } from '@/config/prisma'

type TxClient = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>

type VotoResumido = {
  voted_user_id: string | null
  voted_guest_player_id: string | null
}

// Identifica quem recebeu mais votos; em empate retorna todos os primeiros colocados
function identificarVencedores(votos: VotoResumido[]) {
  if (votos.length === 0) return []

  const contagem = new Map<string, { user_id: string | null; guest_player_id: string | null; count: number }>()

  for (const voto of votos) {
    const chave = voto.voted_user_id ?? `g:${voto.voted_guest_player_id}`
    const entrada = contagem.get(chave) ?? {
      user_id: voto.voted_user_id,
      guest_player_id: voto.voted_guest_player_id,
      count: 0,
    }
    entrada.count++
    contagem.set(chave, entrada)
  }

  const lista = Array.from(contagem.values())
  const maxVotos = Math.max(...lista.map((e) => e.count))
  return lista.filter((e) => e.count === maxVotos)
}

// Registra o(s) MVP(s) da partida ao encerrar a votação.
// Idempotente: não faz nada se já houver registros para esta partida.
export async function registrarVencedoresMvpPartida(tx: TxClient, matchId: string) {
  const jaRegistrado = await tx.mvp_awards.count({ where: { match_id: matchId } })
  if (jaRegistrado > 0) return

  const votos = await tx.mvp_votes.findMany({
    where: { match_id: matchId },
    select: { voted_user_id: true, voted_guest_player_id: true },
  })

  const vencedores = identificarVencedores(votos)
  if (vencedores.length === 0) return

  const partida = await tx.matches.findUnique({
    where: { id: matchId },
    select: { match_date: true },
  })
  if (!partida) return

  const month = partida.match_date.getUTCMonth() + 1
  const year = partida.match_date.getUTCFullYear()

  await tx.mvp_awards.createMany({
    data: vencedores.map((v) => ({
      user_id: v.user_id,
      guest_player_id: v.guest_player_id,
      match_id: matchId,
      month,
      year,
      vote_count: v.count,
    })),
  })
}

// Registra o(s) MVP(s) do torneio ao encerrar a votação.
// Usa end_date do torneio para determinar mês/ano do prêmio.
// Idempotente: não faz nada se já houver registros para este torneio.
export async function registrarVencedoresMvpTorneio(tx: TxClient, tournamentId: string) {
  const jaRegistrado = await tx.mvp_awards.count({ where: { tournament_id: tournamentId } })
  if (jaRegistrado > 0) return

  const votos = await tx.tournament_mvp_votes.findMany({
    where: { tournament_id: tournamentId },
    select: { voted_user_id: true, voted_guest_player_id: true },
  })

  const vencedores = identificarVencedores(votos)
  if (vencedores.length === 0) return

  const torneio = await tx.tournaments.findUnique({
    where: { id: tournamentId },
    select: { end_date: true },
  })
  if (!torneio?.end_date) return

  const month = torneio.end_date.getUTCMonth() + 1
  const year = torneio.end_date.getUTCFullYear()

  await tx.mvp_awards.createMany({
    data: vencedores.map((v) => ({
      user_id: v.user_id,
      guest_player_id: v.guest_player_id,
      tournament_id: tournamentId,
      month,
      year,
      vote_count: v.count,
    })),
  })
}
