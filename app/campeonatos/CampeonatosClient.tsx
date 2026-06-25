"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Minus,
  Trophy,
  MapPin,
  Users,
  Calendar,
  Pencil,
  Trash2,
  UserPlus,
  UserMinus,
  ChevronRight,
  ChevronLeft,
  BarChart3,
  GitBranch,
  Layers,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { tournament_status } from "@/generated/prisma";

// ─── tipos ────────────────────────────────────────────────────────────────────

type FiltroCamp = "todos" | "inscricoes" | "ativos" | "encerrados";

const TABS_CAMP: { label: string; value: FiltroCamp }[] = [
  { label: "Todos", value: "todos" },
  { label: "Inscrições Abertas", value: "inscricoes" },
  { label: "Em Andamento", value: "ativos" },
  { label: "Encerrados", value: "encerrados" },
];

type TournamentStatus = "registration" | "active" | "finished" | "cancelled";
type FormatoCompetição = "league_only" | "bracket_only" | "league_and_bracket";

type TournamentSettings = {
  format: FormatoCompetição;
  league_legs: 1 | 2;
  bracket_legs: 1 | 2;
  qualifying_teams?: number;
};

type TournamentTeam = {
  id: string;
  team_name: string;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
};

type TournamentRegistration = {
  id: string;
  user_id: string | null;
};

type SessaoMvpTorneio = {
  is_closed: boolean;
  closes_at: string;
  total_votes_cast: number;
  eligible_voters: number;
} | null;

type Tournament = {
  id: string;
  name: string;
  status: TournamentStatus;
  is_special_event: boolean;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
  num_teams: number;
  squad_size: number;
  settings: TournamentSettings | Record<string, never>;
  created_at: string;
  tournament_teams: TournamentTeam[];
  tournament_registrations: TournamentRegistration[];
  tournament_mvp_voting_sessions: SessaoMvpTorneio;
  userParticipated: boolean;
  _count: { tournament_registrations: number };
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return "";
  const capitalize = (s: string) =>
    s.charAt(0).toUpperCase() + s.slice(1).replace(".", "");
  if (start && end) {
    const s = new Date(start);
    const e = new Date(end);
    const diaS = s.getUTCDate();
    const diaE = e.getUTCDate();
    const mesS = s.toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" });
    const mesE = e.toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" });
    const anoS = s.getUTCFullYear();
    const anoE = e.getUTCFullYear();
    if (anoS === anoE)
      return `${diaS} ${capitalize(mesS)} – ${diaE} ${capitalize(mesE)} ${anoE}`;
    return `${diaS} ${capitalize(mesS)} ${anoS} – ${diaE} ${capitalize(mesE)} ${anoE}`;
  }
  const d = new Date(start ?? end ?? "");
  const dia = d.getUTCDate();
  const mes = d.toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" });
  const ano = d.getUTCFullYear();
  return `${dia} ${capitalize(mes)} ${ano}`;
}

function toInputDate(dateStr: string): string {
  const d = new Date(dateStr);
  const ano = d.getUTCFullYear();
  const mes = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  const dia = d.getUTCDate().toString().padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function calcPosition(teams: TournamentTeam[], teamId: string): number {
  const sorted = [...teams].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const gdA = a.goals_for - a.goals_against;
    const gdB = b.goals_for - b.goals_against;
    if (gdB !== gdA) return gdB - gdA;
    return b.goals_for - a.goals_for;
  });
  return sorted.findIndex((t) => t.id === teamId) + 1;
}

function descricaoFormato(
  settings: TournamentSettings | Record<string, never>,
): string {
  const s = settings as Partial<TournamentSettings>;
  if (!s.format) return "";
  const map: Record<FormatoCompetição, string> = {
    league_only: "Classificação",
    bracket_only: "Mata-mata",
    league_and_bracket: "Classificação + Mata-mata",
  };
  return map[s.format] ?? "";
}

// ─── cards ────────────────────────────────────────────────────────────────────

function CardCampeonatoAtivo({
  camp,
  ehAdmin,
  onEdit,
  onDelete,
  onDetalhes,
}: {
  camp: Tournament;
  ehAdmin: boolean;
  onEdit: (c: Tournament) => void;
  onDelete: (c: Tournament) => void;
  onDetalhes: () => void;
}) {
  const totalJogos = camp.tournament_teams.reduce(
    (acc, t) => acc + t.wins + t.draws + t.losses,
    0,
  );
  const ourTeam =
    camp.tournament_teams.length > 0
      ? [...camp.tournament_teams].sort(
          (a, b) => b.wins + b.draws + b.losses - (a.wins + a.draws + a.losses),
        )[0]
      : null;
  const position = ourTeam
    ? calcPosition(camp.tournament_teams, ourTeam.id)
    : null;
  const jogosNosso = ourTeam
    ? ourTeam.wins + ourTeam.draws + ourTeam.losses
    : 0;
  const formato = descricaoFormato(camp.settings);

  return (
    <div
      className="relative bg-card border border-border rounded-xl overflow-hidden cursor-pointer hover:border-amber-300 hover:shadow-sm transition-all"
      onClick={onDetalhes}
    >
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400" />

      <div className="pl-5 pr-4 py-4 flex flex-col md:flex-row md:items-center gap-4">
        <div className="hidden md:flex size-14 shrink-0 items-center justify-center rounded-lg bg-amber-50 border border-amber-200">
          <Trophy className="size-7 text-amber-500" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground text-base md:text-lg leading-tight">
            {camp.name}
          </h3>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-muted-foreground">
            {(camp.start_date || camp.end_date) && (
              <span className="flex items-center gap-1">
                <Calendar className="size-3.5" />
                {formatDateRange(camp.start_date, camp.end_date)}
              </span>
            )}
            {camp.tournament_teams.length > 0 && (
              <span className="flex items-center gap-1">
                <Users className="size-3.5" />
                {camp.tournament_teams.length} equipes
              </span>
            )}
            {camp.location && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" />
                {camp.location}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {formato && (
              <Badge
                variant="outline"
                className="bg-amber-50 text-amber-700 border-amber-200 text-xs"
              >
                {formato}
              </Badge>
            )}
            {position && camp.tournament_teams.length > 1 && (
              <Badge variant="outline" className="text-xs">
                {position}º na tabela
              </Badge>
            )}
          </div>
        </div>

        <div className="flex md:flex-col items-center md:items-end gap-3">
          {ourTeam && jogosNosso > 0 && (
            <div className="text-right">
              <p className="font-heading font-bold text-lg text-foreground">
                {ourTeam.wins}V {ourTeam.draws}E {ourTeam.losses}D
              </p>
              <p className="text-xs text-muted-foreground">
                {totalJogos > 0 ? `${totalJogos} jogos` : ""}
              </p>
            </div>
          )}
          {ehAdmin && (
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <Button size="sm" variant="outline" onClick={() => onEdit(camp)}>
                <Pencil className="size-3.5" />
                Editar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive border-destructive/40 bg-white hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onDelete(camp)}
              >
                <Trash2 className="size-3.5" />
                Excluir
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CardCampeonatoInscricoes({
  camp,
  ehAdmin,
  inscrito,
  carregandoInscricao,
  onInscrever,
  onCancelarInscricao,
  onEdit,
  onDelete,
  onDetalhes,
}: {
  camp: Tournament;
  ehAdmin: boolean;
  inscrito: boolean;
  carregandoInscricao: boolean;
  onInscrever: (id: string) => void;
  onCancelarInscricao: (id: string) => void;
  onEdit: (c: Tournament) => void;
  onDelete: (c: Tournament) => void;
  onDetalhes: () => void;
}) {
  const formato = descricaoFormato(camp.settings);
  const squadInfo =
    camp.squad_size > 0 ? `${camp.squad_size + 1} jogadores/time` : "";
  const capacidadeTotal = camp.num_teams * (camp.squad_size + 1);
  const vagasEsgotadas = camp._count.tournament_registrations >= capacidadeTotal;

  return (
    <div
      className="bg-card border border-border rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4 cursor-pointer hover:border-foreground/20 hover:shadow-sm transition-all"
      onClick={onDetalhes}
    >
      <div className="hidden md:flex size-14 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Trophy className="size-7 text-muted-foreground" />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-foreground text-base md:text-lg">
          {camp.name}
        </h3>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-muted-foreground">
          {(camp.start_date || camp.end_date) && (
            <span className="flex items-center gap-1">
              <Calendar className="size-3.5" />
              {formatDateRange(camp.start_date, camp.end_date)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Users className="size-3.5" />
            {camp.num_teams} times · {squadInfo}
          </span>
          {camp.location && (
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" />
              {camp.location}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 text-xs">
            Inscrições Abertas
          </Badge>
          {formato && (
            <Badge variant="outline" className="text-xs">
              {formato}
            </Badge>
          )}
          {inscrito && (
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 text-xs">
              Inscrito
            </Badge>
          )}
          {vagasEsgotadas && !inscrito && (
            <Badge className="bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-100 text-xs">
              Vagas esgotadas
            </Badge>
          )}
        </div>
      </div>

      <div
        className="flex items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        {ehAdmin && camp.status !== "finished" && camp.status !== "cancelled" && (
          <>
            <Button size="sm" variant="outline" onClick={() => onEdit(camp)}>
              <Pencil className="size-3.5" />
              Editar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive border-destructive/40 bg-white hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onDelete(camp)}
            >
              <Trash2 className="size-3.5" />
              Excluir
            </Button>
          </>
        )}
        {inscrito ? (
          <Button
            size="sm"
            variant="outline"
            className="text-destructive border-destructive/40 bg-white hover:bg-destructive/10 hover:text-destructive"
            disabled={carregandoInscricao}
            onClick={() => onCancelarInscricao(camp.id)}
          >
            <UserMinus className="size-3.5" />
            {carregandoInscricao ? "Cancelando..." : "Cancelar inscrição"}
          </Button>
        ) : !vagasEsgotadas ? (
          <Button
            size="sm"
            className="gap-1.5 bg-foreground text-background hover:bg-foreground/90"
            disabled={carregandoInscricao}
            onClick={() => onInscrever(camp.id)}
          >
            <UserPlus className="size-4" />
            {carregandoInscricao ? "Inscrevendo..." : "Inscrever"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function CardCampeonatoEncerrado({
  camp,
  ehAdmin,
  onEdit,
  onDelete,
  onDetalhes,
}: {
  camp: Tournament;
  ehAdmin: boolean;
  onEdit: (c: Tournament) => void;
  onDelete: (c: Tournament) => void;
  onDetalhes: () => void;
}) {
  const sessao = camp.tournament_mvp_voting_sessions;
  const participouDoTorneio = camp.userParticipated;
  const votacaoAberta =
    sessao &&
    !sessao.is_closed &&
    new Date() < new Date(sessao.closes_at) &&
    (ehAdmin || participouDoTorneio);

  return (
    <div
      className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 opacity-80 cursor-pointer hover:opacity-100 hover:border-foreground/20 hover:shadow-sm transition-all"
      onClick={onDetalhes}
    >
      <div className="hidden md:flex size-12 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Trophy className="size-6 text-muted-foreground/60" />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-foreground text-sm md:text-base">
          {camp.name}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatDateRange(camp.start_date, camp.end_date)}
          {descricaoFormato(camp.settings) &&
            ` · ${descricaoFormato(camp.settings)}`}
        </p>
      </div>

      <div
        className="flex items-center gap-2 shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Oculta edição/exclusão em campeonatos encerrados ou cancelados */}
        {ehAdmin && camp.status !== "finished" && camp.status !== "cancelled" && (
          <>
            <Button size="sm" variant="outline" onClick={() => onEdit(camp)}>
              <Pencil className="size-3.5" />
              Editar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive border-destructive/40 bg-white hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onDelete(camp)}
            >
              <Trash2 className="size-3.5" />
              Excluir
            </Button>
          </>
        )}
        {votacaoAberta && (
          <Link href={`/campeonatos/${camp.id}/votacao`}>
            <Button
              size="sm"
              className="gap-1.5 bg-gold hover:bg-gold/90 text-white"
            >
              <Star className="size-3.5 fill-white" />
              Votar MVP
            </Button>
          </Link>
        )}
        <Badge
          variant="outline"
          className="text-xs text-emerald-600 border-emerald-200 bg-emerald-50"
        >
          Encerrado
        </Badge>
      </div>
    </div>
  );
}

// ─── wizard de criação/edição ──────────────────────────────────────────────────

type StepBasico = {
  nome: string;
  local: string;
  dataInicio: string;
  dataFim: string;
};

type StepTimes = {
  numTimes: number;
  squadSize: number;
};

type StepFormato = {
  formato: FormatoCompetição;
  leagueLegs: 1 | 2;
  bracketLegs: 1 | 2;
  qualifyingTeams: number;
};

function StepIndicador({ step, atual }: { step: number; atual: number }) {
  const feito = atual > step;
  const ativo = atual === step;
  return (
    <div
      className={cn(
        "size-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors",
        feito && "bg-foreground text-background border-foreground",
        ativo && "border-foreground text-foreground",
        !feito &&
          !ativo &&
          "border-muted-foreground/30 text-muted-foreground/50",
      )}
    >
      {step}
    </div>
  );
}

function BotaoFormato({
  formato,
  selecionado,
  onClick,
  icone,
  label,
  descricao,
  desabilitado,
  motivoDesabilitado,
}: {
  formato: FormatoCompetição;
  selecionado: FormatoCompetição;
  onClick: (f: FormatoCompetição) => void;
  icone: React.ReactNode;
  label: string;
  descricao: string;
  desabilitado?: boolean;
  motivoDesabilitado?: string;
}) {
  const ativo = formato === selecionado;
  return (
    <button
      type="button"
      onClick={() => !desabilitado && onClick(formato)}
      disabled={desabilitado}
      title={desabilitado ? motivoDesabilitado : undefined}
      className={cn(
        "flex flex-col gap-1.5 p-3 rounded-lg border-2 text-left transition-colors w-full",
        desabilitado
          ? "border-border opacity-40 cursor-not-allowed"
          : ativo
            ? "border-foreground bg-foreground/5"
            : "border-border hover:border-muted-foreground/40",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2",
          desabilitado
            ? "text-muted-foreground"
            : ativo
              ? "text-foreground"
              : "text-muted-foreground",
        )}
      >
        {icone}
        <span className="font-semibold text-sm">{label}</span>
      </div>
      <p
        className={cn(
          "text-xs leading-snug",
          desabilitado
            ? "text-muted-foreground/50"
            : ativo
              ? "text-foreground/70"
              : "text-muted-foreground/60",
        )}
      >
        {/* Exibe o motivo da restrição quando o formato está desabilitado */}
        {desabilitado && motivoDesabilitado ? motivoDesabilitado : descricao}
      </p>
    </button>
  );
}

function InputNumerico({
  value,
  onChange,
  min,
  max,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div className="flex items-center gap-0">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="size-10 flex items-center justify-center rounded-l-md border border-border bg-muted hover:bg-muted/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <Minus className="size-4" />
      </button>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          const v = parseInt(e.target.value);
          if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v)));
        }}
        className="w-14 h-10 border-y border-border bg-background text-center text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-ring [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="size-10 flex items-center justify-center rounded-r-md border border-border bg-muted hover:bg-muted/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

function BotaoLegs({
  valor,
  selecionado,
  onClick,
  label,
  sublabel,
}: {
  valor: 1 | 2;
  selecionado: 1 | 2;
  onClick: (v: 1 | 2) => void;
  label: string;
  sublabel: string;
}) {
  const ativo = valor === selecionado;
  return (
    <button
      type="button"
      onClick={() => onClick(valor)}
      className={cn(
        "flex-1 flex flex-col items-center gap-0.5 py-2.5 px-3 rounded-lg border-2 transition-colors",
        ativo
          ? "border-foreground bg-foreground/5"
          : "border-border hover:border-muted-foreground/40",
      )}
    >
      <span
        className={cn(
          "text-sm font-semibold",
          ativo ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          "text-xs",
          ativo ? "text-foreground/60" : "text-muted-foreground/50",
        )}
      >
        {sublabel}
      </span>
    </button>
  );
}

function DialogCriarCampeonato({
  open,
  onOpenChange,
  campeonato,
  onSalvo,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  campeonato: Tournament | null;
  onSalvo: () => void;
}) {
  const isEdicao = !!campeonato;
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  // Step 1
  const [basico, setBasico] = useState<StepBasico>({
    nome: "",
    local: "",
    dataInicio: "",
    dataFim: "",
  });

  // Step 2
  const [times, setTimes] = useState<StepTimes>({
    numTimes: 4,
    squadSize: 6,
  });

  // Step 3
  const [formato, setFormato] = useState<StepFormato>({
    formato: "league_only",
    leagueLegs: 1,
    bracketLegs: 1,
    qualifyingTeams: 2,
  });

  useEffect(() => {
    if (open) {
      setStep(1);
      setErro("");
      if (campeonato) {
        const s = campeonato.settings as Partial<TournamentSettings>;
        setBasico({
          nome: campeonato.name,
          local: campeonato.location ?? "",
          dataInicio: campeonato.start_date
            ? toInputDate(campeonato.start_date)
            : "",
          dataFim: campeonato.end_date ? toInputDate(campeonato.end_date) : "",
        });
        setTimes({
          numTimes: campeonato.num_teams ?? 4,
          squadSize: campeonato.squad_size ?? 6,
        });
        setFormato({
          formato: s.format ?? "league_only",
          leagueLegs: s.league_legs ?? 1,
          bracketLegs: s.bracket_legs ?? 1,
          qualifyingTeams: s.qualifying_teams ?? 2,
        });
      } else {
        setBasico({ nome: "", local: "", dataInicio: "", dataFim: "" });
        setTimes({ numTimes: 4, squadSize: 6 });
        setFormato({
          formato: "league_only",
          leagueLegs: 1,
          bracketLegs: 1,
          qualifyingTeams: 2,
        });
      }
    }
  }, [open, campeonato]);

  const timesImpar = times.numTimes % 2 !== 0;

  // Reseta para "Classificação" se o número de times se tornar ímpar
  // enquanto o formato "Mata-mata" estava selecionado
  useEffect(() => {
    if (timesImpar && formato.formato === "bracket_only") {
      setFormato((anterior) => ({ ...anterior, formato: "league_only" }));
    }
  }, [timesImpar, formato.formato]);

  function validarStep1(): string {
    if (!basico.nome.trim()) return "Nome do campeonato é obrigatório.";
    if (!isEdicao && !basico.dataInicio) return "Data de início é obrigatória.";
    if (!isEdicao && !basico.dataFim) return "Data de fim é obrigatória.";
    if (basico.dataInicio && basico.dataFim && basico.dataFim < basico.dataInicio)
      return "A data de término não pode ser anterior à data de início.";
    return "";
  }

  function validarStep2(): string {
    if (times.numTimes < 2) return "Mínimo de 2 times.";
    if (times.squadSize < 1) return "Mínimo de 1 jogador de linha por time.";
    return "";
  }

  function validarStep3(): string {
    const { formato: fmt, qualifyingTeams } = formato;
    // Bloqueia mata-mata puro quando o número de times é ímpar
    if (fmt === "bracket_only" && timesImpar) {
      return "Número ímpar de times não permite formato apenas Mata-mata.";
    }
    if (fmt === "league_and_bracket") {
      if (qualifyingTeams < 2) return "Mínimo de 2 times para o mata-mata.";
      if (qualifyingTeams > times.numTimes)
        return "Times classificados não pode ser maior que o total de times.";
    }
    return "";
  }

  function avancar() {
    setErro("");
    if (step === 1) {
      const e = validarStep1();
      if (e) {
        setErro(e);
        return;
      }
      setStep(2);
    } else if (step === 2) {
      const e = validarStep2();
      if (e) {
        setErro(e);
        return;
      }
      setStep(3);
    }
  }

  async function handleSalvar() {
    const e = validarStep3();
    if (e) {
      setErro(e);
      return;
    }

    setLoading(true);
    setErro("");

    const { formato: fmt, leagueLegs, bracketLegs, qualifyingTeams } = formato;

    const settings: TournamentSettings = {
      format: fmt,
      league_legs: leagueLegs,
      bracket_legs: bracketLegs,
      ...(fmt === "league_and_bracket" && {
        qualifying_teams: qualifyingTeams,
      }),
    };

    const payload = {
      name: basico.nome.trim(),
      location: basico.local.trim() || null,
      start_date: basico.dataInicio || null,
      end_date: basico.dataFim || null,
      num_teams: times.numTimes,
      squad_size: times.squadSize,
      settings,
    };

    try {
      const url = isEdicao
        ? `/api/tournaments/${campeonato!.id}`
        : "/api/tournaments";
      const method = isEdicao ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json();
        setErro(d.error ?? "Erro ao salvar.");
        return;
      }
      onSalvo();
      onOpenChange(false);
    } catch {
      setErro("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  }

  const inclaiClassificacao =
    formato.formato === "league_only" ||
    formato.formato === "league_and_bracket";
  const inclaiMataMAta =
    formato.formato === "bracket_only" ||
    formato.formato === "league_and_bracket";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdicao ? "Editar Campeonato" : "Novo Campeonato"}
          </DialogTitle>
        </DialogHeader>

        {/* indicador de steps */}
        <div className="flex items-center gap-2 py-1">
          <StepIndicador step={1} atual={step} />
          <div
            className={cn(
              "flex-1 h-px",
              step > 1 ? "bg-foreground" : "bg-muted-foreground/20",
            )}
          />
          <StepIndicador step={2} atual={step} />
          <div
            className={cn(
              "flex-1 h-px",
              step > 2 ? "bg-foreground" : "bg-muted-foreground/20",
            )}
          />
          <StepIndicador step={3} atual={step} />
        </div>

        {/* step 1 — informações básicas */}
        {step === 1 && (
          <div className="flex flex-col gap-4 py-1">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nome-camp">Nome *</Label>
              <Input
                id="nome-camp"
                value={basico.nome}
                onChange={(e) =>
                  setBasico((p) => ({ ...p, nome: e.target.value }))
                }
                placeholder="Copa dos Amigos 2026"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="local-camp">Local</Label>
              <Input
                id="local-camp"
                value={basico.local}
                onChange={(e) =>
                  setBasico((p) => ({ ...p, local: e.target.value }))
                }
                placeholder="Arena do Bairro"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="inicio-camp">
                  Data de Início {!isEdicao && "*"}
                </Label>
                <Input
                  id="inicio-camp"
                  type="date"
                  value={basico.dataInicio}
                  onChange={(e) =>
                    setBasico((p) => ({ ...p, dataInicio: e.target.value }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fim-camp">
                  Data de Fim {!isEdicao && "*"}
                </Label>
                <Input
                  id="fim-camp"
                  type="date"
                  value={basico.dataFim}
                  onChange={(e) =>
                    setBasico((p) => ({ ...p, dataFim: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* step 2 — times e jogadores */}
        {step === 2 && (
          <div className="flex flex-col gap-5 py-1">
            <div className="flex flex-col gap-1.5">
              <Label>Número de times</Label>
              <div className="flex items-center gap-3">
                <InputNumerico
                  value={times.numTimes}
                  min={2}
                  max={64}
                  onChange={(v) => setTimes((p) => ({ ...p, numTimes: v }))}
                />
                <span className="text-sm text-muted-foreground">
                  times participantes
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Jogadores de linha por time</Label>
              <div className="flex items-center gap-3">
                <InputNumerico
                  value={times.squadSize}
                  min={1}
                  max={20}
                  onChange={(v) => setTimes((p) => ({ ...p, squadSize: v }))}
                />
                <span className="text-sm text-muted-foreground">
                  {times.squadSize >= 1
                    ? `${times.squadSize} de linha + 1 goleiro`
                    : "mínimo 1 jogador de linha"}
                </span>
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 border border-border p-3 text-sm text-muted-foreground">
              Total de jogadores no torneio:{" "}
              <span className="font-semibold text-foreground">
                {times.numTimes * (times.squadSize + 1)} jogadores
              </span>
            </div>
          </div>
        )}

        {/* step 3 — formato da competição */}
        {step === 3 && (
          <div className="flex flex-col gap-4 py-1">
            <div className="flex flex-col gap-2">
              <Label>Formato da competição</Label>
              <div className="grid grid-cols-1 gap-2">
                <BotaoFormato
                  formato="league_only"
                  selecionado={formato.formato}
                  onClick={(f) => setFormato((p) => ({ ...p, formato: f }))}
                  icone={<BarChart3 className="size-4" />}
                  label="Classificação"
                  descricao="Todos os times se enfrentam em rodadas. O campeão é o primeiro colocado."
                />
                <BotaoFormato
                  formato="bracket_only"
                  selecionado={formato.formato}
                  onClick={(f) => setFormato((p) => ({ ...p, formato: f }))}
                  icone={<GitBranch className="size-4" />}
                  label="Mata-mata"
                  descricao="Confrontos eliminatórios diretos com sorteio do chaveamento."
                  desabilitado={timesImpar}
                  motivoDesabilitado="Número ímpar de times não permite apenas Mata-mata. Use Classificação ou Classificação + Mata-mata."
                />
                <BotaoFormato
                  formato="league_and_bracket"
                  selecionado={formato.formato}
                  onClick={(f) => setFormato((p) => ({ ...p, formato: f }))}
                  icone={<Layers className="size-4" />}
                  label="Classificação + Mata-mata"
                  descricao="Fase de grupos seguida de mata-mata com os melhores colocados."
                />
              </div>
            </div>

            {inclaiClassificacao && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm">Rodadas da classificação</Label>
                <div className="flex gap-2">
                  <BotaoLegs
                    valor={1}
                    selecionado={formato.leagueLegs}
                    onClick={(v) =>
                      setFormato((p) => ({ ...p, leagueLegs: v }))
                    }
                    label="Turno único"
                    sublabel="Cada par joga 1x"
                  />
                  <BotaoLegs
                    valor={2}
                    selecionado={formato.leagueLegs}
                    onClick={(v) =>
                      setFormato((p) => ({ ...p, leagueLegs: v }))
                    }
                    label="Ida e volta"
                    sublabel="Cada par joga 2x"
                  />
                </div>
              </div>
            )}

            {inclaiMataMAta && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm">Jogos do mata-mata</Label>
                <div className="flex gap-2">
                  <BotaoLegs
                    valor={1}
                    selecionado={formato.bracketLegs}
                    onClick={(v) =>
                      setFormato((p) => ({ ...p, bracketLegs: v }))
                    }
                    label="Jogo único"
                    sublabel="Um jogo por fase"
                  />
                  <BotaoLegs
                    valor={2}
                    selecionado={formato.bracketLegs}
                    onClick={(v) =>
                      setFormato((p) => ({ ...p, bracketLegs: v }))
                    }
                    label="Ida e volta"
                    sublabel="Dois jogos por fase"
                  />
                </div>
              </div>
            )}

            {formato.formato === "league_and_bracket" && (
              <div className="flex flex-col gap-1.5">
                <Label>Times que avançam para o mata-mata</Label>
                <div className="flex items-center gap-3">
                  <InputNumerico
                    value={formato.qualifyingTeams}
                    min={2}
                    max={times.numTimes}
                    onChange={(v) =>
                      setFormato((p) => ({ ...p, qualifyingTeams: v }))
                    }
                  />
                  <span className="text-sm text-muted-foreground">
                    de {times.numTimes} times
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {erro && <p className="text-sm text-destructive">{erro}</p>}

        <DialogFooter className="flex-row justify-between gap-2">
          <div>
            {step > 1 && (
              <Button
                variant="ghost"
                onClick={() => {
                  setErro("");
                  setStep((s) => s - 1);
                }}
                disabled={loading}
              >
                <ChevronLeft className="size-4 mr-1" />
                Voltar
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            {step < 3 ? (
              <Button onClick={avancar}>
                Próximo
                <ChevronRight className="size-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSalvar} disabled={loading}>
                {loading
                  ? "Salvando..."
                  : isEdicao
                    ? "Salvar"
                    : "Criar campeonato"}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogConfirmarExclusao({
  open,
  onOpenChange,
  titulo,
  onConfirmar,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  titulo: string;
  onConfirmar: () => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleConfirmar() {
    setLoading(true);
    await onConfirmar();
    setLoading(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Confirmar exclusão</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground py-2">
          Deseja remover <strong>{titulo}</strong>? Esta ação não pode ser
          desfeita.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirmar}
            disabled={loading}
          >
            {loading ? "Removendo..." : "Remover"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── componente principal ─────────────────────────────────────────────────────

const CAMP_ENCERRADOS_POR_PAGINA = 5;

export function CampeonatosClient({ ehAdmin }: { ehAdmin: boolean }) {
  const router = useRouter();
  const [campeonatos, setCampeonatos] = useState<Tournament[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState<FiltroCamp>("todos");
  const [paginaEncerrados, setPaginaEncerrados] = useState(0);
  const [dialogCamp, setDialogCamp] = useState(false);
  const [campSelecionado, setCampSelecionado] = useState<Tournament | null>(
    null,
  );
  const [dialogExcluir, setDialogExcluir] = useState(false);
  const [campParaExcluir, setCampParaExcluir] = useState<Tournament | null>(
    null,
  );
  const [inscricoesCarregando, setInscricoesCarregando] = useState<Set<string>>(
    new Set(),
  );

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await fetch("/api/tournaments");
      if (res.ok) setCampeonatos(await res.json());
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  function abrirCriar() {
    setCampSelecionado(null);
    setDialogCamp(true);
  }

  function abrirEditar(c: Tournament) {
    setCampSelecionado(c);
    setDialogCamp(true);
  }

  function abrirExcluir(c: Tournament) {
    setCampParaExcluir(c);
    setDialogExcluir(true);
  }

  async function confirmarExcluir() {
    if (!campParaExcluir) return;
    await fetch(`/api/tournaments/${campParaExcluir.id}`, { method: "DELETE" });
    await carregarDados();
  }

  async function handleInscrever(tournamentId: string) {
    setInscricoesCarregando((prev) => new Set(prev).add(tournamentId));
    try {
      await fetch(`/api/tournaments/${tournamentId}/registrations`, {
        method: "POST",
      });
      await carregarDados();
    } finally {
      setInscricoesCarregando((prev) => {
        const next = new Set(prev);
        next.delete(tournamentId);
        return next;
      });
    }
  }

  async function handleCancelarInscricao(tournamentId: string) {
    setInscricoesCarregando((prev) => new Set(prev).add(tournamentId));
    try {
      await fetch(`/api/tournaments/${tournamentId}/registrations`, {
        method: "DELETE",
      });
      await carregarDados();
    } finally {
      setInscricoesCarregando((prev) => {
        const next = new Set(prev);
        next.delete(tournamentId);
        return next;
      });
    }
  }

  const campInscricoes = campeonatos.filter((c) => c.status === "registration");
  const campAtivos = campeonatos.filter((c) => c.status === "active");
  const campEncerrados = campeonatos.filter(
    (c) => c.status === "finished" || c.status === "cancelled",
  );

  const totalPaginasEncerrados = Math.max(
    1,
    Math.ceil(campEncerrados.length / CAMP_ENCERRADOS_POR_PAGINA),
  );
  const encerradosPaginados = campEncerrados.slice(
    paginaEncerrados * CAMP_ENCERRADOS_POR_PAGINA,
    (paginaEncerrados + 1) * CAMP_ENCERRADOS_POR_PAGINA,
  );

  useEffect(() => {
    if (paginaEncerrados > totalPaginasEncerrados - 1) {
      setPaginaEncerrados(Math.max(0, totalPaginasEncerrados - 1));
    }
  }, [paginaEncerrados, totalPaginasEncerrados]);

  const mostrarInscricoes = filtro === "todos" || filtro === "inscricoes";
  const mostrarAtivos = filtro === "todos" || filtro === "ativos";
  const mostrarEncerrados = filtro === "todos" || filtro === "encerrados";

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <div className="flex items-center gap-1.5 flex-wrap flex-1">
          {TABS_CAMP.map((tab) => {
            const ativo = filtro === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setFiltro(tab.value)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                  ativo
                    ? "bg-foreground text-background"
                    : "bg-card text-foreground border border-border hover:bg-muted",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        {ehAdmin && (
          <Button onClick={abrirCriar} className="gap-2 shrink-0">
            <Plus className="size-4" />
            Novo
          </Button>
        )}
      </div>

      {carregando ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
          Carregando...
        </div>
      ) : (
        <div className="space-y-8">
          {mostrarInscricoes && campInscricoes.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                Inscrições Abertas
              </h2>
              <div className="space-y-3">
                {campInscricoes.map((c) => (
                  <CardCampeonatoInscricoes
                    key={c.id}
                    camp={c}
                    ehAdmin={ehAdmin}
                    inscrito={c.tournament_registrations.length > 0}
                    carregandoInscricao={inscricoesCarregando.has(c.id)}
                    onInscrever={handleInscrever}
                    onCancelarInscricao={handleCancelarInscricao}
                    onEdit={abrirEditar}
                    onDelete={abrirExcluir}
                    onDetalhes={() => router.push(`/campeonatos/${c.id}`)}
                  />
                ))}
              </div>
            </section>
          )}

          {mostrarAtivos && campAtivos.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                Em Andamento
              </h2>
              <div className="space-y-3">
                {campAtivos.map((c) => (
                  <CardCampeonatoAtivo
                    key={c.id}
                    camp={c}
                    ehAdmin={ehAdmin}
                    onEdit={abrirEditar}
                    onDelete={abrirExcluir}
                    onDetalhes={() => router.push(`/campeonatos/${c.id}`)}
                  />
                ))}
              </div>
            </section>
          )}

          {mostrarEncerrados && campEncerrados.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                Encerrados
              </h2>
              <div className="space-y-2">
                {encerradosPaginados.map((c) => (
                  <CardCampeonatoEncerrado
                    key={c.id}
                    camp={c}
                    ehAdmin={ehAdmin}
                    onEdit={abrirEditar}
                    onDelete={abrirExcluir}
                    onDetalhes={() => router.push(`/campeonatos/${c.id}`)}
                  />
                ))}
              </div>
              {totalPaginasEncerrados > 1 && (
                <div className="flex items-center justify-center gap-3 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setPaginaEncerrados((p) => Math.max(0, p - 1))
                    }
                    disabled={paginaEncerrados === 0}
                  >
                    <ChevronLeft className="size-3.5" />
                    Anterior
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Página {paginaEncerrados + 1} de {totalPaginasEncerrados}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setPaginaEncerrados((p) =>
                        Math.min(totalPaginasEncerrados - 1, p + 1),
                      )
                    }
                    disabled={paginaEncerrados >= totalPaginasEncerrados - 1}
                  >
                    Próxima
                    <ChevronRight className="size-3.5" />
                  </Button>
                </div>
              )}
            </section>
          )}

          {campeonatos.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
              <Trophy className="size-12 opacity-20" />
              <p className="text-sm">Nenhum campeonato cadastrado.</p>
              {ehAdmin && (
                <Button variant="outline" size="sm" onClick={abrirCriar}>
                  <Plus className="size-4 mr-1.5" />
                  Cadastrar campeonato
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      <DialogCriarCampeonato
        open={dialogCamp}
        onOpenChange={setDialogCamp}
        campeonato={campSelecionado}
        onSalvo={carregarDados}
      />

      <DialogConfirmarExclusao
        open={dialogExcluir}
        onOpenChange={setDialogExcluir}
        titulo={campParaExcluir?.name ?? ""}
        onConfirmar={confirmarExcluir}
      />
    </>
  );
}
