"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Trophy,
  Crown,
  MapPin,
  Calendar,
  Users,
  Star,
  GitBranch,
  BarChart3,
  Layers,
  Target,
  Shield,
  UserMinus,
  UserRoundPlus,
  Plus,
  Minus,
  Phone,
  Check,
  Save,
  Play,
  Swords,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// ─── tipos ────────────────────────────────────────────────────────────────────

type StatusTorneio = "registration" | "active" | "finished" | "cancelled";
type FormatoCompetição = "league_only" | "bracket_only" | "league_and_bracket";
type StatusPartida = "scheduled" | "started" | "completed" | "cancelled";

type TournamentSettings = {
  format?: FormatoCompetição;
  league_legs?: 1 | 2;
  bracket_legs?: 1 | 2;
  qualifying_teams?: number;
};

type UsuarioResumo = {
  id: string;
  name: string;
  nickname: string | null;
  photo_url: string | null;
  is_goalkeeper: boolean;
  position: string | null;
  player_ratings: { overall: number | null } | null;
};

type GuestResumo = {
  id: string;
  name: string;
  is_goalkeeper: boolean;
  position: string | null;
  overall: number;
};

type JogadorTime = {
  id: string;
  user_id: string | null;
  guest_player_id: string | null;
  is_goalkeeper: boolean;
  users: UsuarioResumo | null;
  guest_players: GuestResumo | null;
};

type TimeDetalhes = {
  id: string;
  team_name: string;
  seed: number | null;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  tournament_team_players: JogadorTime[];
};

type TimePartida = {
  id: string;
  team_name: string;
  team_index: number;
  tournament_team_id: string | null;
};

type Partida = {
  id: string;
  match_date: string;
  location: string | null;
  status: StatusPartida;
  title: string | null;
  bracket_key: string | null;
  round_label: string | null;
  match_teams: TimePartida[];
};

type Fase = {
  id: string;
  order: number;
  type: "league" | "bracket";
  status: "pending" | "active" | "finished";
  matches: Partida[];
};

type JogadorInscrito = {
  id: string;
  user_id: string | null;
  guest_player_id: string | null;
  is_goalkeeper: boolean;
  users: UsuarioResumo | null;
  guest_players: GuestResumo | null;
};

type Artilheiro = {
  id: string;
  nome: string;
  gols: number;
  ehGuest: boolean;
};

type MvpCampeonato = {
  nome: string;
  fotoUrl: string | null;
  posicao: string | null;
  votos: number;
};

type Goleiro = {
  id: string;
  nome: string;
  golsSofridos: number;
  partidas: number;
  ehGuest: boolean;
};

type MatchScore = {
  homeScore: number;
  awayScore: number;
  penaltyHomeScore: number | null;
  penaltyAwayScore: number | null;
};

type CampeonatoDetalhes = {
  id: string;
  name: string;
  status: StatusTorneio;
  is_special_event: boolean;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  num_teams: number;
  squad_size: number;
  settings: TournamentSettings;
  champion_team_id: string | null;
  champion_team: { id: string; team_name: string } | null;
  tournament_teams: TimeDetalhes[];
  tournament_stages: Fase[];
  tournament_registrations: JogadorInscrito[];
  artilharia: Artilheiro[];
  goleiros: Goleiro[];
  match_scores: Record<string, MatchScore>;
};

type Candidato = {
  tipo: "user" | "guest";
  id: string;
  nome: string;
  posicao: string | null;
  ehGoleiro: boolean;
  overall: number;
};

type PosicaoAvulso = "GK" | "DEF" | "MEI" | "ATA";

type FormNovoAvulso = {
  nome: string;
  telefone: string;
  posicao: PosicaoAvulso | null;
  overall: number;
};

// ─── constantes ───────────────────────────────────────────────────────────────

const POSICOES_AVULSO: {
  valor: PosicaoAvulso;
  sigla: string;
  label: string;
}[] = [
  { valor: "GK", sigla: "GK", label: "Goleiro" },
  { valor: "DEF", sigla: "DEF", label: "Defensor" },
  { valor: "MEI", sigla: "MEI", label: "Meia" },
  { valor: "ATA", sigla: "ATA", label: "Atacante" },
];

// ─── helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatarTelefone(valor: string): string {
  const digits = valor.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 3) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 7)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function statusTorneioLabel(status: StatusTorneio): string {
  const map: Record<StatusTorneio, string> = {
    registration: "Inscrições Abertas",
    active: "Em Andamento",
    finished: "Encerrado",
    cancelled: "Cancelado",
  };
  return map[status];
}

function statusPartidaLabel(status: StatusPartida): string {
  const map: Record<StatusPartida, string> = {
    scheduled: "Agendado",
    started: "Em Andamento",
    completed: "Encerrado",
    cancelled: "Cancelado",
  };
  return map[status];
}

function nomePorFormato(format: FormatoCompetição | undefined): string {
  if (!format) return "";
  const map: Record<FormatoCompetição, string> = {
    league_only: "Classificação",
    bracket_only: "Mata-mata",
    league_and_bracket: "Classificação + Mata-mata",
  };
  return map[format];
}

function temLeague(settings: TournamentSettings): boolean {
  return (
    settings.format === "league_only" ||
    settings.format === "league_and_bracket"
  );
}

function temBracket(settings: TournamentSettings): boolean {
  return (
    settings.format === "bracket_only" ||
    settings.format === "league_and_bracket"
  );
}

function ordenarTimes(times: TimeDetalhes[]): TimeDetalhes[] {
  return [...times].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const sgA = a.goals_for - a.goals_against;
    const sgB = b.goals_for - b.goals_against;
    if (sgB !== sgA) return sgB - sgA;
    return b.goals_for - a.goals_for;
  });
}

// ─── subcomponentes visuais ───────────────────────────────────────────────────

function AvatarJogador({
  nome,
  fotoUrl,
  tamanho = "sm",
}: {
  nome: string;
  fotoUrl: string | null;
  tamanho?: "sm" | "md";
}) {
  const sizeClass = tamanho === "md" ? "size-10" : "size-8";
  const textClass = tamanho === "md" ? "text-sm" : "text-xs";
  return (
    <Avatar className={sizeClass}>
      {fotoUrl && <AvatarImage src={fotoUrl} alt={nome} />}
      <AvatarFallback
        className={cn(textClass, "bg-primary/10 text-primary font-heading")}
      >
        {getInitials(nome)}
      </AvatarFallback>
    </Avatar>
  );
}

// Controle numérico de incremento/decremento para avaliações
function NumericStepper({
  value,
  onChange,
  min = 1,
  max = 10,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex flex-col items-center border border-border rounded-xl overflow-hidden w-full">
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-full flex items-center justify-center py-1.5 hover:bg-muted transition-colors text-muted-foreground"
        aria-label="Aumentar"
      >
        <Plus className="size-3" />
      </button>
      <div className="py-2.5 font-heading text-xl text-foreground border-y border-border w-full text-center select-none">
        {value}
      </div>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-full flex items-center justify-center py-1.5 hover:bg-muted transition-colors text-muted-foreground"
        aria-label="Diminuir"
      >
        <Minus className="size-3" />
      </button>
    </div>
  );
}

// ─── tabela de classificação ──────────────────────────────────────────────────

function TabelaClassificacao({
  times,
  settings,
}: {
  times: TimeDetalhes[];
  settings: TournamentSettings;
}) {
  const sorted = ordenarTimes(times);
  const numClassificados = settings.qualifying_teams ?? 0;
  const temZona = numClassificados > 0 && temBracket(settings);

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-muted-foreground gap-2">
        <BarChart3 className="size-10 opacity-20" />
        <p className="text-sm">Nenhum time na classificação ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="bg-primary text-primary-foreground text-xs uppercase tracking-wider">
              <th className="py-3 pl-1 pr-2 text-left font-medium w-14 border-l-[3px] border-l-primary">
                Pos
              </th>
              <th className="py-3 pr-3 text-left font-medium">Time</th>
              <th className="py-3 px-2 text-center font-bold w-10">Pts</th>
              <th className="py-3 px-2 text-center font-medium w-8 opacity-80">
                J
              </th>
              <th className="py-3 px-2 text-center font-medium w-8 opacity-80">
                V
              </th>
              <th className="py-3 px-2 text-center font-medium w-8 opacity-80">
                E
              </th>
              <th className="py-3 px-2 text-center font-medium w-8 opacity-80">
                D
              </th>
              <th className="py-3 px-2 text-center font-medium w-10 opacity-80">
                GP
              </th>
              <th className="py-3 px-2 text-center font-medium w-10 opacity-80">
                GC
              </th>
              <th className="py-3 pl-2 pr-4 text-center font-medium w-10 opacity-80">
                SG
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((time, idx) => {
              const pos = idx + 1;
              const jogos = time.wins + time.draws + time.losses;
              const sg = time.goals_for - time.goals_against;
              const ehLider = pos === 1;
              const ehClassificado = temZona && pos <= numClassificados;

              return (
                <tr
                  key={time.id}
                  className={cn(
                    "transition-colors border-b border-border last:border-b-0",
                    ehLider && "bg-accent/10 hover:bg-accent/15",
                    ehClassificado &&
                      !ehLider &&
                      "bg-emerald-50/60 hover:bg-emerald-50",
                    !ehClassificado && "hover:bg-muted/30",
                  )}
                >
                  <td
                    className={cn(
                      "py-3 pl-1 pr-2 border-l-[3px]",
                      ehLider
                        ? "border-l-accent"
                        : ehClassificado
                          ? "border-l-emerald-400"
                          : "border-l-transparent",
                    )}
                  >
                    <span
                      className={cn(
                        "size-6 ml-2 inline-flex items-center justify-center rounded-full text-xs font-semibold",
                        ehLider && "bg-accent text-accent-foreground",
                        ehClassificado &&
                          !ehLider &&
                          "bg-emerald-100 text-emerald-700",
                        !ehClassificado && "text-muted-foreground",
                      )}
                    >
                      {pos}
                    </span>
                  </td>
                  <td
                    className={cn(
                      "py-3 pr-3 text-foreground",
                      ehLider ? "font-semibold" : "font-medium",
                    )}
                  >
                    {time.team_name}
                  </td>
                  <td className="py-3 px-2 text-center font-bold text-foreground">
                    {time.points}
                  </td>
                  <td className="py-3 px-2 text-center text-muted-foreground">
                    {jogos}
                  </td>
                  <td className="py-3 px-2 text-center text-muted-foreground">
                    {time.wins}
                  </td>
                  <td className="py-3 px-2 text-center text-muted-foreground">
                    {time.draws}
                  </td>
                  <td className="py-3 px-2 text-center text-muted-foreground">
                    {time.losses}
                  </td>
                  <td className="py-3 px-2 text-center text-muted-foreground">
                    {time.goals_for}
                  </td>
                  <td className="py-3 px-2 text-center text-muted-foreground">
                    {time.goals_against}
                  </td>
                  <td className="py-3 pl-2 pr-4 text-center text-muted-foreground">
                    {sg > 0 ? `+${sg}` : sg}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-1.5">
        {temZona && (
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="w-3 h-3 rounded-sm bg-accent shrink-0" />
              Líder
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="w-3 h-3 rounded-sm bg-emerald-400 shrink-0" />
              Classificação ao Mata-mata ({numClassificados}{" "}
              {numClassificados === 1 ? "time" : "times"})
            </span>
          </div>
        )}
        <p className="text-[11px] text-muted-foreground/70">
          Pts = Pontos · J = Jogos · V = Vitórias · E = Empates · D = Derrotas ·
          GP = Gols Pró · GC = Gols Contra · SG = Saldo
        </p>
      </div>
    </div>
  );
}

// ─── chave do mata-mata ────────────────────────────────────────────────────────

function ChaveMataMata({
  fases,
  matchScores,
  onClickPartida,
}: {
  fases: Fase[];
  matchScores: Record<string, MatchScore>;
  onClickPartida?: (matchId: string) => void;
}) {
  const fasesBracket = fases.filter(
    (f) => f.type === "bracket" && f.matches.length > 0,
  );

  if (fasesBracket.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-muted-foreground gap-2">
        <GitBranch className="size-10 opacity-20" />
        <p className="text-sm">Mata-mata ainda não iniciado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {fasesBracket.map((fase) => {
        const rounds = [
          ...new Set(
            fase.matches.map((m) => m.round_label ?? "Fase Eliminatória"),
          ),
        ];

        return (
          <div key={fase.id} className="space-y-4">
            {rounds.map((roundLabel) => {
              const partidas = fase.matches.filter(
                (m) => (m.round_label ?? "Fase Eliminatória") === roundLabel,
              );

              return (
                <div key={roundLabel}>
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                    {roundLabel}
                  </h3>
                  <div className="space-y-2">
                    {partidas.map((partida) => {
                      const times = [...partida.match_teams].sort(
                        (a, b) => a.team_index - b.team_index,
                      );
                      const [home, away] = times;
                      const concluida = partida.status === "completed";

                      // Recupera placar salvo; fallback zerado para partidas ainda não realizadas
                      const placar = matchScores[partida.id] ?? {
                        homeScore: 0,
                        awayScore: 0,
                        penaltyHomeScore: null,
                        penaltyAwayScore: null,
                      };

                      // No jogo de volta, pênaltis ocorrem por empate no agregado (não necessariamente empate no placar deste jogo)
                      const isVolta = (partida.bracket_key ?? '').endsWith('_V');
                      const mostrarPenaltis =
                        concluida &&
                        placar.penaltyHomeScore !== null &&
                        placar.penaltyAwayScore !== null &&
                        (isVolta || placar.homeScore === placar.awayScore);

                      return (
                        <div
                          key={partida.id}
                          onClick={() => onClickPartida?.(partida.id)}
                          className={cn(
                            "bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-2",
                            onClickPartida &&
                              "cursor-pointer hover:bg-muted/40 transition-colors",
                          )}
                        >
                          <div className="flex-1 text-right">
                            <p className="font-medium text-sm text-foreground">
                              {home?.team_name ?? "—"}
                            </p>
                          </div>

                          <div className="flex flex-col items-center gap-1 px-3 shrink-0">
                            {concluida ? (
                              <>
                                <span className="font-heading font-bold text-lg text-foreground tabular-nums leading-none">
                                  {placar.homeScore} · {placar.awayScore}
                                </span>
                                {mostrarPenaltis && (
                                  <span className="text-[10px] text-muted-foreground">
                                    ({placar.penaltyHomeScore}x{placar.penaltyAwayScore})
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-[11px] font-semibold text-muted-foreground">
                                VS
                              </span>
                            )}
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[10px] px-1.5 py-0",
                                concluida &&
                                  "text-emerald-600 border-emerald-200 bg-emerald-50",
                                partida.status === "started" &&
                                  "text-amber-600 border-amber-200 bg-amber-50",
                                partida.status === "cancelled" &&
                                  "text-muted-foreground opacity-60",
                              )}
                            >
                              {statusPartidaLabel(partida.status)}
                            </Badge>
                          </div>

                          <div className="flex-1 text-left">
                            <p className="font-medium text-sm text-foreground">
                              {away?.team_name ?? "—"}
                            </p>
                          </div>

                          {partida.match_date && (
                            <div className="hidden sm:block text-xs text-muted-foreground whitespace-nowrap ml-2">
                              {formatDate(partida.match_date)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── times do campeonato ──────────────────────────────────────────────────────

function overallTime(jogadores: JogadorTime[]): number | null {
  const jogadoresLinha = jogadores.filter(
    (p) => !p.is_goalkeeper && !p.users?.is_goalkeeper && !p.guest_players?.is_goalkeeper,
  );
  const overalls = jogadoresLinha
    .map(
      (p) =>
        p.users?.player_ratings?.overall ?? p.guest_players?.overall ?? null,
    )
    .filter((o): o is number => o !== null);
  if (overalls.length === 0) return null;
  return overalls.reduce((acc, o) => acc + o, 0) / overalls.length;
}

function CardJogadorTime({ jogador }: { jogador: JogadorTime }) {
  const nome =
    jogador.users?.nickname ??
    jogador.users?.name ??
    jogador.guest_players?.name ??
    "—";
  const fotoUrl = jogador.users?.photo_url ?? null;
  const ehGoleiro =
    jogador.is_goalkeeper ||
    jogador.users?.is_goalkeeper ||
    jogador.guest_players?.is_goalkeeper;
  const posicao = ehGoleiro
    ? "Goleiro"
    : (jogador.users?.position ?? jogador.guest_players?.position ?? null);
  const overall =
    jogador.users?.player_ratings?.overall ??
    jogador.guest_players?.overall ??
    null;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <AvatarJogador nome={nome} fotoUrl={fotoUrl} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{nome}</p>
        {posicao && (
          <p className="text-[11px] text-muted-foreground leading-tight">
            {posicao}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {ehGoleiro && (
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 bg-emerald-50 text-emerald-700 border-emerald-200"
          >
            GK
          </Badge>
        )}
        {overall !== null && (
          <span className="text-xs font-bold tabular-nums bg-muted px-2 py-0.5 rounded-full text-foreground">
            {overall}
          </span>
        )}
      </div>
    </div>
  );
}

function TimesTorneio({ times }: { times: TimeDetalhes[] }) {
  if (times.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-muted-foreground gap-2">
        <Users className="size-10 opacity-20" />
        <p className="text-sm">Times ainda não formados.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {times.map((time) => {
        const totalJogadores = time.tournament_team_players.length;
        const mediaOverall = overallTime(time.tournament_team_players);

        const goleiros = time.tournament_team_players.filter(
          (p) =>
            p.is_goalkeeper ||
            p.users?.is_goalkeeper ||
            p.guest_players?.is_goalkeeper,
        );
        const linha = time.tournament_team_players.filter(
          (p) =>
            !p.is_goalkeeper &&
            !p.users?.is_goalkeeper &&
            !p.guest_players?.is_goalkeeper,
        );

        return (
          <div
            key={time.id}
            className="bg-card border border-border rounded-xl overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-2">
              <h3 className="font-semibold text-foreground truncate">
                {time.team_name}
              </h3>
              <div className="flex items-center gap-2 shrink-0">
                {mediaOverall !== null && (
                  <span className="flex items-center gap-1 text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    <Star className="size-3" />
                    {mediaOverall.toFixed(1)}
                  </span>
                )}
                {totalJogadores > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {totalJogadores} jog.
                  </span>
                )}
              </div>
            </div>

            {totalJogadores === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                Sem jogadores cadastrados
              </div>
            ) : (
              <div className="divide-y divide-border">
                {goleiros.map((p) => (
                  <CardJogadorTime key={p.id} jogador={p} />
                ))}
                {linha.map((p) => (
                  <CardJogadorTime key={p.id} jogador={p} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── jogadores inscritos ──────────────────────────────────────────────────────

function JogadoresInscritos({
  inscritos,
  ehAdmin,
  onRemoverInscrito,
  onAdicionarJogadores,
  onIniciarCampeonato,
}: {
  inscritos: JogadorInscrito[];
  ehAdmin: boolean;
  onRemoverInscrito: (id: string, nome: string) => void;
  onAdicionarJogadores: () => void;
  onIniciarCampeonato: () => void;
}) {
  return (
    <div className="space-y-4">
      {ehAdmin && (
        <div className="ml-auto flex items-center gap-2 flex-wrap justify-end">
          <Button size="sm" variant="outline" onClick={onAdicionarJogadores}>
            <UserRoundPlus className="size-3.5" />
            Adicionar Jogadores
          </Button>
          <Button size="sm" onClick={onIniciarCampeonato}>
            <Play className="size-3.5" />
            Iniciar Campeonato
          </Button>
        </div>
      )}
      {/* Cabeçalho da seção */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="w-1 h-4 rounded-full bg-primary shrink-0" />
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Inscritos ({inscritos.length})
        </h2>
      </div>

      {/* Lista de inscritos */}
      {inscritos.length === 0 ? (
        <div className="bg-card rounded-xl ring-1 ring-foreground/10 p-8 text-center">
          <Users className="size-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Nenhum jogador inscrito ainda.
          </p>
        </div>
      ) : (
        <div className="bg-card rounded-xl ring-1 ring-foreground/10 divide-y divide-border overflow-hidden">
          {inscritos.map((inscrito) => {
            const nome =
              inscrito.users?.nickname ??
              inscrito.users?.name ??
              inscrito.guest_players?.name ??
              "—";
            const fotoUrl = inscrito.users?.photo_url ?? null;
            const ehGoleiro =
              inscrito.is_goalkeeper ||
              (inscrito.users?.is_goalkeeper ?? false) ||
              (inscrito.guest_players?.is_goalkeeper ?? false);
            const ehAvulso = !!inscrito.guest_player_id;

            return (
              <div
                key={inscrito.id}
                className="flex items-center gap-3 px-4 py-3"
              >
                <AvatarJogador nome={nome} fotoUrl={fotoUrl} tamanho="md" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {nome}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {ehAvulso ? "Avulso" : "Membro"}
                    {ehGoleiro && " · Goleiro"}
                  </p>
                </div>
                {ehGoleiro && (
                  <Shield className="size-3.5 text-info shrink-0" />
                )}
                {ehAdmin && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-7 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onRemoverInscrito(inscrito.id, nome)}
                  >
                    <UserMinus className="size-3.5" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── artilharia ───────────────────────────────────────────────────────────────

function Artilharia({ artilharia }: { artilharia: Artilheiro[] }) {
  if (artilharia.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-muted-foreground gap-2">
        <Target className="size-10 opacity-20" />
        <p className="text-sm">Nenhum gol registrado ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {artilharia.map((jogador, idx) => (
        <div
          key={jogador.id}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border transition-colors",
            idx === 0 && "border-amber-200 bg-amber-50/60",
          )}
        >
          <span
            className={cn(
              "size-6 shrink-0 inline-flex items-center justify-center rounded-full text-xs font-bold",
              idx === 0 && "bg-amber-200 text-amber-800",
              idx === 1 && "bg-muted text-muted-foreground font-semibold",
              idx === 2 && "bg-orange-100 text-orange-700 font-semibold",
              idx > 2 && "text-muted-foreground",
            )}
          >
            {idx + 1}
          </span>

          <span
            className={cn(
              "flex-1 text-sm",
              idx === 0 ? "font-semibold text-foreground" : "text-foreground",
            )}
          >
            {jogador.nome}
          </span>

          <div className="flex items-center gap-1.5 shrink-0">
            <Target className="size-3.5 text-muted-foreground" />
            <span
              className={cn(
                "font-bold text-sm tabular-nums",
                idx === 0 ? "text-amber-700" : "text-foreground",
              )}
            >
              {jogador.gols}
            </span>
            <span className="text-xs text-muted-foreground">
              {jogador.gols === 1 ? "gol" : "gols"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── partidas por rodada ──────────────────────────────────────────────────────

function PartidasCampeonato({
  fases,
  matchScores,
  onClickPartida,
}: {
  fases: Fase[];
  matchScores: Record<string, MatchScore>;
  onClickPartida?: (matchId: string) => void;
}) {
  // Mapeia matchId → tipo de fase para saber se deve exibir pênaltis (somente mata-mata)
  const tipoFasePorPartida = new Map<string, "league" | "bracket">();
  for (const fase of fases) {
    for (const match of fase.matches) {
      tipoFasePorPartida.set(match.id, fase.type);
    }
  }

  const todasPartidas = fases.flatMap((f) => f.matches);

  if (todasPartidas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-muted-foreground gap-2">
        <Swords className="size-10 opacity-20" />
        <p className="text-sm">Nenhuma partida registrada ainda.</p>
      </div>
    );
  }

  const rodadas = [
    ...new Set(todasPartidas.map((m) => m.round_label ?? "Fase de Grupos")),
  ];

  return (
    <div className="space-y-6">
      {rodadas.map((rodada) => {
        const partidas = todasPartidas.filter(
          (m) => (m.round_label ?? "Fase de Grupos") === rodada,
        );

        return (
          <div key={rodada}>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              {rodada}
            </h3>
            <div className="space-y-2">
              {partidas.map((partida) => {
                const times = [...partida.match_teams].sort(
                  (a, b) => a.team_index - b.team_index,
                );
                const [home, away] = times;
                const score = matchScores[partida.id] ?? {
                  homeScore: 0,
                  awayScore: 0,
                  penaltyHomeScore: null,
                  penaltyAwayScore: null,
                };
                const concluida = partida.status === "completed";
                const ehMataMata = tipoFasePorPartida.get(partida.id) === "bracket";

                // No jogo de volta, pênaltis ocorrem por empate no agregado (não necessariamente empate no placar deste jogo)
                const isVolta = (partida.bracket_key ?? '').endsWith('_V');
                const mostrarPenaltis =
                  concluida &&
                  ehMataMata &&
                  score.penaltyHomeScore !== null &&
                  score.penaltyAwayScore !== null &&
                  (isVolta || score.homeScore === score.awayScore);

                return (
                  <div
                    key={partida.id}
                    onClick={() => onClickPartida?.(partida.id)}
                    className={cn(
                      "bg-card border border-border rounded-xl px-4 py-3",
                      onClickPartida &&
                        "cursor-pointer hover:bg-muted/40 transition-colors",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex-1 text-right">
                        <p className="font-medium text-sm text-foreground">
                          {home?.team_name ?? "—"}
                        </p>
                      </div>

                      <div className="flex flex-col items-center gap-1 px-3 shrink-0 min-w-[80px]">
                        {concluida ? (
                          <>
                            <span className="font-heading font-bold text-lg text-foreground tabular-nums leading-none">
                              {score.homeScore} · {score.awayScore}
                            </span>
                            {mostrarPenaltis && (
                              <span className="text-[10px] text-muted-foreground leading-none">
                                ({score.penaltyHomeScore}x{score.penaltyAwayScore})
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-[11px] font-semibold text-muted-foreground">
                            VS
                          </span>
                        )}
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-1.5 py-0",
                            concluida &&
                              "text-emerald-600 border-emerald-200 bg-emerald-50",
                            partida.status === "started" &&
                              "text-amber-600 border-amber-200 bg-amber-50",
                            partida.status === "cancelled" &&
                              "text-muted-foreground opacity-60",
                          )}
                        >
                          {statusPartidaLabel(partida.status)}
                        </Badge>
                      </div>

                      <div className="flex-1 text-left">
                        <p className="font-medium text-sm text-foreground">
                          {away?.team_name ?? "—"}
                        </p>
                      </div>
                    </div>

                    {(partida.match_date || partida.location) && (
                      <div className="flex items-center justify-center gap-3 mt-2 text-xs text-muted-foreground">
                        {partida.match_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="size-3" />
                            {formatDate(partida.match_date)}
                          </span>
                        )}
                        {partida.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3" />
                            {partida.location}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── estatísticas do campeonato ───────────────────────────────────────────────

function EstatisticasCampeonato({
  artilharia,
  goleiros,
  times,
  fases,
  matchScores,
  settings,
}: {
  artilharia: Artilheiro[];
  goleiros: Goleiro[];
  times: TimeDetalhes[];
  fases: Fase[];
  matchScores: Record<string, MatchScore>;
  settings: TournamentSettings;
}) {
  const apenasMataMata = settings.format === "bracket_only";
  const semDados =
    artilharia.length === 0 &&
    goleiros.length === 0 &&
    times.every((t) => t.goals_for === 0 && t.goals_against === 0);

  if (semDados) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-muted-foreground gap-2">
        <TrendingUp className="size-10 opacity-20" />
        <p className="text-sm">Nenhuma estatística disponível ainda.</p>
      </div>
    );
  }

  // Conta vitórias em tempo normal no mata-mata (pênaltis não contam como vitória)
  const vitoriasMataMata: Record<string, number> = {};
  for (const fase of fases) {
    if (fase.type !== "bracket") continue;
    for (const partida of fase.matches) {
      if (partida.status !== "completed") continue;
      const placar = matchScores[partida.id];
      if (!placar) continue;

      const timesOrdenados = [...partida.match_teams].sort(
        (a, b) => a.team_index - b.team_index,
      );
      const timeCasa = timesOrdenados[0];
      const timeVisita = timesOrdenados[1];

      if (placar.homeScore > placar.awayScore && timeCasa?.tournament_team_id) {
        vitoriasMataMata[timeCasa.tournament_team_id] =
          (vitoriasMataMata[timeCasa.tournament_team_id] ?? 0) + 1;
      } else if (placar.awayScore > placar.homeScore && timeVisita?.tournament_team_id) {
        vitoriasMataMata[timeVisita.tournament_team_id] =
          (vitoriasMataMata[timeVisita.tournament_team_id] ?? 0) + 1;
      }
      // Empates decididos por pênaltis NÃO contam como vitória
    }
  }

  // Acumula gols das partidas de mata-mata por tournament_team_id
  const golsBracket: Record<string, { for: number; against: number }> = {};
  for (const fase of fases) {
    if (fase.type !== "bracket") continue;
    for (const partida of fase.matches) {
      if (partida.status !== "completed") continue;
      const placar = matchScores[partida.id];
      if (!placar) continue;
      const timesOrdenados = [...partida.match_teams].sort(
        (a, b) => a.team_index - b.team_index,
      );
      const timeCasa = timesOrdenados[0];
      const timeVisita = timesOrdenados[1];
      if (timeCasa?.tournament_team_id) {
        const id = timeCasa.tournament_team_id;
        golsBracket[id] = {
          for: (golsBracket[id]?.for ?? 0) + placar.homeScore,
          against: (golsBracket[id]?.against ?? 0) + placar.awayScore,
        };
      }
      if (timeVisita?.tournament_team_id) {
        const id = timeVisita.tournament_team_id;
        golsBracket[id] = {
          for: (golsBracket[id]?.for ?? 0) + placar.awayScore,
          against: (golsBracket[id]?.against ?? 0) + placar.homeScore,
        };
      }
    }
  }

  const melhorAtaque =
    times.length > 0
      ? [...times].sort((a, b) => {
          const totalA = a.goals_for + (golsBracket[a.id]?.for ?? 0);
          const totalB = b.goals_for + (golsBracket[b.id]?.for ?? 0);
          return totalB - totalA;
        })[0]
      : null;
  const melhorDefesa =
    times.length > 0
      ? [...times].sort((a, b) => {
          const totalA = a.goals_against + (golsBracket[a.id]?.against ?? 0);
          const totalB = b.goals_against + (golsBracket[b.id]?.against ?? 0);
          return totalA - totalB;
        })[0]
      : null;

  const totalGolsMelhorAtaque = melhorAtaque
    ? melhorAtaque.goals_for + (golsBracket[melhorAtaque.id]?.for ?? 0)
    : 0;
  const totalGolsSofridosMelhorDefesa = melhorDefesa
    ? melhorDefesa.goals_against + (golsBracket[melhorDefesa.id]?.against ?? 0)
    : 0;

  // Ordena pelo total de vitórias: liga + mata-mata (tempo normal)
  const maisVitorias =
    times.length > 0
      ? [...times].sort((a, b) => {
          const totalA = a.wins + (vitoriasMataMata[a.id] ?? 0);
          const totalB = b.wins + (vitoriasMataMata[b.id] ?? 0);
          return totalB - totalA;
        })[0]
      : null;

  const totalVitoriasMaisVitorias = maisVitorias
    ? maisVitorias.wins + (vitoriasMataMata[maisVitorias.id] ?? 0)
    : 0;

  const temDestaques =
    (melhorAtaque && totalGolsMelhorAtaque > 0) ||
    melhorDefesa !== null ||
    (maisVitorias && totalVitoriasMaisVitorias > 0);

  return (
    <div className="space-y-6">
      {temDestaques && !apenasMataMata && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {melhorAtaque && totalGolsMelhorAtaque > 0 && (
            <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Melhor Ataque
              </p>
              <p className="font-semibold text-foreground truncate text-sm">
                {melhorAtaque.team_name}
              </p>
              <p className="font-heading font-bold text-2xl text-primary leading-none mt-1">
                {totalGolsMelhorAtaque}
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  gols
                </span>
              </p>
            </div>
          )}
          {melhorDefesa && (
            <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Melhor Defesa
              </p>
              <p className="font-semibold text-foreground truncate text-sm">
                {melhorDefesa.team_name}
              </p>
              <p className="font-heading font-bold text-2xl text-emerald-600 leading-none mt-1">
                {totalGolsSofridosMelhorDefesa}
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  sofridos
                </span>
              </p>
            </div>
          )}
          {maisVitorias && totalVitoriasMaisVitorias > 0 && (
            <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Mais Vitórias
              </p>
              <p className="font-semibold text-foreground truncate text-sm">
                {maisVitorias.team_name}
              </p>
              <p className="font-heading font-bold text-2xl text-amber-600 leading-none mt-1">
                {totalVitoriasMaisVitorias}
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  {totalVitoriasMaisVitorias === 1 ? "vitória" : "vitórias"}
                </span>
              </p>
            </div>
          )}
        </div>
      )}

      {artilharia.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 rounded-full bg-amber-400 shrink-0" />
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Artilharia
            </h2>
          </div>
          <Artilharia artilharia={artilharia} />
        </div>
      )}

      {goleiros.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1 h-4 rounded-full bg-emerald-400 shrink-0" />
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Menos Vazados
            </h2>
          </div>
          <div className="space-y-1.5">
            {goleiros.map((gk, idx) => (
              <div
                key={gk.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border transition-colors",
                  idx === 0 && "border-emerald-200 bg-emerald-50/60",
                )}
              >
                <span
                  className={cn(
                    "size-6 shrink-0 inline-flex items-center justify-center rounded-full text-xs font-bold",
                    idx === 0 && "bg-emerald-200 text-emerald-800",
                    idx === 1 && "bg-muted text-muted-foreground font-semibold",
                    idx === 2 && "bg-orange-100 text-orange-700 font-semibold",
                    idx > 2 && "text-muted-foreground",
                  )}
                >
                  {idx + 1}
                </span>
                <Shield
                  className={cn(
                    "size-3.5 shrink-0",
                    idx === 0 ? "text-emerald-600" : "text-muted-foreground",
                  )}
                />
                <span
                  className={cn(
                    "flex-1 text-sm",
                    idx === 0
                      ? "font-semibold text-foreground"
                      : "text-foreground",
                  )}
                >
                  {gk.nome}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={cn(
                      "font-bold text-sm tabular-nums",
                      idx === 0 ? "text-emerald-700" : "text-foreground",
                    )}
                  >
                    {gk.golsSofridos}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {gk.golsSofridos === 1 ? "gol sofrido" : "gols sofridos"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── skeleton de carregamento ─────────────────────────────────────────────────

function SkeletonDetalhes() {
  return (
    <div className="space-y-6 animate-pulse">
      <Skeleton className="h-8 w-24 rounded-lg" />
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <Skeleton className="h-7 w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-28 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-8 w-28 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

// ─── componente principal ─────────────────────────────────────────────────────

type Props = { id: string; ehAdmin: boolean };

export function CampeonatoDetalhesClient({ id, ehAdmin }: Props) {
  const router = useRouter();
  const [campeonato, setCampeonato] = useState<CampeonatoDetalhes | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<string>("");
  // MVPs do campeonato — preenchido via mvp_awards após encerramento da votação; suporta empate
  const [mvps, setMvps] = useState<MvpCampeonato[]>([]);

  // Estado do modal de remoção de inscrição
  const [inscritoParaRemover, setInscritoParaRemover] = useState<{
    id: string;
    nome: string;
  } | null>(null);
  const [removendoInscrito, setRemovendoInscrito] = useState(false);
  const [erroRemocao, setErroRemocao] = useState<string | null>(null);

  // Estado do modal de adição de jogadores
  const [adicionandoJogadores, setAdicionandoJogadores] = useState(false);
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [carregandoCandidatos, setCarregandoCandidatos] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [salvandoJogadores, setSalvandoJogadores] = useState(false);
  const [erroAdicao, setErroAdicao] = useState<string | null>(null);

  // Estado do modal de criação de avulso
  const [criandoAvulso, setCriandoAvulso] = useState(false);
  const [formAvulso, setFormAvulso] = useState<FormNovoAvulso>({
    nome: "",
    telefone: "",
    posicao: null,
    overall: 5,
  });
  const [salvandoAvulso, setSalvandoAvulso] = useState(false);
  const [erroAvulso, setErroAvulso] = useState<string | null>(null);

  // Busca o(s) MVP(s) do campeonato via mvp_awards (suporta empate com múltiplos vencedores)
  const carregarMvp = useCallback(async () => {
    try {
      const resposta = await fetch(`/api/tournaments/${id}/mvp-award`);
      if (!resposta.ok) return;
      const dados = await resposta.json();
      if (dados.mvps?.length) setMvps(dados.mvps);
    } catch {
      // MVP não é dado crítico — ignora erros silenciosamente
    }
  }, [id]);

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/tournaments/${id}`);
      if (!res.ok) {
        setErro(
          res.status === 404
            ? "Campeonato não encontrado."
            : "Erro ao carregar campeonato.",
        );
        return;
      }
      setCampeonato(await res.json());
    } catch {
      setErro("Erro de conexão.");
    } finally {
      setCarregando(false);
    }
  }, [id]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Carrega MVP apenas para campeonatos encerrados
  useEffect(() => {
    if (campeonato?.status === "finished") {
      carregarMvp();
    }
  }, [campeonato?.status, carregarMvp]);

  useEffect(() => {
    if (!campeonato || abaAtiva) return;
    const { status, settings } = campeonato;
    if (status === "registration") {
      setAbaAtiva("inscritos");
    } else if (temLeague(settings)) {
      setAbaAtiva("classificacao");
    } else if (temBracket(settings)) {
      setAbaAtiva("mata-mata");
    } else {
      setAbaAtiva("times");
    }
  }, [campeonato, abaAtiva]);

  async function confirmarRemocaoInscrito() {
    if (!inscritoParaRemover) return;
    setRemovendoInscrito(true);
    setErroRemocao(null);
    try {
      const res = await fetch(`/api/tournaments/${id}/registrations`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration_id: inscritoParaRemover.id }),
      });
      if (!res.ok) {
        const dados = await res.json();
        setErroRemocao(dados.error ?? "Erro ao remover inscrição.");
        return;
      }
      setInscritoParaRemover(null);
      carregarDados();
    } catch {
      setErroRemocao("Falha na conexão. Tente novamente.");
    } finally {
      setRemovendoInscrito(false);
    }
  }

  async function abrirModalAdicionarJogadores() {
    setSelecionados(new Set());
    setErroAdicao(null);
    setAdicionandoJogadores(true);
    setCarregandoCandidatos(true);
    try {
      const res = await fetch(
        `/api/tournaments/${id}/registrations/candidates`,
      );
      if (res.ok) {
        const dados = await res.json();
        const listaCandidatos: Candidato[] = [
          ...dados.users.map(
            (u: {
              id: string;
              name: string;
              nickname: string | null;
              position: string | null;
              is_goalkeeper: boolean;
              overall: number;
            }) => ({
              tipo: "user" as const,
              id: u.id,
              nome: u.nickname ?? u.name,
              posicao: u.position,
              ehGoleiro: u.is_goalkeeper,
              overall: u.overall,
            }),
          ),
          ...dados.guest_players.map(
            (g: {
              id: string;
              name: string;
              position: string | null;
              is_goalkeeper: boolean;
              overall: number;
            }) => ({
              tipo: "guest" as const,
              id: g.id,
              nome: g.name,
              posicao: g.position,
              ehGoleiro: g.is_goalkeeper,
              overall: g.overall,
            }),
          ),
        ];
        setCandidatos(listaCandidatos);
      }
    } catch {
      setErroAdicao("Falha ao carregar jogadores. Tente novamente.");
    } finally {
      setCarregandoCandidatos(false);
    }
  }

  function alternarSelecao(chave: string) {
    const capacidade = campeonato!.num_teams * (campeonato!.squad_size + 1);
    const jaInscritos = campeonato!.tournament_registrations.length;
    setSelecionados((prev) => {
      const nova = new Set(prev);
      if (nova.has(chave)) {
        nova.delete(chave);
      } else if (jaInscritos + nova.size < capacidade) {
        nova.add(chave);
      }
      return nova;
    });
  }

  async function confirmarAdicaoJogadores() {
    if (selecionados.size === 0) return;
    setSalvandoJogadores(true);
    setErroAdicao(null);
    try {
      const requisicoes = Array.from(selecionados).map((chave) => {
        const [tipo, id_candidato] = chave.split(":");
        const candidato = candidatos.find(
          (c) => c.tipo === tipo && c.id === id_candidato,
        );
        if (!candidato) return Promise.resolve(null);

        const corpo =
          tipo === "user"
            ? {
                user_id: id_candidato,
                is_goalkeeper: candidato.ehGoleiro,
              }
            : {
                guest_player_id: id_candidato,
                is_goalkeeper: candidato.ehGoleiro,
              };

        return fetch(`/api/tournaments/${id}/registrations`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(corpo),
        });
      });

      const resultados = await Promise.all(requisicoes);
      const comErro = resultados.some((r) => r && !r.ok);
      if (comErro) {
        setErroAdicao("Alguns jogadores não puderam ser adicionados.");
        return;
      }
      setAdicionandoJogadores(false);
      carregarDados();
    } catch {
      setErroAdicao("Falha na conexão. Tente novamente.");
    } finally {
      setSalvandoJogadores(false);
    }
  }

  async function salvarNovoAvulso() {
    if (!formAvulso.nome.trim()) {
      setErroAvulso("Nome é obrigatório.");
      return;
    }
    setSalvandoAvulso(true);
    setErroAvulso(null);
    try {
      const mapaLabels: Record<PosicaoAvulso, string> = {
        GK: "Goleiro",
        DEF: "Defensor",
        MEI: "Meia",
        ATA: "Atacante",
      };
      const res = await fetch("/api/guest-players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formAvulso.nome.trim(),
          phone: formAvulso.telefone.replace(/\D/g, "") || null,
          position: formAvulso.posicao ? mapaLabels[formAvulso.posicao] : null,
          is_goalkeeper: formAvulso.posicao === "GK",
          overall: formAvulso.overall,
        }),
      });
      if (!res.ok) {
        const dados = await res.json();
        setErroAvulso(dados.error ?? "Erro ao criar jogador.");
        return;
      }
      const novoAvulso = await res.json();
      const novoCandidato: Candidato = {
        tipo: "guest",
        id: novoAvulso.id,
        nome: novoAvulso.name,
        posicao: novoAvulso.position,
        ehGoleiro: novoAvulso.is_goalkeeper,
        overall: novoAvulso.overall,
      };
      setCandidatos((prev) =>
        [...prev, novoCandidato].sort((a, b) => a.nome.localeCompare(b.nome)),
      );
      setSelecionados((prev) => new Set([...prev, `guest:${novoAvulso.id}`]));
      setCriandoAvulso(false);
      setFormAvulso({ nome: "", telefone: "", posicao: null, overall: 5 });
    } catch {
      setErroAvulso("Falha na conexão. Tente novamente.");
    } finally {
      setSalvandoAvulso(false);
    }
  }

  if (carregando) return <SkeletonDetalhes />;

  if (erro || !campeonato) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted-foreground text-sm">
          {erro ?? "Campeonato não encontrado."}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/campeonatos")}
        >
          <ArrowLeft className="size-4" />
          Voltar aos campeonatos
        </Button>
      </div>
    );
  }

  const {
    status,
    settings,
    champion_team,
    tournament_teams,
    tournament_stages,
    tournament_registrations,
    artilharia,
    goleiros,
    match_scores,
  } = campeonato;

  const estaAtivo = status === "active" || status === "finished";

  const capacidadeTotal = campeonato.num_teams * (campeonato.squad_size + 1);
  const vagasOcupadas = tournament_registrations.length;
  const vagasDisponiveis = capacidadeTotal - vagasOcupadas - selecionados.size;
  const capacidadeAtingida = vagasDisponiveis <= 0;

  const abas: { value: string; label: string; icone: React.ReactNode }[] = [];

  if (status === "registration") {
    abas.push({
      value: "inscritos",
      label: `Inscritos (${tournament_registrations.length})`,
      icone: <Users className="size-3.5" />,
    });
  }

  if (estaAtivo) {
    if (temLeague(settings)) {
      abas.push({
        value: "classificacao",
        label: "Classificação",
        icone: <BarChart3 className="size-3.5" />,
      });
    }
    if (temBracket(settings)) {
      abas.push({
        value: "mata-mata",
        label: "Mata-mata",
        icone: <GitBranch className="size-3.5" />,
      });
    }
    abas.push({
      value: "times",
      label: "Times",
      icone: <Layers className="size-3.5" />,
    });
    abas.push({
      value: "partidas",
      label: "Partidas",
      icone: <Swords className="size-3.5" />,
    });
    abas.push({
      value: "estatisticas",
      label: "Estatísticas",
      icone: <TrendingUp className="size-3.5" />,
    });
  }

  if (abas.length === 0) {
    abas.push({
      value: "info",
      label: "Informações",
      icone: <Star className="size-3.5" />,
    });
  }

  const abaEfetiva = abaAtiva || abas[0]?.value || "info";

  return (
    <div className="space-y-5">
      {/* Botão voltar */}
      <Button
        variant="ghost"
        size="sm"
        className="-ml-1"
        onClick={() => router.push("/campeonatos")}
      >
        <ArrowLeft className="size-4" />
        Campeonatos
      </Button>

      {/* Card com informações gerais do campeonato */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="relative pl-5 pr-4 py-5">
          <div
            className={cn(
              "absolute left-0 top-0 bottom-0 w-1",
              status === "active" && "bg-amber-400",
              status === "finished" && "bg-emerald-400",
              status === "registration" && "bg-blue-400",
              status === "cancelled" && "bg-muted-foreground/30",
            )}
          />

          <div className="flex flex-col md:flex-row md:items-start gap-4">
            <div className="hidden md:flex size-14 shrink-0 items-center justify-center rounded-lg bg-amber-50 border border-amber-200">
              <Trophy className="size-7 text-amber-500" />
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="font-heading font-bold text-xl md:text-2xl text-foreground leading-tight mb-2">
                {campeonato.name}
              </h1>

              <div className="flex flex-wrap gap-2 mb-3">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    status === "registration" &&
                      "bg-blue-50 text-blue-700 border-blue-200",
                    status === "active" &&
                      "bg-amber-50 text-amber-700 border-amber-200",
                    status === "finished" &&
                      "bg-emerald-50 text-emerald-700 border-emerald-200",
                    status === "cancelled" && "text-muted-foreground",
                  )}
                >
                  {statusTorneioLabel(status)}
                </Badge>

                {settings.format && (
                  <Badge variant="outline" className="text-xs">
                    {nomePorFormato(settings.format)}
                  </Badge>
                )}

                {campeonato.is_special_event && (
                  <Badge
                    variant="outline"
                    className="text-xs bg-purple-50 text-purple-700 border-purple-200"
                  >
                    <Star className="size-3 mr-1" />
                    Evento Especial
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                {(campeonato.start_date || campeonato.end_date) && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="size-3.5 shrink-0" />
                    {campeonato.start_date && formatDate(campeonato.start_date)}
                    {campeonato.start_date && campeonato.end_date && " → "}
                    {campeonato.end_date && formatDate(campeonato.end_date)}
                  </span>
                )}
                {campeonato.location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-3.5 shrink-0" />
                    {campeonato.location}
                  </span>
                )}
                {campeonato.num_teams > 0 && (
                  <span className="flex items-center gap-1.5">
                    <Users className="size-3.5 shrink-0" />
                    {campeonato.num_teams} times · {campeonato.squad_size}{" "}
                    jogadores/time
                  </span>
                )}
              </div>

              {campeonato.description && (
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  {campeonato.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Banner do campeão */}
      {status === "finished" && champion_team && (
        <div className="relative overflow-hidden rounded-xl border border-amber-200 bg-linear-to-r from-amber-50 to-yellow-50 p-5">
          <div className="absolute -right-4 -top-4 opacity-10">
            <Trophy className="size-28 text-amber-500" />
          </div>

          <div className="flex items-center gap-4">
            <div className="size-12 shrink-0 flex items-center justify-center rounded-full bg-amber-100 border-2 border-amber-300">
              <Trophy className="size-6 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-600 mb-0.5">
                Campeão
              </p>
              <p className="font-heading font-bold text-xl text-amber-800">
                {champion_team.team_name}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Banner do MVP — exibido após encerramento da votação; suporta múltiplos em caso de empate */}
      {status === "finished" && mvps.length > 0 && (
        <div className="relative overflow-hidden rounded-xl border border-blue-200 bg-linear-to-r from-blue-50 to-blue-100 p-5">
          <div className="absolute -right-4 -top-4 opacity-10">
            <Crown className="size-28 text-blue-500" />
          </div>

          <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-3">
            {mvps.length > 1 ? "MVPs do Campeonato" : "MVP do Campeonato"}
          </p>

          <div className="flex flex-col gap-3">
            {mvps.map((m, idx) => (
              <div key={idx} className="flex items-center gap-4">
                <Avatar className="size-12 shrink-0 border-2 border-blue-300">
                  {m.fotoUrl && <AvatarImage src={m.fotoUrl} alt={m.nome} />}
                  <AvatarFallback className="text-sm bg-blue-100 text-blue-700 font-heading">
                    {getInitials(m.nome)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-heading font-bold text-xl text-blue-800">
                    {m.nome}
                  </p>
                  {m.posicao && (
                    <p className="text-xs text-blue-600/70 mt-0.5">{m.posicao}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Abas de conteúdo */}
      <Tabs value={abaEfetiva} onValueChange={setAbaAtiva}>
        <div className="overflow-x-auto pb-0.5">
          <TabsList className="h-auto p-1 min-w-full flex">
            {abas.map((aba) => (
              <TabsTrigger
                key={aba.value}
                value={aba.value}
                className="flex-1 gap-1.5 text-sm whitespace-nowrap"
              >
                {aba.icone}
                {aba.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="mt-4">
          <TabsContent value="inscritos">
            <JogadoresInscritos
              inscritos={tournament_registrations}
              ehAdmin={ehAdmin}
              onRemoverInscrito={(registrationId, nome) => {
                setErroRemocao(null);
                setInscritoParaRemover({ id: registrationId, nome });
              }}
              onAdicionarJogadores={abrirModalAdicionarJogadores}
              onIniciarCampeonato={() =>
                router.push(`/campeonatos/${id}/sortear`)
              }
            />
          </TabsContent>

          <TabsContent value="classificacao">
            <TabelaClassificacao times={tournament_teams} settings={settings} />
          </TabsContent>

          <TabsContent value="mata-mata">
            <ChaveMataMata
              fases={tournament_stages}
              matchScores={match_scores}
              onClickPartida={(matchId) =>
                router.push(`/campeonatos/${id}/jogos/${matchId}`)
              }
            />
          </TabsContent>

          <TabsContent value="times">
            <TimesTorneio times={tournament_teams} />
          </TabsContent>

          <TabsContent value="partidas">
            <PartidasCampeonato
              fases={tournament_stages}
              matchScores={match_scores}
              onClickPartida={(matchId) =>
                router.push(`/campeonatos/${id}/jogos/${matchId}`)
              }
            />
          </TabsContent>

          <TabsContent value="estatisticas">
            <EstatisticasCampeonato
              artilharia={artilharia}
              goleiros={goleiros}
              times={tournament_teams}
              fases={tournament_stages}
              matchScores={match_scores}
              settings={settings}
            />
          </TabsContent>

          <TabsContent value="info">
            <div className="flex flex-col items-center justify-center py-14 text-muted-foreground gap-2">
              <Trophy className="size-10 opacity-20" />
              <p className="text-sm text-center max-w-xs">
                Campeonato com inscrições abertas. Aguardando início das
                atividades.
              </p>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* Modal de confirmação de remoção de inscrição */}
      <Dialog
        open={!!inscritoParaRemover}
        onOpenChange={(aberto) => !aberto && setInscritoParaRemover(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover Inscrição</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja remover{" "}
            <span className="font-medium text-foreground">
              {inscritoParaRemover?.nome}
            </span>{" "}
            da lista de inscritos?
          </p>
          {erroRemocao && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {erroRemocao}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setInscritoParaRemover(null)}
              disabled={removendoInscrito}
              className="bg-white"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmarRemocaoInscrito}
              disabled={removendoInscrito}
              className="gap-2"
            >
              <UserMinus className="size-4" />
              {removendoInscrito ? "Removendo..." : "Remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de adição de jogadores */}
      <Dialog
        open={adicionandoJogadores}
        onOpenChange={(aberto) => !aberto && setAdicionandoJogadores(false)}
      >
        <DialogContent className="sm:max-w-lg flex flex-col max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserRoundPlus className="size-4" />
              Adicionar Jogadores
            </DialogTitle>
          </DialogHeader>

          {erroAdicao && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive shrink-0">
              {erroAdicao}
            </div>
          )}

          <div className="flex items-center justify-between text-xs shrink-0 py-1">
            <span className={cn("font-medium", capacidadeAtingida ? "text-rose-600" : "text-muted-foreground")}>
              {capacidadeAtingida
                ? "Capacidade máxima atingida"
                : `${vagasDisponiveis} vaga${vagasDisponiveis !== 1 ? "s" : ""} restante${vagasDisponiveis !== 1 ? "s" : ""}`}
            </span>
            <span className="text-muted-foreground">
              {vagasOcupadas + selecionados.size}/{capacidadeTotal} jogadores
            </span>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 -mx-6 px-6">
            {carregandoCandidatos ? (
              <div className="space-y-2 py-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-14 rounded-lg bg-muted animate-pulse"
                  />
                ))}
              </div>
            ) : candidatos.length === 0 ? (
              <div className="py-10 text-center">
                <Users className="size-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Todos os jogadores já estão inscritos.
                </p>
              </div>
            ) : (
              <div className="space-y-4 py-2">
                {candidatos.filter((c) => c.tipo === "user").length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 px-1">
                      Membros
                    </p>
                    <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                      {candidatos
                        .filter((c) => c.tipo === "user")
                        .map((candidato) => {
                          const chave = `${candidato.tipo}:${candidato.id}`;
                          const selecionado = selecionados.has(chave);
                          const bloqueado = !selecionado && capacidadeAtingida;
                          return (
                            <button
                              key={chave}
                              type="button"
                              onClick={() => alternarSelecao(chave)}
                              disabled={bloqueado}
                              className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                                bloqueado
                                  ? "opacity-40 cursor-not-allowed"
                                  : selecionado
                                    ? "bg-primary/10"
                                    : "hover:bg-muted/50",
                              )}
                            >
                              <div
                                className={cn(
                                  "size-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                                  selecionado
                                    ? "border-primary bg-primary"
                                    : "border-border",
                                )}
                              >
                                {selecionado && (
                                  <Check className="size-3 text-primary-foreground" />
                                )}
                              </div>
                              <AvatarJogador
                                nome={candidato.nome}
                                fotoUrl={null}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {candidato.nome}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {candidato.ehGoleiro ? "Goleiro" : (candidato.posicao ?? "Posição não definida")}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {candidato.ehGoleiro && (
                                  <Shield className="size-3.5 text-info" />
                                )}
                                <span className="text-xs font-semibold bg-muted px-2 py-0.5 rounded-full text-foreground">
                                  {candidato.overall}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}

                {candidatos.filter((c) => c.tipo === "guest").length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 px-1">
                      Avulsos
                    </p>
                    <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                      {candidatos
                        .filter((c) => c.tipo === "guest")
                        .map((candidato) => {
                          const chave = `${candidato.tipo}:${candidato.id}`;
                          const selecionado = selecionados.has(chave);
                          const bloqueado = !selecionado && capacidadeAtingida;
                          return (
                            <button
                              key={chave}
                              type="button"
                              onClick={() => alternarSelecao(chave)}
                              disabled={bloqueado}
                              className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                                bloqueado
                                  ? "opacity-40 cursor-not-allowed"
                                  : selecionado
                                    ? "bg-primary/10"
                                    : "hover:bg-muted/50",
                              )}
                            >
                              <div
                                className={cn(
                                  "size-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                                  selecionado
                                    ? "border-primary bg-primary"
                                    : "border-border",
                                )}
                              >
                                {selecionado && (
                                  <Check className="size-3 text-primary-foreground" />
                                )}
                              </div>
                              <AvatarJogador
                                nome={candidato.nome}
                                fotoUrl={null}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {candidato.nome}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {candidato.ehGoleiro ? "Goleiro" : (candidato.posicao ?? "Posição não definida")}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {candidato.ehGoleiro && (
                                  <Shield className="size-3.5 text-info" />
                                )}
                                <span className="text-xs font-semibold bg-muted px-2 py-0.5 rounded-full text-foreground">
                                  {candidato.overall}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0 flex-col sm:flex-row gap-2 pt-2 border-t border-border mt-2">
            <Button
              variant="outline"
              onClick={() => {
                setErroAvulso(null);
                setFormAvulso({
                  nome: "",
                  telefone: "",
                  posicao: null,
                  overall: 5,
                });
                setCriandoAvulso(true);
              }}
              className="sm:mr-auto bg-white"
            >
              <Plus className="size-3.5" />
              Criar Jogador Genérico
            </Button>
            <Button
              variant="outline"
              onClick={() => setAdicionandoJogadores(false)}
              disabled={salvandoJogadores}
              className="bg-white"
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmarAdicaoJogadores}
              disabled={selecionados.size === 0 || salvandoJogadores}
              className="gap-2"
            >
              <UserRoundPlus className="size-4" />
              {salvandoJogadores
                ? "Adicionando..."
                : selecionados.size > 0
                  ? `Adicionar (${selecionados.size})`
                  : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de criação de jogador genérico (avulso) */}
      <Dialog
        open={criandoAvulso}
        onOpenChange={(aberto) => !aberto && setCriandoAvulso(false)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Jogador Genérico</DialogTitle>
          </DialogHeader>

          {erroAvulso && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {erroAvulso}
            </div>
          )}

          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="avulso_nome">Nome *</Label>
                <Input
                  id="avulso_nome"
                  placeholder="Ex: João da Silva"
                  value={formAvulso.nome}
                  onChange={(e) =>
                    setFormAvulso((f) => ({ ...f, nome: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label
                  htmlFor="avulso_telefone"
                  className="flex items-center gap-1.5"
                >
                  <Phone className="size-3.5 text-muted-foreground" />
                  WhatsApp
                </Label>
                <Input
                  id="avulso_telefone"
                  type="tel"
                  placeholder="(11) 9 ____-____"
                  value={formAvulso.telefone}
                  onChange={(e) =>
                    setFormAvulso((f) => ({
                      ...f,
                      telefone: formatarTelefone(e.target.value),
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Posição
              </Label>
              <div className="grid grid-cols-4 gap-2">
                {POSICOES_AVULSO.map(({ valor, sigla, label }) => {
                  const selecionada = formAvulso.posicao === valor;
                  return (
                    <button
                      key={valor}
                      type="button"
                      onClick={() =>
                        setFormAvulso((f) => ({
                          ...f,
                          posicao: selecionada ? null : valor,
                        }))
                      }
                      className={cn(
                        "flex flex-col items-center gap-0.5 rounded-xl border py-3 px-2 transition-colors",
                        selecionada
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-background hover:bg-muted",
                      )}
                    >
                      <span
                        className={cn(
                          "text-sm font-bold",
                          selecionada
                            ? "text-background"
                            : valor === "GK"
                              ? "text-accent"
                              : "text-foreground",
                        )}
                      >
                        {sigla}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] hidden sm:block",
                          selecionada
                            ? "text-background/70"
                            : "text-muted-foreground",
                        )}
                      >
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3 pt-1 border-t border-border">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Overall
              </Label>
              <div className="flex items-center gap-4">
                <div className="w-20">
                  <NumericStepper
                    value={formAvulso.overall}
                    onChange={(v) =>
                      setFormAvulso((f) => ({ ...f, overall: v }))
                    }
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Nota geral do jogador usada no sorteio de times (escala 1–10)
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setCriandoAvulso(false)}
              disabled={salvandoAvulso}
              className="bg-white"
            >
              Cancelar
            </Button>
            <Button
              onClick={salvarNovoAvulso}
              disabled={salvandoAvulso}
              className="gap-2"
            >
              <Save className="size-4" />
              {salvandoAvulso ? "Salvando..." : "Criar Jogador"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
