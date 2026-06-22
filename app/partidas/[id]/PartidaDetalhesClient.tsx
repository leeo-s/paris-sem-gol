"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Play,
  Pencil,
  Trash2,
  Save,
  Shield,
  Star,
  UserMinus,
  UserRoundPlus,
  Plus,
  Minus,
  Phone,
  Check,
  Shuffle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ─── tipos ────────────────────────────────────────────────────────────────────

type MatchStatus = "scheduled" | "started" | "completed" | "cancelled";

type JogadorTime = {
  matchPlayerId: string;
  userId: string | null;
  guestPlayerId: string | null;
  nome: string;
  apelido: string | null;
  fotoUrl: string | null;
  posicao: string | null;
  overall: number;
  ehGoleiro: boolean;
};

type ResultadoTime = {
  nome: string;
  indice: number;
  overallMedio: number;
  jogadores: JogadorTime[];
};

// Representa um candidato que pode ser adicionado à partida (membro ou avulso)
type Candidato = {
  tipo: "user" | "guest";
  id: string;
  nome: string;
  apelido: string | null;
  posicao: string | null;
  ehGoleiro: boolean;
  overall: number;
};

type PosicaoAvulso = "GK" | "DEF" | "MEI" | "ATA";

// Estado do formulário de criação de jogador genérico (avulso)
type FormNovoAvulso = {
  nome: string;
  telefone: string;
  posicao: PosicaoAvulso | null;
  overall: number;
};

type JogadorPartida = {
  id: string;
  user_id: string | null;
  guest_player_id: string | null;
  is_goalkeeper: boolean;
  confirmed: boolean;
  unconfirmed_at: string | null;
  users: {
    id: string;
    name: string;
    nickname: string | null;
    photo_url: string | null;
    position: string | null;
    is_goalkeeper: boolean;
  } | null;
  guest_players: { id: string; name: string } | null;
};

type GoalEntry = {
  id: string;
  scorer_user_id: string | null;
  scorer_guest_id: string | null;
  users: { id: string; name: string; nickname: string | null } | null;
  guest_players: { id: string; name: string } | null;
};

type GoalConcededEntry = {
  id: string;
  conceder_user_id: string | null;
  conceder_guest_id: string | null;
  amount: number;
  users: { id: string; name: string; nickname: string | null } | null;
  guest_players: { id: string; name: string } | null;
};

type MvpVoteEntry = {
  id: string;
  voted_user_id: string;
  voter_user_id: string;
  users_mvp_votes_voted_user_idTousers: {
    id: string;
    name: string;
    nickname: string | null;
  };
};

type Partida = {
  id: string;
  match_date: string;
  location: string | null;
  time: string | null;
  status: MatchStatus;
  title: string | null;
  match_players: JogadorPartida[];
  goals: GoalEntry[];
  goals_conceded: GoalConcededEntry[];
  mvp_votes: MvpVoteEntry[];
  mvp_voting_sessions: {
    id: string;
    is_closed: boolean;
    closes_at: string;
    total_votes_cast: number;
    eligible_voters: number;
  } | null;
};

type EstatisticaJogador = {
  chave: string;
  nome: string;
  ehGoleiro: boolean;
  ehAvulso: boolean;
  photoUrl: string | null;
  posicao: string | null;
  golsMarcados: number;
  golsSofridos: number;
  votosRecebidos: number;
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatarTelefone(valor: string): string {
  const digits = valor.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 3) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 7)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 3)} ${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function getInitials(name: string): string {
  return name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function extrairHorario(timeValue: string | null | undefined): string {
  if (!timeValue) return "";
  if (/^\d{2}:\d{2}/.test(timeValue)) return timeValue.substring(0, 5);
  const d = new Date(timeValue);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

function getDateUTC(dateStr: string) {
  const d = new Date(dateStr);
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

function toInputDate(dateStr: string): string {
  const d = getDateUTC(dateStr);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function formatDateFull(dateStr: string): string {
  const d = getDateUTC(dateStr);
  const semana = d.toLocaleDateString("pt-BR", {
    weekday: "long",
    timeZone: "UTC",
  });
  const data = d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return `${semana.charAt(0).toUpperCase() + semana.slice(1)}, ${data}`;
}

function formatDateShort(dateStr: string): string {
  const d = getDateUTC(dateStr);
  const semana = d.toLocaleDateString("pt-BR", {
    weekday: "short",
    timeZone: "UTC",
  });
  const data = d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
  return `${semana.charAt(0).toUpperCase() + semana.slice(1).replace(".", "")}, ${data}`;
}

function isToday(dateStr: string): boolean {
  const hoje = new Date();
  const partida = new Date(dateStr);
  return (
    hoje.getFullYear() === partida.getUTCFullYear() &&
    hoje.getMonth() === partida.getUTCMonth() &&
    hoje.getDate() === partida.getUTCDate()
  );
}

function formatarDataHora(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function nomeExibido(
  users: { name: string; nickname: string | null } | null,
  guest: { name: string } | null,
): string {
  if (users) return users.nickname ?? users.name;
  if (guest) return guest.name;
  return "Desconhecido";
}

function computarEstatisticas(partida: Partida): EstatisticaJogador[] {
  const mapa = new Map<string, EstatisticaJogador>();

  for (const p of partida.match_players) {
    const chave = p.user_id ?? p.guest_player_id ?? p.id;
    const nome = p.users
      ? (p.users.nickname ?? p.users.name)
      : (p.guest_players?.name ?? "Desconhecido");
    const ehGoleiro = p.is_goalkeeper || (p.users?.is_goalkeeper ?? false);

    mapa.set(chave, {
      chave,
      nome,
      ehGoleiro,
      ehAvulso: !!p.guest_player_id,
      photoUrl: p.users?.photo_url ?? null,
      posicao: p.users?.position ?? null,
      golsMarcados: 0,
      golsSofridos: 0,
      votosRecebidos: 0,
    });
  }

  for (const g of partida.goals) {
    const chave = g.scorer_user_id ?? g.scorer_guest_id;
    if (chave && mapa.has(chave)) {
      mapa.get(chave)!.golsMarcados += 1;
    }
  }

  for (const gc of partida.goals_conceded) {
    const chave = gc.conceder_user_id ?? gc.conceder_guest_id;
    if (chave && mapa.has(chave)) {
      mapa.get(chave)!.golsSofridos += gc.amount;
    }
  }

  for (const v of partida.mvp_votes) {
    const chave = v.voted_user_id;
    if (mapa.has(chave)) {
      mapa.get(chave)!.votosRecebidos += 1;
    }
  }

  return Array.from(mapa.values()).sort(
    (a, b) =>
      b.golsMarcados - a.golsMarcados || b.votosRecebidos - a.votosRecebidos,
  );
}

// ─── constantes ──────────────────────────────────────────────────────────────

const CORES_TIME = [
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-purple-500",
  "bg-cyan-500",
  "bg-orange-500",
  "bg-pink-500",
];

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

// ─── sub-componentes ──────────────────────────────────────────────────────────

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

function BadgeStatus({ status }: { status: MatchStatus }) {
  if (status === "scheduled") {
    return (
      <span className="inline-flex items-center rounded-full bg-warning/15 px-3 py-1 text-xs font-semibold text-warning-foreground border border-warning/30">
        Em Aberto
      </span>
    );
  }
  if (status === "started") {
    return (
      <span className="inline-flex items-center rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary border border-primary/30">
        Em Andamento
      </span>
    );
  }
  if (status === "completed") {
    return (
      <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground border border-border">
        Encerrada
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive border border-destructive/20">
      Cancelada
    </span>
  );
}

function AvatarJogador({
  nome,
  photoUrl,
  size = "default",
}: {
  nome: string;
  photoUrl: string | null;
  size?: "sm" | "default";
}) {
  const initials = getInitials(nome);
  return (
    <Avatar size={size}>
      {photoUrl && <AvatarImage src={photoUrl} alt={nome} />}
      <AvatarFallback className="bg-primary text-primary-foreground font-heading text-xs">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

// ─── sub-componentes: times sorteados ────────────────────────────────────────

function CardJogadorTime({ jogador }: { jogador: JogadorTime }) {
  const nome = jogador.apelido ?? jogador.nome;
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <Avatar size="sm">
        {jogador.fotoUrl && <AvatarImage src={jogador.fotoUrl} alt={nome} />}
        <AvatarFallback className="bg-primary/10 text-primary font-heading text-xs">
          {getInitials(nome)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{nome}</p>
        <p className="text-xs text-muted-foreground truncate">
          {jogador.posicao ?? (jogador.ehGoleiro ? "Goleiro" : "Campo")}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {jogador.ehGoleiro && <Shield className="size-3.5 text-info" />}
        <span className="text-xs font-semibold bg-muted px-2 py-0.5 rounded-full text-foreground">
          {jogador.overall}
        </span>
      </div>
    </div>
  );
}

function CardTimeDetalhes({
  time,
  indiceVisual,
}: {
  time: ResultadoTime;
  indiceVisual: number;
}) {
  const corDestaque = CORES_TIME[indiceVisual] ?? "bg-muted-foreground";
  return (
    <div className="bg-card rounded-xl ring-1 ring-foreground/10 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/30">
        <div className={cn("size-2.5 rounded-full shrink-0", corDestaque)} />
        <h3 className="font-heading text-base text-foreground flex-1">
          {time.nome}
        </h3>
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">OVR</span>
          <span className="font-bold text-foreground bg-muted px-2 py-0.5 rounded-full">
            {time.overallMedio.toFixed(1)}
          </span>
        </div>
      </div>
      <div className="divide-y divide-border">
        {time.jogadores.map((j) => (
          <CardJogadorTime key={j.matchPlayerId} jogador={j} />
        ))}
      </div>
    </div>
  );
}

// ─── vista: partida iniciada ──────────────────────────────────────────────────

function ViewIniciada({
  partida,
  ehAdmin,
  times,
  carregandoTimes,
  onIrParaPlacar,
}: {
  partida: Partida;
  ehAdmin: boolean;
  times: ResultadoTime[] | null;
  carregandoTimes: boolean;
  onIrParaPlacar: () => void;
}) {
  const horario = extrairHorario(partida.time);

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="bg-card rounded-xl ring-1 ring-foreground/10 p-4 md:p-6 space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <p className="font-heading text-2xl md:text-3xl tracking-wide text-foreground">
              {partida.title ?? "Fut Semanal"}
            </p>
            <BadgeStatus status={partida.status} />
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Calendar className="size-3.5 shrink-0" />
              {formatDateShort(partida.match_date)}
            </span>
            {horario && (
              <span className="flex items-center gap-1.5">
                <Clock className="size-3.5 shrink-0" />
                {horario}
              </span>
            )}
            {partida.location && (
              <span className="flex items-center gap-1.5">
                <MapPin className="size-3.5 shrink-0" />
                {partida.location}
              </span>
            )}
          </div>
        </div>

        {ehAdmin && (
          <div className="flex items-center gap-2 pt-1 border-t border-border">
            <Button className="mt-3 sm:mt-5" size="sm" onClick={onIrParaPlacar}>
              <Play className="size-3.5" />
              Ir para Placar
            </Button>
          </div>
        )}
      </div>

      {/* Times sorteados */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-primary" />
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {carregandoTimes
              ? "Carregando times..."
              : times && times.length > 0
                ? `Times sorteados (${times.length})`
                : "Times sorteados"}
          </h2>
        </div>

        {carregandoTimes ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        ) : !times || times.length === 0 ? (
          <div className="bg-card rounded-xl ring-1 ring-foreground/10 p-8 text-center">
            <Users className="size-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhum time foi sorteado para esta partida.
            </p>
          </div>
        ) : (
          <div
            className={cn(
              "grid gap-4",
              times.length >= 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1",
            )}
          >
            {times.map((time, indice) => (
              <CardTimeDetalhes
                key={time.indice}
                time={time}
                indiceVisual={indice}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ─── vista: partida agendada ──────────────────────────────────────────────────

function ViewAgendada({
  partida,
  ehAdmin,
  jaIniciada = false,
  onRequestEditar,
  onRequestExcluir,
  onRequestRemoverJogador,
  onRequestAdicionarJogadores,
  onRequestIniciar,
}: {
  partida: Partida;
  ehAdmin: boolean;
  jaIniciada?: boolean;
  onRequestEditar: () => void;
  onRequestExcluir: () => void;
  onRequestRemoverJogador: (matchPlayerId: string, nome: string) => void;
  onRequestAdicionarJogadores: () => void;
  onRequestIniciar: () => void;
}) {
  const confirmados = partida.match_players.filter((p) => p.confirmed);
  const naoConfirmados = partida.match_players.filter((p) => !p.confirmed);
  const ehHoje = isToday(partida.match_date);
  const ehCancelada = partida.status === "cancelled";
  const horario = extrairHorario(partida.time);

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="bg-card rounded-xl ring-1 ring-foreground/10 p-4 md:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <p className="font-heading text-2xl md:text-3xl tracking-wide text-foreground">
                {partida.title ?? "Fut Semanal"}
              </p>
              <BadgeStatus status={partida.status} />
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="size-3.5 shrink-0" />
                {formatDateShort(partida.match_date)}
              </span>
              {horario && (
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3.5 shrink-0" />
                  {horario}
                </span>
              )}
              {partida.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3.5 shrink-0" />
                  {partida.location}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Ações admin — só para partidas não canceladas */}
        {ehAdmin && !ehCancelada && (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border">
            {(ehHoje || jaIniciada) && (
              <Button
                className={"mt-3 sm:mt-5"}
                size="sm"
                onClick={onRequestIniciar}
              >
                {jaIniciada ? (
                  <Play className="size-3.5" />
                ) : (
                  <Shuffle className="size-3.5" />
                )}
                {jaIniciada ? "Ir para Placar" : "Sortear Times"}
              </Button>
            )}
            <Button
              className={"mt-3 sm:mt-5"}
              size="sm"
              variant="outline"
              onClick={onRequestEditar}
            >
              <Pencil className="size-3.5" />
              <p className={cn(ehHoje && "hidden sm:inline")}>Editar Partida</p>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="mt-3 sm:mt-5 text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
              onClick={onRequestExcluir}
            >
              <Trash2 className="size-3.5" />
              <p className={cn(ehHoje && "hidden sm:inline")}>
                Excluir Partida
              </p>
            </Button>
          </div>
        )}
      </div>

      {/* Confirmados — não exibe se cancelada */}
      {!ehCancelada && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-primary" />
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Confirmados ({confirmados.length})
            </h2>

            {ehAdmin && (
              <Button
                size="sm"
                className="ml-auto"
                onClick={onRequestAdicionarJogadores}
              >
                <UserRoundPlus className="size-3.5" />
                Adicionar Jogadores
              </Button>
            )}
          </div>

          {confirmados.length === 0 ? (
            <div className="bg-card rounded-xl ring-1 ring-foreground/10 p-8 text-center">
              <Users className="size-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Nenhum jogador confirmado ainda.
              </p>
            </div>
          ) : (
            <div className="bg-card rounded-xl ring-1 ring-foreground/10 divide-y divide-border overflow-hidden">
              {confirmados.map((p) => {
                const nome = nomeExibido(p.users, p.guest_players);
                const ehGoleiro =
                  p.is_goalkeeper || (p.users?.is_goalkeeper ?? false);
                const ehAvulso = !!p.guest_player_id;

                return (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                    <AvatarJogador
                      nome={nome}
                      photoUrl={p.users?.photo_url ?? null}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {nome}
                        {p.users?.position && (
                          <span className="font-normal text-muted-foreground">
                            {" · "}
                            {p.users.position}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ehAvulso ? "Avulso" : "Membro"}
                        {ehGoleiro && " · Goleiro"}
                      </p>
                    </div>
                    {ehGoleiro && (
                      <Shield className="size-3.5 text-info shrink-0" />
                    )}
                    {/* Botão de cancelar participação visível apenas para admin/coadmin */}
                    {ehAdmin && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => onRequestRemoverJogador(p.id, nome)}
                      >
                        <UserMinus className="size-3.5" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Não confirmados — quem cancelou a participação */}
      {!ehCancelada && naoConfirmados.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-destructive/50" />
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Cancelaram ({naoConfirmados.length})
            </h2>
          </div>

          <div className="bg-card rounded-xl ring-1 ring-foreground/10 divide-y divide-border overflow-hidden">
            {naoConfirmados.map((p) => {
              const nome = nomeExibido(p.users, p.guest_players);
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-4 py-3 opacity-60"
                >
                  <AvatarJogador
                    nome={nome}
                    photoUrl={p.users?.photo_url ?? null}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {nome}
                    </p>
                    {p.unconfirmed_at && (
                      <p className="text-xs text-destructive">
                        Cancelou em {formatarDataHora(p.unconfirmed_at)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── vista: partida encerrada ─────────────────────────────────────────────────

function ViewEncerrada({ partida }: { partida: Partida }) {
  const estatisticas = computarEstatisticas(partida);
  const topMvp = estatisticas
    .filter((e) => e.votosRecebidos > 0)
    .sort((a, b) => b.votosRecebidos - a.votosRecebidos)
    .slice(0, 5);
  const maxVotos = topMvp[0]?.votosRecebidos ?? 1;
  const horario = extrairHorario(partida.time);

  const medalhas = ["🥇", "🥈", "🥉"];

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="bg-card rounded-xl ring-1 ring-foreground/10 p-4 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <p className="font-heading text-2xl md:text-3xl tracking-wide text-foreground">
                {partida.title ?? "Fut Semanal"}
              </p>
              <BadgeStatus status={partida.status} />
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Calendar className="size-3.5 shrink-0" />
                {formatDateFull(partida.match_date)}
              </span>
              {horario && (
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3.5 shrink-0" />
                  {horario}
                </span>
              )}
              {partida.location && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3.5 shrink-0" />
                  {partida.location}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Users className="size-3.5 shrink-0" />
                {partida.match_players.length} jogadores
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Estatísticas dos jogadores */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-muted-foreground/40" />
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Jogadores ({estatisticas.length})
          </h2>
        </div>

        {estatisticas.length === 0 ? (
          <div className="bg-card rounded-xl ring-1 ring-foreground/10 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhum jogador registrado nesta partida.
            </p>
          </div>
        ) : (
          <>
            {/* Tabela desktop */}
            <div className="hidden md:block bg-card rounded-xl ring-1 ring-foreground/10 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Jogador
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      ⚽ Gols
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      🥅 Sofridos
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      ⭐ MVP
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {estatisticas.map((e) => (
                    <tr
                      key={e.chave}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <AvatarJogador nome={e.nome} photoUrl={e.photoUrl} />
                          <div>
                            <p className="font-medium text-foreground">
                              {e.nome}
                              {e.posicao && (
                                <span className="font-normal text-muted-foreground">
                                  {" · "}
                                  {e.posicao}
                                </span>
                              )}
                            </p>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span>{e.ehAvulso ? "Avulso" : "Membro"}</span>
                              {e.ehGoleiro && (
                                <>
                                  <span>·</span>
                                  <Shield className="size-3 text-info" />
                                  <span>Goleiro</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {e.golsMarcados > 0 ? (
                          <span className="font-semibold text-foreground">
                            {e.golsMarcados}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {e.ehGoleiro ? (
                          <span
                            className={cn(
                              "font-semibold",
                              e.golsSofridos === 0
                                ? "text-success"
                                : "text-foreground",
                            )}
                          >
                            {e.golsSofridos}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {e.votosRecebidos > 0 ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-gold">
                            <Star className="size-3 fill-gold" />
                            {e.votosRecebidos}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cards mobile */}
            <div className="md:hidden bg-card rounded-xl ring-1 ring-foreground/10 divide-y divide-border overflow-hidden">
              {estatisticas.map((e) => (
                <div
                  key={e.chave}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <AvatarJogador nome={e.nome} photoUrl={e.photoUrl} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {e.nome}
                      {e.posicao && (
                        <span className="font-normal text-muted-foreground">
                          {" · "}
                          {e.posicao}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {e.ehAvulso ? "Avulso" : "Membro"}
                      {e.ehGoleiro && " · Goleiro"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs shrink-0">
                    {e.golsMarcados > 0 && (
                      <span className="flex items-center gap-0.5 font-semibold text-foreground">
                        <span>⚽</span>
                        <span>{e.golsMarcados}</span>
                      </span>
                    )}
                    {e.ehGoleiro && (
                      <span
                        className={cn(
                          "flex items-center gap-0.5 font-semibold",
                          e.golsSofridos === 0
                            ? "text-success"
                            : "text-foreground",
                        )}
                      >
                        <span>🥅</span>
                        <span>{e.golsSofridos}</span>
                      </span>
                    )}
                    {e.votosRecebidos > 0 && (
                      <span className="flex items-center gap-0.5 font-semibold text-gold">
                        <Star className="size-3 fill-gold" />
                        <span>{e.votosRecebidos}</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Top 5 MVP */}
      {topMvp.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-gold" />
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Top 5 MVP
            </h2>
          </div>

          <div className="bg-card rounded-xl ring-1 ring-foreground/10 divide-y divide-border overflow-hidden">
            {topMvp.map((e, idx) => (
              <div key={e.chave} className="flex items-center gap-4 px-4 py-3">
                <span className="text-base shrink-0 w-6 text-center leading-none">
                  {medalhas[idx] ?? `${idx + 1}.`}
                </span>
                <AvatarJogador nome={e.nome} photoUrl={e.photoUrl} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <p className="text-sm font-medium text-foreground truncate">
                      {e.nome}
                    </p>
                    <p className="text-xs font-semibold text-gold shrink-0">
                      {e.votosRecebidos}{" "}
                      {e.votosRecebidos === 1 ? "voto" : "votos"}
                    </p>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gold rounded-full transition-all duration-500"
                      style={{
                        width: `${(e.votosRecebidos / maxVotos) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── componente principal ─────────────────────────────────────────────────────

export function PartidaDetalhesClient({
  matchId,
  ehAdmin,
}: {
  matchId: string;
  ehAdmin: boolean;
}) {
  const router = useRouter();
  const [partida, setPartida] = useState<Partida | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erroGeral, setErroGeral] = useState<string | null>(null);

  // Estado do modal de edição
  const [editandoPartida, setEditandoPartida] = useState(false);
  const [matchDateEdicao, setMatchDateEdicao] = useState("");
  const [locationEdicao, setLocationEdicao] = useState("");
  const [horarioEdicao, setHorarioEdicao] = useState("");
  const [tituloEdicao, setTituloEdicao] = useState("");
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [erroEdicao, setErroEdicao] = useState<string | null>(null);

  // Estado do modal de exclusão da partida
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState<string | null>(null);

  // Estado do modal de remoção de jogador
  const [jogadorParaRemover, setJogadorParaRemover] = useState<{
    id: string;
    nome: string;
  } | null>(null);
  const [removendoJogador, setRemovendoJogador] = useState(false);
  const [erroRemocaoJogador, setErroRemocaoJogador] = useState<string | null>(
    null,
  );

  // Estado do modal de adição de jogadores (seleção múltipla)
  const [adicionandoJogadores, setAdicionandoJogadores] = useState(false);
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [carregandoCandidatos, setCarregandoCandidatos] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [salvandoJogadores, setSalvandoJogadores] = useState(false);
  const [erroAdicao, setErroAdicao] = useState<string | null>(null);

  // Estado do modal de criação de jogador genérico (avulso)
  const [criandoAvulso, setCriandoAvulso] = useState(false);
  const [formAvulso, setFormAvulso] = useState<FormNovoAvulso>({
    nome: "",
    telefone: "",
    posicao: null,
    overall: 5,
  });
  const [salvandoAvulso, setSalvandoAvulso] = useState(false);
  const [erroAvulso, setErroAvulso] = useState<string | null>(null);

  const [timesGuardados, setTimesGuardados] = useState<ResultadoTime[] | null>(
    null,
  );
  const [carregandoTimes, setCarregandoTimes] = useState(false);

  const buscarTimes = useCallback(async () => {
    setCarregandoTimes(true);
    try {
      const res = await fetch(`/api/matches/${matchId}/draw`);
      if (res.ok) {
        const dados = await res.json();
        setTimesGuardados(dados.times);
      }
    } catch {
      // exibe estado vazio em caso de falha
    } finally {
      setCarregandoTimes(false);
    }
  }, [matchId]);

  const buscarPartida = useCallback(async () => {
    setCarregando(true);
    setErroGeral(null);
    try {
      const res = await fetch(`/api/matches/${matchId}`);
      if (!res.ok) {
        setErroGeral(
          res.status === 404
            ? "Partida não encontrada."
            : "Erro ao carregar a partida.",
        );
        return;
      }
      const data: Partida = await res.json();
      setPartida(data);
    } catch {
      setErroGeral("Falha na conexão. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }, [matchId]);

  useEffect(() => {
    buscarPartida();
  }, [buscarPartida]);

  useEffect(() => {
    if (partida?.status === "started") {
      buscarTimes();
    }
  }, [partida?.status, buscarTimes]);

  function abrirModalEdicao() {
    if (!partida) return;
    setMatchDateEdicao(toInputDate(partida.match_date));
    setLocationEdicao(partida.location ?? "");
    setHorarioEdicao(extrairHorario(partida.time));
    setTituloEdicao(partida.title ?? "");
    setErroEdicao(null);
    setSalvandoEdicao(false);
    setEditandoPartida(true);
  }

  async function salvarEdicao() {
    if (!partida) return;
    setErroEdicao(null);
    if (!matchDateEdicao) {
      setErroEdicao("Data da partida é obrigatória.");
      return;
    }
    setSalvandoEdicao(true);
    try {
      const dataFinal = horarioEdicao
        ? `${matchDateEdicao}T${horarioEdicao}:00`
        : matchDateEdicao;
      const res = await fetch(`/api/matches/${partida.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          match_date: dataFinal,
          location: locationEdicao.trim() || null,
          title: tituloEdicao.trim() || null,
        }),
      });
      if (!res.ok) {
        const dados = await res.json();
        setErroEdicao(dados.error ?? "Erro ao salvar partida.");
        return;
      }
      setEditandoPartida(false);
      buscarPartida();
    } catch {
      setErroEdicao("Falha na conexão. Tente novamente.");
    } finally {
      setSalvandoEdicao(false);
    }
  }

  // Remove um jogador da lista de presentes da partida via API
  async function confirmarRemocaoJogador() {
    if (!partida || !jogadorParaRemover) return;
    setRemovendoJogador(true);
    setErroRemocaoJogador(null);
    try {
      const res = await fetch(`/api/matches/${partida.id}/players`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ match_player_id: jogadorParaRemover.id }),
      });
      if (!res.ok) {
        const dados = await res.json();
        setErroRemocaoJogador(dados.error ?? "Erro ao remover jogador.");
        return;
      }
      setJogadorParaRemover(null);
      buscarPartida();
    } catch {
      setErroRemocaoJogador("Falha na conexão. Tente novamente.");
    } finally {
      setRemovendoJogador(false);
    }
  }

  async function confirmarExclusao() {
    if (!partida) return;
    setExcluindo(true);
    setErroExclusao(null);
    try {
      const res = await fetch(`/api/matches/${partida.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const dados = await res.json();
        setErroExclusao(dados.error ?? "Erro ao excluir partida.");
        return;
      }
      router.push("/partidas");
    } catch {
      setErroExclusao("Falha na conexão. Tente novamente.");
    } finally {
      setExcluindo(false);
    }
  }

  // Abre o modal de adição e busca os candidatos disponíveis para a partida
  async function abrirModalAdicionarJogadores() {
    setSelecionados(new Set());
    setErroAdicao(null);
    setAdicionandoJogadores(true);
    setCarregandoCandidatos(true);
    try {
      const resposta = await fetch(`/api/matches/${matchId}/candidates`);
      if (resposta.ok) {
        const dados = await resposta.json();
        // Unifica membros e avulsos em uma lista tipada única
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
              apelido: u.nickname,
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
              apelido: null,
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

  // Alterna a seleção de um candidato pelo identificador único "tipo:id"
  function alternarSelecao(chave: string) {
    setSelecionados((prev) => {
      const nova = new Set(prev);
      if (nova.has(chave)) {
        nova.delete(chave);
      } else {
        nova.add(chave);
      }
      return nova;
    });
  }

  // Envia os jogadores selecionados para a lista de confirmados da partida
  async function confirmarAdicaoJogadores() {
    if (!partida || selecionados.size === 0) return;
    setSalvandoJogadores(true);
    setErroAdicao(null);
    try {
      const requisicoes = Array.from(selecionados).map((chave) => {
        const [tipo, id] = chave.split(":");
        const candidato = candidatos.find(
          (c) => c.tipo === tipo && c.id === id,
        );
        if (!candidato) return Promise.resolve(null);

        const corpo =
          tipo === "user"
            ? {
                user_id: id,
                is_goalkeeper: candidato.ehGoleiro,
                confirmed: true,
              }
            : {
                guest_player_id: id,
                is_goalkeeper: candidato.ehGoleiro,
                confirmed: true,
              };

        return fetch(`/api/matches/${partida.id}/players`, {
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
      buscarPartida();
    } catch {
      setErroAdicao("Falha na conexão. Tente novamente.");
    } finally {
      setSalvandoJogadores(false);
    }
  }

  // Cria um novo avulso e o pré-seleciona na lista de candidatos
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
      const resposta = await fetch("/api/guest-players", {
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
      if (!resposta.ok) {
        const dados = await resposta.json();
        setErroAvulso(dados.error ?? "Erro ao criar jogador.");
        return;
      }
      const novoAvulso = await resposta.json();
      // Adiciona o novo avulso à lista e o pré-seleciona automaticamente
      const novoCandidato: Candidato = {
        tipo: "guest",
        id: novoAvulso.id,
        nome: novoAvulso.name,
        apelido: null,
        posicao: novoAvulso.position,
        ehGoleiro: novoAvulso.is_goalkeeper,
        overall: novoAvulso.overall,
      };
      setCandidatos((prev) =>
        [...prev, novoCandidato].sort((a, b) => a.nome.localeCompare(b.nome)),
      );
      setSelecionados((prev) => new Set([...prev, `guest:${novoAvulso.id}`]));
      setCriandoAvulso(false);
      // Reseta o formulário para uso futuro
      setFormAvulso({ nome: "", telefone: "", posicao: null, overall: 5 });
    } catch {
      setErroAvulso("Falha na conexão. Tente novamente.");
    } finally {
      setSalvandoAvulso(false);
    }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Breadcrumb */}
      <div>
        <Link
          href="/partidas"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Partidas
        </Link>
      </div>

      {/* Esqueleto de carregamento */}
      {carregando && (
        <div className="space-y-4">
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      )}

      {/* Estado de erro */}
      {!carregando && erroGeral && (
        <div className="bg-card rounded-xl ring-1 ring-foreground/10 p-10 text-center space-y-3">
          <p className="font-heading text-xl text-foreground">
            Algo deu errado
          </p>
          <p className="text-sm text-muted-foreground">{erroGeral}</p>
          <Button size="sm" variant="outline" onClick={buscarPartida}>
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Conteúdo principal */}
      {!carregando && partida && (
        <>
          {partida.status === "completed" ? (
            <ViewEncerrada partida={partida} />
          ) : partida.status === "started" ? (
            <ViewIniciada
              partida={partida}
              ehAdmin={ehAdmin}
              times={timesGuardados}
              carregandoTimes={carregandoTimes}
              onIrParaPlacar={() =>
                router.push(`/partidas/${partida.id}/placar`)
              }
            />
          ) : (
            <ViewAgendada
              partida={partida}
              ehAdmin={ehAdmin}
              jaIniciada={false}
              onRequestEditar={abrirModalEdicao}
              onRequestExcluir={() => {
                setErroExclusao(null);
                setConfirmandoExclusao(true);
              }}
              onRequestRemoverJogador={(id, nome) => {
                setErroRemocaoJogador(null);
                setJogadorParaRemover({ id, nome });
              }}
              onRequestAdicionarJogadores={abrirModalAdicionarJogadores}
              onRequestIniciar={() =>
                router.push(`/partidas/${partida.id}/sortear`)
              }
            />
          )}
        </>
      )}

      {/* Modal de edição */}
      <Dialog
        open={editandoPartida}
        onOpenChange={(v) => !v && setEditandoPartida(false)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Partida</DialogTitle>
          </DialogHeader>

          {erroEdicao && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {erroEdicao}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="match_date_edicao"
                className="flex items-center gap-1.5"
              >
                <Calendar className="size-3.5 text-muted-foreground" />
                Data *
              </Label>
              <Input
                id="match_date_edicao"
                type="date"
                value={matchDateEdicao}
                onChange={(e) => setMatchDateEdicao(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="horario_edicao"
                className="flex items-center gap-1.5"
              >
                <Clock className="size-3.5 text-muted-foreground" />
                Horário
              </Label>
              <Input
                id="horario_edicao"
                type="time"
                value={horarioEdicao}
                onChange={(e) => setHorarioEdicao(e.target.value)}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label
                htmlFor="location_edicao"
                className="flex items-center gap-1.5"
              >
                <MapPin className="size-3.5 text-muted-foreground" />
                Local
              </Label>
              <Input
                id="location_edicao"
                placeholder="Ex: Quadra do Parque"
                value={locationEdicao}
                onChange={(e) => setLocationEdicao(e.target.value)}
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label
                htmlFor="title_edicao"
                className="flex items-center gap-1.5"
              >
                <MapPin className="size-3.5 text-muted-foreground" />
                Título
              </Label>
              <Input
                id="title_edicao"
                placeholder="Ex: Fut Semanal"
                value={tituloEdicao}
                onChange={(e) => setTituloEdicao(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={salvarEdicao}
              disabled={salvandoEdicao}
              className="gap-2 w-full sm:w-auto"
            >
              <Save className="size-4" />
              {salvandoEdicao ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmação de remoção de jogador */}
      <Dialog
        open={!!jogadorParaRemover}
        onOpenChange={(aberto) => !aberto && setJogadorParaRemover(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remover Jogador</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja remover{" "}
            <span className="font-medium text-foreground">
              {jogadorParaRemover?.nome}
            </span>{" "}
            da lista desta partida?
          </p>
          {erroRemocaoJogador && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {erroRemocaoJogador}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setJogadorParaRemover(null)}
              disabled={removendoJogador}
              className={"bg-white"}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmarRemocaoJogador}
              disabled={removendoJogador}
              className="gap-2"
            >
              <UserMinus className="size-4" />
              {removendoJogador ? "Removendo..." : "Remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmação de exclusão */}
      <Dialog
        open={confirmandoExclusao}
        onOpenChange={(v) => !v && setConfirmandoExclusao(false)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir Partida</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir esta partida? Esta ação não pode ser
            desfeita.
          </p>
          {erroExclusao && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {erroExclusao}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConfirmandoExclusao(false)}
              disabled={excluindo}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmarExclusao}
              disabled={excluindo}
              className="gap-2"
            >
              <Trash2 className="size-4" />
              {excluindo ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de adição de jogadores à partida */}
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

          {/* Lista scrollável de candidatos */}
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
                  Todos os jogadores já estão na partida.
                </p>
              </div>
            ) : (
              <div className="space-y-4 py-2">
                {/* Grupo de membros */}
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
                          return (
                            <button
                              key={chave}
                              type="button"
                              onClick={() => alternarSelecao(chave)}
                              className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                                selecionado
                                  ? "bg-primary/10"
                                  : "hover:bg-muted/50",
                              )}
                            >
                              {/* Indicador de seleção */}
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
                                photoUrl={null}
                                size="sm"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {candidato.nome}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {candidato.posicao ?? "Posição não definida"}
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

                {/* Grupo de avulsos */}
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
                          return (
                            <button
                              key={chave}
                              type="button"
                              onClick={() => alternarSelecao(chave)}
                              className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                                selecionado
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
                                photoUrl={null}
                                size="sm"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {candidato.nome}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {candidato.posicao ?? "Posição não definida"}
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
            {/* Botão para abrir o formulário de criação de avulso */}
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
              className={"bg-white"}
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
            {/* Campos básicos: nome e telefone */}
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

            {/* Seleção de posição */}
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

            {/* Overall do jogador avulso */}
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
              className={"bg-white"}
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
