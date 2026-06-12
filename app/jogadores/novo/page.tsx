"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Info, Plus, Minus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// ─── tipos ────────────────────────────────────────────────────────────────────

type Posicao = "GK" | "DEF" | "MEI" | "ATA";
type Role = "admin" | "co_admin" | "player";

type FormState = {
  name: string;
  nickname: string;
  email: string;
  role: Role;
  phone: string;
  birth_date: string;
  position: Posicao | null;
  is_goalkeeper: boolean;
  monthly_type: "mensalista" | "isento";
  // Avaliações em escala 0-10;
  velocidade: number;
  passe: number;
  drible: number;
  finalizacao: number;
  defesa: number;
  fisico: number;
};

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

// ─── utilitários ─────────────────────────────────────────────────────────────

function maskPhone(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length === 3) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3, 7)}-${d.slice(7)}`;
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

export default function NovoJogadorPage() {
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    name: "",
    nickname: "",
    email: "",
    role: "player",
    phone: "",
    birth_date: "",
    position: null,
    is_goalkeeper: false,
    monthly_type: "mensalista",
    velocidade: 5,
    passe: 5,
    drible: 5,
    finalizacao: 5,
    defesa: 5,
    fisico: 5,
  });

  const [overall, setOverall] = useState(5);

  function atualizar<K extends keyof FormState>(campo: K, valor: FormState[K]) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setOverall(
      Math.floor(
        (campo === "velocidade"
          ? (valor as number)
          : form.velocidade +
            (campo === "passe" ? (valor as number) : form.passe) +
            (campo === "drible" ? (valor as number) : form.drible) +
            (campo === "finalizacao" ? (valor as number) : form.finalizacao) +
            (campo === "defesa" ? (valor as number) : form.defesa) +
            (campo === "fisico" ? (valor as number) : form.fisico)) / 6,
      ),
    );
  }

  function selecionarPosicao(pos: Posicao) {
    const ehGoleiro = pos === "GK";
    setForm((f) => ({
      ...f,
      position: pos,
      is_goalkeeper: ehGoleiro,
      // Goleiro é automaticamente isento
      monthly_type: ehGoleiro ? "isento" : f.monthly_type,
    }));
  }

  async function salvar() {
    setErro(null);

    if (!form.name.trim()) {
      setErro("Nome completo é obrigatório.");
      return;
    }
    if (!form.email.trim()) {
      setErro("Email é obrigatório.");
      return;
    }

    setSalvando(true);
    try {
      // API espera ratings na ordem: [shooting, passing, dribbling, defending, physical, speed]
      // Valores convertidos de escala 0-100 para 1-10
      const ratings = [
        form.finalizacao ?? 5,
        form.passe ?? 5,
        form.drible ?? 5,
        form.defesa ?? 5,
        form.fisico ?? 5,
        form.velocidade ?? 5,
        overall ?? 5,
      ];

      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          nickname: form.nickname.trim() || null,
          email: form.email.trim(),
          role: form.role,
          phone: form.phone.replace(/\D/g, "") || null,
          birth_date: form.birth_date || null,
          position: POSICOES.find((p) => p.valor === form.position)?.sublabel,
          is_goalkeeper: form.is_goalkeeper,
          ratings,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setErro(data.error ?? "Erro ao salvar jogador.");
        return;
      }

      router.push("/jogadores");
    } catch {
      setErro("Falha na conexão. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  const gkSelecionado = form.position === "GK";

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-8">
      {/* Cabeçalho da página */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link
          href="/jogadores"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Elenco
        </Link>
        <span className="text-border select-none">/</span>
        <h1 className="font-heading text-lg tracking-wide text-foreground">
          NOVO JOGADOR
        </h1>
        <Button
          onClick={salvar}
          disabled={salvando}
          className="ml-auto gap-2 shrink-0"
        >
          <Save className="size-4" />
          {salvando ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      {/* Erro global */}
      {erro && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {erro}
        </div>
      )}

      {/* Dados pessoais */}
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
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="Ex: rafael@email.com"
              value={form.email}
              onChange={(e) => atualizar("email", e.target.value)}
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
        </div>
      </section>

      {/* Posição */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-5">
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Posição
          </h2>
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
                      selecionado
                        ? "text-background/70"
                        : "text-muted-foreground",
                    )}
                  >
                    {sublabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Mensalidade */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Mensalidade
        </h2>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={gkSelecionado}
            onClick={() =>
              !gkSelecionado && atualizar("monthly_type", "mensalista")
            }
            className={cn(
              "rounded-xl border p-4 text-left transition-colors",
              form.monthly_type === "mensalista"
                ? "border-success/60 bg-success/10"
                : "border-border bg-background",
              gkSelecionado && "opacity-40 cursor-not-allowed",
            )}
          >
            <p
              className={cn(
                "text-sm font-semibold",
                form.monthly_type === "mensalista"
                  ? "text-success"
                  : "text-foreground",
              )}
            >
              Mensalista
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Paga R$ 80/mês
            </p>
          </button>

          <button
            type="button"
            onClick={() => atualizar("monthly_type", "isento")}
            className={cn(
              "rounded-xl border p-4 text-left transition-colors",
              form.monthly_type === "isento"
                ? "border-success/60 bg-success/10"
                : "border-border bg-background hover:bg-muted",
            )}
          >
            <p
              className={cn(
                "text-sm font-semibold",
                form.monthly_type === "isento"
                  ? "text-success"
                  : "text-foreground",
              )}
            >
              Isento
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Sem cobrança</p>
          </button>
        </div>

        {/* Aviso automático para goleiros */}
        {gkSelecionado && (
          <div className="flex items-start gap-2 rounded-lg bg-warning/10 border border-warning/30 px-4 py-3 text-sm text-warning-foreground">
            <Info className="size-4 shrink-0 mt-0.5 text-warning" />
            <span>
              Goleiros são isentos automaticamente ao selecionar a posição GK.
            </span>
          </div>
        )}
      </section>

      {/* Avaliação Técnica */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Avaliação Técnica
        </h2>
        <p className="text-xs text-muted-foreground -mt-2">Escala de 0 a 10</p>

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
          <span className="text-xs text-muted-foreground font-medium text-center">
            Overall
          </span>
          <div className="py-3 font-heading text-4xl text-foreground w-full text-center select-none">
            {overall}
          </div>
        </div>
      </section>

      {/* Botão salvar duplicado no rodapé (útil em mobile) */}
      <div className="flex justify-end">
        <Button
          onClick={salvar}
          disabled={salvando}
          size="lg"
          className="gap-2 w-full sm:w-auto"
        >
          <Save className="size-4" />
          {salvando ? "Salvando..." : "Salvar Jogador"}
        </Button>
      </div>
    </div>
  );
}
