"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  UserPlus,
  MoreHorizontal,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── tipos ────────────────────────────────────────────────────────────────────

type StatusMensalidade = "pending" | "paid" | "late" | "cancelled";

type Jogador = {
  id: string;
  name: string;
  nickname: string | null;
  photo_url: string | null;
  phone: string | null;
  position: string | null;
  is_goalkeeper: boolean;
  is_active: boolean;
  role: string;
  player_ratings: { overall: number | null } | null;
  monthly_fees: { status: StatusMensalidade }[];
  monthly_roster: { status: string }[];
};

type RespostaApi = {
  data: Jogador[];
  total: number;
  page: number;
  pageSize: number;
};

type SessaoUsuario = {
  id: string;
  name: string;
  role: string;
} | null;

type FiltroTab = "todos" | "ativos" | "inadimplente" | "gk" | "suspensos";

// ─── helpers ──────────────────────────────────────────────────────────────────

function construirParams(
  filtro: FiltroTab,
  busca: string,
  pagina: number,
): string {
  const params = new URLSearchParams();
  params.set("page", pagina.toString());
  if (busca) params.set("search", busca);

  if (filtro === "todos") params.set("includeInactive", "true");
  if (filtro === "ativos") params.set("filter", "ativos");
  if (filtro === "inadimplente") params.set("filter", "inadimplente");
  if (filtro === "gk") params.set("is_goalkeeper", "true");

  return params.toString();
}

// ─── sub-componentes ─────────────────────────────────────────────────────────

function BadgePosicao({
  position,
  isGoalkeeper,
}: {
  position: string | null;
  isGoalkeeper: boolean;
}) {
  const label = isGoalkeeper ? "GK" : (position ?? "—");

  const estilos: Record<string, string> = {
    GK: "bg-muted text-foreground border border-border",
    ATA: "bg-destructive/15 text-destructive",
    DEF: "bg-primary/10 text-primary",
    MEI: "bg-info/15 text-info",
  };

  const estilo = estilos[label] ?? "bg-muted text-muted-foreground";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold",
        estilo,
      )}
    >
      {label}
    </span>
  );
}

function BadgeMensalidade({ jogador }: { jogador: Jogador }) {
  const noRoster = jogador.monthly_roster?.[0]?.status !== "active";

  if (jogador.is_goalkeeper || noRoster) {
    return (
      <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
        Isento
      </span>
    );
  }

  const taxa = jogador.monthly_fees?.[0];

  if (taxa?.status === "paid") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-medium text-success">
        <CheckCircle2 className="size-3" />
        Pago
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2.5 py-0.5 text-xs font-medium text-destructive">
      <AlertCircle className="size-3" />
      Pendente
    </span>
  );
}

function ColunaAvaliacao({
  rating,
}: {
  rating: { overall: number | null } | null;
}) {
  // Converte a escala 1–10 para exibição 10–100
  const overall = rating?.overall ?? 5;
  const displayValue = overall;

  return (
    <div className="flex items-center gap-2 min-w-27.5">
      <span className="font-heading text-base text-foreground w-8 shrink-0 leading-none">
        {displayValue}
      </span>
      <Progress value={displayValue * 10} className="h-1.5 flex-1" />
    </div>
  );
}

function Paginacao({
  pagina,
  total,
  pageSize,
  onMudar,
}: {
  pagina: number;
  total: number;
  pageSize: number;
  onMudar: (p: number) => void;
}) {
  const totalPaginas = Math.ceil(total / pageSize);
  if (totalPaginas <= 1) return null;

  const inicio = (pagina - 1) * pageSize + 1;
  const fim = Math.min(pagina * pageSize, total);

  return (
    <div className="flex items-center justify-between px-2 py-4">
      <span className="text-xs text-muted-foreground">
        {inicio}–{fim} de {total} jogadores
      </span>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          disabled={pagina <= 1}
          onClick={() => onMudar(pagina - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft className="size-4" />
        </Button>

        {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((p) => (
          <Button
            key={p}
            variant={p === pagina ? "default" : "outline"}
            size="icon"
            className="size-8 text-xs"
            onClick={() => onMudar(p)}
            aria-label={`Página ${p}`}
          >
            {p}
          </Button>
        ))}

        <Button
          variant="outline"
          size="icon"
          className="size-8"
          disabled={pagina >= totalPaginas}
          onClick={() => onMudar(pagina + 1)}
          aria-label="Próxima página"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── página ───────────────────────────────────────────────────────────────────

const TABS: { label: string; value: FiltroTab }[] = [
  { label: "Todos", value: "todos" },
  { label: "Ativos", value: "ativos" },
  { label: "Inadimplentes", value: "inadimplente" },
  { label: "GK", value: "gk" },
];

export default function ElencoPage() {
  const router = useRouter();
  const [filtro, setFiltro] = useState<FiltroTab>("todos");
  const [busca, setBusca] = useState("");
  const [buscaDebounced, setBuscaDebounced] = useState("");
  const [pagina, setPagina] = useState(1);
  const [jogadores, setJogadores] = useState<Jogador[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [carregando, setCarregando] = useState(true);
  const [contadorInadimplentes, setContadorInadimplentes] = useState(0);
  const [sessao, setSessao] = useState<SessaoUsuario>(null);
  const [suspendendo, setSuspendendo] = useState<string | null>(null);

  // Debounce da busca — evita chamadas a cada tecla
  useEffect(() => {
    const t = setTimeout(() => {
      setBuscaDebounced(busca);
      setPagina(1);
    }, 300);
    return () => clearTimeout(t);
  }, [busca]);

  // Busca o total de inadimplentes uma vez ao carregar
  useEffect(() => {
    fetch("/api/users?filter=inadimplente&page=1")
      .then((r) => r.json())
      .then((d: RespostaApi) => setContadorInadimplentes(d.total))
      .catch(() => setContadorInadimplentes(0));
  }, []);

  const buscarJogadores = useCallback(async () => {
    // "Suspensos" não tem suporte no banco; exibe tabela vazia
    if (filtro === "suspensos") {
      setJogadores([]);
      setTotal(0);
      setCarregando(false);
      return;
    }

    const resSessao = await fetch("/api/auth/me");

    const dadosSessao = await resSessao.json();

    setSessao(dadosSessao?.id ? dadosSessao : null);

    setCarregando(true);
    try {
      const params = construirParams(filtro, buscaDebounced, pagina);
      const res = await fetch(`/api/users?${params}`);
      if (!res.ok) throw new Error("Erro ao buscar jogadores");
      const dados: RespostaApi = await res.json();
      setJogadores(dados.data);
      setTotal(dados.total);
      setPageSize(dados.pageSize);
    } catch {
      setJogadores([]);
      setTotal(0);
    } finally {
      setCarregando(false);
    }
  }, [filtro, buscaDebounced, pagina]);

  useEffect(() => {
    buscarJogadores();
  }, [buscarJogadores]);

  function trocarFiltro(novoFiltro: FiltroTab) {
    setFiltro(novoFiltro);
    setPagina(1);
  }

  async function toggleAtivo(jogador: Jogador) {
    setSuspendendo(jogador.id);
    try {
      const res = await fetch(`/api/users/${jogador.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !jogador.is_active }),
      });
      if (res.ok) {
        setJogadores((prev) =>
          prev.map((j) =>
            j.id === jogador.id ? { ...j, is_active: !j.is_active } : j,
          ),
        );
      }
    } finally {
      setSuspendendo(null);
    }
  }

  const nomeExibido = (j: Jogador) => j.nickname ?? j.name;
  const subtitulo = (j: Jogador) =>
    j.is_goalkeeper ? "Goleiro titular" : (j.phone ?? "");

  const ehAdmin = sessao?.role === "admin" || sessao?.role === "co_admin";

  return (
    <div className="space-y-4">
      {/* Barra de busca, filtros e botão de ação */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar jogador..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>

        {/* Abas de filtro */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {TABS.map((tab) => {
            const ativo = filtro === tab.value;
            const contador =
              tab.value === "todos"
                ? total
                : tab.value === "inadimplente"
                  ? contadorInadimplentes
                  : null;

            return (
              <button
                key={tab.value}
                onClick={() => trocarFiltro(tab.value)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                  ativo
                    ? "bg-foreground text-background"
                    : "bg-card text-foreground border border-border hover:bg-muted",
                  tab.value === "inadimplente" &&
                    !ativo &&
                    "border-destructive/40",
                )}
              >
                {tab.label}
                {contador !== null && (
                  <span
                    className={cn(
                      "inline-flex items-center justify-center rounded-full text-xs font-bold min-w-[18px] h-[18px] px-1",
                      ativo
                        ? "bg-background/20 text-background"
                        : tab.value === "inadimplente"
                          ? "bg-destructive text-destructive-foreground"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {contador}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Botão adicionar — posicionado após os filtros */}
        {ehAdmin && (
          <Link
            href="/jogadores/novo"
            className={buttonVariants({ className: "ml-auto gap-2 shrink-0" })}
          >
            <UserPlus className="size-4" />
            Adicionar Jogador
          </Link>
        )}
      </div>

      {/* Tabela de jogadores */}
      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[280px]">Jogador</TableHead>
              <TableHead>Posição</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Mensalidade</TableHead>
              <TableHead>Avaliação</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>

          <TableBody>
            {carregando ? (
              // Esqueleto de carregamento
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}>
                      <div className="h-4 rounded bg-muted animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : jogadores.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-32 text-center text-muted-foreground"
                >
                  Nenhum jogador encontrado.
                </TableCell>
              </TableRow>
            ) : (
              jogadores.map((j) => (
                <TableRow
                  key={j.id}
                  className={cn(j.is_goalkeeper && "bg-accent/5")}
                >
                  {/* Coluna jogador: avatar + nome + subtítulo */}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <PlayerAvatar
                        name={j.name}
                        src={j.photo_url ?? undefined}
                        size="md"
                      />
                      <div className="min-w-0">
                        <p className="font-medium text-foreground leading-none truncate">
                          {nomeExibido(j)}
                        </p>
                        {/* {subtitulo(j) && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {subtitulo(j)}
                          </p>
                        )} */}
                      </div>
                    </div>
                  </TableCell>

                  {/* Posição */}
                  <TableCell>
                    <BadgePosicao
                      position={j.position}
                      isGoalkeeper={j.is_goalkeeper}
                    />
                  </TableCell>

                  {/* Status de ativação do jogador no sistema */}
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                        j.is_active
                          ? "bg-success/15 text-success"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {j.is_active ? "Ativo" : "Inativo"}
                    </span>
                  </TableCell>

                  {/* Situação da mensalidade */}
                  <TableCell>
                    <BadgeMensalidade jogador={j} />
                  </TableCell>

                  {/* Avaliação geral */}
                  <TableCell>
                    <ColunaAvaliacao rating={j.player_ratings} />
                  </TableCell>

                  {/* Menu de ações */}
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="flex items-center justify-center size-8 rounded-md text-muted-foreground hover:bg-muted transition-colors focus:outline-none"
                        aria-label="Ações do jogador"
                      >
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => router.push(`/jogadores/${j.id}`)}
                        >
                          Ver perfil
                        </DropdownMenuItem>
                        {ehAdmin && (
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/jogadores/${j.id}/editar`)
                            }
                          >
                            Editar dados
                          </DropdownMenuItem>
                        )}

                        {ehAdmin && (
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => toggleAtivo(j)}
                            disabled={suspendendo === j.id}
                          >
                            {j.is_active ? "Desativar" : "Reativar"}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Paginação */}
        {!carregando && total > pageSize && (
          <div className="border-t border-border">
            <Paginacao
              pagina={pagina}
              total={total}
              pageSize={pageSize}
              onMudar={setPagina}
            />
          </div>
        )}
      </div>
    </div>
  );
}
