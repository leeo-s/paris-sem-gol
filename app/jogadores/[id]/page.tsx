"use client";

import { useEffect, useState, useCallback, type ComponentType } from "react";
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
  MapPin,
  Target,
  Shield,
  ChevronLeft,
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Flame,
  Percent,
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

type Transacao = {
  id: string;
  type: "income" | "expense";
  category: string;
  amount: string;
  description: string;
  reference_date: string;
  payment_method: "Pix" | "Dinheiro" | "Cartao";
};

type SessaoUsuario = {
  id: string;
  name: string;
  role: string;
} | null;

type AbaAtiva = "mensalidades" | "partidas" | "destaques" | "pagamentos";

// Estatísticas consolidadas do jogador exibidas na aba de Destaques
type Destaques = {
  ehGoleiro: boolean;
  gols: { total: number; ano: number; mes: number };
  mvp: {
    votos: { total: number; ano: number; mes: number };
    eleito: { total: number; ano: number; mes: number };
  };
  presenca: {
    total: { partidas: number; totalPartidas: number; percentual: number };
    ano: { partidas: number; totalPartidas: number; percentual: number };
    mes: { partidas: number; totalPartidas: number; percentual: number };
  };
  sequenciaPresenca: number;
};

type PartidaHistorico = {
  id: string;
  match_date: string;
  location: string | null;
  status: "scheduled" | "completed" | "cancelled" | "started";
  gols: number;
  votosRecebidos: number;
  mvp: {
    id: string;
    name: string;
    nickname: string | null;
    photo_url: string | null;
    votos: number;
  } | null;
  ehMvp: boolean;
};

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

// Rótulos amigáveis para o método de pagamento registrado na transação
const METODOS_PAGAMENTO: Record<Transacao["payment_method"], string> = {
  Pix: "Pix",
  Dinheiro: "Dinheiro",
  Cartao: "Cartão",
};

const TRANSACOES_POR_PAGINA = 10;

const ATRIBUTOS: { label: string; key: keyof PlayerRatings }[] = [
  { label: "VEL", key: "speed" },
  { label: "DRI", key: "dribbling" },
  { label: "PAS", key: "passing" },
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

// Formata a data de membro exibindo mês e ano, forçando UTC para evitar deslocamento de fuso
function formatarDataMembro(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("pt-BR", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Formata a data de pagamento em dd/mm/aaaa, forçando UTC para evitar deslocamento de fuso
function formatarDataPagamento(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("pt-BR", { timeZone: "UTC" });
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

// Abrevia o nome do mês a partir do número (1–12)
function abreviarMes(numeroMes: number): string {
  return new Date(2000, numeroMes - 1)
    .toLocaleDateString("pt-BR", { month: "short" })
    .replace(".", "")
    .toUpperCase();
}

// Badge colorido para o status da partida
function BadgeStatusPartida({
  status,
}: {
  status: PartidaHistorico["status"];
}) {
  const mapa = {
    scheduled: {
      label: "Agendada",
      className: "bg-muted text-muted-foreground",
    },
    started: {
      label: "Em andamento",
      className: "bg-warning/15 text-warning-foreground",
    },
    completed: {
      label: "Encerrada",
      className: "bg-muted text-muted-foreground",
    },
    cancelled: {
      label: "Cancelada",
      className: "bg-destructive/15 text-destructive",
    },
  };

  const cfg = mapa[status] ?? mapa.scheduled;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
        cfg.className,
      )}
    >
      {cfg.label}
    </span>
  );
}

// Badge colorido indicando se a transação foi uma entrada ou saída financeira
function BadgeTipoTransacao({ type }: { type: Transacao["type"] }) {
  const entrada = type === "income";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        entrada
          ? "bg-success/15 text-success"
          : "bg-destructive/15 text-destructive",
      )}
    >
      {entrada ? (
        <ArrowDownLeft className="size-3" />
      ) : (
        <ArrowUpRight className="size-3" />
      )}
      {entrada ? "Entrada" : "Saída"}
    </span>
  );
}

// Conteúdo da aba de pagamentos do jogador: histórico de transações financeiras,
// paginado em blocos de 10 a partir da API (paginação feita no servidor)
function AbaPagamentos({
  transacoes,
  carregando,
  paginaAtual,
  totalPaginas,
  totalRegistros,
  aoMudarPagina,
}: {
  transacoes: Transacao[] | null;
  carregando: boolean;
  paginaAtual: number;
  totalPaginas: number;
  totalRegistros: number;
  aoMudarPagina: (pagina: number) => void;
}) {
  // Estado de carregamento: exibe skeletons no lugar das linhas
  if (carregando || transacoes === null) {
    return (
      <div className="divide-y divide-border p-4 space-y-3">
        {[...Array(TRANSACOES_POR_PAGINA)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  // Estado vazio: nenhuma transação registrada
  if (transacoes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
        <Wallet className="size-8 opacity-30" />
        <p className="text-sm">Nenhuma transação registrada.</p>
      </div>
    );
  }

  const indiceInicio = (paginaAtual - 1) * TRANSACOES_POR_PAGINA;

  return (
    <div>
      {/* Desktop: tabela completa */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data Ref.</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Pagamento</TableHead>
              <TableHead>Tipo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transacoes.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="text-muted-foreground">
                  {formatarDataPagamento(t.reference_date)}
                </TableCell>
                <TableCell className="font-medium">{t.description}</TableCell>
                <TableCell>{formatarValor(t.amount)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {METODOS_PAGAMENTO[t.payment_method]}
                </TableCell>
                <TableCell>
                  <BadgeTipoTransacao type={t.type} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: lista compacta */}
      <div className="md:hidden divide-y divide-border">
        {transacoes.map((t) => (
          <div key={t.id} className="px-4 py-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground truncate">
                {t.description}
              </span>
              <span className="text-sm font-semibold tabular-nums shrink-0">
                {formatarValor(t.amount)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {formatarDataPagamento(t.reference_date)} ·{" "}
                {METODOS_PAGAMENTO[t.payment_method]}
              </span>
              <BadgeTipoTransacao type={t.type} />
            </div>
          </div>
        ))}
      </div>

      {/* Controles de paginação */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <button
            onClick={() => aoMudarPagina(Math.max(1, paginaAtual - 1))}
            disabled={paginaAtual === 1}
            className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ← Anterior
          </button>

          <span className="text-xs text-muted-foreground">
            {indiceInicio + 1}–
            {Math.min(indiceInicio + TRANSACOES_POR_PAGINA, totalRegistros)} de{" "}
            {totalRegistros} transações
          </span>

          <button
            onClick={() =>
              aoMudarPagina(Math.min(totalPaginas, paginaAtual + 1))
            }
            disabled={paginaAtual === totalPaginas}
            className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Próxima →
          </button>
        </div>
      )}
    </div>
  );
}

// Formata um percentual no formato 0–1 como string "82%"
function formatarPercentual(valor: number): string {
  return `${Math.round(valor * 100)}%`;
}

// Card de estatística com três colunas comparando Total / Ano / Mês
function CardEstatistica({
  icone: Icone,
  titulo,
  corIcone,
  colunas,
  className,
}: {
  icone: ComponentType<{ className?: string }>;
  titulo: string;
  corIcone: string;
  colunas: { label: string; valor: string }[];
  className?: string;
}) {
  return (
    <div
      className={cn("rounded-xl border border-border bg-card p-4", className)}
    >
      <div className="flex items-center gap-2 mb-3">
        <Icone className={cn("size-4", corIcone)} />
        <p className="text-sm font-semibold text-foreground">{titulo}</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {colunas.map((coluna) => (
          <div key={coluna.label} className="text-center">
            <p className="font-heading text-2xl leading-none text-foreground">
              {coluna.valor}
            </p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">
              {coluna.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Card de presença, com percentual em destaque e a fração de partidas abaixo
function CardPresenca({ presenca }: { presenca: Destaques["presenca"] }) {
  const colunas = [
    { label: "Total", dado: presenca.total },
    { label: "Ano", dado: presenca.ano },
    { label: "Mês", dado: presenca.mes },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-4 md:col-span-3">
      <div className="flex items-center gap-2 mb-3">
        <Percent className="size-4 text-success" />
        <p className="text-sm font-semibold text-foreground">Presença</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {colunas.map((coluna) => (
          <div key={coluna.label} className="text-center">
            <p className="font-heading text-2xl leading-none text-success">
              {formatarPercentual(coluna.dado.percentual)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {coluna.dado.partidas}/{coluna.dado.totalPartidas} partidas
            </p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mt-0.5">
              {coluna.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Conteúdo da aba de Destaques: estatísticas consolidadas de gols, MVP e presença,
// comparando sempre o total geral com o ano e o mês atuais
function AbaDestaques({
  destaques,
  carregando,
  ehGoleiro,
}: {
  destaques: Destaques | null;
  carregando: boolean;
  ehGoleiro: boolean;
}) {
  // Estado de carregamento: exibe skeletons no lugar dos cards
  if (carregando || destaques === null) {
    return (
      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  // Rótulo e ícone dos gols variam conforme a posição do jogador
  const labelGols = ehGoleiro ? "Gols Sofridos" : "Gols Marcados";
  const IconeGols = ehGoleiro ? Shield : Target;

  return (
    <div className="p-4 space-y-3">
      {/* Sequência atual de presença, destacada quando relevante (3+ partidas) */}
      {destaques.sequenciaPresenca >= 3 && (
        <div className="flex items-center gap-2 rounded-lg bg-gold/10 border border-gold/30 px-3 py-2">
          <Flame className="size-4 text-gold shrink-0" />
          <span className="text-sm text-gold font-medium">
            {destaques.sequenciaPresenca} partidas consecutivas presente
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <CardEstatistica
          icone={IconeGols}
          titulo={labelGols}
          corIcone="text-destructive"
          colunas={[
            { label: "Total", valor: String(destaques.gols.total) },
            { label: "Ano", valor: String(destaques.gols.ano) },
            { label: "Mês", valor: String(destaques.gols.mes) },
          ]}
        />

        <CardEstatistica
          icone={Star}
          titulo="Votos MVP"
          corIcone="text-gold"
          colunas={[
            { label: "Total", valor: String(destaques.mvp.votos.total) },
            { label: "Ano", valor: String(destaques.mvp.votos.ano) },
            { label: "Mês", valor: String(destaques.mvp.votos.mes) },
          ]}
        />

        <CardEstatistica
          icone={Trophy}
          titulo="Eleito Craque"
          corIcone="text-gold"
          colunas={[
            { label: "Total", valor: String(destaques.mvp.eleito.total) },
            { label: "Ano", valor: String(destaques.mvp.eleito.ano) },
            { label: "Mês", valor: String(destaques.mvp.eleito.mes) },
          ]}
        />

        <CardPresenca presenca={destaques.presenca} />
      </div>
    </div>
  );
}

const PARTIDAS_POR_PAGINA = 5;

// Conteúdo da aba de histórico de partidas do jogador, com paginação
function AbaPartidas({
  historico,
  carregando,
  ehGoleiro,
}: {
  historico: PartidaHistorico[] | null;
  carregando: boolean;
  ehGoleiro: boolean;
}) {
  const [paginaAtual, setPaginaAtual] = useState(1);

  // Estado de carregamento: exibe skeletons no lugar dos cards
  if (carregando || historico === null) {
    return (
      <div className="divide-y divide-border">
        {[...Array(PARTIDAS_POR_PAGINA)].map((_, i) => (
          <div key={i} className="p-4 space-y-2">
            <div className="flex items-center gap-3">
              <Skeleton className="size-14 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            <Skeleton className="h-8 w-full rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  // Estado vazio: nenhuma partida registrada
  if (historico.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
        <Calendar className="size-8 opacity-30" />
        <p className="text-sm">Nenhuma partida registrada.</p>
      </div>
    );
  }

  const totalPaginas = Math.ceil(historico.length / PARTIDAS_POR_PAGINA);
  const indiceInicio = (paginaAtual - 1) * PARTIDAS_POR_PAGINA;
  const partidasDaPagina = historico.slice(
    indiceInicio,
    indiceInicio + PARTIDAS_POR_PAGINA,
  );

  return (
    <div>
      <div className="divide-y divide-border">
        {partidasDaPagina.map((partida) => {
          const dataPartida = new Date(partida.match_date);
          const dia = dataPartida.getUTCDate().toString().padStart(2, "0");
          const mes = abreviarMes(dataPartida.getUTCMonth() + 1);

          // Rótulo e ícone dos gols variam conforme a posição do jogador
          const labelGols = ehGoleiro
            ? `gol${partida.gols !== 1 ? "s" : ""} sofrido${partida.gols !== 1 ? "s" : ""}`
            : `gol${partida.gols !== 1 ? "s" : ""}`;
          const IconeGol = ehGoleiro ? Shield : Target;

          return (
            <div key={partida.id} className="p-4 space-y-2.5">
              {/* Linha principal: data + status + local + estatísticas */}
              <div className="flex items-start gap-3">
                {/* Caixa com a data */}
                <div className="flex flex-col items-center justify-center rounded-xl bg-muted px-3 py-2 shrink-0 min-w-13 text-center">
                  <span className="font-heading text-2xl leading-none text-foreground">
                    {dia}
                  </span>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground mt-0.5">
                    {mes}
                  </span>
                </div>

                {/* Informações e estatísticas da partida */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <BadgeStatusPartida status={partida.status} />
                    {partida.location && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3" />
                        {partida.location}
                      </span>
                    )}
                  </div>

                  {/* Estatísticas individuais: gols e votos MVP */}
                  <div className="flex items-center gap-4 mt-2">
                    <span className="flex items-center gap-1.5">
                      <IconeGol className="size-3.5 text-muted-foreground" />
                      <span className="font-heading text-lg leading-none text-foreground">
                        {partida.gols}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {labelGols}
                      </span>
                    </span>

                    <span className="flex items-center gap-1.5">
                      <Star className="size-3.5 text-muted-foreground" />
                      <span className="font-heading text-lg leading-none text-foreground">
                        {partida.votosRecebidos}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {partida.votosRecebidos === 1
                          ? "voto MVP"
                          : "votos MVP"}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Linha do MVP: destaque em ouro se o próprio jogador foi o MVP */}
              {partida.mvp && (
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2.5 py-1.5",
                    partida.ehMvp ? "bg-gold/10" : "bg-muted/50",
                  )}
                >
                  <Trophy
                    className={cn(
                      "size-3 shrink-0",
                      partida.ehMvp ? "text-gold" : "text-muted-foreground",
                    )}
                    fill={partida.ehMvp ? "currentColor" : "none"}
                  />
                  <span
                    className={cn(
                      "text-xs truncate",
                      partida.ehMvp
                        ? "font-semibold text-gold"
                        : "text-muted-foreground",
                    )}
                  >
                    MVP: {partida.mvp.nickname ?? partida.mvp.name}
                    {partida.ehMvp && " · você!"}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto shrink-0">
                    {partida.mvp.votos}{" "}
                    {partida.mvp.votos === 1 ? "voto" : "votos"}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Controles de paginação */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <button
            onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
            disabled={paginaAtual === 1}
            className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ← Anterior
          </button>

          <span className="text-xs text-muted-foreground">
            {indiceInicio + 1}–
            {Math.min(indiceInicio + PARTIDAS_POR_PAGINA, historico.length)} de{" "}
            {historico.length} partidas
          </span>

          <button
            onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
            disabled={paginaAtual === totalPaginas}
            className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Próxima →
          </button>
        </div>
      )}
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
  const [partidasHistorico, setPartidasHistorico] = useState<
    PartidaHistorico[] | null
  >(null);
  const [carregandoPartidas, setCarregandoPartidas] = useState(false);
  const [destaques, setDestaques] = useState<Destaques | null>(null);
  const [carregandoDestaques, setCarregandoDestaques] = useState(false);
  const [anoMensalidade, setAnoMensalidade] = useState(
    new Date().getFullYear(),
  );
  const [transacoes, setTransacoes] = useState<Transacao[] | null>(null);
  const [carregandoTransacoes, setCarregandoTransacoes] = useState(false);
  const [paginaTransacoes, setPaginaTransacoes] = useState(1);
  const [totalPaginasTransacoes, setTotalPaginasTransacoes] = useState(1);
  const [totalTransacoes, setTotalTransacoes] = useState(0);

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

  // Busca o histórico de partidas somente quando a aba for selecionada pela primeira vez
  const carregarHistoricoPartidas = useCallback(async () => {
    setCarregandoPartidas(true);
    try {
      const resposta = await fetch(`/api/users/${id}/match-history`);
      if (resposta.ok) {
        const dados = await resposta.json();
        setPartidasHistorico(Array.isArray(dados) ? dados : []);
      }
    } catch {
      setPartidasHistorico([]);
    } finally {
      setCarregandoPartidas(false);
    }
  }, [id]);

  useEffect(() => {
    if (aba === "partidas" && partidasHistorico === null) {
      carregarHistoricoPartidas();
    }
  }, [aba, partidasHistorico, carregarHistoricoPartidas]);

  // Busca as estatísticas de destaque somente quando a aba for selecionada pela primeira vez
  const carregarDestaques = useCallback(async () => {
    setCarregandoDestaques(true);
    try {
      const resposta = await fetch(`/api/users/${id}/highlights`);
      if (resposta.ok) {
        setDestaques(await resposta.json());
      }
    } finally {
      setCarregandoDestaques(false);
    }
  }, [id]);

  useEffect(() => {
    if (aba === "destaques" && destaques === null) {
      carregarDestaques();
    }
  }, [aba, destaques, carregarDestaques]);

  // Busca uma página do histórico financeiro do jogador na API (paginação no servidor)
  const carregarTransacoes = useCallback(
    async (pagina: number) => {
      setCarregandoTransacoes(true);
      try {
        const resposta = await fetch(
          `/api/users/${id}/transactions?page=${pagina}`,
        );
        if (resposta.ok) {
          const dados = await resposta.json();
          setTransacoes(
            Array.isArray(dados.transacoes) ? dados.transacoes : [],
          );
          setTotalPaginasTransacoes(dados.totalPaginas ?? 1);
          setTotalTransacoes(dados.total ?? 0);
        }
      } catch {
        setTransacoes([]);
      } finally {
        setCarregandoTransacoes(false);
      }
    },
    [id],
  );

  // Carrega a primeira página somente quando a aba for selecionada pela primeira vez
  useEffect(() => {
    if (aba === "pagamentos" && transacoes === null) {
      carregarTransacoes(1);
    }
  }, [aba, transacoes, carregarTransacoes]);

  // Troca de página da paginação de transações, disparando nova busca no servidor
  function mudarPaginaTransacoes(pagina: number) {
    setPaginaTransacoes(pagina);
    carregarTransacoes(pagina);
  }

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
    { key: "pagamentos", label: "Pagamentos" },
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
          <div className="size-20 rounded-full border-2 border-gold flex items-center justify-center overflow-hidden bg-sidebar-accent shrink-0 ">
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

          {/* Overall + atributos técnicos */}
          <div className="shrink-0 flex flex-col items-center gap-2">
            <div className="size-12 rounded-full border-2 border-gold bg-sidebar-accent flex items-center justify-center">
              <span className="font-heading text-lg text-gold leading-none">
                {overallDisplay}
              </span>
            </div>

            {ratings && (
              <div className="flex items-end gap-2">
                {ATRIBUTOS.map(({ label, key }) => {
                  const val = ratings[key] as number | null;
                  return (
                    <div key={label} className="text-center">
                      <p className="text-[10px] font-medium text-sidebar-foreground/40 mb-0.5">
                        {label}
                      </p>
                      <p
                        className={cn(
                          "font-heading text-sm leading-none",
                          corAtributo(val),
                        )}
                      >
                        {val !== null ? Math.round(val) : "—"}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
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
        <div className="flex border-b border-border overflow-x-auto scrollbar-none">
          {abas.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setAba(key)}
              className={cn(
                "shrink-0 whitespace-nowrap px-5 py-3 text-sm font-medium transition-colors relative",
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
        {aba === "mensalidades" &&
          (() => {
            // Anos disponíveis extraídos das mensalidades, mais o ano atual sempre presente
            const anosDisponiveis = Array.from(
              new Set([
                new Date().getFullYear(),
                ...mensalidades.map((m) => m.year),
              ]),
            ).sort((a, b) => b - a);

            // Mensalidades filtradas pelo ano selecionado
            const mensalidadesFiltradas = mensalidades.filter(
              (m) => m.year === anoMensalidade,
            );

            const semDados = mensalidadesFiltradas.length === 0;

            return (
              <>
                {/* Seletor de ano por setas */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
                  <button
                    onClick={() =>
                      setAnoMensalidade(
                        (a) =>
                          anosDisponiveis[anosDisponiveis.indexOf(a) + 1] ?? a,
                      )
                    }
                    disabled={
                      anosDisponiveis.indexOf(anoMensalidade) ===
                      anosDisponiveis.length - 1
                    }
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="size-4" />
                  </button>

                  <span className="text-sm font-medium text-foreground">
                    {anoMensalidade}
                  </span>

                  <button
                    onClick={() =>
                      setAnoMensalidade(
                        (a) =>
                          anosDisponiveis[anosDisponiveis.indexOf(a) - 1] ?? a,
                      )
                    }
                    disabled={anosDisponiveis.indexOf(anoMensalidade) === 0}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>

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
                      {semDados ? (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="h-28 text-center text-muted-foreground"
                          >
                            {jogador.is_goalkeeper
                              ? "Goleiro isento de mensalidade."
                              : `Nenhuma mensalidade registrada em ${anoMensalidade}.`}
                          </TableCell>
                        </TableRow>
                      ) : (
                        mensalidadesFiltradas.map((m) => (
                          <TableRow key={m.id}>
                            <TableCell className="font-medium">
                              {MESES[m.month - 1]}
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
                  {semDados ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      {jogador.is_goalkeeper
                        ? "Goleiro isento de mensalidade."
                        : `Nenhuma mensalidade registrada em ${anoMensalidade}.`}
                    </div>
                  ) : (
                    mensalidadesFiltradas.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between px-4 py-3"
                      >
                        <span className="text-sm font-medium text-foreground">
                          {MESES[m.month - 1]}
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
            );
          })()}

        {/* Aba: Partidas */}
        {aba === "partidas" && (
          <AbaPartidas
            historico={partidasHistorico}
            carregando={carregandoPartidas}
            ehGoleiro={jogador.is_goalkeeper}
          />
        )}

        {/* Aba: Pagamentos */}
        {aba === "pagamentos" && (
          <AbaPagamentos
            transacoes={transacoes}
            carregando={carregandoTransacoes}
            paginaAtual={paginaTransacoes}
            totalPaginas={totalPaginasTransacoes}
            totalRegistros={totalTransacoes}
            aoMudarPagina={mudarPaginaTransacoes}
          />
        )}

        {/* Aba: Destaques */}
        {aba === "destaques" && (
          <AbaDestaques
            destaques={destaques}
            carregando={carregandoDestaques}
            ehGoleiro={jogador.is_goalkeeper}
          />
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
