"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Target,
  ShieldOff,
  Trophy,
  Minus,
  Plus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ─── tipos ────────────────────────────────────────────────────────────────────

type JogadorPlacar = {
  matchPlayerId: string;
  userId: string | null;
  guestPlayerId: string | null;
  nome: string;
  ehGoleiro: boolean;
  fotoUrl: string | null;
};

// Formato cru retornado pelo GET /api/matches/:id/players
type JogadorPartidaRaw = {
  id: string;
  user_id: string | null;
  guest_player_id: string | null;
  is_goalkeeper: boolean;
  users: {
    name: string;
    nickname: string | null;
    photo_url: string | null;
    is_goalkeeper: boolean;
  } | null;
  guest_players: { name: string } | null;
};

// Formato retornado pelo GET /api/matches/:id/goals (um registro por gol)
type GolEntrada = {
  scorer_user_id: string | null;
  scorer_guest_id: string | null;
};

// Formato retornado pelo GET /api/matches/:id/goals-conceded
type GolSofridoEntrada = {
  conceder_user_id: string | null;
  conceder_guest_id: string | null;
  amount: number;
};

// ─── helpers ──────────────────────────────────────────────────────────────────

// Extrai iniciais do nome para o fallback do avatar
function extrairIniciais(nome: string): string {
  return nome
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((parte) => parte[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ─── sub-componentes ──────────────────────────────────────────────────────────

// Linha de jogador com controle inline de quantidade de gols
function LinhaJogador({
  jogador,
  contagem,
  aoAlterar,
}: {
  jogador: JogadorPlacar;
  contagem: number;
  aoAlterar: (novoValor: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      {/* Avatar do jogador */}
      <Avatar size="sm">
        {jogador.fotoUrl && (
          <AvatarImage src={jogador.fotoUrl} alt={jogador.nome} />
        )}
        <AvatarFallback className="bg-primary/10 text-primary font-heading text-xs">
          {extrairIniciais(jogador.nome)}
        </AvatarFallback>
      </Avatar>

      {/* Nome e indicador de goleiro */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {jogador.nome}
        </p>
        {jogador.ehGoleiro && (
          <p className="text-xs text-info">Goleiro</p>
        )}
      </div>

      {/* Controle de quantidade */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => aoAlterar(Math.max(0, contagem - 1))}
          disabled={contagem <= 0}
          className="size-7 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Diminuir"
        >
          <Minus className="size-3" />
        </button>
        <span
          className={cn(
            "font-heading text-base w-6 text-center tabular-nums",
            contagem > 0 ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {contagem}
        </span>
        <button
          type="button"
          onClick={() => aoAlterar(contagem + 1)}
          className="size-7 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
          aria-label="Aumentar"
        >
          <Plus className="size-3" />
        </button>
      </div>
    </div>
  );
}

// Skeleton exibido enquanto os dados carregam
function SkeletonCard() {
  return (
    <div className="bg-card rounded-xl ring-1 ring-foreground/10 overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/30">
        <Skeleton className="h-4 w-36" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="size-8 rounded-full shrink-0" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-7 w-24 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── componente principal ─────────────────────────────────────────────────────

export function PlacarClient({ matchId }: { matchId: string }) {
  const router = useRouter();

  // Chave única no localStorage para os dados não salvos desta partida
  const chaveStorage = `psg_placar_rascunho_${matchId}`;

  // Controla se o carregamento inicial já foi concluído, evitando sobrescrever
  // o localStorage com estado vazio durante o mount
  const dadosCarregados = useRef(false);

  // Lista normalizada de jogadores da partida
  const [jogadores, setJogadores] = useState<JogadorPlacar[]>([]);

  // Contagem de gols marcados, indexada por matchPlayerId
  const [golsMarcados, setGolsMarcados] = useState<Record<string, number>>({});

  // Contagem de gols sofridos, indexada por matchPlayerId
  const [golsSofridos, setGolsSofridos] = useState<Record<string, number>>({});

  // Estados de UI
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Persiste as contagens no localStorage sempre que alguma mudar,
  // mas só após o carregamento inicial para não gravar estado vazio
  useEffect(() => {
    if (!dadosCarregados.current) return;
    try {
      localStorage.setItem(
        chaveStorage,
        JSON.stringify({ golsMarcados, golsSofridos }),
      );
    } catch {
      // Ignora erros de cota ou modo privado
    }
  }, [golsMarcados, golsSofridos, chaveStorage]);

  // Busca jogadores e pré-preenche gols ao montar o componente
  useEffect(() => {
    async function carregarDados() {
      setCarregando(true);
      try {
        // Busca jogadores, gols marcados e sofridos em paralelo
        const [resJogadores, resGols, resGolsSofridos] = await Promise.all([
          fetch(`/api/matches/${matchId}/players`),
          fetch(`/api/matches/${matchId}/goals`),
          fetch(`/api/matches/${matchId}/goals-conceded`),
        ]);

        const jogadoresRaw: JogadorPartidaRaw[] = await resJogadores.json();
        const golsRaw: GolEntrada[] = resGols.ok ? await resGols.json() : [];
        const golsSofridosRaw: GolSofridoEntrada[] = resGolsSofridos.ok
          ? await resGolsSofridos.json()
          : [];

        // Normaliza e ordena os jogadores em ordem alfabética
        const jogadoresNormalizados: JogadorPlacar[] = jogadoresRaw
          .map((jp) => ({
            matchPlayerId: jp.id,
            userId: jp.user_id,
            guestPlayerId: jp.guest_player_id,
            nome:
              jp.users?.nickname ??
              jp.users?.name ??
              jp.guest_players?.name ??
              "Desconhecido",
            ehGoleiro: jp.is_goalkeeper || (jp.users?.is_goalkeeper ?? false),
            fotoUrl: jp.users?.photo_url ?? null,
          }))
          .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

        setJogadores(jogadoresNormalizados);

        // Mapas auxiliares: userId/guestId → matchPlayerId (para pré-preenchimento)
        const mapaUserParaMatch = new Map<string, string>();
        const mapaGuestParaMatch = new Map<string, string>();
        for (const j of jogadoresNormalizados) {
          if (j.userId) mapaUserParaMatch.set(j.userId, j.matchPlayerId);
          if (j.guestPlayerId)
            mapaGuestParaMatch.set(j.guestPlayerId, j.matchPlayerId);
        }

        // Pré-preenche gols marcados (cada registro = 1 gol individual)
        const marcadosIniciais: Record<string, number> = {};
        for (const g of golsRaw) {
          const chave = g.scorer_user_id
            ? mapaUserParaMatch.get(g.scorer_user_id)
            : g.scorer_guest_id
              ? mapaGuestParaMatch.get(g.scorer_guest_id)
              : undefined;
          if (chave)
            marcadosIniciais[chave] = (marcadosIniciais[chave] ?? 0) + 1;
        }

        // Pré-preenche gols sofridos (cada registro já tem a quantidade)
        const sofridosIniciais: Record<string, number> = {};
        for (const gc of golsSofridosRaw) {
          const chave = gc.conceder_user_id
            ? mapaUserParaMatch.get(gc.conceder_user_id)
            : gc.conceder_guest_id
              ? mapaGuestParaMatch.get(gc.conceder_guest_id)
              : undefined;
          if (chave) sofridosIniciais[chave] = gc.amount;
        }

        // Se há um rascunho salvo localmente, usa ele em vez dos dados da API
        // (representa marcações feitas após o último reload, não salvas ainda)
        try {
          const rascunhoSalvo = localStorage.getItem(chaveStorage);
          if (rascunhoSalvo) {
            const { golsMarcados: marcadosSalvos, golsSofridos: sofridosSalvos } =
              JSON.parse(rascunhoSalvo) as {
                golsMarcados: Record<string, number>;
                golsSofridos: Record<string, number>;
              };
            setGolsMarcados(marcadosSalvos ?? {});
            setGolsSofridos(sofridosSalvos ?? {});
            dadosCarregados.current = true;
            return;
          }
        } catch {
          // Rascunho corrompido ou inacessível — usa dados da API normalmente
        }

        // Sem rascunho: usa os dados vindos da API
        setGolsMarcados(marcadosIniciais);
        setGolsSofridos(sofridosIniciais);
        dadosCarregados.current = true;
      } catch {
        setErro("Erro ao carregar os dados da partida.");
      } finally {
        setCarregando(false);
      }
    }

    carregarDados();
  }, [matchId, chaveStorage]);

  // Atualiza a contagem de gols marcados de um jogador
  function alterarGolsMarcados(matchPlayerId: string, novoValor: number) {
    setGolsMarcados((anterior) => ({
      ...anterior,
      [matchPlayerId]: novoValor,
    }));
  }

  // Atualiza a contagem de gols sofridos de um jogador
  function alterarGolsSofridos(matchPlayerId: string, novoValor: number) {
    setGolsSofridos((anterior) => ({
      ...anterior,
      [matchPlayerId]: novoValor,
    }));
  }

  // Salva os gols, encerra a partida e abre a votação de MVP
  async function encerrarPartida() {
    setSalvando(true);
    setErro(null);
    try {
      // Monta payload de gols marcados — apenas jogadores com pelo menos 1 gol
      const payloadGolsMarcados = jogadores
        .filter((j) => (golsMarcados[j.matchPlayerId] ?? 0) > 0)
        .map((j) => ({
          user_id: j.userId ?? undefined,
          guest_player_id: j.guestPlayerId ?? undefined,
          quantity: golsMarcados[j.matchPlayerId]!,
        }));

      // Monta payload de gols sofridos — apenas jogadores com pelo menos 1 gol sofrido
      const payloadGolsSofridos = jogadores
        .filter((j) => (golsSofridos[j.matchPlayerId] ?? 0) > 0)
        .map((j) => ({
          user_id: j.userId ?? undefined,
          guest_player_id: j.guestPlayerId ?? undefined,
          amount: golsSofridos[j.matchPlayerId]!,
        }));

      // Registra gols marcados (se houver)
      if (payloadGolsMarcados.length > 0) {
        const resGols = await fetch(`/api/matches/${matchId}/goals`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gols: payloadGolsMarcados }),
        });
        if (!resGols.ok) {
          const dados = await resGols.json();
          setErro(dados.error ?? "Erro ao salvar gols marcados.");
          return;
        }
      }

      // Registra gols sofridos (se houver)
      if (payloadGolsSofridos.length > 0) {
        const resGolsSofridos = await fetch(
          `/api/matches/${matchId}/goals-conceded`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ golsSofridos: payloadGolsSofridos }),
          },
        );
        if (!resGolsSofridos.ok) {
          const dados = await resGolsSofridos.json();
          setErro(dados.error ?? "Erro ao salvar gols sofridos.");
          return;
        }
      }

      // Encerra a partida — o PATCH abre automaticamente a sessão de votação MVP
      const resEncerrar = await fetch(`/api/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      if (!resEncerrar.ok) {
        const dados = await resEncerrar.json();
        setErro(dados.error ?? "Erro ao encerrar a partida.");
        return;
      }

      // Limpa o rascunho salvo localmente ao encerrar com sucesso
      try {
        localStorage.removeItem(chaveStorage);
      } catch {
        // Ignora erros de acesso ao storage
      }

      router.push(`/partidas/${matchId}`);
    } catch {
      setErro("Falha na conexão. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Link de volta para a partida */}
      <div>
        <Link
          href={`/partidas/${matchId}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Partida
        </Link>
      </div>

      {/* Cabeçalho da tela */}
      <div>
        <h1 className="font-heading text-2xl text-foreground">Placar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Registre os gols marcados e sofridos por cada jogador.
        </p>
      </div>

      {/* Skeletons enquanto carrega */}
      {carregando && (
        <div className="grid gap-4 md:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Erro ao carregar (sem jogadores) */}
      {!carregando && erro && jogadores.length === 0 && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {erro}
        </div>
      )}

      {/* Cards de gols */}
      {!carregando && jogadores.length > 0 && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Card — gols marcados */}
            <div className="bg-card rounded-xl ring-1 ring-foreground/10 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
                <Target className="size-4 text-primary shrink-0" />
                <h2 className="font-heading text-sm text-foreground">
                  Gols Marcados
                </h2>
              </div>
              {jogadores.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="size-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum jogador encontrado.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {jogadores.map((jogador) => (
                    <LinhaJogador
                      key={jogador.matchPlayerId}
                      jogador={jogador}
                      contagem={golsMarcados[jogador.matchPlayerId] ?? 0}
                      aoAlterar={(v) =>
                        alterarGolsMarcados(jogador.matchPlayerId, v)
                      }
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Card — gols sofridos */}
            <div className="bg-card rounded-xl ring-1 ring-foreground/10 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
                <ShieldOff className="size-4 text-muted-foreground shrink-0" />
                <h2 className="font-heading text-sm text-foreground">
                  Gols Sofridos
                </h2>
              </div>
              {jogadores.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="size-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nenhum jogador encontrado.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {jogadores.map((jogador) => (
                    <LinhaJogador
                      key={jogador.matchPlayerId}
                      jogador={jogador}
                      contagem={golsSofridos[jogador.matchPlayerId] ?? 0}
                      aoAlterar={(v) =>
                        alterarGolsSofridos(jogador.matchPlayerId, v)
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Erro ao salvar */}
          {erro && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {erro}
            </div>
          )}

          {/* Botão de encerrar partida */}
          <div className="flex justify-end pt-2">
            <Button
              onClick={encerrarPartida}
              disabled={salvando}
              size="lg"
              className="gap-2"
            >
              <Trophy className="size-4" />
              {salvando ? "Encerrando..." : "Encerrar Partida"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
