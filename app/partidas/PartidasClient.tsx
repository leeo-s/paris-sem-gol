"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  MapPin,
  Users,
  Pencil,
  Play,
  Trophy,
  Shield,
  Star,
  Calendar,
  Clock,
  Save,
  Trash2,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
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

// ─── utilitários ─────────────────────────────────────────────────────────────

function extrairHorario(timeValue: string | null): string {
  if (!timeValue) return "";
  const d = new Date(timeValue);
  if (isNaN(d.getTime())) return timeValue;
  const horas = d.getUTCHours().toString().padStart(2, "0");
  const minutos = d.getUTCMinutes().toString().padStart(2, "0");
  return `${horas}:${minutos}`;
}

// ─── tipos ────────────────────────────────────────────────────────────────────

type MatchStatus = "scheduled" | "completed" | "cancelled";

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
  time: string;
  status: MatchStatus;
  match_players: Array<{
    id: string;
    user_id: string | null;
    guest_player_id: string | null;
    is_goalkeeper: boolean;
    confirmed: boolean;
  }>;
  mvp_voting_sessions: {
    id: string;
    is_closed: boolean;
    closes_at: string;
    total_votes_cast: number;
  } | null;
  goals: GoalEntry[];
  goals_conceded: GoalConcededEntry[];
  mvp_votes: MvpVoteEntry[];
};

type FiltroTab = "todas" | "em_aberto" | "encerradas";

// ─── helpers ──────────────────────────────────────────────────────────────────

function getDateUTC(dateStr: string) {
  const d = new Date(dateStr);
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

// Converte ISO date string para "YYYY-MM-DD" esperado pelo input[type="date"]
function toInputDate(dateStr: string): string {
  const d = getDateUTC(dateStr);
  const ano = d.getUTCFullYear();
  const mes = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  const dia = d.getUTCDate().toString().padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function formatDateBadge(dateStr: string): { dia: string; mes: string } {
  const d = getDateUTC(dateStr);
  const dia = d.getUTCDate().toString().padStart(2, "0");
  const mes = d
    .toLocaleDateString("pt-BR", { month: "short", timeZone: "UTC" })
    .toUpperCase()
    .replace(".", "");
  return { dia, mes };
}

function formatDateFull(dateStr: string): string {
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
  const semanaFormatada =
    semana.charAt(0).toUpperCase() + semana.slice(1).replace(".", "");
  return `${semanaFormatada} ${data}`;
}

function formatDateShort(dateStr: string): string {
  const d = getDateUTC(dateStr);
  const dia = d.getUTCDate().toString().padStart(2, "0");
  const mes = (d.getUTCMonth() + 1).toString().padStart(2, "0");
  const ano = d.getUTCFullYear();
  const semana = d.toLocaleDateString("pt-BR", {
    weekday: "short",
    timeZone: "UTC",
  });
  const semanaFormatada =
    semana.charAt(0).toUpperCase() + semana.slice(1).replace(".", "");
  return `${semanaFormatada} ${dia}/${mes}/${ano}`;
}

function isToday(dateStr: string): boolean {
  const hoje = new Date();
  const partida = new Date(dateStr);
  // match_date é salvo como UTC midnight — comparamos a data UTC da partida
  // com a data LOCAL do usuário (para funcionar corretamente em qualquer fuso)
  return (
    hoje.getFullYear() === partida.getUTCFullYear() &&
    hoje.getMonth() === partida.getUTCMonth() &&
    hoje.getDate() === partida.getUTCDate()
  );
}

// Extrai HH:MM de uma string "HH:MM:SS" retornada pela API
function formatarHorario(horario: string): string {
  return horario.substring(0, 5);
}

function nomeExibido(
  users: { name: string; nickname: string | null } | null,
  guest: { name: string } | null,
): string {
  if (users) return users.nickname ?? users.name;
  if (guest) return guest.name;
  return "Desconhecido";
}

function calcularArtilheiro(
  goals: GoalEntry[],
): { nome: string; gols: number } | null {
  if (!goals.length) return null;

  const contagem: Record<string, { nome: string; gols: number }> = {};
  for (const g of goals) {
    const chave = g.scorer_user_id ?? g.scorer_guest_id ?? "anon";
    const nome = nomeExibido(g.users, g.guest_players);
    if (!contagem[chave]) contagem[chave] = { nome, gols: 0 };
    contagem[chave].gols += 1;
  }

  const top = Object.values(contagem).sort((a, b) => b.gols - a.gols)[0];
  return top ?? null;
}

function calcularMelhorGoleiro(
  goalsConceded: GoalConcededEntry[],
): { nome: string; golsSofridos: number } | null {
  if (!goalsConceded.length) return null;

  const contagem: Record<string, { nome: string; golsSofridos: number }> = {};
  for (const g of goalsConceded) {
    const chave = g.conceder_user_id ?? g.conceder_guest_id ?? "anon";
    const nome = nomeExibido(g.users, g.guest_players);
    if (!contagem[chave]) contagem[chave] = { nome, golsSofridos: 0 };
    contagem[chave].golsSofridos += g.amount;
  }

  const melhor = Object.values(contagem).sort(
    (a, b) => a.golsSofridos - b.golsSofridos,
  )[0];
  return melhor ?? null;
}

function calcularMvp(
  mvpVotes: MvpVoteEntry[],
): { nome: string; votos: number } | null {
  if (!mvpVotes.length) return null;

  const contagem: Record<string, { nome: string; votos: number }> = {};
  for (const v of mvpVotes) {
    const chave = v.voted_user_id;
    const nome = nomeExibido(v.users_mvp_votes_voted_user_idTousers, null);
    if (!contagem[chave]) contagem[chave] = { nome, votos: 0 };
    contagem[chave].votos += 1;
  }

  const mvp = Object.values(contagem).sort((a, b) => b.votos - a.votos)[0];
  return mvp ?? null;
}

function contarConfirmados(players: Partida["match_players"]): number {
  return players.filter((p) => p.confirmed).length;
}

// ─── sub-componentes ──────────────────────────────────────────────────────────

function BadgeStatus({ status }: { status: MatchStatus }) {
  if (status === "scheduled") {
    return (
      <span className="inline-flex items-center rounded-full bg-warning/15 px-3 py-1 text-xs font-semibold text-warning-foreground border border-warning/30">
        Em Aberto
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

function CartaoAberta({
  partida,
  ehProxima,
  ehAdmin,
  onRequestExcluir,
  onRequestEditar,
}: {
  partida: Partida;
  ehProxima: boolean;
  ehAdmin: boolean;
  onRequestExcluir: (id: string) => void;
  // Callback para abrir o modal de edição com a partida selecionada
  onRequestEditar: (partida: Partida) => void;
}) {
  const { dia, mes } = formatDateBadge(partida.match_date);
  const dataCurta = formatDateShort(partida.match_date);
  const confirmados = contarConfirmados(partida.match_players);
  const ehHoje = isToday(partida.match_date);

  return (
    <Link href={`/partidas/${partida.id}`} className="block group">
      <div
        className={cn(
          "bg-card rounded-xl ring-1 ring-foreground/10 overflow-hidden transition-shadow hover:shadow-md",
          ehProxima && "border-l-4 border-l-gold",
        )}
      >
        {/* Desktop layout */}
        <div className="hidden md:flex items-start gap-4 p-4">
          {/* Date badge */}
          <div className="flex flex-col items-center justify-center bg-primary text-primary-foreground rounded-lg w-12 h-12 shrink-0">
            <span className="font-heading text-xl leading-none">{dia}</span>
            <span className="text-[9px] uppercase tracking-wider opacity-80">
              {mes}
            </span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-heading text-base tracking-wide text-foreground">
                  Fut Semanal
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3 shrink-0" />
                    {dataCurta + " - " + formatarHorario(partida.time)}
                  </span>
                  {partida.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3 shrink-0" />
                      {partida.location}
                    </span>
                  )}
                  {confirmados > 0 && (
                    <span className="flex items-center gap-1">
                      <Users className="size-3 shrink-0" />
                      {confirmados} confirmados
                    </span>
                  )}
                </div>
              </div>
              <BadgeStatus status={partida.status} />
            </div>

            {/* Ações — desktop: todas as partidas em aberto mostram Editar + Excluir */}
            <div
              className="flex items-center gap-2 mt-3"
              onClick={(e) => e.preventDefault()}
            >
              {ehHoje && ehAdmin && (
                <Link
                  href={`/partidas/${partida.id}/iniciar`}
                  className={buttonVariants({ size: "sm" })}
                >
                  <Play className="size-3.5" />
                  Iniciar Partida
                </Link>
              )}
              {ehAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRequestEditar(partida)}
                >
                  <Pencil className="size-3.5" />
                  Editar Partida
                </Button>
              )}
              {ehAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => onRequestExcluir(partida.id)}
                >
                  <Trash2 className="size-3.5" />
                  Excluir Partida
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile layout */}
        <div className="md:hidden p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-heading text-base tracking-wide text-foreground">
                Pelada Semanal
              </p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-xs text-muted-foreground w-50">
                <span>{dataCurta + " - " + formatarHorario(partida.time)}</span>
                {partida.location && (
                  <>
                    <span>·</span>
                    <span>{partida.location}</span>
                  </>
                )}
              </div>
            </div>
            <BadgeStatus status={partida.status} />
          </div>

          {/* Ações — mobile: todas as partidas em aberto mostram Editar + Excluir */}
          <div
            className="flex flex-wrap items-center gap-2"
            onClick={(e) => e.preventDefault()}
          >
            {ehHoje && ehAdmin && (
              <Link
                href={`/partidas/${partida.id}/iniciar`}
                className={buttonVariants({ size: "sm", className: "flex-1" })}
              >
                <Play className="size-3.5" />
                Iniciar Partida
              </Link>
            )}
            {ehAdmin && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => onRequestEditar(partida)}
              >
                <Pencil className="size-3.5" />
                Editar Partida
              </Button>
            )}
            {ehAdmin && (
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onRequestExcluir(partida.id)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

function CartaoEncerrada({ partida }: { partida: Partida }) {
  const dataCompleta = formatDateFull(partida.match_date);
  const artilheiro = calcularArtilheiro(partida.goals);
  const melhorGoleiro = calcularMelhorGoleiro(partida.goals_conceded);
  const mvp = calcularMvp(partida.mvp_votes);
  const temEstatisticas = artilheiro || melhorGoleiro || mvp;

  return (
    <Link href={`/partidas/${partida.id}`} className="block group">
      <div className="bg-card rounded-xl ring-1 ring-foreground/10 overflow-hidden transition-shadow hover:shadow-md">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="size-3 shrink-0" />
            <span>{dataCompleta + " - " + formatarHorario(partida.time)}</span>
            {partida.location && (
              <>
                <span className="hidden md:inline">·</span>
                <span className="hidden md:flex items-center gap-1">
                  <MapPin className="size-3 shrink-0" />
                  {partida.location}
                </span>
              </>
            )}
          </div>
          <BadgeStatus status={partida.status} />
        </div>

        {/* Localização mobile */}
        {partida.location && (
          <div className="md:hidden flex items-center gap-1 px-4 pb-2 text-xs text-muted-foreground">
            <MapPin className="size-3 shrink-0" />
            {partida.location}
          </div>
        )}

        {/* Estatísticas */}
        {temEstatisticas && (
          <div className="border-t border-border px-4 py-3 space-y-2">
            {artilheiro && (
              <div className="flex items-center gap-2 text-xs">
                <Trophy className="size-3.5 shrink-0 text-warning" />
                <span className="text-muted-foreground">Artilheiro:</span>
                <span className="font-medium text-foreground">
                  {artilheiro.nome}
                </span>
                <span className="text-muted-foreground">
                  ({artilheiro.gols} {artilheiro.gols === 1 ? "gol" : "gols"})
                </span>
              </div>
            )}
            {melhorGoleiro && (
              <div className="flex items-center gap-2 text-xs">
                <Shield className="size-3.5 shrink-0 text-info" />
                <span className="text-muted-foreground">GK menos vazado:</span>
                <span className="font-medium text-foreground">
                  {melhorGoleiro.nome}
                </span>
                <span className="text-muted-foreground">
                  ({melhorGoleiro.golsSofridos}{" "}
                  {melhorGoleiro.golsSofridos === 1 ? "gol" : "gols"} sofrido
                  {melhorGoleiro.golsSofridos !== 1 ? "s" : ""})
                </span>
              </div>
            )}
            {mvp && (
              <div className="flex items-center gap-2 text-xs">
                <Star className="size-3.5 shrink-0 text-gold" />
                <span className="text-muted-foreground">MVP:</span>
                <span className="font-medium text-foreground">{mvp.nome}</span>
                <span className="text-muted-foreground">
                  ({mvp.votos} {mvp.votos === 1 ? "voto" : "votos"})
                </span>
              </div>
            )}
          </div>
        )}

        {!temEstatisticas && (
          <div className="border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground italic">
              Estatísticas não registradas
            </p>
          </div>
        )}
      </div>
    </Link>
  );
}

// ─── componente principal ─────────────────────────────────────────────────────

const TABS: { label: string; value: FiltroTab }[] = [
  { label: "Todas", value: "todas" },
  { label: "Em Aberto", value: "em_aberto" },
  { label: "Encerradas", value: "encerradas" },
];

export function PartidasClient({ ehAdmin }: { ehAdmin: boolean }) {
  const [filtro, setFiltro] = useState<FiltroTab>("todas");
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [carregando, setCarregando] = useState(true);

  // ─── estado do modal de confirmação de exclusão ───────────────────────────
  const [idPartidaParaExcluir, setIdPartidaParaExcluir] = useState<
    string | null
  >(null);
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState<string | null>(null);

  // Abre o dialog de confirmação para a partida selecionada
  function solicitarExclusao(id: string) {
    setIdPartidaParaExcluir(id);
    setErroExclusao(null);
  }

  // Chama a API DELETE e atualiza a lista após sucesso
  async function confirmarExclusao() {
    if (!idPartidaParaExcluir) return;
    setExcluindo(true);
    setErroExclusao(null);
    try {
      const resposta = await fetch(`/api/matches/${idPartidaParaExcluir}`, {
        method: "DELETE",
      });
      if (!resposta.ok) {
        const dados = await resposta.json();
        setErroExclusao(dados.error ?? "Erro ao excluir partida.");
        return;
      }
      setIdPartidaParaExcluir(null);
      buscarPartidas();
    } catch {
      setErroExclusao("Falha na conexão. Tente novamente.");
    } finally {
      setExcluindo(false);
    }
  }

  // ─── estado do modal de edição de partida ────────────────────────────────
  const [partidaEditando, setPartidaEditando] = useState<Partida | null>(null);
  const [matchDateEdicao, setMatchDateEdicao] = useState("");
  const [locationEdicao, setLocationEdicao] = useState("");
  const [horarioEdicao, setHorarioEdicao] = useState("");
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [erroEdicao, setErroEdicao] = useState<string | null>(null);

  // Abre o modal com os campos pré-preenchidos com os dados da partida
  function abrirModalEdicao(partida: Partida) {
    setPartidaEditando(partida);
    setMatchDateEdicao(toInputDate(partida.match_date));
    setLocationEdicao(partida.location ?? "");
    setHorarioEdicao(partida.time ? formatarHorario(partida.time) : "");
    setErroEdicao(null);
    setSalvandoEdicao(false);
  }

  // Envia PATCH para atualizar os dados da partida no banco
  async function salvarEdicao() {
    if (!partidaEditando) return;
    setErroEdicao(null);
    if (!matchDateEdicao) {
      setErroEdicao("Data da partida é obrigatória.");
      return;
    }
    setSalvandoEdicao(true);
    try {
      let dataFinal = matchDateEdicao;
      if (horarioEdicao) dataFinal = `${matchDateEdicao}T${horarioEdicao}:00`;
      const resposta = await fetch(`/api/matches/${partidaEditando.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          match_date: dataFinal,
          location: locationEdicao.trim() || null,
        }),
      });
      if (!resposta.ok) {
        const dados = await resposta.json();
        setErroEdicao(dados.error ?? "Erro ao salvar partida.");
        return;
      }
      setPartidaEditando(null);
      buscarPartidas();
    } catch {
      setErroEdicao("Falha na conexão. Tente novamente.");
    } finally {
      setSalvandoEdicao(false);
    }
  }

  // ─── estado do modal nova partida ─────────────────────────────────────────
  const [modalAberto, setModalAberto] = useState(false);
  const [matchDate, setMatchDate] = useState("");
  const [location, setLocation] = useState("");
  const [horario, setHorario] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erroModal, setErroModal] = useState<string | null>(null);
  const [carregandoConfig, setCarregandoConfig] = useState(false);

  function abrirModal() {
    setMatchDate("");
    setLocation("");
    setHorario("");
    setErroModal(null);
    setSalvando(false);
    setModalAberto(true);
    setCarregandoConfig(true);
    fetch("/api/club-settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((config) => {
        if (config) {
          if (config.local) setLocation(config.local);
          setHorario(extrairHorario(config.time));
        }
      })
      .finally(() => setCarregandoConfig(false));
  }

  async function salvarPartida() {
    setErroModal(null);
    if (!matchDate) {
      setErroModal("Data da partida é obrigatória.");
      return;
    }
    setSalvando(true);
    try {
      let dataFinal = matchDate;
      if (horario) dataFinal = `${matchDate}T${horario}:00`;
      const res = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          match_date: dataFinal,
          location: location.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setErroModal(data.error ?? "Erro ao criar partida.");
        return;
      }
      setModalAberto(false);
      buscarPartidas();
    } catch {
      setErroModal("Falha na conexão. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  const buscarPartidas = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await fetch("/api/matches");
      if (!res.ok) throw new Error("Erro ao buscar partidas");
      const dados: Partida[] = await res.json();
      setPartidas(dados);
    } catch {
      setPartidas([]);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    buscarPartidas();
  }, [buscarPartidas]);

  const abertas = partidas
    .filter((p) => p.status === "scheduled")
    .sort(
      (a, b) =>
        new Date(a.match_date).getTime() - new Date(b.match_date).getTime(),
    );

  const encerradas = partidas.filter(
    (p) => p.status === "completed" || p.status === "cancelled",
  );

  const mostrarAbertas = filtro === "todas" || filtro === "em_aberto";
  const mostrarEncerradas = filtro === "todas" || filtro === "encerradas";

  return (
    <div className="space-y-5">
      {/* Barra de filtros + botão nova partida */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 flex-wrap flex-1">
          {TABS.map((tab) => {
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

          {ehAdmin && (
            <>
              <Button
                onClick={abrirModal}
                className="w-auto ml-auto gap-2 shrink-0"
              >
                <Plus className="size-4" />
                <span className="hidden sm:inline">Nova Partida</span>
              </Button>

              <Dialog
                open={modalAberto}
                onOpenChange={(v) => !v && setModalAberto(false)}
              >
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Nova Partida</DialogTitle>
                  </DialogHeader>

                  {erroModal && (
                    <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      {erroModal}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="match_date"
                        className="flex items-center gap-1.5"
                      >
                        <Calendar className="size-3.5 text-muted-foreground" />
                        Data *
                      </Label>
                      <Input
                        id="match_date"
                        type="date"
                        value={matchDate}
                        onChange={(e) => setMatchDate(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label
                        htmlFor="horario"
                        className="flex items-center gap-1.5"
                      >
                        <Clock className="size-3.5 text-muted-foreground" />
                        Horário
                      </Label>
                      <Input
                        id="horario"
                        type="time"
                        value={horario}
                        onChange={(e) => setHorario(e.target.value)}
                        disabled={carregandoConfig}
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <Label
                        htmlFor="location"
                        className="flex items-center gap-1.5"
                      >
                        <MapPin className="size-3.5 text-muted-foreground" />
                        Local
                      </Label>
                      <Input
                        id="location"
                        placeholder="Ex: Quadra do Parque"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        disabled={carregandoConfig}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      onClick={salvarPartida}
                      disabled={salvando || carregandoConfig}
                      className="gap-2 w-full sm:w-auto"
                    >
                      <Save className="size-4" />
                      {salvando ? "Salvando..." : "Criar Partida"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>

        {/* Modal de edição de partida — pré-preenchido com os dados atuais */}
        <Dialog
          open={partidaEditando !== null}
          onOpenChange={(aberto) => {
            if (!aberto) setPartidaEditando(null);
          }}
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

        {/* Dialog de confirmação de exclusão */}
        <Dialog
          open={idPartidaParaExcluir !== null}
          onOpenChange={(aberto) => {
            if (!aberto) setIdPartidaParaExcluir(null);
          }}
        >
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Excluir Partida</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja excluir esta partida? Esta ação não pode
              ser desfeita.
            </p>
            {erroExclusao && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {erroExclusao}
              </div>
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setIdPartidaParaExcluir(null)}
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
      </div>

      {/* Estado de carregamento */}
      {carregando && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 rounded-xl bg-card ring-1 ring-foreground/10 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Conteúdo */}
      {!carregando && (
        <div className="space-y-6">
          {/* Seção Em Aberto */}
          {mostrarAbertas && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 rounded-full bg-warning" />
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Em Aberto
                </h2>
              </div>

              {abertas.length === 0 ? (
                <div className="bg-card rounded-xl ring-1 ring-foreground/10 p-8 text-center text-muted-foreground text-sm">
                  Nenhuma partida em aberto.
                </div>
              ) : (
                <div className="space-y-3">
                  {abertas.map((p, idx) => (
                    <CartaoAberta
                      key={p.id}
                      partida={p}
                      ehProxima={idx === 0}
                      ehAdmin={ehAdmin}
                      onRequestExcluir={solicitarExclusao}
                      onRequestEditar={abrirModalEdicao}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Seção Encerradas */}
          {mostrarEncerradas && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 rounded-full bg-muted-foreground/40" />
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Encerradas
                </h2>
              </div>

              {encerradas.length === 0 ? (
                <div className="bg-card rounded-xl ring-1 ring-foreground/10 p-8 text-center text-muted-foreground text-sm">
                  Nenhuma partida encerrada.
                </div>
              ) : (
                <div className="space-y-3">
                  {encerradas.map((p) => (
                    <CartaoEncerrada key={p.id} partida={p} />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Estado vazio geral */}
          {partidas.length === 0 && (
            <div className="bg-card rounded-xl ring-1 ring-foreground/10 p-12 text-center space-y-2">
              <p className="font-heading text-lg text-foreground">
                Nenhuma partida encontrada
              </p>
              <p className="text-sm text-muted-foreground">
                Crie a primeira partida do clube.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
