"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Shuffle,
  Shield,
  Play,
  Plus,
  Minus,
  Users,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

// ─── tipos ────────────────────────────────────────────────────────────────────

type JogadorSorteado = {
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
  jogadores: JogadorSorteado[];
  teamId: string;
};

// Resposta bruta do endpoint /players (match_player com relações aninhadas)
type RespostaJogadorApi = {
  id: string;
  user_id: string | null;
  guest_player_id: string | null;
  is_goalkeeper: boolean;
  confirmed: boolean;
  users?: {
    name: string;
    nickname?: string | null;
    photo_url?: string | null;
    position?: string | null;
    is_goalkeeper: boolean;
    player_ratings?: { overall: number } | null;
  } | null;
  guest_players?: { name: string; position?: string | null } | null;
};

// ─── constantes ──────────────────────────────────────────────────────────────

// Cores de destaque para cada time (Time A = azul, Time B = verde, etc.)
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

// Classes Tailwind para os botões de seleção de time no modo manual
const CORES_BOTAO_TIME = [
  "bg-blue-500 border-blue-500 text-white hover:bg-blue-600",
  "bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600",
  "bg-amber-500 border-amber-500 text-white hover:bg-amber-600",
  "bg-rose-500 border-rose-500 text-white hover:bg-rose-600",
  "bg-purple-500 border-purple-500 text-white hover:bg-purple-600",
  "bg-cyan-500 border-cyan-500 text-white hover:bg-cyan-600",
  "bg-orange-500 border-orange-500 text-white hover:bg-orange-600",
  "bg-pink-500 border-pink-500 text-white hover:bg-pink-600",
];

const LETRAS_TIME = ["A", "B", "C", "D", "E", "F", "G", "H"];

// Ordem preferida de exibição dos grupos de posição
const ORDEM_POSICOES = [
  "Goleiros",
  "Atacante",
  "Meia",
  "Volante",
  "Lateral",
  "Defensor",
  "Outros",
];

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

// Agrupa jogadores por posição, colocando goleiros primeiro
function agruparPorPosicao(
  jogadores: JogadorSorteado[],
): [string, JogadorSorteado[]][] {
  const grupos: Record<string, JogadorSorteado[]> = {};

  for (const jogador of jogadores) {
    const chaveGrupo = jogador.ehGoleiro
      ? "Goleiros"
      : (jogador.posicao ?? "Outros");
    if (!grupos[chaveGrupo]) grupos[chaveGrupo] = [];
    grupos[chaveGrupo].push(jogador);
  }

  // Ordena os grupos pela ordem preferida; posições desconhecidas ficam por último
  return Object.entries(grupos).sort(([posA], [posB]) => {
    const indiceA = ORDEM_POSICOES.indexOf(posA);
    const indiceB = ORDEM_POSICOES.indexOf(posB);
    if (indiceA === -1 && indiceB === -1) return posA.localeCompare(posB);
    if (indiceA === -1) return 1;
    if (indiceB === -1) return -1;
    return indiceA - indiceB;
  });
}

// Converte o objeto bruto da API de jogadores para o tipo JogadorSorteado
function mapearJogadorApi(mp: RespostaJogadorApi): JogadorSorteado {
  return {
    matchPlayerId: mp.id,
    userId: mp.user_id,
    guestPlayerId: mp.guest_player_id,
    nome: mp.users?.name ?? mp.guest_players?.name ?? "Desconhecido",
    apelido: mp.users?.nickname ?? null,
    fotoUrl: mp.users?.photo_url ?? null,
    posicao: mp.users?.position ?? mp.guest_players?.position ?? null,
    overall: mp.users?.player_ratings?.overall ?? 5,
    ehGoleiro: mp.is_goalkeeper || (mp.users?.is_goalkeeper ?? false),
  };
}

// ─── sub-componentes ──────────────────────────────────────────────────────────

// Controle de incremento/decremento para jogadores por time
function ControladorNumerico({
  valor,
  aoAlterar,
  minimo = 4,
  maximo = 12,
}: {
  valor: number;
  aoAlterar: (v: number) => void;
  minimo?: number;
  maximo?: number;
}) {
  return (
    <div className="flex items-center gap-4">
      {/* Botão de diminuir */}
      <button
        type="button"
        onClick={() => aoAlterar(Math.max(minimo, valor - 1))}
        disabled={valor <= minimo}
        className="size-11 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Diminuir"
      >
        <Minus className="size-4" />
      </button>

      {/* Valor atual destacado */}
      <span className="font-heading text-5xl text-foreground w-16 text-center tabular-nums">
        {valor}
      </span>

      {/* Botão de aumentar */}
      <button
        type="button"
        onClick={() => aoAlterar(Math.min(maximo, valor + 1))}
        disabled={valor >= maximo}
        className="size-11 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        aria-label="Aumentar"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

// Card de um jogador dentro de um time sorteado
function CardJogador({ jogador }: { jogador: JogadorSorteado }) {
  const nomeExibido = jogador.apelido ?? jogador.nome;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      {/* Avatar do jogador */}
      <Avatar size="sm">
        {jogador.fotoUrl && (
          <AvatarImage src={jogador.fotoUrl} alt={nomeExibido} />
        )}
        <AvatarFallback className="bg-primary/10 text-primary font-heading text-xs">
          {extrairIniciais(nomeExibido)}
        </AvatarFallback>
      </Avatar>

      {/* Nome e posição */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {nomeExibido}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {jogador.posicao ?? (jogador.ehGoleiro ? "Goleiro" : "Campo")}
        </p>
      </div>

      {/* Ícone de goleiro e overall */}
      <div className="flex items-center gap-2 shrink-0">
        {jogador.ehGoleiro && <Shield className="size-3.5 text-info" />}
        <span className="text-xs font-semibold bg-muted px-2 py-0.5 rounded-full text-foreground">
          {jogador.overall}
        </span>
      </div>
    </div>
  );
}

// Card de um time completo com cabeçalho e lista de jogadores
function CardTime({
  time,
  indiceVisual,
}: {
  time: ResultadoTime;
  indiceVisual: number;
}) {
  const corDestaque = CORES_TIME[indiceVisual] ?? "bg-muted-foreground";

  return (
    <div className="bg-card rounded-xl ring-1 ring-foreground/10 overflow-hidden">
      {/* Cabeçalho do time com nome e overall médio */}
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

      {/* Lista de jogadores do time */}
      <div className="divide-y divide-border">
        {time.jogadores.map((jogador) => (
          <CardJogador key={jogador.matchPlayerId} jogador={jogador} />
        ))}
      </div>
    </div>
  );
}

// Card de jogador no modo de atribuição manual, com botões de seleção de time
function CardJogadorManual({
  jogador,
  numeroDeTimes,
  indiceTimeAtribuido,
  timesCheios,
  aoAtribuir,
}: {
  jogador: JogadorSorteado;
  numeroDeTimes: number;
  indiceTimeAtribuido: number | null;
  // Times que já atingiram o limite de jogadores de campo
  timesCheios: Set<number>;
  aoAtribuir: (indice: number | null) => void;
}) {
  const nomeExibido = jogador.apelido ?? jogador.nome;

  // Goleiros não contam para o limite, então nunca têm botão bloqueado por lotação
  function botaoEstaDesabilitado(indiceTime: number): boolean {
    if (jogador.ehGoleiro) return false;
    if (indiceTimeAtribuido === indiceTime) return false; // pode sempre desmarcar
    return timesCheios.has(indiceTime);
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      {/* Avatar do jogador */}
      <Avatar size="sm">
        {jogador.fotoUrl && (
          <AvatarImage src={jogador.fotoUrl} alt={nomeExibido} />
        )}
        <AvatarFallback className="bg-primary/10 text-primary font-heading text-xs">
          {extrairIniciais(nomeExibido)}
        </AvatarFallback>
      </Avatar>

      {/* Nome e posição */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {nomeExibido}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {jogador.posicao ?? (jogador.ehGoleiro ? "Goleiro" : "Campo")}
        </p>
      </div>

      {/* Overall e botões de seleção de time */}
      <div className="flex items-center gap-1.5 shrink-0">
        {jogador.ehGoleiro && <Shield className="size-3.5 text-info" />}
        <span className="text-xs font-semibold bg-muted px-2 py-0.5 rounded-full text-foreground">
          {jogador.overall}
        </span>

        {/* Botões A, B, C, D — desabilitados quando o time já está cheio */}
        <div className="flex items-center gap-1 ml-1.5">
          {Array.from({ length: numeroDeTimes }, (_, i) => {
            const desabilitado = botaoEstaDesabilitado(i);
            return (
              <button
                key={i}
                type="button"
                disabled={desabilitado}
                onClick={() => aoAtribuir(indiceTimeAtribuido === i ? null : i)}
                className={cn(
                  "size-7 rounded-full text-xs font-bold border transition-colors",
                  indiceTimeAtribuido === i
                    ? CORES_BOTAO_TIME[i]
                    : desabilitado
                      ? "border-border text-muted-foreground/30 cursor-not-allowed"
                      : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {LETRAS_TIME[i]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── componente principal ─────────────────────────────────────────────────────

export function SortearClient({ matchId }: { matchId: string }) {
  const router = useRouter();

  // Configuração compartilhada: quantos jogadores de campo por time
  const [jogadoresPorTime, setJogadoresPorTime] = useState(5);

  // Resultado final (sorteio automático ou atribuição manual confirmada)
  const [timesResultado, setTimesResultado] = useState<ResultadoTime[] | null>(
    null,
  );

  // Controla qual modo está ativo: sorteio automático ou escolha manual
  const [modoManual, setModoManual] = useState(false);

  // Jogadores confirmados carregados para o modo manual
  const [jogadoresParaAtribuir, setJogadoresParaAtribuir] = useState<
    JogadorSorteado[] | null
  >(null);

  // Mapa de matchPlayerId → índice do time escolhido (null = sem time)
  const [atribuicoes, setAtribuicoes] = useState<Record<string, number | null>>(
    {},
  );

  // Estados de carregamento e erro
  const [sorteando, setSorteando] = useState(false);
  const [carregandoJogadores, setCarregandoJogadores] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [iniciando, setIniciando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Número de times no modo manual: calculado a partir dos jogadores de campo disponíveis
  const numeroDeTimes = useMemo(() => {
    if (!jogadoresParaAtribuir) return 2;
    const jogadoresDeCampo = jogadoresParaAtribuir.filter((j) => !j.ehGoleiro);
    return Math.max(2, Math.floor(jogadoresDeCampo.length / jogadoresPorTime));
  }, [jogadoresParaAtribuir, jogadoresPorTime]);

  // Overall médio de cada time (somente jogadores de campo) conforme atribuições atuais
  const overallsPorTime = useMemo(() => {
    if (!jogadoresParaAtribuir) return [];
    return Array.from({ length: numeroDeTimes }, (_, indiceTime) => {
      const jogadoresDoCampoNoTime = jogadoresParaAtribuir.filter(
        (j) => !j.ehGoleiro && atribuicoes[j.matchPlayerId] === indiceTime,
      );
      if (jogadoresDoCampoNoTime.length === 0) return null;
      const somaOverall = jogadoresDoCampoNoTime.reduce(
        (soma, j) => soma + j.overall,
        0,
      );
      return (
        Math.round((somaOverall / jogadoresDoCampoNoTime.length) * 10) / 10
      );
    });
  }, [jogadoresParaAtribuir, atribuicoes, numeroDeTimes]);

  // Contagem de jogadores que já receberam um time
  const totalJogadoresAtribuidos = useMemo(() => {
    if (!jogadoresParaAtribuir) return 0;
    return jogadoresParaAtribuir.filter(
      (j) =>
        atribuicoes[j.matchPlayerId] !== undefined &&
        atribuicoes[j.matchPlayerId] !== null,
    ).length;
  }, [jogadoresParaAtribuir, atribuicoes]);

  // Habilita o botão "Confirmar Times" apenas quando todos os jogadores têm time
  const todosAtribuidos =
    jogadoresParaAtribuir !== null &&
    jogadoresParaAtribuir.length > 0 &&
    totalJogadoresAtribuidos === jogadoresParaAtribuir.length;

  // Contagem de jogadores de campo (sem goleiros) em cada time conforme atribuições atuais
  const contagemDeCampoPorTime = useMemo(() => {
    const contagem = new Map<number, number>();
    if (!jogadoresParaAtribuir) return contagem;
    for (const jogador of jogadoresParaAtribuir) {
      if (jogador.ehGoleiro) continue;
      const indice = atribuicoes[jogador.matchPlayerId];
      if (indice !== null && indice !== undefined) {
        contagem.set(indice, (contagem.get(indice) ?? 0) + 1);
      }
    }
    return contagem;
  }, [jogadoresParaAtribuir, atribuicoes]);

  // Times que já atingiram o limite de jogadores de campo — botões desses times ficam bloqueados
  const timesCheios = useMemo(() => {
    const cheios = new Set<number>();
    for (const [indice, quantidade] of contagemDeCampoPorTime) {
      if (quantidade >= jogadoresPorTime) cheios.add(indice);
    }
    return cheios;
  }, [contagemDeCampoPorTime, jogadoresPorTime]);

  // Jogadores agrupados por posição para exibição no modo manual
  const gruposPorPosicao = useMemo(
    () =>
      jogadoresParaAtribuir ? agruparPorPosicao(jogadoresParaAtribuir) : [],
    [jogadoresParaAtribuir],
  );

  // Busca os jogadores confirmados da partida para o modo manual
  async function buscarJogadoresConfirmados() {
    setCarregandoJogadores(true);
    setErro(null);
    try {
      const resposta = await fetch(`/api/matches/${matchId}/players`);
      if (!resposta.ok) {
        setErro("Erro ao carregar os jogadores confirmados.");
        return;
      }
      const dados: RespostaJogadorApi[] = await resposta.json();

      // Filtra apenas os confirmados e converte para o tipo interno
      const confirmados = dados
        .filter((mp) => mp.confirmed)
        .map(mapearJogadorApi);

      setJogadoresParaAtribuir(confirmados);
      setAtribuicoes({});
    } catch {
      setErro("Falha na conexão. Tente novamente.");
    } finally {
      setCarregandoJogadores(false);
    }
  }

  // Altera jogadores por time; no modo manual, limpa atribuições pois a quantidade de times pode mudar
  function alterarJogadoresPorTime(novoValor: number) {
    setJogadoresPorTime(novoValor);
    if (modoManual) setAtribuicoes({});
  }

  // Ativa o modo manual e carrega os jogadores se ainda não foram buscados
  function ativarModoManual() {
    setModoManual(true);
    setTimesResultado(null);
    setAtribuicoes({});
    if (!jogadoresParaAtribuir) buscarJogadoresConfirmados();
  }

  // Ativa o modo de sorteio automático e limpa resultado anterior
  function ativarModoSorteio() {
    setModoManual(false);
    setTimesResultado(null);
  }

  // Atribui (ou remove) um jogador a um time no modo manual
  function atribuirJogadorAoTime(
    matchPlayerId: string,
    indiceTime: number | null,
  ) {
    setAtribuicoes((anterior) => ({
      ...anterior,
      [matchPlayerId]: indiceTime,
    }));
  }

  // Envia as atribuições manuais para a API, que cria os times e retorna o resultado
  async function confirmarTimesManual() {
    setConfirmando(true);
    setErro(null);
    try {
      // Monta a lista de atribuições válidas (exclui jogadores sem time)
      const atribuicoesValidas = Object.entries(atribuicoes)
        .filter(([, indice]) => indice !== null)
        .map(([matchPlayerId, teamIndex]) => ({ matchPlayerId, teamIndex }));

      const resposta = await fetch(`/api/matches/${matchId}/draw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          players_per_team: jogadoresPorTime,
          manual_assignments: atribuicoesValidas,
        }),
      });

      if (!resposta.ok) {
        const dados = await resposta.json();
        setErro(dados.error ?? "Erro ao salvar os times. Tente novamente.");
        return;
      }

      const dados = await resposta.json();
      setTimesResultado(dados.times);
    } catch {
      setErro("Falha na conexão. Verifique sua internet e tente novamente.");
    } finally {
      setConfirmando(false);
    }
  }

  // Chama a API de sorteio automático com a configuração atual
  async function executarSorteio() {
    setSorteando(true);
    setErro(null);
    try {
      const resposta = await fetch(`/api/matches/${matchId}/draw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ players_per_team: jogadoresPorTime }),
      });

      if (!resposta.ok) {
        const dados = await resposta.json();
        setErro(dados.error ?? "Erro ao sortear os times. Tente novamente.");
        return;
      }

      const dados = await resposta.json();
      setTimesResultado(dados.times);
    } catch {
      setErro("Falha na conexão. Verifique sua internet e tente novamente.");
    } finally {
      setSorteando(false);
    }
  }

  // Marca a partida como iniciada, salva os times e redireciona para a tela de placar
  async function iniciarPartida() {
    setIniciando(true);
    setErro(null);
    try {
      const atribuicoesDeTime = timesResultado?.flatMap((time) =>
        time.jogadores.map((j) => ({
          matchPlayerId: j.matchPlayerId,
          teamId: time.teamId,
        })),
      );

      const resposta = await fetch(`/api/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "started",
          ...(atribuicoesDeTime && { team_assignments: atribuicoesDeTime }),
        }),
      });
      if (!resposta.ok) {
        const dados = await resposta.json();
        setErro(dados.error ?? "Erro ao iniciar a partida. Tente novamente.");
        return;
      }
      router.push(`/partidas/${matchId}/placar`);
    } catch {
      setErro("Falha na conexão. Tente novamente.");
    } finally {
      setIniciando(false);
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

      {/* Seção de configuração do sorteio */}
      <div className="bg-card rounded-xl ring-1 ring-foreground/10 p-6 space-y-6 flex flex-col items-center text-center">
        <div>
          <h1 className="font-heading text-2xl text-foreground">
            Sorteio de Times
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure o número de jogadores por time e sorteie ou monte os
            times manualmente.
          </p>
        </div>

        {/* Seletor de jogadores por time */}
        <div className="space-y-3 flex flex-col items-center">
          <p className="text-sm font-medium text-foreground">
            Jogadores por time{" "}
            <span className="text-muted-foreground font-normal">
              (sem contar o goleiro)
            </span>
          </p>
          <ControladorNumerico
            valor={jogadoresPorTime}
            aoAlterar={alterarJogadoresPorTime}
            minimo={4}
            maximo={12}
          />
          <p className="text-xs text-muted-foreground">
            Mínimo: 4 · Máximo: 12
          </p>
        </div>

        {/* Toggle entre sorteio automático e escolha manual */}
        <div className="flex rounded-lg border border-border overflow-hidden w-full sm:w-auto">
          <button
            type="button"
            onClick={ativarModoSorteio}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors",
              !modoManual
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-muted",
            )}
          >
            <Shuffle className="size-4" />
            Sortear
          </button>
          <button
            type="button"
            onClick={ativarModoManual}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors",
              modoManual
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-muted",
            )}
          >
            <Pencil className="size-4" />
            Escolher a mão
          </button>
        </div>

        {/* Mensagem de erro da API */}
        {erro && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive w-full">
            {erro}
          </div>
        )}

        {/* Botão do modo sorteio automático */}
        {!modoManual && (
          <Button
            onClick={executarSorteio}
            disabled={sorteando}
            size="lg"
            className="w-full sm:w-auto gap-2"
          >
            <Shuffle className="size-4" />
            {sorteando
              ? "Sorteando..."
              : timesResultado
                ? "Sortear Novamente"
                : "Sortear Times"}
          </Button>
        )}
      </div>

      {/* Modo manual — exibido enquanto o resultado ainda não foi confirmado */}
      {modoManual && !timesResultado && (
        <div className="space-y-4">
          {carregandoJogadores ? (
            <div className="bg-card rounded-xl ring-1 ring-foreground/10 p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Carregando jogadores...
              </p>
            </div>
          ) : jogadoresParaAtribuir && jogadoresParaAtribuir.length === 0 ? (
            <div className="bg-card rounded-xl ring-1 ring-foreground/10 p-8 text-center">
              <Users className="size-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Nenhum jogador confirmado na partida.
              </p>
            </div>
          ) : jogadoresParaAtribuir ? (
            <>
              {/* Painel de overall em tempo real por time */}
              <div className="bg-card rounded-xl ring-1 ring-foreground/10 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1 h-4 rounded-full bg-primary" />
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Overall por time
                  </h2>
                </div>

                {/* Linha com cada time, cor, contagem de jogadores e overall calculado */}
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {Array.from({ length: numeroDeTimes }, (_, i) => {
                    const quantidadeNoCampo = contagemDeCampoPorTime.get(i) ?? 0;
                    const cheio = timesCheios.has(i);
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <div
                          className={cn(
                            "size-2.5 rounded-full shrink-0",
                            CORES_TIME[i],
                          )}
                        />
                        <span className="text-sm font-medium text-foreground">
                          Time {LETRAS_TIME[i]}
                        </span>
                        {/* Contagem de campo com indicador visual quando cheio */}
                        <span
                          className={cn(
                            "text-xs font-bold px-2 py-0.5 rounded-full",
                            cheio
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {quantidadeNoCampo}/{jogadoresPorTime}
                        </span>
                        <span className="text-xs font-bold bg-muted px-2 py-0.5 rounded-full text-foreground">
                          {overallsPorTime[i] !== null
                            ? overallsPorTime[i]?.toFixed(1)
                            : "OVR —"}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Progresso de atribuição */}
                <p className="text-xs text-muted-foreground mt-3">
                  {totalJogadoresAtribuidos} de {jogadoresParaAtribuir.length}{" "}
                  jogadores atribuídos
                </p>
              </div>

              {/* Lista de jogadores agrupados por posição */}
              <div className="space-y-3">
                {gruposPorPosicao.map(([posicao, jogadoresDoPosicao]) => (
                  <div
                    key={posicao}
                    className="bg-card rounded-xl ring-1 ring-foreground/10 overflow-hidden"
                  >
                    {/* Cabeçalho do grupo de posição */}
                    <div className="px-4 py-2.5 border-b border-border bg-muted/30">
                      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        {posicao}
                      </h3>
                    </div>

                    {/* Cards individuais com botões de seleção de time */}
                    <div className="divide-y divide-border">
                      {jogadoresDoPosicao.map((jogador) => (
                        <CardJogadorManual
                          key={jogador.matchPlayerId}
                          jogador={jogador}
                          numeroDeTimes={numeroDeTimes}
                          indiceTimeAtribuido={
                            atribuicoes[jogador.matchPlayerId] ?? null
                          }
                          timesCheios={timesCheios}
                          aoAtribuir={(indice) =>
                            atribuirJogadorAoTime(
                              jogador.matchPlayerId,
                              indice,
                            )
                          }
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Ações do modo manual */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setAtribuicoes({});
                    buscarJogadoresConfirmados();
                  }}
                  disabled={carregandoJogadores}
                  className="gap-2 bg-white"
                >
                  <Users className="size-4" />
                  Recarregar Jogadores
                </Button>

                {/* Habilitado apenas quando todos os jogadores têm time */}
                <Button
                  onClick={confirmarTimesManual}
                  disabled={!todosAtribuidos || confirmando}
                  className="gap-2"
                >
                  <Play className="size-4" />
                  {confirmando ? "Salvando..." : "Confirmar Times"}
                </Button>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* Resultado do sorteio ou da atribuição manual confirmada */}
      {timesResultado && !sorteando && (
        <div className="space-y-4">
          {/* Cabeçalho da seção de resultados */}
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-primary" />
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Times {modoManual ? "definidos" : "sorteados"} (
              {timesResultado.length})
            </h2>
          </div>

          {/* Grade de cards de times — 2 colunas no desktop */}
          {timesResultado.length === 0 ? (
            <div className="bg-card rounded-xl ring-1 ring-foreground/10 p-8 text-center">
              <Users className="size-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Nenhum time foi formado. Verifique se há jogadores confirmados
                na partida.
              </p>
            </div>
          ) : (
            <div
              className={cn(
                "grid gap-4",
                timesResultado.length >= 2
                  ? "grid-cols-1 md:grid-cols-2"
                  : "grid-cols-1",
              )}
            >
              {timesResultado.map((time, indice) => (
                <CardTime key={time.indice} time={time} indiceVisual={indice} />
              ))}
            </div>
          )}

          {/* Ações pós-resultado */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {modoManual ? (
              // No modo manual: volta para a tela de atribuição para refazer
              <Button
                variant="outline"
                onClick={() => {
                  setTimesResultado(null);
                  setAtribuicoes({});
                }}
                className="gap-2 bg-white"
              >
                <Pencil className="size-4" />
                Refazer Atribuição
              </Button>
            ) : (
              // No modo sorteio: ressorteia com a mesma configuração
              <Button
                variant="outline"
                onClick={executarSorteio}
                disabled={sorteando}
                className="gap-2 bg-white"
              >
                <Shuffle className="size-4" />
                Sortear Novamente
              </Button>
            )}

            {/* Inicia a partida e redireciona para o placar */}
            <Button
              onClick={iniciarPartida}
              disabled={sorteando || iniciando}
              className="gap-2"
            >
              <Play className="size-4" />
              {iniciando ? "Iniciando..." : "Iniciar Partida"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
