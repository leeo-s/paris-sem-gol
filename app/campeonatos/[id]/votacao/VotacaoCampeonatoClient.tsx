"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Star, Clock, Users, Flag, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ─── tipos ────────────────────────────────────────────────────────────────────

type JogadorElegivel = {
  id: string;
  name: string;
  nickname: string | null;
  photo_url: string | null;
  position: string | null;
};

type ResultadoJogador = {
  jogador: JogadorElegivel | null;
  votos: number;
};

type SessaoVotacao = {
  id: string;
  tournament_id: string;
  is_closed: boolean;
  closes_at: string;
  total_votes_cast: number;
  eligible_voters: number;
};

type DadosVotacao = {
  sessao: SessaoVotacao;
  jaVotou: boolean;
  votadoEm: string | null;
  resultados: ResultadoJogador[] | null;
  isAdmin: boolean;
  jogadores: JogadorElegivel[];
  ehElegivelParaVotar: boolean;
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

function formatarContagem(ms: number): string {
  if (ms <= 0) return "00:00:00";
  const horas = Math.floor(ms / 3600000);
  const minutos = Math.floor((ms % 3600000) / 60000);
  const segundos = Math.floor((ms % 60000) / 1000);
  return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;
}

// ─── sub-componentes ──────────────────────────────────────────────────────────

function AvatarJogador({
  nome,
  photoUrl,
  size = "default",
}: {
  nome: string;
  photoUrl: string | null;
  size?: "sm" | "default" | "lg";
}) {
  return (
    <Avatar size={size}>
      {photoUrl && <AvatarImage src={photoUrl} alt={nome} />}
      <AvatarFallback className="bg-primary text-primary-foreground font-heading text-xs">
        {getInitials(nome)}
      </AvatarFallback>
    </Avatar>
  );
}

// ─── view: admin ──────────────────────────────────────────────────────────────

function ViewAdmin({
  dados,
  tournamentId,
  onEncerrar,
  encerrando,
  onVotar,
  enviandoVoto,
  erroVoto,
}: {
  dados: DadosVotacao;
  tournamentId: string;
  onEncerrar: () => void;
  encerrando: boolean;
  onVotar: (votedUserId: string) => void;
  enviandoVoto: boolean;
  erroVoto: string | null;
}) {
  const { sessao, jogadores, resultados } = dados;
  const [tempoRestante, setTempoRestante] = useState(0);
  const [selecionado, setSelecionado] = useState<string | null>(null);

  const podeCastVoto = dados.ehElegivelParaVotar && !dados.jaVotou && !sessao.is_closed;
  const jogadorVotado = dados.jaVotou ? jogadores.find((j) => j.id === dados.votadoEm) : null;

  useEffect(() => {
    if (sessao.is_closed) return;
    const tick = () => {
      const closes = new Date(sessao.closes_at).getTime();
      setTempoRestante(Math.max(0, closes - Date.now()));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [sessao.closes_at, sessao.is_closed]);

  const jogadoresComVotos = jogadores
    .map((j) => {
      const resultado = resultados?.find((r) => r.jogador?.id === j.id);
      return { ...j, votos: resultado?.votos ?? 0 };
    })
    .sort((a, b) => b.votos - a.votos);

  const maxVotos = Math.max(1, ...jogadoresComVotos.map((j) => j.votos));
  const liderando = jogadoresComVotos[0]?.votos > 0 ? jogadoresComVotos[0] : null;

  return (
    <div className="space-y-4 max-w-5xl">
      <Link
        href={`/campeonatos/${tournamentId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        Detalhes do Campeonato
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="font-heading text-2xl md:text-3xl tracking-wide text-foreground uppercase">
          MVP do Campeonato
        </h1>

        <div className="flex items-center gap-3 flex-wrap">
          {sessao.is_closed ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground border border-border">
              <Flag className="size-3" />
              Votação encerrada
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-3 py-1.5 text-xs font-semibold text-warning-foreground border border-warning/30">
              <span className="relative flex size-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75" />
                <span className="relative inline-flex rounded-full size-1.5 bg-warning" />
              </span>
              Votação aberta · {sessao.total_votes_cast}/{sessao.eligible_voters} votaram
            </span>
          )}

          {!sessao.is_closed && (
            <Button size="sm" onClick={onEncerrar} disabled={encerrando} className="gap-2">
              <Flag className="size-3.5" />
              {encerrando ? "Encerrando..." : "Encerrar Votação"}
            </Button>
          )}
        </div>
      </div>

      {!sessao.is_closed && (
        <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3">
          <Star className="size-4 text-warning-foreground shrink-0 mt-0.5" />
          <div className="text-sm text-warning-foreground space-y-1">
            <span className="font-semibold">Votação em andamento.</span>{" "}
            <span>
              {sessao.total_votes_cast} de {sessao.eligible_voters} jogadores já votaram.
              Resultado visível apenas para o admin até o encerramento.
            </span>
            {tempoRestante > 0 && (
              <div className="flex items-center gap-1.5 mt-1 text-xs text-warning-foreground/80">
                <Clock className="size-3" />
                Encerra automaticamente em {formatarContagem(tempoRestante)}
              </div>
            )}
          </div>
        </div>
      )}

      {dados.ehElegivelParaVotar && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">Seu voto</p>

          {dados.jaVotou ? (
            <div className="flex items-center gap-3">
              <Star className="size-4 text-gold fill-gold shrink-0" />
              <p className="text-sm text-muted-foreground">
                Você votou em{" "}
                <span className="font-semibold text-foreground">
                  {jogadorVotado ? (jogadorVotado.nickname ?? jogadorVotado.name) : "..."}
                </span>
                .
              </p>
            </div>
          ) : sessao.is_closed ? (
            <p className="text-sm text-muted-foreground">A votação foi encerrada antes de você votar.</p>
          ) : (
            <>
              {erroVoto && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {erroVoto}
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {jogadores.map((jogador) => {
                  const nome = jogador.nickname ?? jogador.name;
                  const ehSelecionado = selecionado === jogador.id;
                  return (
                    <button
                      key={jogador.id}
                      type="button"
                      disabled={enviandoVoto}
                      onClick={() => setSelecionado((prev) => (prev === jogador.id ? null : jogador.id))}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all cursor-pointer active:scale-[0.98]",
                        ehSelecionado ? "border-gold/40 bg-gold/8" : "border-border hover:bg-muted/30",
                      )}
                    >
                      <AvatarJogador nome={nome} photoUrl={jogador.photo_url} size="sm" />
                      <p className="text-xs font-semibold text-foreground leading-tight truncate w-full">{nome}</p>
                      <Star
                        className={cn(
                          "size-4 transition-all",
                          ehSelecionado ? "fill-gold text-gold" : "text-muted-foreground/30",
                        )}
                      />
                    </button>
                  );
                })}
              </div>
              {selecionado && (
                <Button
                  className="gap-2 bg-gold hover:bg-gold/90 text-white font-semibold"
                  disabled={enviandoVoto}
                  onClick={() => onVotar(selecionado)}
                >
                  <Star className="size-4 fill-white" />
                  {enviandoVoto
                    ? "Confirmando..."
                    : `Confirmar Voto — ${jogadores.find((j) => j.id === selecionado)?.nickname ?? jogadores.find((j) => j.id === selecionado)?.name ?? ""}`}
                </Button>
              )}
            </>
          )}
        </div>
      )}

      {jogadoresComVotos.length === 0 ? (
        <div className="bg-card rounded-xl ring-1 ring-foreground/10 p-10 text-center">
          <Users className="size-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Nenhum jogador elegível encontrado neste campeonato.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {jogadoresComVotos.map((jogador) => {
            const ehLider = liderando?.id === jogador.id && jogador.votos > 0;
            const porcentagem = (jogador.votos / maxVotos) * 100;
            const nome = jogador.nickname ?? jogador.name;

            return (
              <div
                key={jogador.id}
                className={cn(
                  "relative flex flex-col items-center gap-2 rounded-xl border p-4 transition-all",
                  ehLider ? "border-gold/40 bg-gold/8" : "border-border bg-card",
                )}
              >
                <AvatarJogador nome={nome} photoUrl={jogador.photo_url} />

                <div className="text-center space-y-0.5 w-full">
                  <p className="text-sm font-semibold text-foreground leading-tight truncate">
                    {nome}
                  </p>
                  {jogador.position && (
                    <p className="text-xs text-muted-foreground">{jogador.position}</p>
                  )}
                </div>

                <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      ehLider ? "bg-gold" : "bg-gold/40",
                    )}
                    style={{ width: `${porcentagem}%` }}
                  />
                </div>

                <div className="flex items-center gap-1">
                  {jogador.votos > 0 ? (
                    <span className={cn("text-sm font-bold", ehLider ? "text-gold" : "text-foreground")}>
                      {jogador.votos}{" "}
                      <span className="font-normal text-xs text-muted-foreground">
                        {jogador.votos === 1 ? "voto" : "votos"}
                      </span>
                    </span>
                  ) : (
                    <span className="text-sm font-medium text-muted-foreground/40">0</span>
                  )}
                </div>

                {ehLider && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-white whitespace-nowrap">
                    <Star className="size-2.5 fill-white" />
                    Liderando
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {sessao.is_closed && liderando && (
        <div className="flex items-center gap-4 rounded-xl border border-gold/30 bg-gold/8 px-5 py-4">
          <Star className="size-6 text-gold fill-gold shrink-0" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              MVP do Campeonato
            </p>
            <p className="font-heading text-xl text-foreground">
              {liderando.nickname ?? liderando.name}
            </p>
            <p className="text-sm text-muted-foreground">
              {liderando.votos} {liderando.votos === 1 ? "voto" : "votos"}
              {liderando.position && ` · ${liderando.position}`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── view: jogador ────────────────────────────────────────────────────────────

function ViewJogador({
  dados,
  tournamentId,
  onVotar,
  enviandoVoto,
  erroVoto,
}: {
  dados: DadosVotacao;
  tournamentId: string;
  onVotar: (votedUserId: string) => void;
  enviandoVoto: boolean;
  erroVoto: string | null;
}) {
  const { sessao, jaVotou, votadoEm, resultados, jogadores } = dados;
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [tempoRestante, setTempoRestante] = useState(0);

  useEffect(() => {
    if (sessao.is_closed) return;
    const tick = () => {
      const closes = new Date(sessao.closes_at).getTime();
      setTempoRestante(Math.max(0, closes - Date.now()));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [sessao.closes_at, sessao.is_closed]);

  const jogadorVotado = jaVotou ? jogadores.find((j) => j.id === votadoEm) : null;

  if (sessao.is_closed) {
    const jogadoresComVotos = jogadores
      .map((j) => {
        const resultado = resultados?.find((r) => r.jogador?.id === j.id);
        return { ...j, votos: resultado?.votos ?? 0 };
      })
      .sort((a, b) => b.votos - a.votos);

    const maxVotos = Math.max(1, ...jogadoresComVotos.map((j) => j.votos));
    const vencedor = jogadoresComVotos[0]?.votos > 0 ? jogadoresComVotos[0] : null;

    return (
      <div className="space-y-4 max-w-lg mx-auto">
        <Link
          href={`/campeonatos/${tournamentId}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          Detalhes do Campeonato
        </Link>

        <div>
          <h1 className="font-heading text-2xl tracking-wide text-foreground uppercase">
            MVP do Campeonato
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Votação encerrada</p>
        </div>

        {vencedor && (
          <div className="flex items-center gap-4 rounded-xl border border-gold/30 bg-gold/8 px-5 py-4">
            <Star className="size-6 text-gold fill-gold shrink-0" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                MVP
              </p>
              <p className="font-heading text-xl text-foreground">
                {vencedor.nickname ?? vencedor.name}
              </p>
              <p className="text-sm text-muted-foreground">
                {vencedor.votos} {vencedor.votos === 1 ? "voto" : "votos"}
              </p>
            </div>
          </div>
        )}

        <div className="bg-card rounded-xl ring-1 ring-foreground/10 divide-y divide-border overflow-hidden">
          {jogadoresComVotos.map((j, idx) => {
            const nome = j.nickname ?? j.name;
            return (
              <div key={j.id} className="flex items-center gap-3 px-4 py-3">
                <span className="text-sm font-semibold text-muted-foreground w-5 text-center">
                  {idx + 1}
                </span>
                <AvatarJogador nome={nome} photoUrl={j.photo_url} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {nome}
                      {votadoEm === j.id && (
                        <span className="ml-1.5 text-xs text-gold font-semibold">· Seu voto</span>
                      )}
                    </p>
                    {j.votos > 0 && (
                      <span className="text-xs font-semibold text-gold shrink-0">{j.votos}</span>
                    )}
                  </div>
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gold rounded-full transition-all duration-500"
                      style={{ width: `${(j.votos / maxVotos) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-lg mx-auto pb-24">
      <Link
        href={`/campeonatos/${tournamentId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-3.5" />
        Detalhes do Campeonato
      </Link>

      <div>
        <h1 className="font-heading text-2xl tracking-wide text-foreground uppercase">
          MVP do Campeonato
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          1 voto por jogador
          {tempoRestante > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 text-xs text-muted-foreground/70">
              <Clock className="size-3" />
              {formatarContagem(tempoRestante)}
            </span>
          )}
        </p>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
        <Info className="size-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-sm text-muted-foreground">
          {jaVotou ? (
            <>
              Você votou em{" "}
              <span className="font-semibold text-foreground">
                {jogadorVotado ? (jogadorVotado.nickname ?? jogadorVotado.name) : "..."}
              </span>
              . Resultado visível após o encerramento.
            </>
          ) : (
            "Vote no jogador que mais se destacou no campeonato. Você ainda não votou."
          )}
        </p>
      </div>

      {erroVoto && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {erroVoto}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {jogadores.map((jogador) => {
          const nome = jogador.nickname ?? jogador.name;
          const ehVotado = jaVotou && votadoEm === jogador.id;
          const ehSelecionado = !jaVotou && selecionado === jogador.id;
          const ativo = ehVotado || ehSelecionado;

          return (
            <button
              key={jogador.id}
              type="button"
              disabled={jaVotou || enviandoVoto}
              onClick={() => {
                if (jaVotou) return;
                setSelecionado((prev) => (prev === jogador.id ? null : jogador.id));
              }}
              className={cn(
                "relative flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all",
                ativo ? "border-gold/40 bg-gold/8" : "border-border bg-card hover:bg-muted/30",
                jaVotou && !ehVotado && "opacity-60",
                !jaVotou && "cursor-pointer active:scale-[0.98]",
              )}
            >
              <AvatarJogador nome={nome} photoUrl={jogador.photo_url} />

              <div className="space-y-0.5 w-full">
                <p className="text-sm font-semibold text-foreground leading-tight truncate">{nome}</p>
                {ehVotado && <p className="text-xs text-gold font-medium">Seu voto</p>}
                {jogador.position && !ehVotado && (
                  <p className="text-xs text-muted-foreground">{jogador.position}</p>
                )}
              </div>

              <Star
                className={cn(
                  "size-5 transition-all",
                  ativo ? "fill-gold text-gold" : "text-muted-foreground/30",
                )}
              />
            </button>
          );
        })}
      </div>

      {!jaVotou && selecionado && (
        <div className="fixed bottom-16 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t border-border md:static md:bottom-auto md:bg-transparent md:backdrop-blur-none md:border-none md:p-0">
          <Button
            className="w-full gap-2 bg-gold hover:bg-gold/90 text-white font-semibold h-12"
            disabled={enviandoVoto}
            onClick={() => {
              if (selecionado) onVotar(selecionado);
            }}
          >
            <Star className="size-4 fill-white" />
            {enviandoVoto
              ? "Confirmando..."
              : `Confirmar Voto — ${jogadores.find((j) => j.id === selecionado)?.nickname ?? jogadores.find((j) => j.id === selecionado)?.name ?? ""}`}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── componente principal ─────────────────────────────────────────────────────

export function VotacaoCampeonatoClient({
  tournamentId,
  ehAdmin,
}: {
  tournamentId: string;
  ehAdmin: boolean;
}) {
  const [dados, setDados] = useState<DadosVotacao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [enviandoVoto, setEnviandoVoto] = useState(false);
  const [erroVoto, setErroVoto] = useState<string | null>(null);
  const [encerrando, setEncerrando] = useState(false);

  const buscarDados = useCallback(async () => {
    setErro(null);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/mvp-voting`);
      if (!res.ok) {
        if (res.status === 404) {
          setErro("Sessão de votação não encontrada para este campeonato.");
        } else {
          setErro("Erro ao carregar os dados da votação.");
        }
        return;
      }
      const dadosVotacao: DadosVotacao = await res.json();
      setDados(dadosVotacao);
    } catch {
      setErro("Falha na conexão. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    buscarDados();
  }, [buscarDados]);

  async function confirmarVoto(votedUserId: string) {
    setEnviandoVoto(true);
    setErroVoto(null);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/mvp-voting/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voted_user_id: votedUserId }),
      });

      if (!res.ok) {
        const body = await res.json();
        setErroVoto(body.error ?? "Erro ao registrar voto.");
        return;
      }

      await buscarDados();
    } catch {
      setErroVoto("Falha na conexão. Tente novamente.");
    } finally {
      setEnviandoVoto(false);
    }
  }

  async function encerrarVotacao() {
    setEncerrando(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/mvp-voting`, {
        method: "PATCH",
      });

      if (!res.ok) {
        const body = await res.json();
        setErro(body.error ?? "Erro ao encerrar votação.");
        return;
      }

      await buscarDados();
    } catch {
      setErro("Falha na conexão. Tente novamente.");
    } finally {
      setEncerrando(false);
    }
  }

  if (carregando) {
    return (
      <div className="space-y-4 max-w-5xl">
        <Skeleton className="h-5 w-32 rounded-lg" />
        <Skeleton className="h-10 w-56 rounded-lg" />
        <Skeleton className="h-14 rounded-xl" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (erro || !dados) {
    return (
      <div className="max-w-md mx-auto">
        <Link
          href={`/campeonatos/${tournamentId}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="size-3.5" />
          Detalhes do Campeonato
        </Link>
        <div className="bg-card rounded-xl ring-1 ring-foreground/10 p-10 text-center space-y-3">
          <p className="font-heading text-xl text-foreground">Votação indisponível</p>
          <p className="text-sm text-muted-foreground">
            {erro ?? "A sessão de votação não foi encontrada."}
          </p>
          <Button size="sm" variant="outline" onClick={buscarDados}>
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  if (ehAdmin) {
    return (
      <ViewAdmin
        dados={dados}
        tournamentId={tournamentId}
        onEncerrar={encerrarVotacao}
        encerrando={encerrando}
        onVotar={confirmarVoto}
        enviandoVoto={enviandoVoto}
        erroVoto={erroVoto}
      />
    );
  }

  return (
    <ViewJogador
      dados={dados}
      tournamentId={tournamentId}
      onVotar={confirmarVoto}
      enviandoVoto={enviandoVoto}
      erroVoto={erroVoto}
    />
  );
}
