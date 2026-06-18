"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Crown,
  Trophy,
  Target,
  Shield,
  CalendarCheck,
  Star,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { cn } from "@/lib/utils";

// ─── tipos ─────────────────────────────────────────────────────────────────────

type JogadorResumido = {
  id: string;
  name: string;
  nickname: string | null;
  photo_url: string | null;
  position: string | null;
};

type ItemPodio = JogadorResumido & {
  goals: number;
  mvpAwards: number;
  votes: number;
  presences: number;
  rank: 1 | 2 | 3;
};
type ItemMvp = JogadorResumido & { votes: number };
type ItemArtilheiro = JogadorResumido & { goals: number };
type ItemGoleiro = JogadorResumido & { conceded: number; matches: number };
type ItemPresenca = JogadorResumido & {
  matches: number;
  totalMatches: number;
  percentage: number;
};

// Formato de resposta dos endpoints paginados (5 itens por página)
type RespostaPaginada<T> = {
  items: T[];
  page: number;
  totalPages: number;
  total: number;
};

// Dados de paginação repassados pelo hook ao componente de controles
type ControlesPaginacao = {
  pagina: number;
  totalPaginas: number;
  onAnterior: () => void;
  onProximo: () => void;
};

// ─── constantes ────────────────────────────────────────────────────────────────

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

// Estilo visual de cada posição do pódio do ano — só o 1º lugar recebe o
// brilho pulsante e a coroa, para se destacar dos demais
const CONFIG_PODIO: Record<
  1 | 2 | 3,
  {
    rotulo: string;
    corCard: string;
    corAnelAvatar: string;
    corBadge: string;
    tamanhoAvatar: "xl" | "lg";
    pulsante: boolean;
  }
> = {
  1: {
    rotulo: "Craque do Ano",
    // O fundo e a borda do 1º lugar vêm da classe .border-spin-gold (linha
    // dourada animada circulando o card) — aqui só o necessário para os demais
    corCard: "",
    corAnelAvatar: "ring-gold",
    corBadge: "bg-gold/15 text-gold-foreground border border-gold/40",
    tamanhoAvatar: "xl",
    pulsante: true,
  },
  2: {
    rotulo: "2º Lugar",
    corCard: "border-2 border-slate-300",
    corAnelAvatar: "ring-slate-300",
    corBadge: "bg-slate-100 text-slate-600 border border-slate-300",
    tamanhoAvatar: "lg",
    pulsante: false,
  },
  3: {
    rotulo: "3º Lugar",
    corCard: "border-2 border-amber-700",
    corAnelAvatar: "ring-amber-700",
    corBadge: "bg-amber-700/10 text-amber-700 border border-amber-700/30",
    tamanhoAvatar: "lg",
    pulsante: false,
  },
};

// ─── helpers ───────────────────────────────────────────────────────────────────

function formatarPercentual(decimal: number): string {
  return `${Math.round(decimal * 100)}%`;
}

// Pluraliza um rótulo simples conforme a quantidade (ex: "1 voto" / "2 votos")
function pluralizar(
  quantidade: number,
  singular: string,
  plural: string,
): string {
  return `${quantidade} ${quantidade === 1 ? singular : plural}`;
}

// ─── hook de paginação ──────────────────────────────────────────────────────────

// Hook genérico para os cards com lista completa paginada (5 itens por
// página) — busca a página atual no endpoint informado e volta para a
// página 1 automaticamente sempre que o período (ano ou mês) muda
function usePainelPaginado<T>(
  montarUrl: (pagina: number) => string,
  dependenciasPeriodo: unknown[],
) {
  const [pagina, setPagina] = useState(1);
  const [itens, setItens] = useState<T[]>([]);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [carregando, setCarregando] = useState(true);

  // Período mudou (ano/mês) — reinicia a paginação
  useEffect(() => {
    setPagina(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependenciasPeriodo);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    fetch(montarUrl(pagina))
      .then((res) =>
        res.ok ? (res.json() as Promise<RespostaPaginada<T>>) : null,
      )
      .then((dados) => {
        if (!ativo || !dados) return;
        setItens(dados.items);
        setTotalPaginas(dados.totalPages);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagina, ...dependenciasPeriodo]);

  return { itens, pagina, setPagina, totalPaginas, carregando };
}

// ─── sub-componentes ───────────────────────────────────────────────────────────

// Card de uma posição do pódio do ano — o 1º lugar ganha coroa e brilho dourado
// pulsante para se destacar visualmente dos demais
function CardPodio({ jogador }: { jogador: ItemPodio }) {
  const config = CONFIG_PODIO[jogador.rank];

  // 2º e 3º lugar ficam menores no mobile para caber um do lado do outro —
  // só o 1º lugar ocupa a linha inteira nesse breakpoint
  const ehSecundario = jogador.rank !== 1;

  return (
    <Card
      className={cn(
        "transition-transform",
        config.corCard,
        config.pulsante && "animate-glow-gold border-spin-gold md:scale-105",
        jogador.rank === 1 && "col-span-2 md:col-span-1 md:order-2",
        jogador.rank === 2 && "md:order-1",
        jogador.rank === 3 && "md:order-3",
      )}
    >
      <CardContent
        className={cn(
          "flex flex-col items-center gap-2.5 text-center",
          ehSecundario ? "py-4 px-2 md:py-6 md:px-4" : "py-6 px-4",
        )}
      >
        {/* Margem extra no 1º lugar para a coroa maior não ser cortada pelo
            overflow-hidden do Card */}
        <div className={cn("relative", jogador.rank === 1 && "mt-5")}>
          {jogador.rank === 1 && (
            <Crown className="absolute -top-8 left-1/2 -translate-x-1/2 size-10 text-gold drop-shadow-md" />
          )}
          <PlayerAvatar
            name={jogador.name}
            src={jogador.photo_url ?? undefined}
            size={config.tamanhoAvatar}
            className={cn(
              "ring-4 ring-offset-2 ring-offset-card",
              config.corAnelAvatar,
              ehSecundario && "size-10 md:size-14",
            )}
          />
        </div>

        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
            config.corBadge,
          )}
        >
          {jogador.rank === 1 && (
            <Star className="size-3 fill-gold text-gold" />
          )}
          {config.rotulo}
        </span>

        <div>
          <p
            className={cn(
              "font-heading tracking-wide text-foreground leading-none",
              ehSecundario ? "text-base md:text-xl" : "text-xl",
            )}
          >
            {jogador.name}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {jogador.position ?? "—"}
          </p>
        </div>

        <p
          className={cn(
            "font-heading leading-none mt-1",
            jogador.rank === 1
              ? "text-4xl text-gold"
              : "text-xl md:text-2xl text-foreground",
          )}
        >
          {jogador.mvpAwards} <span className="text-base">MVPs</span>
        </p>

        <p className="text-xs text-muted-foreground">
          {pluralizar(jogador.goals, "gol", "gols")} ·{" "}
          {pluralizar(jogador.votes, "voto", "votos")} ·{" "}
          {pluralizar(jogador.presences, "presença", "presenças")}
        </p>
      </CardContent>
    </Card>
  );
}

// Linha numerada usada em todas as listas de destaque — avatar, nome,
// posição, barra de proporção (opcional) e valor principal à direita
function LinhaRanking({
  posicao,
  jogador,
  valorPrincipal,
  linhaSecundaria,
  valorBarra,
  maxBarra,
  corBarra = "bg-primary",
}: {
  posicao: number;
  jogador: JogadorResumido;
  valorPrincipal: string;
  linhaSecundaria?: string;
  valorBarra?: number;
  maxBarra?: number;
  corBarra?: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span
        className={cn(
          "w-5 text-center font-heading text-base shrink-0",
          posicao === 1 ? "text-gold" : "text-muted-foreground",
        )}
      >
        {posicao}
      </span>
      <PlayerAvatar
        name={jogador.name}
        src={jogador.photo_url ?? undefined}
        size="sm"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground leading-none truncate">
          {jogador.name}
        </p>
        <p className="text-xs text-muted-foreground mt-1 truncate">
          {linhaSecundaria ?? jogador.position ?? "—"}
        </p>
        {valorBarra !== undefined && (
          <div className="h-1 rounded-full bg-muted overflow-hidden mt-1.5">
            <div
              className={cn("h-full rounded-full transition-all", corBarra)}
              style={{
                width: `${maxBarra && maxBarra > 0 ? (valorBarra / maxBarra) * 100 : 0}%`,
              }}
            />
          </div>
        )}
      </div>
      <span className="font-heading text-lg leading-none text-foreground shrink-0">
        {valorPrincipal}
      </span>
    </div>
  );
}

// Skeleton genérico de carregamento para as listas de destaque
function SkeletonLista() {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2.5">
          <div className="size-8 rounded-full bg-muted animate-pulse shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-32 bg-muted animate-pulse rounded" />
            <div className="h-3 w-20 bg-muted animate-pulse rounded" />
          </div>
          <div className="h-5 w-8 bg-muted animate-pulse rounded" />
        </div>
      ))}
    </div>
  );
}

// Botões compactos de avançar/voltar usados no cabeçalho dos cards que
// listam todos os jogadores com paginação (5 por página)
function Paginacao({
  pagina,
  totalPaginas,
  onAnterior,
  onProximo,
}: ControlesPaginacao) {
  return (
    <div className="flex items-center gap-0.5 shrink-0">
      <button
        onClick={onAnterior}
        disabled={pagina <= 1}
        className="p-1 rounded hover:bg-muted transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
        aria-label="Página anterior"
      >
        <ChevronLeft className="size-3.5 text-foreground" />
      </button>
      <span className="text-xs text-muted-foreground tabular-nums px-0.5 min-w-8 text-center">
        {pagina}/{totalPaginas}
      </span>
      <button
        onClick={onProximo}
        disabled={pagina >= totalPaginas}
        className="p-1 rounded hover:bg-muted transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
        aria-label="Próxima página"
      >
        <ChevronRight className="size-3.5 text-foreground" />
      </button>
    </div>
  );
}

// Painel (card) com uma lista de ranking — reutilizado tanto para os destaques
// do ano quanto para os destaques do mês, na grade do desktop e nas abas do mobile.
// Quando `paginacao` é informada, exibe os controles de avançar/voltar no
// cabeçalho — usado pelos cards que listam todos os jogadores (exceto gols sofridos)
function PainelRanking({
  titulo,
  icon: Icon,
  carregando,
  vazio,
  vazioMensagem = "Nenhum registro neste período.",
  paginacao,
  children,
}: {
  titulo: string;
  icon: React.ComponentType<{ className?: string }>;
  carregando: boolean;
  vazio: boolean;
  vazioMensagem?: string;
  paginacao?: ControlesPaginacao;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2 pt-5 px-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon className="size-4 text-muted-foreground" />
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {titulo}
            </h2>
          </div>
          {paginacao && !carregando && !vazio && <Paginacao {...paginacao} />}
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-3 divide-y divide-border">
        {carregando ? (
          <SkeletonLista />
        ) : vazio ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            {vazioMensagem}
          </p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

// Seletor de período genérico — usado tanto para o ano (pódio) quanto
// para o mês (cards mensais)
function SeletorPeriodo({
  label,
  onAnterior,
  onProximo,
}: {
  label: string;
  onAnterior: () => void;
  onProximo: () => void;
}) {
  return (
    <div className="flex items-center rounded-lg border border-border overflow-hidden bg-white">
      <button
        onClick={onAnterior}
        className="px-2.5 py-2 hover:bg-muted transition-colors bg-white"
        aria-label="Período anterior"
      >
        <ChevronLeft className="size-4 text-foreground" />
      </button>
      <span className="px-3 text-sm font-medium text-foreground whitespace-nowrap min-w-27.5 text-center">
        {label}
      </span>
      <button
        onClick={onProximo}
        className="px-2.5 py-2 hover:bg-muted transition-colors bg-white"
        aria-label="Próximo período"
      >
        <ChevronRight className="size-4 text-foreground" />
      </button>
    </div>
  );
}

// ─── página ───────────────────────────────────────────────────────────────────

export default function RankPage() {
  const agora = new Date();

  // Período do pódio e dos top 5 do ano — independente do período dos cards mensais
  const [ano, setAno] = useState(agora.getFullYear());

  // Período dos cards mensais (MVP, artilharia, goleiros, presença)
  const [mes, setMes] = useState(agora.getMonth() + 1);
  const [anoMes, setAnoMes] = useState(agora.getFullYear());

  // Pódio e gols sofridos — únicos sem paginação (top 3 e top 5 fixos)
  const [podio, setPodio] = useState<ItemPodio[]>([]);
  const [golsSofridosAno, setGolsSofridosAno] = useState<ItemGoleiro[]>([]);
  const [carregandoTemporada, setCarregandoTemporada] = useState(true);

  const [goleiros, setGoleiros] = useState<ItemGoleiro[]>([]);
  const [carregandoMes, setCarregandoMes] = useState(true);

  // Listas completas com paginação (5 por página) — artilharia, presença e
  // MVP, tanto do ano quanto do mês
  const artilheirosAnoPainel = usePainelPaginado<ItemArtilheiro>(
    (pagina) => `/api/highlights/season/scorers?year=${ano}&page=${pagina}`,
    [ano],
  );
  const presencaAnoPainel = usePainelPaginado<ItemPresenca>(
    (pagina) => `/api/highlights/season/presence?year=${ano}&page=${pagina}`,
    [ano],
  );
  const mvpPainel = usePainelPaginado<ItemMvp>(
    (pagina) =>
      `/api/highlights/monthly/mvp?month=${mes}&year=${anoMes}&page=${pagina}`,
    [mes, anoMes],
  );
  const artilheirosPainel = usePainelPaginado<ItemArtilheiro>(
    (pagina) =>
      `/api/highlights/monthly/scorers?month=${mes}&year=${anoMes}&page=${pagina}`,
    [mes, anoMes],
  );
  const presencaPainel = usePainelPaginado<ItemPresenca>(
    (pagina) =>
      `/api/highlights/monthly/presence?month=${mes}&year=${anoMes}&page=${pagina}`,
    [mes, anoMes],
  );

  // ── busca do pódio e gols sofridos do ano ────────────────────────────────
  const buscarTemporada = useCallback(async () => {
    setCarregandoTemporada(true);
    try {
      const res = await fetch(`/api/highlights/season?year=${ano}`);
      if (res.ok) {
        const dados = await res.json();
        setPodio(dados.podium);
        setGolsSofridosAno(dados.topGoalsConceded);
      }
    } finally {
      setCarregandoTemporada(false);
    }
  }, [ano]);

  // ── busca dos gols sofridos do mês ───────────────────────────────────────
  const buscarMes = useCallback(async () => {
    setCarregandoMes(true);
    try {
      const res = await fetch(
        `/api/highlights/monthly?month=${mes}&year=${anoMes}`,
      );
      if (res.ok) {
        const dados = await res.json();
        setGoleiros(dados.goalsConceded);
      }
    } finally {
      setCarregandoMes(false);
    }
  }, [mes, anoMes]);

  useEffect(() => {
    buscarTemporada();
  }, [buscarTemporada]);

  useEffect(() => {
    buscarMes();
  }, [buscarMes]);

  function mesAnterior() {
    if (mes === 1) {
      setMes(12);
      setAnoMes((a) => a - 1);
    } else setMes((m) => m - 1);
  }
  function proximoMes() {
    if (mes === 12) {
      setMes(1);
      setAnoMes((a) => a + 1);
    } else setMes((m) => m + 1);
  }

  const labelMes = `${MESES[mes - 1]} ${anoMes}`;

  // ── controles de avançar/voltar de cada card paginado ──────────────────────
  const paginacaoArtilheirosAno: ControlesPaginacao = {
    pagina: artilheirosAnoPainel.pagina,
    totalPaginas: artilheirosAnoPainel.totalPaginas,
    onAnterior: () => artilheirosAnoPainel.setPagina((p) => Math.max(1, p - 1)),
    onProximo: () =>
      artilheirosAnoPainel.setPagina((p) =>
        Math.min(artilheirosAnoPainel.totalPaginas, p + 1),
      ),
  };
  const paginacaoPresencaAno: ControlesPaginacao = {
    pagina: presencaAnoPainel.pagina,
    totalPaginas: presencaAnoPainel.totalPaginas,
    onAnterior: () => presencaAnoPainel.setPagina((p) => Math.max(1, p - 1)),
    onProximo: () =>
      presencaAnoPainel.setPagina((p) =>
        Math.min(presencaAnoPainel.totalPaginas, p + 1),
      ),
  };
  const paginacaoMvp: ControlesPaginacao = {
    pagina: mvpPainel.pagina,
    totalPaginas: mvpPainel.totalPaginas,
    onAnterior: () => mvpPainel.setPagina((p) => Math.max(1, p - 1)),
    onProximo: () =>
      mvpPainel.setPagina((p) => Math.min(mvpPainel.totalPaginas, p + 1)),
  };
  const paginacaoArtilheiros: ControlesPaginacao = {
    pagina: artilheirosPainel.pagina,
    totalPaginas: artilheirosPainel.totalPaginas,
    onAnterior: () => artilheirosPainel.setPagina((p) => Math.max(1, p - 1)),
    onProximo: () =>
      artilheirosPainel.setPagina((p) =>
        Math.min(artilheirosPainel.totalPaginas, p + 1),
      ),
  };
  const paginacaoPresenca: ControlesPaginacao = {
    pagina: presencaPainel.pagina,
    totalPaginas: presencaPainel.totalPaginas,
    onAnterior: () => presencaPainel.setPagina((p) => Math.max(1, p - 1)),
    onProximo: () =>
      presencaPainel.setPagina((p) =>
        Math.min(presencaPainel.totalPaginas, p + 1),
      ),
  };

  // ── valores máximos de cada lista — usados para dimensionar as barras de
  // artilharia/MVP, que são relativas ao maior valor da página. A barra de
  // presença não entra aqui pois usa o percentual absoluto (0 a 1), não o
  // maior valor da lista — ver `item.percentage` abaixo
  const maxVotos = Math.max(...mvpPainel.itens.map((m) => m.votes), 0);
  const maxGols = Math.max(...artilheirosPainel.itens.map((a) => a.goals), 0);
  const maxGolsAno = Math.max(
    ...artilheirosAnoPainel.itens.map((a) => a.goals),
    0,
  );

  return (
    <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 space-y-6">
      {/* ── pódio do ano ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Trophy className="size-4 text-muted-foreground" />
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Destaques do Ano
          </h2>
        </div>
        <SeletorPeriodo
          label={String(ano)}
          onAnterior={() => setAno((a) => a - 1)}
          onProximo={() => setAno((a) => a + 1)}
        />
      </div>

      {carregandoTemporada ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          <div className="h-64 rounded-2xl bg-muted animate-pulse col-span-2 md:col-span-1" />
          <div className="h-48 rounded-2xl bg-muted animate-pulse" />
          <div className="h-48 rounded-2xl bg-muted animate-pulse" />
        </div>
      ) : podio.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground text-sm">
            Nenhum gol registrado em {ano} ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 items-center">
          {podio.map((jogador) => (
            <CardPodio key={jogador.id} jogador={jogador} />
          ))}
        </div>
      )}

      {/* ── top 5 da temporada ───────────────────────────────────────────────── */}
      {!carregandoTemporada && podio.length > 0 && (
        <>
          {/* Grade — visível a partir do desktop, com os três painéis lado a lado */}
          <div className="hidden lg:grid grid-cols-3 gap-4">
            <PainelRanking
              titulo={`Artilharia · ${ano}`}
              icon={Target}
              carregando={artilheirosAnoPainel.carregando}
              vazio={artilheirosAnoPainel.itens.length === 0}
              paginacao={paginacaoArtilheirosAno}
            >
              {artilheirosAnoPainel.itens.map((item, i) => (
                <LinhaRanking
                  key={item.id}
                  posicao={(artilheirosAnoPainel.pagina - 1) * 5 + i + 1}
                  jogador={item}
                  valorPrincipal={String(item.goals)}
                  valorBarra={item.goals}
                  maxBarra={maxGolsAno}
                  corBarra="bg-primary"
                />
              ))}
            </PainelRanking>

            <PainelRanking
              titulo={`Gols Sofridos · ${ano}`}
              icon={Shield}
              carregando={carregandoTemporada}
              vazio={golsSofridosAno.length === 0}
            >
              {golsSofridosAno.map((item, i) => (
                <LinhaRanking
                  key={item.id}
                  posicao={i + 1}
                  jogador={item}
                  valorPrincipal={String(item.conceded)}
                  linhaSecundaria={`${item.matches} jogo${item.matches === 1 ? "" : "s"}`}
                />
              ))}
            </PainelRanking>

            <PainelRanking
              titulo={`Presença · ${ano}`}
              icon={CalendarCheck}
              carregando={presencaAnoPainel.carregando}
              vazio={presencaAnoPainel.itens.length === 0}
              paginacao={paginacaoPresencaAno}
            >
              {presencaAnoPainel.itens.map((item, i) => (
                <LinhaRanking
                  key={item.id}
                  posicao={(presencaAnoPainel.pagina - 1) * 5 + i + 1}
                  jogador={item}
                  valorPrincipal={formatarPercentual(item.percentage)}
                  linhaSecundaria={`${item.matches} de ${item.totalMatches}`}
                  valorBarra={item.percentage}
                  maxBarra={1}
                  corBarra="bg-success"
                />
              ))}
            </PainelRanking>
          </div>

          {/* Abas — visíveis apenas em telas menores que desktop */}
          <div className="lg:hidden">
            <Tabs defaultValue="artilharia-ano">
              <div className="overflow-x-auto pb-0.5">
                <TabsList>
                  <TabsTrigger value="artilharia-ano">Artilharia</TabsTrigger>
                  <TabsTrigger value="gols-sofridos-ano">
                    Gols Sofridos
                  </TabsTrigger>
                  <TabsTrigger value="presenca-ano">Presença</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="artilharia-ano">
                <PainelRanking
                  titulo={`Artilharia · ${ano}`}
                  icon={Target}
                  carregando={artilheirosAnoPainel.carregando}
                  vazio={artilheirosAnoPainel.itens.length === 0}
                  paginacao={paginacaoArtilheirosAno}
                >
                  {artilheirosAnoPainel.itens.map((item, i) => (
                    <LinhaRanking
                      key={item.id}
                      posicao={(artilheirosAnoPainel.pagina - 1) * 5 + i + 1}
                      jogador={item}
                      valorPrincipal={String(item.goals)}
                      valorBarra={item.goals}
                      maxBarra={maxGolsAno}
                      corBarra="bg-primary"
                    />
                  ))}
                </PainelRanking>
              </TabsContent>

              <TabsContent value="gols-sofridos-ano">
                <PainelRanking
                  titulo={`Gols Sofridos · ${ano}`}
                  icon={Shield}
                  carregando={carregandoTemporada}
                  vazio={golsSofridosAno.length === 0}
                >
                  {golsSofridosAno.map((item, i) => (
                    <LinhaRanking
                      key={item.id}
                      posicao={i + 1}
                      jogador={item}
                      valorPrincipal={String(item.conceded)}
                      linhaSecundaria={`${item.matches} jogo${item.matches === 1 ? "" : "s"}`}
                    />
                  ))}
                </PainelRanking>
              </TabsContent>

              <TabsContent value="presenca-ano">
                <PainelRanking
                  titulo={`Presença · ${ano}`}
                  icon={CalendarCheck}
                  carregando={presencaAnoPainel.carregando}
                  vazio={presencaAnoPainel.itens.length === 0}
                  paginacao={paginacaoPresencaAno}
                >
                  {presencaAnoPainel.itens.map((item, i) => (
                    <LinhaRanking
                      key={item.id}
                      posicao={(presencaAnoPainel.pagina - 1) * 5 + i + 1}
                      jogador={item}
                      valorPrincipal={formatarPercentual(item.percentage)}
                      linhaSecundaria={`${item.matches} de ${item.totalMatches}`}
                      valorBarra={item.percentage}
                      maxBarra={1}
                      corBarra="bg-success"
                    />
                  ))}
                </PainelRanking>
              </TabsContent>
            </Tabs>
          </div>
        </>
      )}

      {/* ── destaques do mês ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <Star className="size-4 text-muted-foreground" />
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Destaques do Mês
          </h2>
        </div>
        <SeletorPeriodo
          label={labelMes}
          onAnterior={mesAnterior}
          onProximo={proximoMes}
        />
      </div>

      {/* Grade — visível a partir do desktop, com os quatro painéis lado a lado */}
      <div className="hidden lg:grid grid-cols-2 xl:grid-cols-4 gap-4">
        <PainelRanking
          titulo={`MVP · ${MESES[mes - 1]}`}
          icon={Crown}
          carregando={mvpPainel.carregando}
          vazio={mvpPainel.itens.length === 0}
          paginacao={paginacaoMvp}
        >
          {mvpPainel.itens.map((item, i) => (
            <LinhaRanking
              key={item.id}
              posicao={(mvpPainel.pagina - 1) * 5 + i + 1}
              jogador={item}
              valorPrincipal={String(item.votes)}
              valorBarra={item.votes}
              maxBarra={maxVotos}
              corBarra="bg-gold"
            />
          ))}
        </PainelRanking>

        <PainelRanking
          titulo={`Artilharia · ${MESES[mes - 1]}`}
          icon={Target}
          carregando={artilheirosPainel.carregando}
          vazio={artilheirosPainel.itens.length === 0}
          paginacao={paginacaoArtilheiros}
        >
          {artilheirosPainel.itens.map((item, i) => (
            <LinhaRanking
              key={item.id}
              posicao={(artilheirosPainel.pagina - 1) * 5 + i + 1}
              jogador={item}
              valorPrincipal={String(item.goals)}
              valorBarra={item.goals}
              maxBarra={maxGols}
              corBarra="bg-primary"
            />
          ))}
        </PainelRanking>

        <PainelRanking
          titulo={`Gols Sofridos · ${MESES[mes - 1]}`}
          icon={Shield}
          carregando={carregandoMes}
          vazio={goleiros.length === 0}
        >
          {goleiros.map((item, i) => (
            <LinhaRanking
              key={item.id}
              posicao={i + 1}
              jogador={item}
              valorPrincipal={String(item.conceded)}
              linhaSecundaria={`${item.matches} jogo${item.matches === 1 ? "" : "s"}`}
            />
          ))}
        </PainelRanking>

        <PainelRanking
          titulo={`Presença · ${MESES[mes - 1]}`}
          icon={CalendarCheck}
          carregando={presencaPainel.carregando}
          vazio={presencaPainel.itens.length === 0}
          paginacao={paginacaoPresenca}
        >
          {presencaPainel.itens.map((item, i) => (
            <LinhaRanking
              key={item.id}
              posicao={(presencaPainel.pagina - 1) * 5 + i + 1}
              jogador={item}
              valorPrincipal={formatarPercentual(item.percentage)}
              linhaSecundaria={`${item.matches} de ${item.totalMatches}`}
              valorBarra={item.percentage}
              maxBarra={1}
              corBarra="bg-success"
            />
          ))}
        </PainelRanking>
      </div>

      {/* Abas — visíveis apenas em telas menores que desktop */}
      <div className="lg:hidden">
        <Tabs defaultValue="artilharia">
          <div className="overflow-x-auto pb-0.5">
            <TabsList>
              <TabsTrigger value="artilharia">Artilharia</TabsTrigger>
              <TabsTrigger value="mvp">MVP</TabsTrigger>
              <TabsTrigger value="goleiros">Gols Sofridos</TabsTrigger>
              <TabsTrigger value="presenca">Presença</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="artilharia">
            <PainelRanking
              titulo={`Artilharia · ${MESES[mes - 1]}`}
              icon={Target}
              carregando={artilheirosPainel.carregando}
              vazio={artilheirosPainel.itens.length === 0}
              paginacao={paginacaoArtilheiros}
            >
              {artilheirosPainel.itens.map((item, i) => (
                <LinhaRanking
                  key={item.id}
                  posicao={(artilheirosPainel.pagina - 1) * 5 + i + 1}
                  jogador={item}
                  valorPrincipal={String(item.goals)}
                  valorBarra={item.goals}
                  maxBarra={maxGols}
                  corBarra="bg-primary"
                />
              ))}
            </PainelRanking>
          </TabsContent>

          <TabsContent value="mvp">
            <PainelRanking
              titulo={`MVP · ${MESES[mes - 1]}`}
              icon={Crown}
              carregando={mvpPainel.carregando}
              vazio={mvpPainel.itens.length === 0}
              paginacao={paginacaoMvp}
            >
              {mvpPainel.itens.map((item, i) => (
                <LinhaRanking
                  key={item.id}
                  posicao={(mvpPainel.pagina - 1) * 5 + i + 1}
                  jogador={item}
                  valorPrincipal={String(item.votes)}
                  valorBarra={item.votes}
                  maxBarra={maxVotos}
                  corBarra="bg-gold"
                />
              ))}
            </PainelRanking>
          </TabsContent>

          <TabsContent value="goleiros">
            <PainelRanking
              titulo={`Gols Sofridos · ${MESES[mes - 1]}`}
              icon={Shield}
              carregando={carregandoMes}
              vazio={goleiros.length === 0}
            >
              {goleiros.map((item, i) => (
                <LinhaRanking
                  key={item.id}
                  posicao={i + 1}
                  jogador={item}
                  valorPrincipal={String(item.conceded)}
                  linhaSecundaria={`${item.matches} jogo${item.matches === 1 ? "" : "s"}`}
                />
              ))}
            </PainelRanking>
          </TabsContent>

          <TabsContent value="presenca">
            <PainelRanking
              titulo={`Presença · ${MESES[mes - 1]}`}
              icon={CalendarCheck}
              carregando={presencaPainel.carregando}
              vazio={presencaPainel.itens.length === 0}
              paginacao={paginacaoPresenca}
            >
              {presencaPainel.itens.map((item, i) => (
                <LinhaRanking
                  key={item.id}
                  posicao={(presencaPainel.pagina - 1) * 5 + i + 1}
                  jogador={item}
                  valorPrincipal={formatarPercentual(item.percentage)}
                  linhaSecundaria={`${item.matches} de ${item.totalMatches}`}
                  valorBarra={item.percentage}
                  maxBarra={1}
                  corBarra="bg-success"
                />
              ))}
            </PainelRanking>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
