import { redirect } from "next/navigation"
import { prisma } from "@/config/prisma"
import { createServerSupabaseClient } from "@/config/supabase/server"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { PlayerAvatar } from "@/components/PlayerAvatar"
import { cn } from "@/lib/utils"
import {
  MapPin,
  Users2,
  Shuffle,
  Trophy,
  Cake,
  Flame,
  Target,
  Calendar,
  Star,
  Banknote,
  ShieldAlert,
} from "lucide-react"

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmt(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

function monthName(m: number) {
  return new Date(2000, m - 1).toLocaleDateString("pt-BR", { month: "long" })
}

function monthAbbr(m: number) {
  return new Date(2000, m - 1)
    .toLocaleDateString("pt-BR", { month: "short" })
    .replace(".", "")
    .toUpperCase()
}

function calcAge(birthDate: Date) {
  const today = new Date()
  const b = new Date(birthDate)
  let a = today.getFullYear() - b.getFullYear()
  if (today < new Date(today.getFullYear(), b.getMonth(), b.getDate())) a--
  return a
}

function dName(name: string, nickname: string | null) {
  return nickname ?? name
}

// ─── types ────────────────────────────────────────────────────────────────────

type PlayerProfile = {
  id: string
  name: string
  nickname: string | null
  photo_url: string | null
  position?: string | null
}

// ─── sub-components ───────────────────────────────────────────────────────────

function ProximaPartidaCard({
  match,
}: {
  match: {
    match_date: Date
    location: string | null
    status: string
    match_players: { id: string }[]
  } | null
}) {
  if (!match) {
    return (
      <Card className="bg-primary text-primary-foreground border-none">
        <CardContent className="p-5">
          <p className="text-[10px] uppercase tracking-widest text-primary-foreground/50 mb-1">
            Próxima Partida
          </p>
          <p className="text-sm text-primary-foreground/70">
            Nenhuma partida agendada
          </p>
        </CardContent>
      </Card>
    )
  }

  const d = new Date(match.match_date)
  const day = d.getUTCDate().toString().padStart(2, "0")
  const mon = monthAbbr(d.getUTCMonth() + 1)
  const playerCount = match.match_players.length

  return (
    <Card className="bg-primary text-primary-foreground border-none">
      <CardContent className="p-4 md:p-5">
        <div className="flex items-center gap-4">
          {/* Date box */}
          <div className="flex flex-col items-center justify-center rounded-xl bg-sidebar-accent px-4 py-2.5 shrink-0 min-w-[60px] text-center">
            <span className="font-heading text-3xl leading-none text-primary-foreground">
              {day}
            </span>
            <span className="text-[10px] uppercase tracking-wide text-primary-foreground/70 mt-0.5">
              {mon}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-0.5">
              <p className="text-[10px] uppercase tracking-widest text-primary-foreground/50">
                Próxima Partida
              </p>
              <Badge className="bg-accent text-accent-foreground text-[10px] shrink-0">
                Em Aberto
              </Badge>
            </div>
            <h2 className="font-heading text-xl md:text-2xl leading-tight text-primary-foreground">
              Pelada Semanal
            </h2>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              {match.location && (
                <span className="flex items-center gap-1 text-xs text-primary-foreground/60">
                  <MapPin className="size-3" />
                  {match.location}
                </span>
              )}
              {playerCount > 0 && (
                <span className="flex items-center gap-1 text-xs text-primary-foreground/60">
                  <Users2 className="size-3" />
                  {playerCount} jogadores
                </span>
              )}
            </div>
          </div>

          {/* Desktop button */}
          <Button
            size="sm"
            variant="outline"
            className="hidden sm:flex border-primary-foreground/25 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground gap-1.5 shrink-0"
          >
            <Shuffle className="size-3.5" />
            Sortear Times
          </Button>
        </div>

        {/* Mobile button */}
        <Button
          size="sm"
          variant="outline"
          className="sm:hidden mt-3 w-full border-primary-foreground/25 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground gap-1.5"
        >
          <Shuffle className="size-3.5" />
          Sortear Times
        </Button>
      </CardContent>
    </Card>
  )
}

function MvpCard({
  mvp,
  wins,
  mes,
}: {
  mvp: { jogador: PlayerProfile | undefined; votos: number } | null
  wins: number
  mes: number
}) {
  const mon = monthAbbr(mes)
  const monFull =
    monthName(mes).charAt(0).toUpperCase() + monthName(mes).slice(1)

  return (
    <Card className="bg-accent border-none">
      <CardContent className="p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-2">
              <Trophy className="size-3.5 text-accent-foreground/70" />
              <span className="text-[10px] font-medium uppercase tracking-widest text-accent-foreground/60">
                MVP do Mês · {mon}
              </span>
            </div>

            {mvp?.jogador ? (
              <>
                <h3 className="font-heading text-2xl md:text-3xl text-accent-foreground leading-none truncate">
                  {dName(mvp.jogador.name, mvp.jogador.nickname)}
                </h3>
                <p className="text-sm text-accent-foreground/70 mt-1.5">
                  {wins > 0
                    ? `${wins}× Craque da Partida em ${monFull}`
                    : `${mvp.votos} votos este mês`}
                </p>
              </>
            ) : (
              <p className="text-sm text-accent-foreground/60 mt-1">
                Nenhum MVP registrado
              </p>
            )}
          </div>

          {mvp && (
            <div className="flex items-center justify-center rounded-full size-14 bg-accent-foreground/15 shrink-0">
              <span className="font-heading text-2xl text-accent-foreground leading-none">
                {mvp.votos}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function SaldoCard({
  financeiro,
  mes,
  ano,
}: {
  financeiro: {
    saldo: number
    totalEntradas: number
    entradasMes: number
    saidasMes: number
  }
  mes: number
  ano: number
}) {
  const monCap =
    monthName(mes).charAt(0).toUpperCase() + monthName(mes).slice(1)

  return (
    <Card>
      <CardContent className="p-4 md:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Banknote className="size-3.5 text-muted-foreground" />
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Saldo Financeiro
          </span>
        </div>

        <p className="font-heading text-3xl md:text-4xl text-foreground leading-none">
          {fmt(financeiro.saldo)}
        </p>

        <p className="text-xs text-muted-foreground mt-1.5 mb-3">
          {monCap} {ano}
          {financeiro.totalEntradas > 0 && (
            <> · Caixa total: {fmt(financeiro.totalEntradas)}</>
          )}
        </p>

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center text-xs bg-success/10 text-success px-2.5 py-1 rounded-full font-medium">
            ↑ {fmt(financeiro.entradasMes)} receitas
          </span>
          <span className="inline-flex items-center text-xs bg-destructive/10 text-destructive px-2.5 py-1 rounded-full font-medium">
            ↓ {fmt(financeiro.saidasMes)} despesas
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

function AniversariantesCard({
  aniversariantes,
  mes,
}: {
  aniversariantes: Array<{
    id: string
    name: string
    nickname: string | null
    photo_url: string | null
    birth_date: Date | null
    ehHoje: boolean
  }>
  mes: number
}) {
  const mon = monthAbbr(mes)

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center gap-2">
          <Cake className="size-3.5 text-muted-foreground" />
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Aniversariantes · {mon}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {aniversariantes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum aniversariante neste mês
          </p>
        ) : (
          <div className="space-y-3">
            {aniversariantes.map((j) => (
              <div key={j.id} className="flex items-center gap-3">
                <PlayerAvatar
                  name={j.name}
                  src={j.photo_url ?? undefined}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground leading-none truncate">
                    {dName(j.name, j.nickname)}
                    {j.ehHoje && " 🎂"}
                  </p>
                  {j.birth_date && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(j.birth_date).getUTCDate()} de{" "}
                      {monthName(new Date(j.birth_date).getUTCMonth() + 1)} ·{" "}
                      {calcAge(j.birth_date)} anos
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function ArtilheirosCard({
  data,
  titulo,
  iconType,
}: {
  data: Array<{ jogador: PlayerProfile | undefined; gols: number }>
  titulo: string
  iconType: "flame" | "target"
}) {
  const maxGols = data[0]?.gols ?? 1
  const Icon = iconType === "flame" ? Flame : Target

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center gap-2">
          <Icon className="size-3.5 text-muted-foreground" />
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            {titulo}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem dados disponíveis</p>
        ) : (
          <div className="space-y-3">
            {data.map((item, index) =>
              item.jogador ? (
                <div key={item.jogador.id} className="flex items-center gap-2.5">
                  <span className="font-heading text-sm text-muted-foreground w-4 shrink-0 leading-none">
                    {index + 1}
                  </span>
                  <PlayerAvatar
                    name={item.jogador.name}
                    src={item.jogador.photo_url ?? undefined}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground leading-none truncate">
                      {dName(item.jogador.name, item.jogador.nickname)}
                    </p>
                    {item.jogador.position && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {item.jogador.position}
                      </p>
                    )}
                    <Progress
                      value={Math.round((item.gols / maxGols) * 100)}
                      className="mt-1.5"
                    />
                  </div>
                  <span className="font-heading text-base text-foreground shrink-0 min-w-[20px] text-right leading-none">
                    {item.gols}
                  </span>
                </div>
              ) : null
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function GoleirosCard({
  data,
  mes,
}: {
  data: Array<{
    jogador: PlayerProfile | undefined
    totalGolsSofridos: number
    partidas: number
    mediaPorPartida: number
  }>
  mes: number
}) {
  const mon = monthAbbr(mes)
  const maxGols = Math.max(...data.map((g) => g.totalGolsSofridos), 1)

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="size-3.5 text-muted-foreground" />
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Goleiros · Gols Sofridos
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem dados disponíveis</p>
        ) : (
          <div className="space-y-4">
            {data.map((g) =>
              g.jogador ? (
                <div key={g.jogador.id} className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <PlayerAvatar
                      name={g.jogador.name}
                      src={g.jogador.photo_url ?? undefined}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground leading-none truncate">
                        {dName(g.jogador.name, g.jogador.nickname)}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {mon} · {g.partidas} jogo{g.partidas !== 1 ? "s" : ""}{" "}
                        · média: {g.mediaPorPartida.toFixed(1)}/jogo
                      </p>
                    </div>
                    <span className="font-heading text-xl text-foreground shrink-0">
                      {g.totalGolsSofridos}
                    </span>
                  </div>
                  {/* Color-coded bar: fewer goals = green, more = red */}
                  <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        g.mediaPorPartida <= 1.5
                          ? "bg-success"
                          : g.mediaPorPartida <= 2.5
                          ? "bg-warning"
                          : "bg-destructive"
                      )}
                      style={{
                        width: `${Math.round((g.totalGolsSofridos / maxGols) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ) : null
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function PartidasMvpCard({
  partidas,
  mes,
}: {
  partidas: Array<{
    data: Date
    local: string | null
    mvp: PlayerProfile | null
    votos: number
  }>
  mes: number
}) {
  const mon = monthAbbr(mes)

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center gap-2">
          <Star className="size-3.5 text-muted-foreground" />
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Partidas com MVP · {mon}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {partidas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma partida com MVP encerrada neste mês
          </p>
        ) : (
          <div className="space-y-3">
            {partidas.map((p, i) => {
              const d = new Date(p.data)
              const dateStr = `${d.getUTCDate().toString().padStart(2, "0")}/${(
                d.getUTCMonth() + 1
              )
                .toString()
                .padStart(2, "0")}/${d.getUTCFullYear()}`

              return (
                <div
                  key={i}
                  className="rounded-xl border border-border p-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      {dateStr}
                      {p.local && ` · ${p.local}`}
                    </span>
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      Encerrada
                    </Badge>
                  </div>
                  {p.mvp && (
                    <div className="flex items-center gap-2 bg-accent/15 rounded-lg px-2.5 py-1.5">
                      <Star
                        className="size-3 text-accent shrink-0"
                        fill="currentColor"
                      />
                      <span className="text-xs font-medium text-foreground truncate">
                        MVP: {dName(p.mvp.name, p.mvp.nickname)}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto shrink-0">
                        {p.votos} votos
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function PresencasCard({
  data,
  mes,
  totalPartidas,
}: {
  data: Array<{
    jogador: PlayerProfile | undefined
    presencas: number
    percentual: number
  }>
  mes: number
  totalPartidas: number
}) {
  const mon = monthAbbr(mes)

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center gap-2">
          <Calendar className="size-3.5 text-muted-foreground" />
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Presenças · {mon}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem dados disponíveis</p>
        ) : (
          <div className="space-y-3">
            {data.map((item, index) =>
              item.jogador ? (
                <div
                  key={item.jogador.id}
                  className="flex items-center gap-2.5"
                >
                  <span className="font-heading text-sm text-muted-foreground w-4 shrink-0 leading-none">
                    {index + 1}
                  </span>
                  <PlayerAvatar
                    name={item.jogador.name}
                    src={item.jogador.photo_url ?? undefined}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground leading-none truncate">
                      {dName(item.jogador.name, item.jogador.nickname)}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {item.presencas} de {totalPartidas} partida
                      {totalPartidas !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-sm font-semibold shrink-0",
                      item.percentual === 100
                        ? "text-success"
                        : item.percentual >= 75
                        ? "text-foreground"
                        : item.percentual >= 50
                        ? "text-warning"
                        : "text-destructive"
                    )}
                  >
                    {item.percentual}%
                  </span>
                </div>
              ) : null
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────

export const metadata = {
  title: "Dashboard",
}

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const today = new Date()
  const mes = today.getMonth() + 1
  const ano = today.getFullYear()
  const inicioDoPeriodo = new Date(ano, mes - 1, 1)
  const fimDoPeriodo = new Date(ano, mes, 0, 23, 59, 59)

  const [
    artilheirosDoMesRaw,
    artilheirosTemporadaRaw,
    goleirosRaw,
    presencasRaw,
    mvpRaw,
    proximaPartida,
    aniversariantesRaw,
    financeiro,
    partidasComMvpRaw,
    totalPartidasDoMes,
  ] = await Promise.all([
    // Top scorers of the month
    prisma.goals.groupBy({
      by: ["scorer_user_id"],
      where: {
        scorer_user_id: { not: null },
        matches: {
          match_date: { gte: inicioDoPeriodo, lte: fimDoPeriodo },
          status: "completed",
        },
      },
      _count: { scorer_user_id: true },
      orderBy: { _count: { scorer_user_id: "desc" } },
      take: 5,
    }),

    // Top scorers of the season
    prisma.goals.groupBy({
      by: ["scorer_user_id"],
      where: {
        scorer_user_id: { not: null },
        matches: {
          match_date: {
            gte: new Date(ano, 0, 1),
            lte: new Date(ano, 11, 31, 23, 59, 59),
          },
          status: "completed",
        },
      },
      _count: { scorer_user_id: true },
      orderBy: { _count: { scorer_user_id: "desc" } },
      take: 5,
    }),

    // Goalkeepers — fewest goals conceded
    prisma.goals_conceded.groupBy({
      by: ["conceder_user_id"],
      where: {
        conceder_user_id: { not: null },
        matches: {
          match_date: { gte: inicioDoPeriodo, lte: fimDoPeriodo },
          status: "completed",
        },
      },
      _sum: { amount: true },
      _count: { match_id: true },
      orderBy: { _sum: { amount: "asc" } },
      take: 3,
    }),

    // Most present players
    prisma.match_players.groupBy({
      by: ["user_id"],
      where: {
        user_id: { not: null },
        matches: {
          match_date: { gte: inicioDoPeriodo, lte: fimDoPeriodo },
          status: "completed",
        },
      },
      _count: { match_id: true },
      orderBy: { _count: { match_id: "desc" } },
      take: 8,
    }),

    // MVP of the month (most votes across all matches)
    prisma.mvp_votes.groupBy({
      by: ["voted_user_id"],
      where: {
        matches: {
          match_date: { gte: inicioDoPeriodo, lte: fimDoPeriodo },
        },
      },
      _count: { voted_user_id: true },
      orderBy: { _count: { voted_user_id: "desc" } },
      take: 1,
    }),

    // Next scheduled match
    prisma.matches.findFirst({
      where: { status: "scheduled", match_date: { gte: new Date() } },
      orderBy: { match_date: "asc" },
      include: { match_players: { select: { id: true } } },
    }),

    // All active users with birth dates
    prisma.users.findMany({
      where: { is_active: true, birth_date: { not: null } },
      select: {
        id: true,
        name: true,
        nickname: true,
        photo_url: true,
        birth_date: true,
      },
    }),

    // Financial summary
    Promise.all([
      prisma.financial_transactions.aggregate({
        _sum: { amount: true },
        where: { type: "income" },
      }),
      prisma.financial_transactions.aggregate({
        _sum: { amount: true },
        where: { type: "expense" },
      }),
      prisma.financial_transactions.aggregate({
        _sum: { amount: true },
        where: {
          type: "income",
          reference_date: { gte: inicioDoPeriodo, lte: fimDoPeriodo },
        },
      }),
      prisma.financial_transactions.aggregate({
        _sum: { amount: true },
        where: {
          type: "expense",
          reference_date: { gte: inicioDoPeriodo, lte: fimDoPeriodo },
        },
      }),
    ]).then(([entradas, saidas, entradasMes, saidasMes]) => ({
      saldo:
        Number(entradas._sum.amount ?? 0) - Number(saidas._sum.amount ?? 0),
      totalEntradas: Number(entradas._sum.amount ?? 0),
      entradasMes: Number(entradasMes._sum.amount ?? 0),
      saidasMes: Number(saidasMes._sum.amount ?? 0),
    })),

    // Completed matches with closed MVP sessions
    prisma.matches.findMany({
      where: {
        status: "completed",
        match_date: { gte: inicioDoPeriodo, lte: fimDoPeriodo },
        mvp_voting_sessions: { is_closed: true },
      },
      select: {
        id: true,
        match_date: true,
        location: true,
        mvp_votes: {
          select: {
            voted_user_id: true,
            users_mvp_votes_voted_user_idTousers: {
              select: { id: true, name: true, nickname: true, photo_url: true },
            },
          },
        },
      },
      orderBy: { match_date: "desc" },
    }),

    // Total completed matches in the month
    prisma.matches.count({
      where: {
        status: "completed",
        match_date: { gte: inicioDoPeriodo, lte: fimDoPeriodo },
      },
    }),
  ])

  // ── Fetch player profiles in one batch ───────────────────────────────────
  const allUserIds = [
    ...artilheirosDoMesRaw.map((a) => a.scorer_user_id!),
    ...artilheirosTemporadaRaw.map((a) => a.scorer_user_id!),
    ...goleirosRaw.map((g) => g.conceder_user_id!),
    ...presencasRaw.map((p) => p.user_id!),
    ...(mvpRaw[0] ? [mvpRaw[0].voted_user_id] : []),
  ]

  const profiles = await prisma.users.findMany({
    where: { id: { in: [...new Set(allUserIds)] } },
    select: {
      id: true,
      name: true,
      nickname: true,
      photo_url: true,
      position: true,
    },
  })
  const pm = Object.fromEntries(profiles.map((p) => [p.id, p]))

  // ── Process data ─────────────────────────────────────────────────────────
  const artilheirosDoMes = artilheirosDoMesRaw.map((a) => ({
    jogador: pm[a.scorer_user_id!] as PlayerProfile | undefined,
    gols: a._count.scorer_user_id,
  }))

  const artilheirosTemporada = artilheirosTemporadaRaw.map((a) => ({
    jogador: pm[a.scorer_user_id!] as PlayerProfile | undefined,
    gols: a._count.scorer_user_id,
  }))

  const goleiros = goleirosRaw.map((g) => ({
    jogador: pm[g.conceder_user_id!] as PlayerProfile | undefined,
    totalGolsSofridos: Number(g._sum.amount ?? 0),
    partidas: g._count.match_id,
    mediaPorPartida:
      g._count.match_id > 0
        ? Math.round(
            (Number(g._sum.amount ?? 0) / g._count.match_id) * 10
          ) / 10
        : 0,
  }))

  const presencas = presencasRaw.map((p) => ({
    jogador: pm[p.user_id!] as PlayerProfile | undefined,
    presencas: p._count.match_id,
    percentual:
      totalPartidasDoMes > 0
        ? Math.round((p._count.match_id / totalPartidasDoMes) * 100)
        : 0,
  }))

  const mvpDoMes = mvpRaw[0]
    ? {
        jogador: pm[mvpRaw[0].voted_user_id] as PlayerProfile | undefined,
        votos: mvpRaw[0]._count.voted_user_id,
      }
    : null

  // Birthday players for the current month
  const aniversariantes = aniversariantesRaw
    .filter(
      (j) => j.birth_date && new Date(j.birth_date).getUTCMonth() === mes - 1
    )
    .map((j) => ({
      ...j,
      ehHoje: j.birth_date
        ? new Date(j.birth_date).getUTCDate() === today.getDate() &&
          new Date(j.birth_date).getUTCMonth() === today.getMonth()
        : false,
    }))
    .sort((a, b) => {
      const da = a.birth_date ? new Date(a.birth_date).getUTCDate() : 0
      const db = b.birth_date ? new Date(b.birth_date).getUTCDate() : 0
      return da - db
    })

  // Compute match-level MVPs from vote tallies
  const partidasComMvp = partidasComMvpRaw.map((partida) => {
    const tally: Record<
      string,
      {
        votos: number
        jogador: {
          id: string
          name: string
          nickname: string | null
          photo_url: string | null
        }
      }
    > = {}

    partida.mvp_votes.forEach((voto) => {
      const id = voto.voted_user_id
      if (!tally[id]) {
        tally[id] = {
          votos: 0,
          jogador: voto.users_mvp_votes_voted_user_idTousers,
        }
      }
      tally[id].votos++
    })

    const winner =
      Object.values(tally).sort((a, b) => b.votos - a.votos)[0] ?? null

    return {
      data: partida.match_date,
      local: partida.location,
      mvp: winner?.jogador ?? null,
      votos: winner?.votos ?? 0,
    }
  })

  // Count individual match MVP wins for the monthly MVP player
  const mvpWins = mvpDoMes?.jogador
    ? partidasComMvp.filter((p) => p.mvp?.id === mvpDoMes.jogador!.id).length
    : 0

  const monName = monthName(mes)
  const monCap = monName.charAt(0).toUpperCase() + monName.slice(1)

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Próxima Partida */}
      <ProximaPartidaCard match={proximaPartida} />

      {/* Row 2: MVP · Saldo · Aniversariantes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <MvpCard mvp={mvpDoMes} wins={mvpWins} mes={mes} />
        <SaldoCard financeiro={financeiro} mes={mes} ano={ano} />
        <AniversariantesCard aniversariantes={aniversariantes} mes={mes} />
      </div>

      {/* Row 3: Artilheiros Mês · Artilheiros Temporada · Goleiros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <ArtilheirosCard
          data={artilheirosDoMes}
          titulo={`Artilheiros · ${monCap}`}
          iconType="flame"
        />
        <ArtilheirosCard
          data={artilheirosTemporada}
          titulo={`Artilheiros · ${ano}`}
          iconType="target"
        />
        <GoleirosCard data={goleiros} mes={mes} />
      </div>

      {/* Row 4: Partidas com MVP · Presenças */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
        <PartidasMvpCard partidas={partidasComMvp} mes={mes} />
        <PresencasCard
          data={presencas}
          mes={mes}
          totalPartidas={totalPartidasDoMes}
        />
      </div>
    </div>
  )
}
