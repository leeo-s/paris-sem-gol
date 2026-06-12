"use client";

import { useState } from "react";
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

// ─── componente principal ─────────────────────────────────────────────────────

export function SortearClient({ matchId }: { matchId: string }) {
  const router = useRouter();

  // Configuração do sorteio: quantos jogadores de linha por time
  const [jogadoresPorTime, setJogadoresPorTime] = useState(5);

  // Resultado do último sorteio
  const [timesResultado, setTimesResultado] = useState<ResultadoTime[] | null>(
    null,
  );

  // Estados de carregamento e erro
  const [sorteando, setSorteando] = useState(false);
  const [iniciando, setIniciando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Marca a partida como iniciada e redireciona para a tela de placar
  async function iniciarPartida() {
    setIniciando(true);
    setErro(null);
    try {
      const resposta = await fetch(`/api/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "started" }),
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

  // Chama a API de sorteio com a configuração atual
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
            Configure o número de jogadores por time e sorteie os times
            equilibrados pelo overall.
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
            aoAlterar={setJogadoresPorTime}
            minimo={4}
            maximo={12}
          />
          <p className="text-xs text-muted-foreground">
            Mínimo: 4 · Máximo: 12
          </p>
        </div>

        {/* Mensagem de erro da API */}
        {erro && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {erro}
          </div>
        )}

        {/* Botão principal de sorteio */}
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
      </div>

      {/* Resultado do sorteio — exibido após a primeira chamada */}
      {timesResultado && !sorteando && (
        <div className="space-y-4">
          {/* Cabeçalho da seção de resultados */}
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-primary" />
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Times sorteados ({timesResultado.length})
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

          {/* Ações pós-sorteio */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {/* Ressortear com a mesma configuração */}
            <Button
              variant="outline"
              onClick={executarSorteio}
              disabled={sorteando}
              className="gap-2 bg-white"
            >
              <Shuffle className="size-4" />
              Sortear Novamente
            </Button>

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
