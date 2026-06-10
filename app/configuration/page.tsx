"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Camera,
  Save,
  Building2,
  DollarSign,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ─── tipos ────────────────────────────────────────────────────────────────────

type ConfiguracaoClube = {
  id: string;
  club_name: string;
  monthly_fee: string;
  guest_fee: string;
  local: string;
  time: string;
};

type SecaoAtiva = "dados";

type StatusSalvar = "idle" | "salvando" | "sucesso" | "erro";

// ─── helpers ──────────────────────────────────────────────────────────────────

// Extrai "HH:MM" de um campo Time do Postgres (serializado como ISO ou "HH:MM:SS")
function extrairHorario(timeStr: string | null | undefined): string {
  if (!timeStr) return "09:00";
  try {
    const date = new Date(timeStr);
    if (!isNaN(date.getTime())) {
      const h = date.getUTCHours().toString().padStart(2, "0");
      const m = date.getUTCMinutes().toString().padStart(2, "0");
      return `${h}:${m}`;
    }
    return timeStr.substring(0, 5);
  } catch {
    return "09:00";
  }
}

function formatarMoeda(valor: string | number): string {
  const num = typeof valor === "string" ? parseFloat(valor) : valor;
  if (isNaN(num)) return "";
  return num.toFixed(2).replace(".", ",");
}

function parseMoeda(valor: string): number {
  return parseFloat(valor.replace(",", ".")) || 0;
}

// ─── itens do menu lateral ────────────────────────────────────────────────────

const secoes: {
  id: SecaoAtiva;
  label: string;
  icone: React.ElementType;
}[] = [{ id: "dados", label: "Dados do Clube", icone: Building2 }];

// ─── componente principal ─────────────────────────────────────────────────────

export default function ConfiguracaoPage() {
  const [config, setConfig] = useState<ConfiguracaoClube | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [secaoAtiva, setSecaoAtiva] = useState<SecaoAtiva>("dados");
  const [statusSalvar, setStatusSalvar] = useState<StatusSalvar>("idle");
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  // Campos do formulário
  const [nomeClube, setNomeClube] = useState("");
  const [mensalidade, setMensalidade] = useState("");
  const [taxaConvidado, setTaxaConvidado] = useState("");
  const [local, setLocal] = useState("");
  const [horario, setHorario] = useState("09:00");

  // Logo
  const [logoPreview, setLogoPreview] = useState<string>("/logo.png");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const inputArquivoRef = useRef<HTMLInputElement>(null);
  // Timestamp para forçar reload do logo após upload
  const [logoVersion, setLogoVersion] = useState<number>(Date.now());

  // ─── carrega configurações ─────────────────────────────────────────────────

  const carregarConfiguracoes = useCallback(async () => {
    try {
      const resp = await fetch("/api/club-settings");
      if (!resp.ok) throw new Error("Erro ao carregar configurações");
      const dados: ConfiguracaoClube = await resp.json();
      setConfig(dados);
      setNomeClube(dados.club_name ?? "");
      setMensalidade(formatarMoeda(dados.monthly_fee));
      setTaxaConvidado(formatarMoeda(dados.guest_fee));
      setLocal(dados.local ?? "");
      setHorario(extrairHorario(dados.time));
    } catch {
      setMensagemErro("Não foi possível carregar as configurações.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarConfiguracoes();
  }, [carregarConfiguracoes]);

  // ─── seleção de logo ───────────────────────────────────────────────────────

  function aoSelecionarArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    if (!arquivo.type.startsWith("image/")) {
      setMensagemErro("Apenas imagens são aceitas.");
      return;
    }

    setLogoFile(arquivo);
    const leitor = new FileReader();
    leitor.onload = (ev) => {
      if (ev.target?.result) setLogoPreview(ev.target.result as string);
    };
    leitor.readAsDataURL(arquivo);
  }

  // ─── salvar ────────────────────────────────────────────────────────────────

  async function aoSalvar() {
    setStatusSalvar("salvando");
    setMensagemErro(null);

    try {
      // 1. Faz upload do logo se um novo foi selecionado
      if (logoFile) {
        const form = new FormData();
        form.append("file", logoFile);
        const respLogo = await fetch("/api/upload-logo", {
          method: "POST",
          body: form,
        });
        if (!respLogo.ok) {
          const erroLogo = await respLogo.json();
          throw new Error(erroLogo.error ?? "Erro ao enviar logo");
        }
        setLogoVersion(Date.now());
        setLogoFile(null);
      }

      // 2. Salva os demais campos
      const respConfig = await fetch("/api/club-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          club_name: nomeClube,
          monthly_fee: parseMoeda(mensalidade),
          guest_fee: parseMoeda(taxaConvidado),
          local,
          time: horario,
        }),
      });

      if (!respConfig.ok) {
        const erro = await respConfig.json();
        throw new Error(erro.error ?? "Erro ao salvar configurações");
      }

      setStatusSalvar("sucesso");
      setTimeout(() => setStatusSalvar("idle"), 3000);
    } catch (err) {
      setStatusSalvar("erro");
      setMensagemErro(err instanceof Error ? err.message : "Erro desconhecido");
      setTimeout(() => setStatusSalvar("idle"), 4000);
    }
  }

  // ─── loading ───────────────────────────────────────────────────────────────

  if (carregando) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ─── render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col">
      {/* ── Layout principal ── */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* ── Sidebar de navegação (desktop) ── */}
        <nav className="hidden md:flex flex-col w-52 shrink-0 border-r border-border bg-card p-3 gap-1">
          {secoes.map(({ id, label, icone: Icone }) => (
            <button
              key={id}
              onClick={() => setSecaoAtiva(id)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-all duration-150",
                secaoAtiva === id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icone className="size-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        {/* ── Conteúdo ── */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          {/* ── Navegação mobile (chips) ── */}
          <div className="flex gap-2 md:hidden mb-4 overflow-x-auto pb-1">
            {secoes.map(({ id, label, icone: Icone }) => (
              <button
                key={id}
                onClick={() => setSecaoAtiva(id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all",
                  secaoAtiva === id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border",
                )}
              >
                <Icone className="size-3 shrink-0" />
                {label}
              </button>
            ))}
          </div>

          {/* ─────────────────────────── SEÇÃO: DADOS DO CLUBE ─────────────────── */}
          {secaoAtiva === "dados" && (
            <div className="space-y-6 max-w-2xl">
              <Card>
                <CardHeader className="pb-4">
                  <h2 className="font-heading text-lg tracking-wide text-foreground flex items-center gap-2">
                    <Building2 className="size-4 text-accent" />
                    DADOS DO CLUBE
                  </h2>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Logo upload */}
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                    <div className="relative group shrink-0">
                      <div className="size-24 rounded-xl overflow-hidden border-2 border-border bg-muted">
                        <Image
                          key={logoVersion}
                          src={
                            logoFile
                              ? logoPreview
                              : `/logo.png?v=${logoVersion}`
                          }
                          alt="Logo do clube"
                          width={96}
                          height={96}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => inputArquivoRef.current?.click()}
                        className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Trocar logo"
                      >
                        <Camera className="size-6 text-white" />
                      </button>
                    </div>

                    <div className="flex flex-col gap-1.5 text-center sm:text-left">
                      <p className="font-medium text-sm text-foreground">
                        Logo do Clube
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Clique na imagem para trocar · PNG ou JPG
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => inputArquivoRef.current?.click()}
                        className="mt-1 gap-1.5 w-fit mx-auto sm:mx-0"
                      >
                        <Camera className="size-3.5" />
                        Trocar foto
                      </Button>
                      <input
                        ref={inputArquivoRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={aoSelecionarArquivo}
                      />
                    </div>
                  </div>

                  {/* Nome do clube */}
                  <div className="grid gap-2">
                    <Label
                      htmlFor="club-name"
                      className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                    >
                      Nome do Clube
                    </Label>
                    <Input
                      id="club-name"
                      value={nomeClube}
                      onChange={(e) => setNomeClube(e.target.value)}
                      placeholder="Ex: Paris Sem Gol"
                      className="h-11"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-4">
                  <h2 className="font-heading text-lg tracking-wide text-foreground flex items-center gap-2">
                    <DollarSign className="size-4 text-accent" />
                    VALORES
                  </h2>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Mensalidade */}
                  <div className="grid gap-2">
                    <Label
                      htmlFor="mensalidade"
                      className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                    >
                      Mensalidade (R$)
                    </Label>
                    <p className="text-xs text-muted-foreground -mt-1">
                      Aplicado automaticamente a novos cadastros
                    </p>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                        R$
                      </span>
                      <Input
                        id="mensalidade"
                        value={mensalidade}
                        onChange={(e) => setMensalidade(e.target.value)}
                        onBlur={() =>
                          setMensalidade(formatarMoeda(parseMoeda(mensalidade)))
                        }
                        placeholder="30,00"
                        className="h-11 pl-9"
                        inputMode="decimal"
                      />
                    </div>
                  </div>

                  <div className="border-t border-border" />

                  {/* Taxa de convidado */}
                  <div className="grid gap-2">
                    <Label
                      htmlFor="taxa-convidado"
                      className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                    >
                      Taxa de Convidado (R$)
                    </Label>
                    <p className="text-xs text-muted-foreground -mt-1">
                      Cobrado de convidados nas partidas
                    </p>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                        R$
                      </span>
                      <Input
                        id="taxa-convidado"
                        value={taxaConvidado}
                        onChange={(e) => setTaxaConvidado(e.target.value)}
                        onBlur={() =>
                          setTaxaConvidado(
                            formatarMoeda(parseMoeda(taxaConvidado)),
                          )
                        }
                        placeholder="15,00"
                        className="h-11 pl-9"
                        inputMode="decimal"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-4">
                  <h2 className="font-heading text-lg tracking-wide text-foreground flex items-center gap-2">
                    <MapPin className="size-4 text-accent" />
                    LOCAL E HORÁRIO
                  </h2>
                </CardHeader>
                <CardContent className="space-y-5">
                  {/* Local */}
                  <div className="grid gap-2">
                    <Label
                      htmlFor="local"
                      className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                    >
                      Local da Pelada
                    </Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="local"
                        value={local}
                        onChange={(e) => setLocal(e.target.value)}
                        placeholder="Ex: Arena Montenegro"
                        className="h-11 pl-9"
                      />
                    </div>
                  </div>

                  <div className="border-t border-border" />

                  {/* Horário */}
                  <div className="grid gap-2">
                    <Label
                      htmlFor="horario"
                      className="text-xs font-medium uppercase tracking-wider text-muted-foreground"
                    >
                      Horário
                    </Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <Input
                        id="horario"
                        type="time"
                        value={horario}
                        onChange={(e) => setHorario(e.target.value)}
                        className="h-11 pl-9"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Botão salvar */}
              <div className="flex flex-col items-center">
                <Button
                  onClick={aoSalvar}
                  disabled={statusSalvar === "salvando"}
                  className="gap-2 font-heading tracking-wide shrink-0 w-50"
                >
                  {statusSalvar === "salvando" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : statusSalvar === "sucesso" ? (
                    <CheckCircle2 className="size-4" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  <span className="hidden sm:inline">
                    {statusSalvar === "salvando"
                      ? "Salvando..."
                      : statusSalvar === "sucesso"
                        ? "Salvo!"
                        : "Salvar Alterações"}
                  </span>
                  <span className="sm:hidden">
                    {statusSalvar === "salvando" ? (
                      <span>Salvando...</span>
                    ) : statusSalvar === "sucesso" ? (
                      <span>Salvo com sucesso</span>
                    ) : (
                      <span>Salvar</span>
                    )}
                  </span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
