"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Play,
  Trophy,
  Target,
  Shield,
  Plus,
  Minus,
  UserRoundPlus,
  Check,
  Loader2,
  Flag,
  X,
  Calendar,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

// ─── tipos ────────────────────────────────────────────────────────────────────

type MatchStatus = "scheduled" | "started" | "completed" | "cancelled";

type RegisteredPlayer = {
  tournamentTeamPlayerId: string;
  userId: string | null;
  guestPlayerId: string | null;
  nome: string;
  ehGoleiro: boolean;
  fotoUrl: string | null;
  posicao: string | null;
  overall: number;
};

type MatchPlayer = {
  matchPlayerId: string;
  userId: string | null;
  guestPlayerId: string | null;
  nome: string;
  ehGoleiro: boolean;
  fotoUrl: string | null;
  posicao: string | null;
  isOnLoan: boolean;
  gols: number;
};

type TeamData = {
  matchTeamId: string;
  tournamentTeamId: string | null;
  teamName: string;
  teamIndex: number;
  registeredPlayers: RegisteredPlayer[];
  matchPlayers: MatchPlayer[];
};

type TorneioPartida = {
  matchId: string;
  status: MatchStatus;
  title: string | null;
  roundLabel: string | null;
  bracketKey: string | null;
  matchDate: string;
  location: string | null;
  penaltyHomeScore: number | null;
  penaltyAwayScore: number | null;
  isVolta: boolean;
  firstLeg: { homeScore: number; awayScore: number; status: string } | null;
  stage: { id: string; type: "league" | "bracket"; order: number; status: string };
  tournament: { id: string; name: string; settings: Record<string, unknown> };
  teams: TeamData[];
};

type LoanCandidate = {
  tipo: "user" | "guest";
  id: string;
  nome: string;
  posicao: string | null;
  ehGoleiro: boolean;
  overall: number;
  fotoUrl: string | null;
};

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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Converte uma data ISO para o formato YYYY-MM-DD aceito pelo input[type=date]
function toInputDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

// ─── sub-componentes ──────────────────────────────────────────────────────────

function AvatarJogador({
  nome,
  fotoUrl,
  size = "sm",
}: {
  nome: string;
  fotoUrl: string | null;
  size?: "sm" | "default";
}) {
  return (
    <Avatar size={size}>
      {fotoUrl && <AvatarImage src={fotoUrl} alt={nome} />}
      <AvatarFallback className="bg-primary/10 text-primary font-heading text-xs">
        {getInitials(nome)}
      </AvatarFallback>
    </Avatar>
  );
}

// Card de jogador durante o jogo com botões de gol
function CardJogadorPlacar({
  jogador,
  gols,
  onAlterar,
  disabled,
  onRemover,
}: {
  jogador: MatchPlayer;
  gols: number;
  onAlterar: (novo: number) => void;
  disabled: boolean;
  onRemover?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0">
      <AvatarJogador nome={jogador.nome} fotoUrl={jogador.fotoUrl} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {jogador.nome}
          {jogador.isOnLoan && (
            <span className="ml-1.5 text-[10px] text-amber-600 font-semibold uppercase tracking-wide">
              Emp.
            </span>
          )}
        </p>
        {jogador.ehGoleiro && (
          <p className="text-[11px] text-info">Goleiro</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {jogador.ehGoleiro && <Shield className="size-3.5 text-info" />}
        <button
          type="button"
          disabled={disabled || gols <= 0}
          onClick={() => onAlterar(Math.max(0, gols - 1))}
          className="size-7 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Minus className="size-3" />
        </button>
        <span
          className={cn(
            "font-heading text-base w-6 text-center tabular-nums",
            gols > 0 ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {gols}
        </span>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onAlterar(gols + 1)}
          className="size-7 rounded-full bg-primary/10 border border-primary/30 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Plus className="size-3" />
        </button>
        {onRemover && (
          <button
            type="button"
            disabled={disabled}
            onClick={onRemover}
            title="Remover do time"
            className="size-7 rounded-full border border-destructive/30 text-destructive flex items-center justify-center hover:bg-destructive/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed ml-1"
          >
            <X className="size-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// Card de time na visão "agendada" (elenco)
function CardElencoTime({
  team,
}: {
  team: TeamData;
}) {
  // Mostra sempre os registrados + emprestados já adicionados (evita sumir registrados ao inserir empréstimo)
  const emprestados = team.matchPlayers.filter((mp) => mp.isOnLoan);
  const jogadores: Array<RegisteredPlayer | MatchPlayer> =
    [...team.registeredPlayers, ...emprestados];

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
        <div
          className={cn(
            "size-2.5 rounded-full shrink-0",
            team.teamIndex === 0 ? "bg-blue-500" : "bg-rose-500",
          )}
        />
        <h3 className="font-heading text-sm font-semibold text-foreground flex-1">
          {team.teamName}
        </h3>
        <span className="text-xs text-muted-foreground">
          {jogadores.length} jog.
        </span>
      </div>
      {jogadores.length === 0 ? (
        <div className="px-4 py-6 text-sm text-center text-muted-foreground">
          Nenhum jogador
        </div>
      ) : (
        <div className="divide-y divide-border">
          {jogadores.map((j) => {
            const nome = "nome" in j ? j.nome : (j as RegisteredPlayer).nome;
            const fotoUrl =
              "fotoUrl" in j ? j.fotoUrl : (j as RegisteredPlayer).fotoUrl;
            const ehGoleiro =
              "ehGoleiro" in j
                ? j.ehGoleiro
                : (j as RegisteredPlayer).ehGoleiro;
            const isLoan = "isOnLoan" in j ? (j as MatchPlayer).isOnLoan : false;

            return (
              <div
                key={"matchPlayerId" in j ? j.matchPlayerId : j.tournamentTeamPlayerId}
                className="flex items-center gap-3 px-4 py-2.5"
              >
                <AvatarJogador nome={nome} fotoUrl={fotoUrl} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {nome}
                    {isLoan && (
                      <span className="ml-1.5 text-[10px] text-amber-600 font-semibold uppercase">
                        Emp.
                      </span>
                    )}
                  </p>
                </div>
                {ehGoleiro && (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 bg-emerald-50 text-emerald-700 border-emerald-200"
                  >
                    GK
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Skeleton de carregamento ─────────────────────────────────────────────────

function SkeletonPartida() {
  return (
    <div className="space-y-4 animate-pulse">
      <Skeleton className="h-5 w-24 rounded" />
      <Skeleton className="h-20 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

// ─── componente principal ─────────────────────────────────────────────────────

export function TorneioPartidaClient({
  tournamentId,
  matchId,
  ehAdmin,
}: {
  tournamentId: string;
  matchId: string;
  ehAdmin: boolean;
}) {
  const router = useRouter();
  const [dados, setDados] = useState<TorneioPartida | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Estado de gols marcados: matchPlayerId → quantidade
  const [golsMarcados, setGolsMarcados] = useState<Record<string, number>>({});

  // Pênaltis para fase mata-mata
  const [penaltyHomePlacar, setPenaltyHomePlacar] = useState<string>("");
  const [penaltyAwayPlacar, setPenaltyAwayPlacar] = useState<string>("");

  // Estado de ações
  const [iniciando, setIniciando] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [removendoJogador, setRemovendoJogador] = useState<string | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);

  // Modal de empréstimo
  const [modalEmprestimoAberto, setModalEmprestimoAberto] = useState(false);
  const [teamIndexEmprestimo, setTeamIndexEmprestimo] = useState<0 | 1>(0);
  const [candidatosUsers, setCandidatosUsers] = useState<LoanCandidate[]>([]);
  const [candidatosGuests, setCandidatosGuests] = useState<LoanCandidate[]>([]);
  const [carregandoCandidatos, setCarregandoCandidatos] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [salvandoEmprestimo, setSalvandoEmprestimo] = useState(false);
  const [erroEmprestimo, setErroEmprestimo] = useState<string | null>(null);

  // Submodal de criação de jogador genérico dentro do modal de empréstimo
  const [criandoAvulso, setCriandoAvulso] = useState(false);
  const [formAvulso, setFormAvulso] = useState({ nome: "", posicao: "", ehGoleiro: false, overall: 5 });
  const [salvandoAvulso, setSalvandoAvulso] = useState(false);
  const [erroAvulso, setErroAvulso] = useState<string | null>(null);

  // Estado do modal de alteração de data da partida
  const [alterandoData, setAlterandoData] = useState(false);
  const [novaData, setNovaData] = useState("");
  const [salvandoData, setSalvandoData] = useState(false);
  const [erroData, setErroData] = useState<string | null>(null);

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/matches/${matchId}`);
      if (!res.ok) {
        setErro(res.status === 404 ? "Jogo não encontrado." : "Erro ao carregar o jogo.");
        return;
      }
      const json: TorneioPartida = await res.json();
      setDados(json);

      // Pré-preenche gols marcados com dados já salvos
      const iniciais: Record<string, number> = {};
      for (const team of json.teams) {
        for (const mp of team.matchPlayers) {
          if (mp.gols > 0) iniciais[mp.matchPlayerId] = mp.gols;
        }
      }
      setGolsMarcados(iniciais);
    } catch {
      setErro("Falha na conexão.");
    } finally {
      setCarregando(false);
    }
  }, [tournamentId, matchId]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  async function iniciarPartida() {
    setIniciando(true);
    setErroAcao(null);
    try {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/matches/${matchId}/start`,
        { method: "POST" },
      );
      if (!res.ok) {
        const json = await res.json();
        setErroAcao(json.error ?? "Erro ao iniciar partida.");
        return;
      }
      await carregarDados();
    } catch {
      setErroAcao("Falha na conexão.");
    } finally {
      setIniciando(false);
    }
  }

  async function removerJogador(matchPlayerId: string) {
    setRemovendoJogador(matchPlayerId);
    setErroAcao(null);
    try {
      const res = await fetch(`/api/matches/${matchId}/players?hard=true`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ match_player_id: matchPlayerId }),
      });
      if (!res.ok) {
        const json = await res.json();
        setErroAcao(json.error ?? "Erro ao remover jogador.");
        return;
      }
      await carregarDados();
    } catch {
      setErroAcao("Falha na conexão.");
    } finally {
      setRemovendoJogador(null);
    }
  }

  async function finalizarPartida() {
    if (!dados) return;
    setFinalizando(true);
    setErroAcao(null);
    try {
      const goals = dados.teams
        .flatMap((t) => t.matchPlayers)
        .map((mp) => ({
          userId: mp.userId ?? undefined,
          guestPlayerId: mp.guestPlayerId ?? undefined,
          quantity: golsMarcados[mp.matchPlayerId] ?? 0,
        }))
        .filter((g) => g.quantity > 0);

      const homeScore = dados.teams[0]?.matchPlayers.reduce((acc, p) => acc + (golsMarcados[p.matchPlayerId] ?? 0), 0) ?? 0;
      const awayScore = dados.teams[1]?.matchPlayers.reduce((acc, p) => acc + (golsMarcados[p.matchPlayerId] ?? 0), 0) ?? 0;

      // No jogo de volta, empate é calculado pelo saldo agregado (ida + volta)
      // homeTeam na volta era o awayTeam na ida, por isso firstLeg.awayScore conta para o homeTeam da volta
      const ehEmpateMataMata = dados.stage.type === "bracket" && (
        dados.isVolta && dados.firstLeg
          ? (dados.firstLeg.awayScore + homeScore) === (dados.firstLeg.homeScore + awayScore)
          : homeScore === awayScore
      );

      const body: Record<string, unknown> = { goals };

      if (ehEmpateMataMata) {
        const ph = parseInt(penaltyHomePlacar, 10);
        const pa = parseInt(penaltyAwayPlacar, 10);
        if (isNaN(ph) || isNaN(pa) || ph < 0 || pa < 0 || ph === pa) {
          setErroAcao("Informe o placar de pênaltis sem empate para definir o vencedor.");
          setFinalizando(false);
          return;
        }
        body.penaltyHomeScore = ph;
        body.penaltyAwayScore = pa;
      }

      const res = await fetch(
        `/api/tournaments/${tournamentId}/matches/${matchId}/finalize`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        const json = await res.json();
        setErroAcao(json.error ?? "Erro ao finalizar partida.");
        return;
      }
      await carregarDados();
    } catch {
      setErroAcao("Falha na conexão.");
    } finally {
      setFinalizando(false);
    }
  }

  async function salvarAvulso() {
    if (!formAvulso.nome.trim()) { setErroAvulso("Nome obrigatório."); return; }
    setSalvandoAvulso(true);
    setErroAvulso(null);
    try {
      const res = await fetch("/api/guest-players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formAvulso.nome.trim(),
          position: formAvulso.posicao.trim() || null,
          is_goalkeeper: formAvulso.ehGoleiro,
          overall: formAvulso.overall,
        }),
      });
      if (!res.ok) { setErroAvulso("Erro ao criar jogador."); return; }
      const novoAvulso = await res.json();
      const novoCandidato: LoanCandidate = {
        tipo: "guest",
        id: novoAvulso.id,
        nome: novoAvulso.name,
        posicao: novoAvulso.position,
        ehGoleiro: novoAvulso.is_goalkeeper,
        overall: novoAvulso.overall,
        fotoUrl: null,
      };
      setCandidatosGuests((prev) => [...prev, novoCandidato].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")));
      setSelecionados((prev) => new Set([...prev, `guest:${novoAvulso.id}`]));
      setCriandoAvulso(false);
      setFormAvulso({ nome: "", posicao: "", ehGoleiro: false, overall: 5 });
    } catch {
      setErroAvulso("Falha na conexão.");
    } finally {
      setSalvandoAvulso(false);
    }
  }

  // Envia a nova data ao backend e recarrega os dados da partida
  async function salvarNovaData() {
    if (!novaData) {
      setErroData("Data é obrigatória.");
      return;
    }
    setSalvandoData(true);
    setErroData(null);
    try {
      const res = await fetch(`/api/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ match_date: novaData }),
      });
      if (!res.ok) {
        const json = await res.json();
        setErroData(json.error ?? "Erro ao salvar data.");
        return;
      }
      setAlterandoData(false);
      await carregarDados();
    } catch {
      setErroData("Falha na conexão.");
    } finally {
      setSalvandoData(false);
    }
  }

  async function abrirModalEmprestimo(teamIndex: 0 | 1) {
    setTeamIndexEmprestimo(teamIndex);
    setSelecionados(new Set());
    setErroEmprestimo(null);
    setModalEmprestimoAberto(true);
    setCarregandoCandidatos(true);
    try {
      const res = await fetch(
        `/api/tournaments/${tournamentId}/matches/${matchId}/loan-candidates?teamIndex=${teamIndex}`,
      );
      if (res.ok) {
        const dados = await res.json();
        setCandidatosUsers(dados.users ?? []);
        setCandidatosGuests(dados.guests ?? []);
      }
    } catch {
      setErroEmprestimo("Falha ao carregar candidatos.");
    } finally {
      setCarregandoCandidatos(false);
    }
  }

  async function confirmarEmprestimo() {
    if (!dados || selecionados.size === 0) return;
    setSalvandoEmprestimo(true);
    setErroEmprestimo(null);

    const team = dados.teams[teamIndexEmprestimo];
    if (!team) return;

    try {
      const requisicoes = Array.from(selecionados).map((chave) => {
        const [tipo, id] = chave.split(":");
        const lista = tipo === "user" ? candidatosUsers : candidatosGuests;
        const candidato = lista.find((c) => c.id === id);
        if (!candidato) return Promise.resolve(null);

        const corpo =
          tipo === "user"
            ? { user_id: id, is_goalkeeper: candidato.ehGoleiro, confirmed: true, team_id: team.matchTeamId, is_on_loan: true }
            : { guest_player_id: id, is_goalkeeper: candidato.ehGoleiro, confirmed: true, team_id: team.matchTeamId, is_on_loan: true };

        return fetch(`/api/matches/${matchId}/players`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(corpo),
        });
      });

      const resultados = await Promise.all(requisicoes);
      if (resultados.some((r) => r && !r.ok)) {
        setErroEmprestimo("Alguns jogadores não puderam ser adicionados.");
        return;
      }
      setModalEmprestimoAberto(false);
      await carregarDados();
    } catch {
      setErroEmprestimo("Falha na conexão.");
    } finally {
      setSalvandoEmprestimo(false);
    }
  }

  // ─── render ──────────────────────────────────────────────────────────────────

  if (carregando) return <SkeletonPartida />;

  if (erro || !dados) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted-foreground text-sm">{erro ?? "Jogo não encontrado."}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/campeonatos/${tournamentId}`)}
        >
          <ArrowLeft className="size-4" />
          Voltar ao campeonato
        </Button>
      </div>
    );
  }

  const { status, roundLabel, teams } = dados;
  const homeTeam = teams[0];
  const awayTeam = teams[1];

  // Calcula placar atual a partir do estado local de gols (inclui gols de goleiros)
  const homePlacar = homeTeam?.matchPlayers
    .reduce((acc, p) => acc + (golsMarcados[p.matchPlayerId] ?? 0), 0) ?? 0;
  const awayPlacar = awayTeam?.matchPlayers
    .reduce((acc, p) => acc + (golsMarcados[p.matchPlayerId] ?? 0), 0) ?? 0;

  // Para o jogo de volta, o saldo agregado considera a ida + volta
  // homeTeam na volta era o awayTeam na ida, então firstLeg.awayScore conta para homeTeam da volta
  const agregadoHome = dados.isVolta && dados.firstLeg
    ? dados.firstLeg.awayScore + homePlacar
    : homePlacar;
  const agregadoAway = dados.isVolta && dados.firstLeg
    ? dados.firstLeg.homeScore + awayPlacar
    : awayPlacar;

  const ehEmpateMataMata = dados.stage.type === "bracket" && status === "started" && agregadoHome === agregadoAway;

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Voltar */}
      <Button
        variant="ghost"
        size="sm"
        className="-ml-1"
        onClick={() => router.push(`/campeonatos/${tournamentId}`)}
      >
        <ArrowLeft className="size-4" />
        {dados.tournament.name}
      </Button>

      {/* Cabeçalho */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            {roundLabel && (
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                {roundLabel}
              </p>
            )}
            <h1 className="font-heading text-xl font-bold text-foreground">
              {homeTeam?.teamName ?? "—"} × {awayTeam?.teamName ?? "—"}
            </h1>
            {dados.matchDate && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {formatDate(dados.matchDate)}
                {dados.location && ` · ${dados.location}`}
              </p>
            )}
          </div>
          <Badge
            variant="outline"
            className={cn(
              "shrink-0 text-xs",
              status === "started" && "bg-amber-50 text-amber-700 border-amber-200",
              status === "completed" && "bg-emerald-50 text-emerald-700 border-emerald-200",
              status === "scheduled" && "bg-blue-50 text-blue-700 border-blue-200",
            )}
          >
            {status === "scheduled" && "Agendado"}
            {status === "started" && "Em Andamento"}
            {status === "completed" && "Encerrado"}
            {status === "cancelled" && "Cancelado"}
          </Badge>
        </div>

        {/* Ações admin para partida agendada */}
        {ehAdmin && status === "scheduled" && (
          <div className="flex items-center gap-2 pt-2 border-t border-border flex-wrap">
            {homeTeam && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => abrirModalEmprestimo(0)}
              >
                <UserRoundPlus className="size-3.5" />
                Editar {homeTeam.teamName}
              </Button>
            )}
            {awayTeam && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => abrirModalEmprestimo(1)}
              >
                <UserRoundPlus className="size-3.5" />
                Editar {awayTeam.teamName}
              </Button>
            )}
            {/* Alterar data disponível enquanto a partida não foi iniciada */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setErroData(null);
                setNovaData(dados ? toInputDate(dados.matchDate) : "");
                setAlterandoData(true);
              }}
            >
              <Calendar className="size-3.5" />
              Alterar Data
            </Button>
            {/* Iniciar apenas quando os dois times reais já estão definidos */}
            {homeTeam?.tournamentTeamId && awayTeam?.tournamentTeamId && (
              <Button
                size="sm"
                onClick={iniciando ? undefined : iniciarPartida}
                disabled={iniciando}
                className="ml-auto"
              >
                {iniciando ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Play className="size-3.5" />
                )}
                {iniciando ? "Iniciando..." : "Iniciar Partida"}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Erro de ação */}
      {erroAcao && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {erroAcao}
        </div>
      )}

      {/* ─── Vista: AGENDADA ─────────────────────────────────────────────────── */}
      {status === "scheduled" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {homeTeam && <CardElencoTime team={homeTeam} />}
          {awayTeam && <CardElencoTime team={awayTeam} />}
        </div>
      )}

      {/* ─── Vista: EM ANDAMENTO ─────────────────────────────────────────────── */}
      {status === "started" && (
        <div className="space-y-4">
          {/* Placar ao vivo */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-center gap-4">
              <div className="flex-1 text-right">
                <p className="font-heading font-bold text-lg text-foreground leading-tight">
                  {homeTeam?.teamName}
                </p>
              </div>
              <div className="flex flex-col items-center shrink-0 px-4">
                <span className="font-heading font-bold text-4xl text-foreground tabular-nums">
                  {homePlacar}
                  <span className="text-muted-foreground mx-2">×</span>
                  {awayPlacar}
                </span>
                {dados.isVolta && dados.firstLeg && (
                  <span className="text-xs text-muted-foreground mt-1">
                    Ida: {dados.firstLeg.awayScore} × {dados.firstLeg.homeScore}
                  </span>
                )}
                {dados.isVolta && dados.firstLeg && (
                  <span className="text-xs font-semibold text-foreground mt-0.5">
                    Agregado: {agregadoHome} × {agregadoAway}
                  </span>
                )}
                <span className="text-[10px] font-semibold uppercase tracking-widest text-amber-600 mt-1">
                  Em Andamento
                </span>
              </div>
              <div className="flex-1 text-left">
                <p className="font-heading font-bold text-lg text-foreground leading-tight">
                  {awayTeam?.teamName}
                </p>
              </div>
            </div>
          </div>

          {/* Cards dos times com marcação de gols */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[homeTeam, awayTeam].filter(Boolean).map((team) => {
              if (!team) return null;
              const corBar = team.teamIndex === 0 ? "bg-blue-500" : "bg-rose-500";
              const golsTime = team.matchPlayers
                .reduce((acc, p) => acc + (golsMarcados[p.matchPlayerId] ?? 0), 0);

              return (
                <div
                  key={team.matchTeamId}
                  className="bg-card border border-border rounded-xl overflow-hidden"
                >
                  <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-muted/30">
                    <div className={cn("size-2.5 rounded-full shrink-0", corBar)} />
                    <h3 className="font-heading text-sm font-semibold text-foreground flex-1">
                      {team.teamName}
                    </h3>
                    <div className="flex items-center gap-1.5">
                      <Target className="size-3.5 text-muted-foreground" />
                      <span className="font-heading font-bold text-base tabular-nums text-foreground">
                        {golsTime}
                      </span>
                    </div>
                    {ehAdmin && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs text-muted-foreground"
                        onClick={() => abrirModalEmprestimo(team.teamIndex as 0 | 1)}
                      >
                        <UserRoundPlus className="size-3" />
                      </Button>
                    )}
                  </div>

                  {team.matchPlayers.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-center text-muted-foreground">
                      Sem jogadores
                    </div>
                  ) : (
                    <div>
                      {team.matchPlayers.map((mp) => (
                        <CardJogadorPlacar
                          key={mp.matchPlayerId}
                          jogador={mp}
                          gols={golsMarcados[mp.matchPlayerId] ?? 0}
                          onAlterar={(v) =>
                            setGolsMarcados((prev) => ({ ...prev, [mp.matchPlayerId]: v }))
                          }
                          disabled={finalizando || removendoJogador !== null}
                          onRemover={ehAdmin ? () => removerJogador(mp.matchPlayerId) : undefined}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Disputa de pênaltis (mata-mata empatado) */}
          {ehEmpateMataMata && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-amber-800">
                Empate — informe o placar da disputa de pênaltis
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    {homeTeam?.teamName ?? "Mandante"}
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={penaltyHomePlacar}
                    onChange={(e) => setPenaltyHomePlacar(e.target.value)}
                    placeholder="0"
                    className="text-center font-heading font-bold text-lg"
                    disabled={finalizando}
                  />
                </div>
                <span className="text-muted-foreground font-heading font-bold text-xl pt-5">×</span>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    {awayTeam?.teamName ?? "Visitante"}
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={penaltyAwayPlacar}
                    onChange={(e) => setPenaltyAwayPlacar(e.target.value)}
                    placeholder="0"
                    className="text-center font-heading font-bold text-lg"
                    disabled={finalizando}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Botão finalizar */}
          {ehAdmin && (
            <div className="flex justify-end pt-2">
              <Button
                size="lg"
                onClick={finalizarPartida}
                disabled={finalizando}
                className="gap-2"
              >
                {finalizando ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Flag className="size-4" />
                )}
                {finalizando ? "Finalizando..." : "Finalizar Partida"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ─── Vista: ENCERRADA ────────────────────────────────────────────────── */}
      {status === "completed" && (
        <div className="space-y-4">
          {/* Resultado final */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-center gap-4">
              <div className="flex-1 text-right">
                <p className="font-heading font-bold text-lg text-foreground">
                  {homeTeam?.teamName}
                </p>
              </div>
              <div className="flex flex-col items-center shrink-0 px-4">
                <span className="font-heading font-bold text-4xl text-foreground tabular-nums">
                  {homePlacar}
                  <span className="text-muted-foreground mx-2">×</span>
                  {awayPlacar}
                </span>
                {dados.isVolta && dados.firstLeg && (
                  <span className="text-xs text-muted-foreground mt-1">
                    Ida: {dados.firstLeg.awayScore} × {dados.firstLeg.homeScore}
                  </span>
                )}
                {dados.isVolta && dados.firstLeg && (
                  <span className="text-xs font-semibold text-foreground mt-0.5">
                    Agregado: {dados.firstLeg.awayScore + homePlacar} × {dados.firstLeg.homeScore + awayPlacar}
                  </span>
                )}
                {(dados.penaltyHomeScore !== null || dados.penaltyAwayScore !== null) && (
                  <span className="text-xs text-muted-foreground mt-1">
                    Pen. {dados.penaltyHomeScore ?? 0} × {dados.penaltyAwayScore ?? 0}
                  </span>
                )}
                <Badge
                  variant="outline"
                  className="mt-1 text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200"
                >
                  Encerrado
                </Badge>
              </div>
              <div className="flex-1 text-left">
                <p className="font-heading font-bold text-lg text-foreground">
                  {awayTeam?.teamName}
                </p>
              </div>
            </div>
          </div>

          {/* Estatísticas dos jogadores */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[homeTeam, awayTeam].filter(Boolean).map((team) => {
              if (!team) return null;
              const corBar = team.teamIndex === 0 ? "bg-blue-500" : "bg-rose-500";
              const artilheiros = team.matchPlayers
                .filter((p) => (golsMarcados[p.matchPlayerId] ?? 0) > 0)
                .sort((a, b) => (golsMarcados[b.matchPlayerId] ?? 0) - (golsMarcados[a.matchPlayerId] ?? 0));
              const goleirosZero = team.matchPlayers
                .filter((p) => p.ehGoleiro && (golsMarcados[p.matchPlayerId] ?? 0) === 0);

              return (
                <div
                  key={team.matchTeamId}
                  className="bg-card border border-border rounded-xl overflow-hidden"
                >
                  <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-muted/30">
                    <div className={cn("size-2.5 rounded-full shrink-0", corBar)} />
                    <h3 className="font-heading text-sm font-semibold text-foreground">
                      {team.teamName}
                    </h3>
                  </div>
                  {artilheiros.length === 0 && goleirosZero.length === 0 ? (
                    <div className="px-4 py-4 text-sm text-center text-muted-foreground">
                      Sem registros
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {artilheiros.map((mp) => (
                        <div key={mp.matchPlayerId} className="flex items-center gap-3 px-4 py-2.5">
                          <AvatarJogador nome={mp.nome} fotoUrl={mp.fotoUrl} />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-foreground truncate block">{mp.nome}</span>
                            {mp.ehGoleiro && <span className="text-[11px] text-info">Goleiro</span>}
                          </div>
                          <div className="flex items-center gap-1.5 text-sm font-bold text-foreground shrink-0">
                            {mp.ehGoleiro && <Shield className="size-3.5 text-info" />}
                            <Target className="size-3.5 text-muted-foreground" />
                            {golsMarcados[mp.matchPlayerId] ?? 0}
                          </div>
                        </div>
                      ))}
                      {goleirosZero.map((gk) => (
                        <div key={gk.matchPlayerId} className="flex items-center gap-3 px-4 py-2.5">
                          <AvatarJogador nome={gk.nome} fotoUrl={gk.fotoUrl} />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-foreground truncate block">{gk.nome}</span>
                            <span className="text-[11px] text-info">Goleiro</span>
                          </div>
                          <Shield className="size-3.5 text-info shrink-0" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Modal de alteração de data ──────────────────────────────────────── */}
      <Dialog
        open={alterandoData}
        onOpenChange={(aberto) => !aberto && setAlterandoData(false)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="size-4" />
              Alterar Data da Partida
            </DialogTitle>
          </DialogHeader>

          {erroData && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {erroData}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="nova_data_partida" className="flex items-center gap-1.5">
              <Calendar className="size-3.5 text-muted-foreground" />
              Nova Data *
            </Label>
            <Input
              id="nova_data_partida"
              type="date"
              value={novaData}
              onChange={(e) => setNovaData(e.target.value)}
              disabled={salvandoData}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setAlterandoData(false)}
              disabled={salvandoData}
              className="bg-white"
            >
              Cancelar
            </Button>
            <Button
              onClick={salvarNovaData}
              disabled={salvandoData || !novaData}
              className="gap-2"
            >
              {salvandoData ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {salvandoData ? "Salvando..." : "Salvar Data"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Modal de empréstimo ─────────────────────────────────────────────── */}
      <Dialog
        open={modalEmprestimoAberto}
        onOpenChange={(aberto) => !aberto && setModalEmprestimoAberto(false)}
      >
        <DialogContent className="sm:max-w-lg flex flex-col max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserRoundPlus className="size-4" />
              Adicionar Jogador Emprestado
              {dados && (
                <span className="text-muted-foreground font-normal text-sm">
                  — {dados.teams[teamIndexEmprestimo]?.teamName}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {erroEmprestimo && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive shrink-0">
              {erroEmprestimo}
            </div>
          )}

          <div className="flex-1 overflow-y-auto min-h-0 -mx-6 px-6">
            {carregandoCandidatos ? (
              <div className="space-y-2 py-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : candidatosUsers.length === 0 && candidatosGuests.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-sm text-muted-foreground">
                  Nenhum jogador disponível.
                </p>
              </div>
            ) : (
              <div className="space-y-4 py-2">
                {candidatosUsers.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 px-1">
                      Jogadores Cadastrados
                    </p>
                    <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                      {candidatosUsers.map((c) => {
                        const chave = `user:${c.id}`;
                        return (
                          <CandidatoItem
                            key={chave}
                            candidato={c}
                            selecionado={selecionados.has(chave)}
                            onToggle={() =>
                              setSelecionados((prev) => {
                                const novo = new Set(prev);
                                novo.has(chave) ? novo.delete(chave) : novo.add(chave);
                                return novo;
                              })
                            }
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
                {candidatosGuests.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1.5 px-1">
                      Jogadores Genéricos
                    </p>
                    <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                      {candidatosGuests.map((c) => {
                        const chave = `guest:${c.id}`;
                        return (
                          <CandidatoItem
                            key={chave}
                            candidato={c}
                            selecionado={selecionados.has(chave)}
                            onToggle={() =>
                              setSelecionados((prev) => {
                                const novo = new Set(prev);
                                novo.has(chave) ? novo.delete(chave) : novo.add(chave);
                                return novo;
                              })
                            }
                          />
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
                setFormAvulso({ nome: "", posicao: "", ehGoleiro: false, overall: 5 });
                setCriandoAvulso(true);
              }}
              disabled={salvandoEmprestimo}
              className="sm:mr-auto bg-white"
            >
              <Plus className="size-3.5" />
              Criar Jogador Genérico
            </Button>
            <Button
              variant="outline"
              onClick={() => setModalEmprestimoAberto(false)}
              disabled={salvandoEmprestimo}
              className="bg-white"
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmarEmprestimo}
              disabled={selecionados.size === 0 || salvandoEmprestimo}
              className="gap-2"
            >
              <UserRoundPlus className="size-4" />
              {salvandoEmprestimo
                ? "Adicionando..."
                : selecionados.size > 0
                  ? `Adicionar (${selecionados.size})`
                  : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Submodal: criar jogador genérico ─────────────────────────────────── */}
      <Dialog open={criandoAvulso} onOpenChange={(o) => !o && setCriandoAvulso(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Novo Jogador Genérico</DialogTitle>
          </DialogHeader>

          {erroAvulso && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {erroAvulso}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="avulso_nome_emp">Nome *</Label>
              <Input
                id="avulso_nome_emp"
                placeholder="Ex: João da Silva"
                value={formAvulso.nome}
                onChange={(e) => setFormAvulso((f) => ({ ...f, nome: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="avulso_pos_emp">Posição</Label>
              <Input
                id="avulso_pos_emp"
                placeholder="Ex: Atacante"
                value={formAvulso.posicao}
                onChange={(e) => setFormAvulso((f) => ({ ...f, posicao: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setFormAvulso((f) => ({ ...f, ehGoleiro: !f.ehGoleiro }))}
                className={cn(
                  "size-5 rounded border-2 flex items-center justify-center transition-colors shrink-0",
                  formAvulso.ehGoleiro ? "border-primary bg-primary" : "border-border",
                )}
              >
                {formAvulso.ehGoleiro && <Check className="size-3 text-primary-foreground" />}
              </button>
              <Label className="cursor-pointer" onClick={() => setFormAvulso((f) => ({ ...f, ehGoleiro: !f.ehGoleiro }))}>
                É goleiro
              </Label>
            </div>
            <div className="space-y-1.5">
              <Label>Overall: {formAvulso.overall}</Label>
              <input
                type="range"
                min={1}
                max={10}
                value={formAvulso.overall}
                onChange={(e) => setFormAvulso((f) => ({ ...f, overall: Number(e.target.value) }))}
                className="w-full accent-primary"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setCriandoAvulso(false)} disabled={salvandoAvulso} className="bg-white">
              Cancelar
            </Button>
            <Button onClick={salvarAvulso} disabled={salvandoAvulso || !formAvulso.nome.trim()}>
              {salvandoAvulso ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              {salvandoAvulso ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── item de candidato no modal ───────────────────────────────────────────────

function CandidatoItem({
  candidato,
  selecionado,
  onToggle,
}: {
  candidato: LoanCandidate;
  selecionado: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
        selecionado ? "bg-primary/10" : "hover:bg-muted/50",
      )}
    >
      <div
        className={cn(
          "size-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
          selecionado ? "border-primary bg-primary" : "border-border",
        )}
      >
        {selecionado && <Check className="size-3 text-primary-foreground" />}
      </div>
      <Avatar size="sm">
        {candidato.fotoUrl && <AvatarImage src={candidato.fotoUrl} alt={candidato.nome} />}
        <AvatarFallback className="bg-primary/10 text-primary font-heading text-xs">
          {candidato.nome
            .split(/[\s._-]+/)
            .filter(Boolean)
            .map((n) => n[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{candidato.nome}</p>
        <p className="text-xs text-muted-foreground">
          {candidato.posicao ?? (candidato.ehGoleiro ? "Goleiro" : "Campo")}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {candidato.ehGoleiro && <Shield className="size-3.5 text-info" />}
        <span className="text-xs font-semibold bg-muted px-2 py-0.5 rounded-full text-foreground">
          {candidato.overall}
        </span>
      </div>
    </button>
  );
}
