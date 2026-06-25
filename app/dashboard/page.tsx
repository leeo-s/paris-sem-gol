import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createServerSupabaseClient } from "@/config/supabase/server";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { cn } from "@/lib/utils";
import { ProximaPartidaCard } from "./ProximaPartidaCard";
import {
  Trophy,
  Cake,
  Flame,
  Target,
  Calendar,
  Star,
  Banknote,
  ShieldAlert,
} from "lucide-react";

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmt(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function monthName(m: number) {
  return new Date(2000, m - 1).toLocaleDateString("pt-BR", { month: "long" });
}

function monthAbbr(m: number) {
  return new Date(2000, m - 1)
    .toLocaleDateString("pt-BR", { month: "short" })
    .replace(".", "")
    .toUpperCase();
}

function calcAge(birthDate: string | Date) {
  const today = new Date();
  const b = new Date(birthDate);
  let a = today.getFullYear() - b.getFullYear();
  if (today < new Date(today.getFullYear(), b.getMonth(), b.getDate())) a--;
  return a;
}

function dName(name: string, nickname: string | null) {
  return nickname ?? name;
}

// ─── types ────────────────────────────────────────────────────────────────────

type PlayerProfile = {
  id: string;
  name: string;
  nickname: string | null;
  photo_url: string | null;
  position?: string | null;
};

type DashboardData = {
  periodo: { mes: number; ano: number };
  artilheirosDoMes: Array<{ jogador: PlayerProfile; gols: number }>;
  artilheirosTemporada: Array<{ jogador: PlayerProfile; gols: number }>;
  goleirosComMenosGols: Array<{
    jogador: PlayerProfile;
    totalGolsSofridos: number;
    partidas: number;
    mediaPorPartida: number;
  }>;
  maisPresentesDoMes: Array<{ jogador: PlayerProfile; presencas: number }>;
  totalPartidasDoMes: number;
  mvpDoMes: {
    jogador: PlayerProfile;
    vezesEleito: number;
    totalVotos: number;
  } | null;
  mvpsPorPartida: Array<{
    data: string;
    local: string | null;
    // Top 3 candidatos a MVP ordenados por votos decrescente
    top3Mvps: Array<{ jogador: PlayerProfile; votos: number }>;
  }>;
  proximaPartida: {
    id: string;
    match_date: string;
    location: string | null;
    status: string;
    title: string | null;
    bracket_key: string | null;
    usuarioPodeConfirmar: boolean;
    usuarioJaConfirmou: boolean;
  } | null;
  aniversariantesDoMes: Array<{
    id: string;
    name: string;
    nickname: string | null;
    photo_url: string | null;
    birth_date: string | null;
    ehHoje: boolean;
  }>;
  caixa: {
    saldo: number;
    totalEntradas: number;
    totalSaidas: number;
    entradasMes: number;
    saidasMes: number;
  };
};

// ─── sub-components ───────────────────────────────────────────────────────────

function MvpCard({
  mvp,
  mes,
}: {
  mvp: DashboardData["mvpDoMes"];
  mes: number;
}) {
  const mon = monthAbbr(mes);
  const monFull =
    monthName(mes).charAt(0).toUpperCase() + monthName(mes).slice(1);

  return (
    <Card className="bg-accent border-none">
      <CardContent className="p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-2">
              <Trophy className="size-3.5 text-accent-foreground/70" />
              <span className="text-[10px] font-medium uppercase tracking-widest text-accent-foreground/60">
                MVP do Mês · {mon}
              </span>
            </div>

            {mvp?.jogador ? (
              <>
                <h3 className="font-heading text-2xl md:text-3xl text-accent-foreground leading-none truncate">
                  {dName(mvp.jogador.name, mvp.jogador.nickname)}
                </h3>
                <p className="text-sm text-accent-foreground/70 mt-1.5">
                  {mvp.vezesEleito > 0
                    ? `${mvp.vezesEleito}× eleito MVP em ${monFull}`
                    : `${mvp.totalVotos} votos este mês`}
                </p>
              </>
            ) : (
              <p className="text-sm text-accent-foreground/60 mt-1">
                Nenhum MVP registrado
              </p>
            )}
          </div>

          {mvp?.jogador && (
            <PlayerAvatar
              name={mvp.jogador.name}
              src={mvp.jogador.photo_url ?? undefined}
              size="lg"
              className="shrink-0"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SaldoCard({
  caixa,
  mes,
  ano,
}: {
  caixa: DashboardData["caixa"];
  mes: number;
  ano: number;
}) {
  const monCap =
    monthName(mes).charAt(0).toUpperCase() + monthName(mes).slice(1);

  return (
    <Card>
      <CardContent className="p-4 md:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Banknote className="size-3.5 text-muted-foreground" />
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Saldo Financeiro
          </span>
        </div>

        <p className="font-heading text-3xl md:text-4xl text-foreground leading-none">
          {fmt(caixa.saldo)}
        </p>

        <p className="text-xs text-muted-foreground mt-1.5 mb-3">
          {monCap} {ano}
        </p>

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center text-xs bg-success/10 text-success px-2.5 py-1 rounded-full font-medium">
            ↑ {fmt(caixa.entradasMes)} receitas
          </span>
          <span className="inline-flex items-center text-xs bg-destructive/10 text-destructive px-2.5 py-1 rounded-full font-medium">
            ↓ {fmt(caixa.saidasMes)} despesas
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function AniversariantesCard({
  aniversariantes,
  mes,
}: {
  aniversariantes: DashboardData["aniversariantesDoMes"];
  mes: number;
}) {
  const mon = monthAbbr(mes);

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center gap-2">
          <Cake className="size-3.5 text-muted-foreground" />
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Aniversariantes · {mon}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {aniversariantes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum aniversariante neste mês
          </p>
        ) : (
          <div className="space-y-3">
            {aniversariantes.map((j) => (
              <div key={j.id} className="flex items-center gap-3">
                <PlayerAvatar
                  name={j.name}
                  src={j.photo_url ?? undefined}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground leading-none truncate">
                    {dName(j.name, j.nickname)}
                    {j.ehHoje && " 🎂"}
                  </p>
                  {j.birth_date && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(j.birth_date).getUTCDate()} de{" "}
                      {monthName(new Date(j.birth_date).getUTCMonth() + 1)} ·{" "}
                      {calcAge(j.birth_date)} anos
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ArtilheirosCard({
  data,
  titulo,
  iconType,
}: {
  data: Array<{ jogador: PlayerProfile; gols: number }>;
  titulo: string;
  iconType: "flame" | "target";
}) {
  const maxGols = data[0]?.gols ?? 1;
  const Icon = iconType === "flame" ? Flame : Target;

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center gap-2">
          <Icon className="size-3.5 text-muted-foreground" />
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            {titulo}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem dados disponíveis</p>
        ) : (
          <div className="space-y-3">
            {data.map((item, index) =>
              item.jogador ? (
                <div
                  key={item.jogador.id}
                  className="flex items-center gap-2.5"
                >
                  <span className="font-heading text-sm text-muted-foreground w-4 shrink-0 leading-none">
                    {index + 1}
                  </span>
                  <PlayerAvatar
                    name={item.jogador.name}
                    src={item.jogador.photo_url ?? undefined}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground leading-none truncate">
                      {dName(item.jogador.name, item.jogador.nickname)}
                    </p>
                    {item.jogador.position && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {item.jogador.position}
                      </p>
                    )}
                    <Progress
                      value={Math.round((item.gols / maxGols) * 100)}
                      className="mt-1.5"
                    />
                  </div>
                  <span className="font-heading text-base text-foreground shrink-0 min-w-5 text-right leading-none">
                    {item.gols}
                  </span>
                </div>
              ) : null,
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function GoleirosCard({
  data,
  mes,
}: {
  data: DashboardData["goleirosComMenosGols"];
  mes: number;
}) {
  const mon = monthAbbr(mes);
  const maxGols = Math.max(...data.map((g) => g.totalGolsSofridos), 1);

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center gap-2">
          <ShieldAlert className="size-3.5 text-muted-foreground" />
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Goleiros · Gols Sofridos
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem dados disponíveis</p>
        ) : (
          <div className="space-y-4">
            {data.map((g) =>
              g.jogador ? (
                <div key={g.jogador.id} className="space-y-1.5">
                  <div className="flex items-center gap-2.5">
                    <PlayerAvatar
                      name={g.jogador.name}
                      src={g.jogador.photo_url ?? undefined}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground leading-none truncate">
                        {dName(g.jogador.name, g.jogador.nickname)}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {mon} · {g.partidas} jogo{g.partidas !== 1 ? "s" : ""} ·
                        média: {g.mediaPorPartida.toFixed(1)}/jogo
                      </p>
                    </div>
                    <span className="font-heading text-xl text-foreground shrink-0">
                      {g.totalGolsSofridos}
                    </span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        g.mediaPorPartida <= 1.5
                          ? "bg-success"
                          : g.mediaPorPartida <= 2.5
                            ? "bg-warning"
                            : "bg-destructive",
                      )}
                      style={{
                        width: `${Math.round((g.totalGolsSofridos / maxGols) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ) : null,
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PartidasMvpCard({
  partidas,
  mes,
}: {
  partidas: DashboardData["mvpsPorPartida"];
  mes: number;
}) {
  const mon = monthAbbr(mes);

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center gap-2">
          <Star className="size-3.5 text-muted-foreground" />
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Partidas · {mon}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {partidas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma partida com MVP encerrada neste mês
          </p>
        ) : (
          <div className="space-y-3">
            {partidas.map((p, i) => {
              const d = new Date(p.data);
              const dateStr = `${d.getUTCDate().toString().padStart(2, "0")}/${(
                d.getUTCMonth() + 1
              )
                .toString()
                .padStart(2, "0")}/${d.getUTCFullYear()}`;

              return (
                <div
                  key={i}
                  className="rounded-xl border border-border p-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      {dateStr}
                      {p.local && ` · ${p.local}`}
                    </span>
                    <Badge variant="secondary" className="text-[10px] shrink-0">
                      Encerrada
                    </Badge>
                  </div>
                  {/* Exibe o top 3 de candidatos a MVP da partida */}
                  {p.top3Mvps.map((candidato, posicao) => {
                    // Primeiro colocado recebe destaque visual diferenciado
                    const ehPrimeiro = posicao === 0;
                    return (
                      <div
                        key={candidato.jogador.id}
                        className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 ${
                          ehPrimeiro ? "bg-accent/15" : "bg-muted/40"
                        }`}
                      >
                        {ehPrimeiro ? (
                          <Star
                            className="size-3 text-accent shrink-0"
                            fill="currentColor"
                          />
                        ) : (
                          // Posição numérica para 2º e 3º colocados
                          <span className="size-3 text-[9px] font-bold text-muted-foreground shrink-0 flex items-center justify-center">
                            {posicao + 1}º
                          </span>
                        )}
                        <span
                          className={`text-xs truncate ${
                            ehPrimeiro
                              ? "font-medium text-foreground"
                              : "text-muted-foreground"
                          }`}
                        >
                          {ehPrimeiro && "MVP: "}
                          {dName(
                            candidato.jogador.name,
                            candidato.jogador.nickname,
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground ml-auto shrink-0">
                          {candidato.votos} votos
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PresencasCard({
  data,
  mes,
  totalPartidas,
}: {
  data: Array<{
    jogador: PlayerProfile;
    presencas: number;
    percentual: number;
  }>;
  mes: number;
  totalPartidas: number;
}) {
  const mon = monthAbbr(mes);

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center gap-2">
          <Calendar className="size-3.5 text-muted-foreground" />
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            Presenças · {mon}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem dados disponíveis</p>
        ) : (
          <div className="space-y-3">
            {data.map((item, index) =>
              item.jogador ? (
                <div
                  key={item.jogador.id}
                  className="flex items-center gap-2.5"
                >
                  <span className="font-heading text-sm text-muted-foreground w-4 shrink-0 leading-none">
                    {index + 1}
                  </span>
                  <PlayerAvatar
                    name={item.jogador.name}
                    src={item.jogador.photo_url ?? undefined}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground leading-none truncate">
                      {dName(item.jogador.name, item.jogador.nickname)}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {item.presencas} de {totalPartidas} partida
                      {totalPartidas !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-sm font-semibold shrink-0",
                      item.percentual === 100
                        ? "text-success"
                        : item.percentual >= 75
                          ? "text-foreground"
                          : item.percentual >= 50
                            ? "text-warning"
                            : "text-destructive",
                    )}
                  >
                    {item.percentual}%
                  </span>
                </div>
              ) : null,
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export const metadata: import("next").Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const headersList = await headers();
  const rawHost = headersList.get("host") ?? "localhost:3000";
  const host = rawHost.replace(/^www\./, "");
  const proto = headersList.get("x-forwarded-proto") ?? "http";

  const res = await fetch(`${proto}://${host}/api/dashboard`, {
    headers: { Cookie: headersList.get("cookie") ?? "" },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Falha ao carregar dados do dashboard");
  }

  const data: DashboardData = await res.json();

  const {
    periodo,
    artilheirosDoMes,
    artilheirosTemporada,
    goleirosComMenosGols,
    maisPresentesDoMes,
    totalPartidasDoMes,
    mvpDoMes,
    mvpsPorPartida,
    proximaPartida,
    aniversariantesDoMes,
    caixa,
  } = data;

  const { mes, ano } = periodo;

  const presencas = maisPresentesDoMes.map((p) => ({
    ...p,
    percentual:
      totalPartidasDoMes > 0
        ? Math.round((p.presencas / totalPartidasDoMes) * 100)
        : 0,
  }));

  const monName = monthName(mes);
  const monCap = monName.charAt(0).toUpperCase() + monName.slice(1);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Próxima Partida */}
      <ProximaPartidaCard match={proximaPartida} />

      {/* Row 2: MVP · Saldo · Aniversariantes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <MvpCard mvp={mvpDoMes} mes={mes} />
        <SaldoCard caixa={caixa} mes={mes} ano={ano} />
        <AniversariantesCard aniversariantes={aniversariantesDoMes} mes={mes} />
      </div>

      {/* Row 3: Artilheiros Mês · Artilheiros Temporada · Goleiros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <ArtilheirosCard
          data={artilheirosDoMes}
          titulo={`Artilheiros · ${monCap}`}
          iconType="flame"
        />
        <ArtilheirosCard
          data={artilheirosTemporada}
          titulo={`Artilheiros · ${ano}`}
          iconType="target"
        />
        <GoleirosCard data={goleirosComMenosGols} mes={mes} />
      </div>

      {/* Row 4: Partidas com MVP · Presenças */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4">
        <PartidasMvpCard partidas={mvpsPorPartida} mes={mes} />
        <PresencasCard
          data={presencas}
          mes={mes}
          totalPartidas={totalPartidasDoMes}
        />
      </div>
    </div>
  );
}
