"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Plus,
  Minus,
  Camera,
  Loader2,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ─── tipos ────────────────────────────────────────────────────────────────────

type Posicao = "GK" | "DEF" | "MEI" | "ATA";
type Role = "admin" | "co_admin" | "player";

type FormState = {
  name: string;
  nickname: string;
  phone: string;
  birth_date: string;
  position: Posicao | null;
  is_goalkeeper: boolean;
  photo_url: string | null;
  // Apenas admin/co-admin
  role: Role;
  is_active: boolean;
  // Avaliações 1–10
  velocidade: number;
  passe: number;
  drible: number;
  finalizacao: number;
  defesa: number;
  fisico: number;
};

type SessaoUsuario = {
  id: string;
  role: string;
} | null;

// ─── constantes ───────────────────────────────────────────────────────────────

const POSICOES: { valor: Posicao; label: string; sublabel: string }[] = [
  { valor: "GK", label: "GK", sublabel: "Goleiro" },
  { valor: "DEF", label: "DEF", sublabel: "Defensor" },
  { valor: "MEI", label: "MEI", sublabel: "Meia" },
  { valor: "ATA", label: "ATA", sublabel: "Atacante" },
];

const ROLES: { valor: Role; label: string }[] = [
  { valor: "player", label: "Jogador" },
  { valor: "co_admin", label: "Co-admin" },
  { valor: "admin", label: "Admin" },
];

type CampoAvaliacao = {
  key: keyof Pick<
    FormState,
    "velocidade" | "passe" | "drible" | "finalizacao" | "defesa" | "fisico"
  >;
  label: string;
};

const AVALIACOES: CampoAvaliacao[] = [
  { key: "velocidade", label: "Velocidade" },
  { key: "passe", label: "Passe" },
  { key: "drible", label: "Drible" },
  { key: "finalizacao", label: "Finalização" },
  { key: "defesa", label: "Defesa" },
  { key: "fisico", label: "Físico" },
];

// Mapeia qualquer formato salvo de volta para o código interno da posição.
// Aceita sublabels ("Atacante"), labels curtos ("ATA") e variações sem acento.
const POSICAO_POR_LABEL: Record<string, Posicao> = {
  // Sublabels armazenados pelo formulário de cadastro
  Goleiro: "GK",
  Defensor: "DEF",
  Meia: "MEI",
  Atacante: "ATA",
  // Labels curtos (caso algum registro antigo tenha usado o código)
  GK: "GK",
  DEF: "DEF",
  MEI: "MEI",
  ATA: "ATA",
  // Variações em minúsculo
  goleiro: "GK",
  defensor: "DEF",
  meia: "MEI",
  atacante: "ATA",
};

// ─── utilitários ─────────────────────────────────────────────────────────────

function maskPhone(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length === 3) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 7)
    return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3, 7)}-${d.slice(7)}`;
}

function calcularOverall(form: FormState): number {
  return Math.floor(
    (form.velocidade +
      form.passe +
      form.drible +
      form.finalizacao +
      form.defesa +
      form.fisico) /
      6,
  );
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

// ─── sub-componentes ──────────────────────────────────────────────────────────

function NumericStepper({
  value,
  onChange,
  min = 1,
  max = 10,
  step = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="flex flex-col items-center border border-border rounded-xl overflow-hidden w-full">
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + step))}
        className="w-full flex items-center justify-center py-1.5 hover:bg-muted transition-colors text-muted-foreground"
        aria-label="Aumentar"
      >
        <Plus className="size-3" />
      </button>
      <div className="py-2.5 font-heading text-xl text-foreground border-y border-border w-full text-center select-none">
        {value}
      </div>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - step))}
        className="w-full flex items-center justify-center py-1.5 hover:bg-muted transition-colors text-muted-foreground"
        aria-label="Diminuir"
      >
        <Minus className="size-3" />
      </button>
    </div>
  );
}

// ─── página ───────────────────────────────────────────────────────────────────

export default function EditarJogadorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sessao, setSessao] = useState<SessaoUsuario>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [fazendoUpload, setFazendoUpload] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  const [form, setForm] = useState<FormState>({
    name: "",
    nickname: "",
    phone: "",
    birth_date: "",
    position: null,
    is_goalkeeper: false,
    photo_url: null,
    role: "player",
    is_active: true,
    velocidade: 5,
    passe: 5,
    drible: 5,
    finalizacao: 5,
    defesa: 5,
    fisico: 5,
  });

  // Carrega o perfil do jogador e a sessão em paralelo
  const carregarDados = useCallback(async () => {
    setCarregando(true);
    try {
      const [resSessao, resJogador] = await Promise.all([
        fetch("/api/auth/me"),
        fetch(`/api/users/${id}`),
      ]);

      const [dadosSessao, dadosJogador] = await Promise.all([
        resSessao.json(),
        resJogador.json(),
      ]);

      setSessao(dadosSessao?.id ? dadosSessao : null);

      if (dadosJogador?.id) {
        const ratings = dadosJogador.player_ratings;
        // Converte posição armazenada ("Atacante") de volta para o código ("ATA")
        const posCode =
          dadosJogador.is_goalkeeper
            ? "GK"
            : POSICAO_POR_LABEL[dadosJogador.position ?? ""] ?? null;

        // Formata telefone para exibição
        const phoneMasked = dadosJogador.phone
          ? maskPhone(dadosJogador.phone)
          : "";

        // Formata data de nascimento para input[type=date] (YYYY-MM-DD)
        const birthForInput = dadosJogador.birth_date
          ? dadosJogador.birth_date.slice(0, 10)
          : "";

        setForm({
          name: dadosJogador.name ?? "",
          nickname: dadosJogador.nickname ?? "",
          phone: phoneMasked,
          birth_date: birthForInput,
          position: posCode as Posicao | null,
          is_goalkeeper: dadosJogador.is_goalkeeper ?? false,
          photo_url: dadosJogador.photo_url ?? null,
          role: (dadosJogador.role as Role) ?? "player",
          is_active: dadosJogador.is_active ?? true,
          velocidade: ratings?.speed ?? 5,
          passe: ratings?.passing ?? 5,
          drible: ratings?.dribbling ?? 5,
          finalizacao: ratings?.finishing ?? 5,
          defesa: ratings?.defense ?? 5,
          fisico: ratings?.physical ?? 5,
        });
      }
    } finally {
      setCarregando(false);
    }
  }, [id]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  function atualizar<K extends keyof FormState>(campo: K, valor: FormState[K]) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function selecionarPosicao(pos: Posicao) {
    const ehGoleiro = pos === "GK";
    setForm((f) => ({
      ...f,
      position: pos,
      is_goalkeeper: ehGoleiro,
    }));
  }

  // Faz upload da foto e atualiza o estado com a URL retornada
  async function handleFotoSelecionada(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    setFazendoUpload(true);
    setErro(null);
    try {
      const formData = new FormData();
      formData.append("file", arquivo);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setErro(data.error ?? "Erro ao fazer upload da foto.");
        return;
      }

      const { url } = await res.json();
      atualizar("photo_url", url);
    } catch {
      setErro("Falha no upload. Tente novamente.");
    } finally {
      setFazendoUpload(false);
      // Limpa o input para permitir re-seleção do mesmo arquivo
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function salvar() {
    setErro(null);
    setSucesso(false);

    if (!form.name.trim()) {
      setErro("Nome completo é obrigatório.");
      return;
    }

    if (!form.position) {
      setErro("Selecione a posição do jogador antes de salvar.");
      // Rola até a seção de posição para facilitar a correção
      document.getElementById("secao-posicao")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSalvando(true);
    try {
      const ehGestor =
        sessao?.role === "admin" || sessao?.role === "co_admin";

      const posicaoSublabel = POSICOES.find(
        (p) => p.valor === form.position,
      )?.sublabel;

      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        nickname: form.nickname.trim() || null,
        phone: form.phone.replace(/\D/g, "") || null,
        birth_date: form.birth_date || null,
        position: posicaoSublabel ?? null,
        photo_url: form.photo_url,
      };

      // Campos restritos a admin/co-admin
      if (ehGestor) {
        payload.is_goalkeeper = form.is_goalkeeper;
        payload.role = form.role;
        payload.is_active = form.is_active;

        // Envia avaliações para o endpoint de ratings se for gestor
        payload.ratings = [
          form.finalizacao,
          form.passe,
          form.drible,
          form.defesa,
          form.fisico,
          form.velocidade,
          calcularOverall(form),
        ];
      }

      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setErro(data.error ?? "Erro ao salvar.");
        return;
      }

      setSucesso(true);
      setTimeout(() => router.push(`/jogadores/${id}`), 800);
    } catch {
      setErro("Falha na conexão. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <div className="max-w-3xl mx-auto space-y-5 pb-8">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-6 w-40" />
        </div>
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  const ehGestor = sessao?.role === "admin" || sessao?.role === "co_admin";
  const ehProprioJogador = sessao?.id === id;
  const overall = calcularOverall(form);
  const gkSelecionado = form.position === "GK";

  // Redireciona se o usuário não tem permissão para editar
  if (!ehProprioJogador && !ehGestor) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Link
          href={`/jogadores/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Perfil
        </Link>
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Você não tem permissão para editar este perfil.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-8">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link
          href={`/jogadores/${id}`}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Perfil
        </Link>
        <span className="text-border select-none">/</span>
        <h1 className="font-heading text-lg tracking-wide text-foreground">
          EDITAR JOGADOR
        </h1>
        <Button
          onClick={salvar}
          disabled={salvando || fazendoUpload}
          className="ml-auto gap-2 shrink-0"
        >
          {salvando ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {salvando ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      {/* Erro global */}
      {erro && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {erro}
        </div>
      )}

      {/* Feedback de sucesso */}
      {sucesso && (
        <div className="rounded-lg border border-success/40 bg-success/10 px-4 py-3 text-sm text-success">
          Perfil atualizado com sucesso!
        </div>
      )}

      {/* ── Avatar ───────────────────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          Foto de Perfil
        </h2>

        <div className="flex items-center gap-5">
          {/* Avatar clicável */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={fazendoUpload}
            className="relative group shrink-0"
            aria-label="Alterar foto de perfil"
          >
            <div className="size-20 rounded-full border-2 border-border overflow-hidden bg-muted flex items-center justify-center">
              {fazendoUpload ? (
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              ) : form.photo_url ? (
                <img
                  src={form.photo_url}
                  alt="Foto de perfil"
                  className="size-full object-cover"
                />
              ) : (
                <span className="font-heading text-2xl text-muted-foreground">
                  {form.name ? iniciais(form.name) : "?"}
                </span>
              )}
            </div>

            {/* Overlay com ícone de câmera */}
            <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="size-5 text-white" />
            </div>

            {/* Badge de câmera */}
            <div className="absolute -bottom-1 -right-1 size-7 rounded-full bg-foreground border-2 border-background flex items-center justify-center">
              <Camera className="size-3 text-background" />
            </div>
          </button>

          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {fazendoUpload ? "Enviando..." : "Clique na foto para alterar"}
            </p>
            <p className="text-xs text-muted-foreground">
              JPG, PNG ou WebP · Máx. 5MB
            </p>
            {form.photo_url && !fazendoUpload && (
              <button
                type="button"
                onClick={() => atualizar("photo_url", null)}
                className="text-xs text-destructive hover:underline"
              >
                Remover foto
              </button>
            )}
          </div>

          {/* Input file oculto */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFotoSelecionada}
          />
        </div>
      </section>

      {/* ── Dados pessoais ───────────────────────────────────────────── */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Dados Pessoais
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Nome Completo *</Label>
            <Input
              id="name"
              placeholder="Ex: Rafael Lima"
              value={form.name}
              onChange={(e) => atualizar("name", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nickname">Apelido</Label>
            <Input
              id="nickname"
              placeholder="Ex: Rafa"
              value={form.nickname}
              onChange={(e) => atualizar("nickname", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">WhatsApp</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(11) 9 ____-____"
              value={form.phone}
              onChange={(e) => atualizar("phone", maskPhone(e.target.value))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="birth_date">Data de Nascimento</Label>
            <Input
              id="birth_date"
              type="date"
              value={form.birth_date}
              onChange={(e) => atualizar("birth_date", e.target.value)}
            />
          </div>

          {/* Função — visível apenas para gestores */}
          {ehGestor && (
            <div className="space-y-1.5">
              <Label htmlFor="role">Função</Label>
              <select
                id="role"
                value={form.role}
                onChange={(e) => atualizar("role", e.target.value as Role)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {ROLES.map(({ valor, label }) => (
                  <option key={valor} value={valor}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status ativo/inativo — visível apenas para gestores */}
          {ehGestor && (
            <div className="space-y-1.5">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={form.is_active ? "ativo" : "inativo"}
                onChange={(e) =>
                  atualizar("is_active", e.target.value === "ativo")
                }
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="ativo">Ativo</option>
                <option value="inativo">Suspenso</option>
              </select>
            </div>
          )}
        </div>
      </section>

      {/* ── Posição ──────────────────────────────────────────────────── */}
      <section
        id="secao-posicao"
        className={cn(
          "rounded-xl border bg-card p-5 space-y-4",
          !form.position && erro?.includes("posição")
            ? "border-destructive/60"
            : "border-border",
        )}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Posição <span className="text-destructive">*</span>
          </h2>
          {!form.position && (
            <span className="text-xs text-destructive">Obrigatório</span>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2">
          {POSICOES.map(({ valor, label, sublabel }) => {
            const selecionado = form.position === valor;
            return (
              <button
                key={valor}
                type="button"
                onClick={() => selecionarPosicao(valor)}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl border py-3 px-2 transition-colors",
                  selecionado
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background hover:bg-muted",
                )}
              >
                <span
                  className={cn(
                    "text-sm font-bold",
                    selecionado
                      ? "text-background"
                      : valor === "GK"
                        ? "text-accent"
                        : "text-foreground",
                  )}
                >
                  {label}
                </span>
                <span
                  className={cn(
                    "text-[10px] hidden sm:block",
                    selecionado ? "text-background/70" : "text-muted-foreground",
                  )}
                >
                  {sublabel}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Avaliação Técnica — apenas para gestores ─────────────────── */}
      {ehGestor && (
        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Avaliação Técnica
          </h2>
          <p className="text-xs text-muted-foreground -mt-2">
            Escala de 1 a 10
          </p>

          {gkSelecionado && (
            <div className="flex items-start gap-2 rounded-lg bg-info/10 border border-info/30 px-4 py-3 text-sm text-info-foreground">
              <Info className="size-4 shrink-0 mt-0.5 text-info" />
              <span>
                Para goleiros, os atributos Defesa e Físico são os mais
                relevantes.
              </span>
            </div>
          )}

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {AVALIACOES.map(({ key, label }) => (
              <div key={key} className="flex flex-col items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium text-center leading-tight">
                  {label}
                </span>
                <NumericStepper
                  value={form[key] as number}
                  onChange={(v) => atualizar(key, v as FormState[typeof key])}
                />
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-border text-center">
            <span className="text-xs text-muted-foreground font-medium">
              Overall
            </span>
            <div className="py-3 font-heading text-4xl text-foreground w-full text-center select-none">
              {overall}
            </div>
          </div>
        </section>
      )}

      {/* Botão salvar — rodapé */}
      <div className="flex justify-end">
        <Button
          onClick={salvar}
          disabled={salvando || fazendoUpload}
          size="lg"
          className="gap-2 w-full sm:w-auto"
        >
          {salvando ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {salvando ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>
    </div>
  );
}
