"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  MoreHorizontal,
  CheckCircle2,
  AlertCircle,
  Clock,
  Phone,
  Ban,
  Star,
  XCircle,
  ShieldOff,
  Trophy,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ─── tipos ────────────────────────────────────────────────────────────────────

type PlayerRatings = {
  overall: number | null;
  speed: number | null;
  finishing: number | null;
  passing: number | null;
  dribbling: number | null;
  defense: number | null;
  physical: number | null;
};

type Jogador = {
  id: string;
  name: string;
  nickname: string | null;
  email: string;
  role: string;
  photo_url: string | null;
  birth_date: string | null;
  phone: string | null;
  position: string | null;
  is_goalkeeper: boolean;
  is_active: boolean;
  invited_at: string | null;
  first_login_at: string | null;
  created_at: string;
  player_ratings: PlayerRatings | null;
};

type Mensalidade = {
  id: string;
  month: number;
  year: number;
  amount: string;
  status: "pending" | "paid" | "late" | "cancelled";
  paid_at: string | null;
  notes: string | null;
};

type SessaoUsuario = {
  id: string;
  name: string;
  role: string;
} | null;

type AbaAtiva = "mensalidades" | "partidas" | "destaques";

// ─── constantes ───────────────────────────────────────────────────────────────

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const ATRIBUTOS: { label: string; key: keyof PlayerRatings }[] = [
  { label: "VEL", key: "speed" },
  { label: "DRI", key: "dribbling" },
  { label: "CHU", key: "finishing" },
  { label: "DEF", key: "defense" },
  { label: "FIS", key: "physical" },
];

// ─── utilitários ──────────────────────────────────────────────────────────────

function formatarTelefone(phone: string | null): string {
  if (!phone) return "";
  const d = phone.replace(/\D/g, "");
  if (d.length === 11)
    return `+55 ${d.slice(0, 2)} ${d.slice(2, 3)} ${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10)
    return `+55 ${d.slice(0, 2)} ${d.slice(2, 6)}-${d.slice(6)}`;
  return phone;
}

function formatarDataMembro(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
}

function formatarDataPagamento(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

function formatarValor(amount: string): string {
  return `R$ ${Number(amount).toFixed(2).replace(".", ",")}`;
}

function iniciais(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function corAtributo(value: number | null): string {
  if (value === null) return "text-sidebar-foreground/50";
  const pct = value;
  if (pct >= 8) return "text-gold";
  if (pct >= 7) return "text-sidebar-foreground";
  if (pct >= 5) return "text-sidebar-foreground/70";
  return "text-destructive";
}

// ─── sub-componentes ──────────────────────────────────────────────────────────

function BadgeMensalidade({ status }: { status: Mensalidade["status"] }) {
  const mapa = {
    paid: {
      label: "Pago",
      icon: <CheckCircle2 className="size-3" />,
      className: "bg-success/15 text-success",
    },
    pending: {
      label: "Pendente",
      icon: <Clock className="size-3" />,
      className: "bg-warning/15 text-warning-foreground",
    },
    late: {
      label: "Atrasado",
      icon: <AlertCircle className="size-3" />,
      className: "bg-destructive/15 text-destructive",
    },
    cancelled: {
      label: "Cancelado",
      icon: <XCircle className="size-3" />,
      className: "bg-muted text-muted-foreground",
    },
  };

  const cfg = mapa[status] ?? mapa.pending;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        cfg.className,
      )}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function SkeletonPerfil() {
  return (
    <div className="max-w-5xl mx-auto space-y-4 md:space-y-5">
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-6 w-40" />
        <div className="ml-auto flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
      <Skeleton className="h-44 w-full rounded-2xl" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

// ─── página principal ─────────────────────────────────────────────────────────

export default function PerfilJogadorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [jogador, setJogador] = useState<Jogador | null>(null);
  const [mensalidades, setMensalidades] = useState<Mensalidade[]>([]);
  const [sessao, setSessao] = useState<SessaoUsuario>(null);
  const [aba, setAba] = useState<AbaAtiva>("mensalidades");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [suspendendo, setSuspendendo] = useState(false);
  const [totalGols, setTotalGols] = useState(0);
  const [totalPartidas, setTotalPartidas] = useState(0);
  const [totalPresença, setTotalPresença] = useState(0);
  const [totalVotos, setTotalVotos] = useState(0);

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [
        resSessao,
        resJogador,
        resMensalidades,
        totalGoals,
        totalPartidas,
        totalVotos,
      ] = await Promise.all([
        fetch("/api/auth/me"),
        fetch(`/api/users/${id}`),
        fetch(`/api/financial/monthly-fees?user_id=${id}`),
        fetch(`/api/users/${id}/gols`),
        fetch(`/api/users/${id}/matches`),
        fetch(`/api/users/${id}/votes`),
      ]);

      if (!resJogador.ok) {
        setErro("Jogador não encontrado.");
        return;
      }

      const [
        dadosSessao,
        dadosJogador,
        dadosMensalidades,
        dadosGoals,
        dadosPartidas,
        dadosVotos,
      ] = await Promise.all([
        resSessao.json(),
        resJogador.json(),
        resMensalidades.json(),
        totalGoals.json(),
        totalPartidas.json(),
        totalVotos.json(),
      ]);

      setSessao(dadosSessao?.id ? dadosSessao : null);
      setJogador(dadosJogador);
      setMensalidades(
        Array.isArray(dadosMensalidades) ? dadosMensalidades : [],
      );
      setTotalGols(dadosGoals.gols);
      setTotalPartidas(dadosPartidas.partidas);
      setTotalPresença(dadosPartidas.presença);
      setTotalVotos(dadosVotos.votos);
    } catch {
      setErro("Falha ao carregar perfil.");
    } finally {
      setCarregando(false);
    }
  }, [id]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  async function suspender() {
    if (!jogador) return;
    setSuspendendo(true);
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !jogador.is_active }),
      });
      if (res.ok) {
        setJogador((j) => (j ? { ...j, is_active: !j.is_active } : j));
      }
    } finally {
      setSuspendendo(false);
    }
  }

  if (carregando) return <SkeletonPerfil />;

  if (erro || !jogador) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <Link
          href="/jogadores"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Elenco
        </Link>
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {erro ?? "Jogador não encontrado."}
        </div>
      </div>
    );
  }

  const ehProprioJogador = sessao?.id === jogador.id;
  const ehGestor = sessao?.role === "admin" || sessao?.role === "co_admin";
  const podeEditar = ehProprioJogador || ehGestor;

  const ratings = jogador.player_ratings;
  const overall = ratings?.overall ?? 0;
  // Exibe na escala 10–100
  const overallDisplay = Math.round(overall);

  // Status da mensalidade mais recente (para badge "Em dia")
  const ultimaMensalidade = mensalidades[0];
  const statusPagamento = jogador.is_goalkeeper
    ? "isento"
    : ultimaMensalidade?.status === "paid"
      ? "emdia"
      : ultimaMensalidade?.status === "late" ||
          ultimaMensalidade?.status === "pending"
        ? "inadimplente"
        : "emdia";

  const nomePrincipal = jogador.nickname ?? jogador.name;
  const posicaoLabel = jogador.is_goalkeeper
    ? "Goleiro"
    : (jogador.position ?? "—");

  const abas: { key: AbaAtiva; label: string }[] = [
    { key: "mensalidades", label: "Mensalidades" },
    { key: "partidas", label: "Partidas" },
    { key: "destaques", label: "Destaques" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-4 md:space-y-5 pb-4">
      {/* ── Cabeçalho ───────────────────────────────────────────────── */}
      <header className="flex items-center gap-3 flex-wrap">
        <Link
          href="/jogadores"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Elenco
        </Link>

        <h1 className="font-heading text-lg tracking-wide text-foreground hidden md:block">
          {jogador.name.toUpperCase()}
        </h1>

        <div className="ml-auto flex items-center gap-2">
          {podeEditar && (
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button size="sm">
                  <MoreHorizontal className="size-3.5 mr-1.5" />
                  <span className="hidden sm:inline">Ações</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => router.push(`/jogadores/${id}/editar`)}
                >
                  <Pencil className="size-4 mr-2 bg" />
                  Editar Cadastro
                </DropdownMenuItem>
                {ehGestor && (
                  <>
                    <DropdownMenuItem>
                      <Star className="size-4 mr-2" />
                      Isentar Mensalidade
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={suspender}
                      disabled={suspendendo}
                    >
                      <Ban className="size-4 mr-2" />
                      {jogador.is_active
                        ? "Suspender Jogador"
                        : "Reativar Jogador"}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>

      {/* ── Hero Card — desktop (dark navy) ─────────────────────────── */}
      <div className="hidden md:block rounded-2xl overflow-hidden bg-sidebar text-sidebar-foreground p-6">
        <div className="flex items-start gap-6">
          {/* Avatar + overall */}
          <div className="relative shrink-0">
            <div className="size-24 rounded-full border-2 border-gold flex items-center justify-center overflow-hidden bg-sidebar-accent">
              {jogador.photo_url ? (
                <img
                  src={jogador.photo_url}
                  alt={jogador.name}
                  className="size-full object-cover"
                />
              ) : (
                <span className="font-heading text-3xl text-gold">
                  {iniciais(jogador.name)}
                </span>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 size-11 rounded-full bg-sidebar border-2 border-gold flex items-center justify-center">
              <span className="font-heading text-base text-gold leading-none">
                {overallDisplay}
              </span>
            </div>
          </div>

          {/* Info do jogador */}
          <div className="flex-1 min-w-0">
            <p className="font-heading text-3xl text-white tracking-wide leading-tight">
              {nomePrincipal}
            </p>
            <p className="text-sm text-sidebar-foreground/60 mt-1">
              {posicaoLabel} · Membro desde{" "}
              {formatarDataMembro(jogador.created_at)}
            </p>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
                  jogador.is_active
                    ? "bg-success/20 text-success border border-success/40"
                    : "bg-destructive/20 text-destructive border border-destructive/40",
                )}
              >
                {jogador.is_active ? "Ativo" : "Suspenso"}
              </span>

              {statusPagamento !== "isento" && (
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border",
                    statusPagamento === "emdia"
                      ? "bg-gold/20 text-gold border-gold/40"
                      : "bg-destructive/20 text-destructive border-destructive/40",
                  )}
                >
                  {statusPagamento === "emdia" ? "Em dia" : "Inadimplente"}
                </span>
              )}

              {statusPagamento === "isento" && (
                <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-muted/20 text-sidebar-foreground/60 border border-sidebar-foreground/20">
                  Isento
                </span>
              )}

              {jogador.phone && (
                <span className="inline-flex items-center gap-1.5 text-sm text-sidebar-foreground/60">
                  <Phone className="size-3" />
                  {formatarTelefone(jogador.phone)}
                </span>
              )}
            </div>
          </div>

          {/* Avaliação técnica */}
          {ratings && (
            <div className="shrink-0 text-right">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40 mb-3">
                Avaliação Técnica
              </p>
              <div className="flex items-end gap-5">
                {ATRIBUTOS.map(({ label, key }) => {
                  const val = ratings[key] as number | null;
                  return (
                    <div key={label} className="text-center">
                      <p className="text-[10px] font-medium text-sidebar-foreground/40 mb-1">
                        {label}
                      </p>
                      <p
                        className={cn(
                          "font-heading text-2xl leading-none",
                          corAtributo(val),
                        )}
                      >
                        {val !== null ? Math.round(val) : "—"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Hero Card — mobile (light) ───────────────────────────────── */}
      <div className="md:hidden rounded-2xl bg-sidebar p-4">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="size-20 rounded-full border-2 border-gold flex items-center justify-center overflow-hidden bg-sidebar-accent shrink-0">
            {jogador.photo_url ? (
              <img
                src={jogador.photo_url}
                alt={jogador.name}
                className="size-full object-cover"
              />
            ) : (
              <span className="font-heading text-2xl text-gold">
                {iniciais(jogador.name)}
              </span>
            )}
          </div>

          {/* Nome + posição */}
          <div className="flex-1 min-w-0">
            <p className="font-heading text-xl text-sidebar-foreground tracking-wide leading-tight">
              {nomePrincipal}
            </p>
            <p className="text-sm text-sidebar-foreground/60">{posicaoLabel}</p>
          </div>

          {/* Overall badge */}
          <div className="size-12 rounded-full border-2 border-gold bg-sidebar-accent flex items-center justify-center shrink-0">
            <span className="font-heading text-lg text-gold leading-none">
              {overallDisplay}
            </span>
          </div>
        </div>

        {/* Badges mobile */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
              jogador.is_active
                ? "bg-success/15 text-success border border-success/30"
                : "bg-destructive/15 text-destructive border border-destructive/30",
            )}
          >
            {jogador.is_active ? "Ativo" : "Suspenso"}
          </span>
          {statusPagamento !== "isento" && (
            <span
              className={cn(
                "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border",
                statusPagamento === "emdia"
                  ? "bg-gold/20 text-gold border-gold/40"
                  : "bg-destructive/20 text-destructive border-destructive/40",
              )}
            >
              {statusPagamento === "emdia" ? "Em dia" : "Inadimplente"}
            </span>
          )}

          {statusPagamento === "isento" && (
            <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-muted/20 text-sidebar-foreground/60 border border-sidebar-foreground/20">
              Isento
            </span>
          )}
        </div>
      </div>

      {/* ── Cards de estatísticas ────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Gols */}
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="font-heading text-4xl leading-none text-destructive text-center">
            {totalGols}
          </p>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            {jogador.is_goalkeeper ? `Gols Sofridos ` : `Gols Marcados `}—{" "}
            {new Date().getFullYear()}
          </p>
        </div>

        {/* Assistências */}
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="font-heading text-4xl leading-none text-foreground text-center">
            {totalVotos}
          </p>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Votos MVP — {new Date().getFullYear()}
          </p>
        </div>

        {/* Partidas */}
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="font-heading text-4xl leading-none text-foreground text-center">
            {totalPartidas}
          </p>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Partidas - {new Date().getFullYear()}
          </p>
        </div>

        {/* Presença */}
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="font-heading text-4xl leading-none text-success text-center">
            {(totalPresença * 100).toFixed(1)}%
          </p>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Presença - {new Date().getFullYear()}
          </p>
        </div>
      </div>

      {/* ── Abas ────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Navegação das abas */}
        <div className="flex border-b border-border">
          {abas.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setAba(key)}
              className={cn(
                "px-5 py-3 text-sm font-medium transition-colors relative",
                aba === key
                  ? "text-foreground after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Aba: Mensalidades */}
        {aba === "mensalidades" && (
          <>
            {/* Desktop: tabela completa */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Competência</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Data Pgto.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mensalidades.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-28 text-center text-muted-foreground"
                      >
                        {jogador.is_goalkeeper
                          ? "Goleiro isento de mensalidade."
                          : "Nenhuma mensalidade registrada."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    mensalidades.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">
                          {MESES[m.month - 1]} {m.year}
                        </TableCell>
                        <TableCell>
                          <BadgeMensalidade status={m.status} />
                        </TableCell>
                        <TableCell>{formatarValor(m.amount)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatarDataPagamento(m.paid_at)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile: lista compacta */}
            <div className="md:hidden divide-y divide-border">
              {mensalidades.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  {jogador.is_goalkeeper
                    ? "Goleiro isento de mensalidade."
                    : "Nenhuma mensalidade registrada."}
                </div>
              ) : (
                mensalidades.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <span className="text-sm font-medium text-foreground">
                      {MESES[m.month - 1]} {m.year}
                    </span>
                    <div className="flex items-center gap-2">
                      <BadgeMensalidade status={m.status} />
                      <span className="text-xs text-muted-foreground">
                        · {formatarValor(m.amount)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* Aba: Partidas */}
        {aba === "partidas" && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
            <Calendar className="size-8 opacity-30" />
            <p className="text-sm">Histórico de partidas em breve.</p>
          </div>
        )}

        {/* Aba: Destaques */}
        {aba === "destaques" && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
            <Trophy className="size-8 opacity-30" />
            <p className="text-sm">Destaques em breve.</p>
          </div>
        )}
      </div>

      {/* ── Ações de rodapé (gestor) ─────────────────────────────────── */}
      {ehGestor && (
        <div className="flex flex-wrap gap-3">
          <Button
            className={"bg-white"}
            variant="outline"
            onClick={() => router.push(`/jogadores/${id}/editar`)}
          >
            <Pencil className="size-4 mr-2" />
            Editar Cadastro
          </Button>
          <Button className={"bg-white"} variant="outline">
            <Star className="size-4 mr-2" />
            Isentar Mensalidade
          </Button>
          <Button
            variant="outline"
            className={cn(
              "border-destructive/40 text-destructive hover:bg-destructive/5 bg-white",
            )}
            onClick={suspender}
            disabled={suspendendo}
          >
            {jogador.is_active ? (
              <>
                <Ban className="size-4 mr-2" />
                Suspender
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4 mr-2" />
                Reativar
              </>
            )}
          </Button>
        </div>
      )}

      {/* Ação de rodapé (próprio jogador sem privilégio admin) */}
      {ehProprioJogador && !ehGestor && (
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => router.push(`/jogadores/${id}/editar`)}
          >
            <Pencil className="size-4 mr-2" />
            Editar Perfil
          </Button>
        </div>
      )}
    </div>
  );
}
