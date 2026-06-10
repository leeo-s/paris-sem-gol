"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  Landmark,
  CheckCircle2,
  Clock,
  XCircle,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { DatalistInput } from "@/components/DatalistInput";
import { Checkbox } from "@/components/ui/checkbox";

// ─── tipos ─────────────────────────────────────────────────────────────────────

type SessaoUsuario = { id: string; name: string; role: string } | null;

type ResumoAno = {
  ano: number;
  totalEntradas: number;
  totalSaidas: number;
  saldoAtual: number;
  saldoGlobal: number;
  inadimplencia: { total: number; quantidadeJogadores: number };
  entradasPorCategoria: {
    categoria: string;
    total: number;
    transacoes: number;
  }[];
  saidasPorCategoria: {
    categoria: string;
    total: number;
    transacoes: number;
  }[];
  evolucaoMensal: {
    mes: number;
    entradas: number;
    saidas: number;
    saldo: number;
  }[];
};

type Transacao = {
  id: string;
  type: "income" | "expense";
  category: string;
  amount: string;
  description: string;
  reference_date: string;
  users_financial_transactions_user_idTousers: {
    id: string;
    name: string;
    nickname: string | null;
  } | null;
};

type Mensalidade = {
  id: string;
  month: number;
  year: number;
  amount: string;
  status: "pending" | "paid" | "late" | "cancelled";
  paid_at: string | null;
  notes: string | null;
  users: {
    id: string;
    name: string;
    nickname: string | null;
    is_goalkeeper: boolean;
  };
};

type VendaCamisa = {
  id: string;
  amount: string;
  payment_status: "pending" | "paid" | "late" | "cancelled";
  jersey_status: "pending" | "delivered" | "cancelled";
  notes: string | null;
  created_at: string;
  users: { id: string; name: string; nickname: string | null } | null;
  guest_players: { id: string; name: string } | null;
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

const CATEGORIAS_RECEITA: Record<string, { label: string; cor: string }> = {
  monthly_fee: { label: "Mensalidades", cor: "bg-primary" },
  guest_fee: { label: "Taxa Avulso", cor: "bg-info" },
  bbq: { label: "Evento / Churrasco", cor: "bg-info" },
  jersey: { label: "Camisas / Uniformes", cor: "bg-warning" },
  other: { label: "Outros", cor: "bg-muted-foreground" },
};

const CATEGORIAS_DESPESA: Record<string, { label: string; cor: string }> = {
  field_rental: { label: "Aluguel da Quadra", cor: "bg-destructive" },
  equipment: { label: "Materiais / Equipamentos", cor: "bg-destructive" },
  bbq: { label: "Churrasco", cor: "bg-destructive" },
  other: { label: "Outros", cor: "bg-muted-foreground" },
};

const TODAS_CATEGORIAS = {
  income: [
    { value: "monthly_fee", label: "Mensalidades" },
    { value: "guest_fee", label: "Taxa Avulso" },
    { value: "bbq", label: "Evento / Churrasco" },
    { value: "jersey", label: "Camisas / Uniformes" },
    { value: "other", label: "Outros" },
  ],
  expense: [
    { value: "field_rental", label: "Aluguel da Quadra" },
    { value: "equipment", label: "Materiais / Equipamentos" },
    { value: "bbq", label: "Churrasco" },
    { value: "other", label: "Outros" },
  ],
};

// ─── helpers ───────────────────────────────────────────────────────────────────

function brl(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function brlCompact(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor);
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

// ─── sub-componentes ───────────────────────────────────────────────────────────

function CartaoResumo({
  titulo,
  valor,
  variante,
  carregando,
}: {
  titulo: string;
  valor: number;
  variante: "receita" | "despesa" | "saldo" | "receber";
  carregando: boolean;
}) {
  const estilos = {
    receita: "border-l-4 border-l-success",
    despesa: "border-l-4 border-l-destructive",
    saldo: "border-l-4 border-l-info",
    receber: "border-l-4 border-l-warning",
  };

  const coresValor = {
    receita: "text-success",
    despesa: "text-destructive",
    saldo: "text-info",
    receber: "text-warning",
  };

  return (
    <Card className={cn("bg-card", estilos[variante])}>
      <CardContent className="p-4 md:p-5">
        {carregando ? (
          <div className="space-y-2">
            <div className="h-7 w-28 bg-muted animate-pulse rounded" />
            <div className="h-3.5 w-24 bg-muted animate-pulse rounded" />
          </div>
        ) : (
          <>
            <p
              className={cn(
                "font-heading text-2xl md:text-3xl leading-none",
                coresValor[variante],
              )}
            >
              {brlCompact(valor)}
            </p>
            <p className="text-xs text-muted-foreground mt-1.5">{titulo}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function BarraCategoria({
  label,
  valor,
  max,
  cor,
  tipo,
}: {
  label: string;
  valor: number;
  max: number;
  cor: string;
  tipo: "income" | "expense";
}) {
  const percentual = max > 0 ? (valor / max) * 100 : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground">{label}</span>
        <span
          className={cn(
            "font-medium tabular-nums",
            tipo === "expense" ? "text-destructive" : "text-foreground",
          )}
        >
          {brlCompact(valor)}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", cor)}
          style={{ width: `${percentual}%` }}
        />
      </div>
    </div>
  );
}

function ItemTransacao({ transacao }: { transacao: Transacao }) {
  const entrada = transacao.type === "income";
  const valor = Number(transacao.amount);

  return (
    <div className="flex items-center gap-3 py-3">
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          entrada ? "bg-success/10" : "bg-destructive/10",
        )}
      >
        {entrada ? (
          <ArrowDownLeft className="size-4 text-success" />
        ) : (
          <ArrowUpRight className="size-4 text-destructive" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground leading-none truncate">
          {transacao.description}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {formatarData(transacao.reference_date)}
        </p>
      </div>
      <span
        className={cn(
          "text-sm font-semibold tabular-nums shrink-0",
          entrada ? "text-success" : "text-destructive",
        )}
      >
        {entrada ? "+" : "-"}
        {brlCompact(valor)}
      </span>
    </div>
  );
}

function BadgeStatusMensalidade({ status }: { status: Mensalidade["status"] }) {
  const config = {
    paid: {
      label: "Pago",
      classe: "bg-success/15 text-success",
      icon: CheckCircle2,
    },
    pending: {
      label: "Pendente",
      classe: "bg-warning/15 text-warning",
      icon: Clock,
    },
    late: {
      label: "Em atraso",
      classe: "bg-destructive/15 text-destructive",
      icon: XCircle,
    },
    cancelled: {
      label: "Cancelado",
      classe: "bg-muted text-muted-foreground",
      icon: XCircle,
    },
  };

  const { label, classe, icon: Icon } = config[status] ?? config.pending;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        classe,
      )}
    >
      <Icon className="size-3" />
      {label}
    </span>
  );
}

// ─── tipos do dialogo ─────────────────────────────────────────────────────────

type UsuarioParaRoster = {
  id: string;
  name: string;
  nickname: string | null;
  position: string | null;
  is_goalkeeper: boolean;
  in_roster: boolean;
};

type FeePendente = {
  id: string;
  month: number;
  year: number;
  amount: string;
  status: string;
};

type UsuarioComFeesPendentes = {
  id: string;
  name: string;
  fees: FeePendente[];
};

// ─── dialogo de novo lançamento ───────────────────────────────────────────────

function DialogoNovoLancamento({
  aberto,
  onFechar,
  onSucesso,
  mes,
  ano,
  dia,
}: {
  aberto: boolean;
  onFechar: () => void;
  onSucesso: () => void;
  mes: number;
  ano: number;
  dia: number;
}) {
  const [tipo, setTipo] = useState<"income" | "expense">("income");
  const [categoria, setCategoria] = useState("");
  // Armazena os dígitos dos centavos (ex: "500" = R$ 5,00)
  const [valor, setValor] = useState("");
  const [descricao, setDescricao] = useState("");
  const [data, setData] = useState(() => {
    const d = new Date(ano, mes - 1, 1);
    return d.toISOString().slice(0, 10);
  });
  const [paymentMethod, setPaymentMethod] = useState<
    "Pix" | "Dinheiro" | "Cartao"
  >("Pix");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  // Estado para atribuição de usuário ao lançamento
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const [mensalidadeId, setMensalidadeId] = useState<string | null>(null);
  const [todosUsuarios, setTodosUsuarios] = useState<
    { id: string; name: string }[]
  >([]);
  const [usuariosComFeesPendentes, setUsuariosComFeesPendentes] = useState<
    UsuarioComFeesPendentes[]
  >([]);

  // Formata os dígitos de centavos para exibição (ex: "500" → "5,00")
  function formatarValor(digitos: string): string {
    if (!digitos) return "";
    const padded = digitos.padStart(3, "0");
    const intPart = parseInt(padded.slice(0, -2), 10).toString();
    return `${intPart},${padded.slice(-2)}`;
  }

  function handleValorKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key >= "0" && e.key <= "9") {
      e.preventDefault();
      // Limita a 10 dígitos (R$ 99.999.999,99)
      if (valor.length < 10) setValor((prev) => prev + e.key);
    } else if (e.key === "Backspace") {
      e.preventDefault();
      setValor((prev) => prev.slice(0, -1));
    } else if (!["Tab", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
    }
  }

  // Busca todos os usuários ativos ao abrir o modal (usado nas categorias comuns)
  useEffect(() => {
    if (!aberto) return;
    fetch("/api/users?all=true")
      .then((res) => (res.ok ? res.json() : []))
      .then(setTodosUsuarios)
      .catch(() => {});
  }, [aberto]);

  // Busca todos os usuários que têm alguma mensalidade não paga (qualquer mês)
  // Só executa quando a categoria selecionada for mensalidade
  useEffect(() => {
    if (!aberto || categoria !== "monthly_fee") {
      setUsuariosComFeesPendentes([]);
      return;
    }
    fetch("/api/financial/monthly-fees/roster-pending")
      .then((res) => (res.ok ? res.json() : []))
      .then(setUsuariosComFeesPendentes)
      .catch(() => {});
  }, [aberto, categoria]);

  // Atualiza a data inicial quando muda o mês selecionado
  useEffect(() => {
    const d = new Date(ano, mes - 1, dia);
    setData(d.toISOString().slice(0, 10));
    setCategoria("");
    setValor("");
    setUsuarioId(null);
    setMensalidadeId(null);
  }, [mes, ano, aberto]);

  // Limpa o mês de referência ao trocar de usuário
  useEffect(() => {
    setMensalidadeId(null);
  }, [usuarioId]);

  // Troca o tipo e reseta campos dependentes
  function handleTipoChange(novoTipo: "income" | "expense") {
    setTipo(novoTipo);
    setCategoria("");
    setUsuarioId(null);
    setMensalidadeId(null);
  }

  // Troca a categoria e reseta o usuário/mensalidade vinculados
  function handleCategoriaChange(novaCategoria: string | null) {
    setCategoria(novaCategoria ?? "");
    setUsuarioId(null);
    setMensalidadeId(null);
  }

  // Fees do usuário selecionado para exibir no seletor de mês de referência
  const feesPendentesDoUsuario =
    usuariosComFeesPendentes.find((u) => u.id === usuarioId)?.fees ?? [];

  // Label da fee selecionada para exibir no trigger do Select (Base UI não espelha ItemText)
  const feeSelecionada = feesPendentesDoUsuario.find(
    (f) => f.id === mensalidadeId,
  );
  const labelFeeSelecionada = feeSelecionada
    ? `${MESES[feeSelecionada.month - 1]} ${feeSelecionada.year} · ${brl(Number(feeSelecionada.amount))}`
    : null;

  // Lista de itens exibida no DatalistInput varia conforme a categoria
  const itensParaDatalist =
    categoria === "monthly_fee"
      ? usuariosComFeesPendentes.map((u) => ({ id: u.id, name: u.name }))
      : todosUsuarios;

  async function salvar() {
    setErro("");
    if (!categoria) {
      setErro("Selecione uma categoria");
      return;
    }
    if (!valor || Number(valor) === 0) {
      setErro("Informe um valor válido");
      return;
    }
    if (!descricao.trim()) {
      setErro("Informe uma descrição");
      return;
    }

    setSalvando(true);
    try {
      const res = await fetch("/api/financial/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: tipo,
          category: categoria,
          amount: Number(valor) / 100,
          description: descricao.trim(),
          reference_date: data,
          payment_method: paymentMethod,
          // Campos opcionais de vínculo com usuário e mensalidade
          user_id: usuarioId ?? undefined,
          monthly_fee_id: mensalidadeId ?? undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        setErro(body.error ?? "Erro ao salvar");
        return;
      }

      // Limpa o formulário e fecha
      setTipo("income");
      setCategoria("");
      setValor("");
      setDescricao("");
      setUsuarioId(null);
      setMensalidadeId(null);
      setPaymentMethod("Pix");
      onFechar();
      onSucesso();
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl tracking-wide">
            NOVO LANÇAMENTO
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Tipo: entrada / saída */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => handleTipoChange("income")}
              className={cn(
                "flex-1 py-2.5 text-sm font-medium transition-colors",
                tipo === "income"
                  ? "bg-success text-success-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted",
              )}
            >
              Entrada
            </button>
            <button
              type="button"
              onClick={() => handleTipoChange("expense")}
              className={cn(
                "flex-1 py-2.5 text-sm font-medium transition-colors",
                tipo === "expense"
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted",
              )}
            >
              Saída
            </button>
          </div>

          {/* Categoria */}
          <div className="space-y-1.5">
            <Label htmlFor="categoria">Categoria</Label>
            <Select value={categoria} onValueChange={handleCategoriaChange}>
              <SelectTrigger id="categoria" className={"w-full"}>
                <SelectValue placeholder="Selecione a categoria">
                  {
                    TODAS_CATEGORIAS[tipo].find((c) => c.value === categoria)
                      ?.label
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {TODAS_CATEGORIAS[tipo].map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Atribuir usuário — filtra apenas por elenco+inadimplente quando for mensalidade */}
          <div className="space-y-1.5">
            <Label>Atribuir usuário</Label>
            <DatalistInput
              items={itensParaDatalist}
              value={usuarioId}
              onValueChange={setUsuarioId}
              placeholder={
                categoria === "monthly_fee"
                  ? "Jogador com mensalidade pendente..."
                  : "Selecionar jogador..."
              }
              emptyMessage={
                categoria === "monthly_fee"
                  ? "Nenhum jogador com mensalidade pendente neste mês."
                  : "Nenhum jogador encontrado."
              }
            />
          </div>

          {/* Mês de referência da mensalidade — aparece ao selecionar um usuário na categoria mensalidade */}
          {categoria === "monthly_fee" &&
            usuarioId &&
            feesPendentesDoUsuario.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="mes-referencia">Mês de referência</Label>
                <Select
                  value={mensalidadeId ?? ""}
                  onValueChange={(v) => setMensalidadeId(v || null)}
                >
                  <SelectTrigger id="mes-referencia" className="w-full">
                    <SelectValue placeholder="Selecione o mês que está pagando...">
                      {/* Base UI não espelha ItemText automaticamente — label computado manualmente */}
                      {labelFeeSelecionada}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {feesPendentesDoUsuario.map((fee) => (
                      <SelectItem key={fee.id} value={fee.id}>
                        {MESES[fee.month - 1]} {fee.year} ·{" "}
                        {brl(Number(fee.amount))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

          {/* Valor */}
          <div className="space-y-1.5">
            <Label htmlFor="valor">Valor (R$)</Label>
            <Input
              id="valor"
              type="text"
              inputMode="numeric"
              placeholder="0,00"
              value={formatarValor(valor)}
              onKeyDown={handleValorKeyDown}
              onChange={() => {}}
            />
          </div>

          {/* Forma de pagamento */}
          <div className="space-y-1.5">
            <Label>Forma de pagamento</Label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { valor: "Pix", label: "Pix" },
                  { valor: "Dinheiro", label: "Dinheiro" },
                  { valor: "Cartao", label: "Cartão" },
                ] as const
              ).map(({ valor: v, label }) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setPaymentMethod(v)}
                  className={cn(
                    "rounded-lg border py-2 text-xs font-medium transition-colors",
                    paymentMethod === v
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background hover:bg-muted text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <Label htmlFor="descricao">Descrição</Label>
            <Input
              id="descricao"
              placeholder="Ex: Mensalidade — Diego Andrade"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          {/* Data */}
          <div className="space-y-1.5">
            <Label htmlFor="data-ref">Data de referência</Label>
            <Input
              id="data-ref"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </div>

          {erro && <p className="text-sm text-destructive">{erro}</p>}

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onFechar}
              disabled={salvando}
            >
              Cancelar
            </Button>
            <Button className="flex-1" onClick={salvar} disabled={salvando}>
              {salvando ? "Salvando..." : "Confirmar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── card de caixa total (reutilizado em mobile e desktop) ────────────────────

// Exibe o saldo acumulado do clube com histórico mensal expansível
function CardCaixaTotal({
  carregando,
  caixaTotal,
  historicoMeses,
  ano,
}: {
  carregando: boolean;
  caixaTotal: number;
  historicoMeses: {
    mes: number;
    entradas: number;
    saidas: number;
    saldo: number;
  }[];
  ano: number;
}) {
  const [expandido, setExpandido] = useState(false);

  // Limite inicial de meses visíveis antes de expandir
  const LIMITE_MESES = 4;
  const mesesVisiveis = expandido
    ? historicoMeses
    : historicoMeses.slice(0, LIMITE_MESES);
  const temMaisMeses = historicoMeses.length > LIMITE_MESES;

  return (
    <Card>
      <CardHeader className="pb-2 pt-5 px-5">
        <div className="flex items-center gap-2">
          <Landmark className="size-4 text-muted-foreground" />
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Caixa Total do Clube
          </h2>
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5 space-y-4">
        {carregando ? (
          <div className="space-y-2">
            <div className="h-9 w-36 bg-muted animate-pulse rounded" />
            <div className="h-3 w-28 bg-muted animate-pulse rounded" />
          </div>
        ) : (
          <>
            {/* Valor principal do caixa acumulado */}
            <div>
              <p
                className={cn(
                  "font-heading text-3xl leading-none",
                  caixaTotal >= 0 ? "text-success" : "text-destructive",
                )}
              >
                {brlCompact(caixaTotal)}
              </p>
            </div>

            {/* Histórico mensal com botão para expandir quando houver muitos meses */}
            {historicoMeses.length > 0 && (
              <div className="space-y-2 border-t border-border pt-3">
                {mesesVisiveis.map((m) => (
                  <div
                    key={m.mes}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-muted-foreground">
                      {MESES[m.mes - 1].slice(0, 3)} {ano}
                    </span>
                    <span
                      className={cn(
                        "font-medium tabular-nums",
                        m.saldo >= 0 ? "text-success" : "text-destructive",
                      )}
                    >
                      {brlCompact(m.saldo)}
                    </span>
                  </div>
                ))}

                {/* Botão de expandir/recolher o histórico de meses */}
                {temMaisMeses && (
                  <button
                    type="button"
                    onClick={() => setExpandido((anterior) => !anterior)}
                    className="flex w-full items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors pt-1"
                  >
                    {expandido ? (
                      <>
                        <ChevronUp className="size-3.5" />
                        Ver menos
                      </>
                    ) : (
                      <>
                        <ChevronDown className="size-3.5" />+
                        {historicoMeses.length - LIMITE_MESES} meses
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── dialogo de gerenciamento do elenco mensalista ────────────────────────────

function DialogoGerenciarMensalistas({
  aberto,
  onFechar,
  onSucesso,
  mes,
  ano,
}: {
  aberto: boolean;
  onFechar: () => void;
  onSucesso: () => void;
  mes: number;
  ano: number;
}) {
  const [usuarios, setUsuarios] = useState<UsuarioParaRoster[]>([]);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [valorMensalidade, setValorMensalidade] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  // Carrega usuários ativos e o elenco já cadastrado para o mês ao abrir o modal
  useEffect(() => {
    if (!aberto) return;
    setCarregando(true);
    setErro("");

    fetch(`/api/monthly-roster/manage?month=${mes}&year=${ano}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((dados: { monthly_fee: number; users: UsuarioParaRoster[] }) => {
        setValorMensalidade(Number(dados.monthly_fee));
        setUsuarios(dados.users);

        // Pré-seleciona quem já está no elenco do mês
        const jaNoElenco = new Set<string>(
          dados.users.filter((u) => u.in_roster).map((u) => u.id),
        );
        setSelecionados(jaNoElenco);
      })
      .catch(() => setErro("Erro ao carregar dados. Tente novamente."))
      .finally(() => setCarregando(false));
  }, [aberto, mes, ano]);

  // Exclui goleiros — eles não participam do plano mensal
  const jogadores = usuarios.filter((u) => !u.is_goalkeeper);

  // Conta quantos jogadores estão selecionados para aplicar o limite de 20
  const totalSelecionados = jogadores.filter((u) =>
    selecionados.has(u.id),
  ).length;

  // Alterna a seleção de um jogador respeitando o limite de 20
  function alternarSelecao(usuarioId: string) {
    setSelecionados((anterior) => {
      const novo = new Set(anterior);
      if (novo.has(usuarioId)) {
        novo.delete(usuarioId);
      } else {
        if (totalSelecionados >= 20) return anterior;
        novo.add(usuarioId);
      }
      return novo;
    });
  }

  // Envia a lista final para a API que sincroniza o elenco e as mensalidades
  async function salvar() {
    setErro("");
    setSalvando(true);
    try {
      const resposta = await fetch("/api/monthly-roster/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_ids: Array.from(selecionados),
          month: mes,
          year: ano,
        }),
      });

      if (!resposta.ok) {
        const corpo = await resposta.json();
        setErro(corpo.error ?? "Erro ao salvar");
        return;
      }

      onFechar();
      onSucesso();
    } catch {
      setErro("Erro de conexão. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(aberto) => !aberto && onFechar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl tracking-wide">
            MENSALISTAS · {MESES[mes - 1].toUpperCase()} {ano}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Contador de vagas e valor da mensalidade */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Limite:{" "}
              <span
                className={cn(
                  "font-medium",
                  totalSelecionados >= 20
                    ? "text-destructive"
                    : "text-foreground",
                )}
              >
                {totalSelecionados}/20
              </span>{" "}
              jogadores
            </span>
            <span className="text-muted-foreground font-medium">
              {brl(valorMensalidade)}/mês
            </span>
          </div>

          {/* Lista de jogadores com checkboxes */}
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="max-h-[50vh] overflow-y-auto">
              {carregando ? (
                // Skeleton enquanto carrega
                <div className="p-4 space-y-3">
                  {Array.from({ length: 6 }).map((_, indice) => (
                    <div key={indice} className="flex items-center gap-3">
                      <div className="size-4 rounded bg-muted animate-pulse shrink-0" />
                      <div className="flex-1 space-y-1">
                        <div className="h-3.5 w-32 bg-muted animate-pulse rounded" />
                        <div className="h-3 w-20 bg-muted animate-pulse rounded" />
                      </div>
                      <div className="h-3.5 w-16 bg-muted animate-pulse rounded" />
                    </div>
                  ))}
                </div>
              ) : jogadores.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  Nenhum jogador ativo encontrado.
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {jogadores.map((usuario) => {
                    const estaSelecionado = selecionados.has(usuario.id);
                    // Bloqueia a seleção quando o limite de 20 é atingido
                    const estaBloqueado =
                      !estaSelecionado && totalSelecionados >= 20;

                    return (
                      <label
                        key={usuario.id}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 transition-colors select-none",
                          estaBloqueado
                            ? "opacity-40 cursor-not-allowed"
                            : "cursor-pointer",
                          estaSelecionado
                            ? "bg-primary/5"
                            : "hover:bg-muted/50",
                        )}
                      >
                        <Checkbox
                          checked={estaSelecionado}
                          onCheckedChange={() =>
                            !estaBloqueado && alternarSelecao(usuario.id)
                          }
                          disabled={estaBloqueado}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground leading-none">
                            {usuario.name}
                          </p>
                          {usuario.nickname && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {usuario.nickname}
                            </p>
                          )}
                        </div>
                        {/* Posição e valor da mensalidade */}
                        <div className="text-right shrink-0">
                          <p className="text-xs text-muted-foreground">
                            {usuario.position ?? "—"}
                          </p>
                          <p className="text-xs font-medium text-foreground">
                            {brl(valorMensalidade)}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {erro && <p className="text-sm text-destructive">{erro}</p>}

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onFechar}
              disabled={salvando}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
              onClick={salvar}
              disabled={salvando || carregando}
            >
              {salvando ? "Salvando..." : "Confirmar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── página principal ──────────────────────────────────────────────────────────

export default function FinanceiroPage() {
  const agora = new Date();
  const [mes, setMes] = useState(agora.getMonth() + 1);
  const [ano, setAno] = useState(agora.getFullYear());
  const [dia, setDia] = useState(agora.getDate());
  const [abaAtiva, setAbaAtiva] = useState("overview");
  const [dialogoAberto, setDialogoAberto] = useState(false);
  const [dialogoMensalistasAberto, setDialogoMensalistasAberto] =
    useState(false);

  const [resumoAno, setResumoAno] = useState<ResumoAno | null>(null);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [mensalidades, setMensalidades] = useState<Mensalidade[]>([]);
  const [vendas, setVendas] = useState<VendaCamisa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [sessao, setSessao] = useState<SessaoUsuario>(null);

  const buscarDados = useCallback(async () => {
    setCarregando(true);
    try {
      const [resResumo, resTransacoes, resMensalidades, resVendas, resSessao] =
        await Promise.all([
          fetch(`/api/financial/summary?year=${ano}`),
          fetch(`/api/financial/transactions?month=${mes}&year=${ano}`),
          fetch(`/api/financial/monthly-fees?month=${mes}&year=${ano}`),
          fetch(`/api/financial/jersey-sales`),
          fetch(`/api/auth/me`),
        ]);

      if (resSessao.ok) {
        const dados = await resSessao.json();
        setSessao(dados?.id ? dados : null);
      }

      if (resResumo.ok) setResumoAno(await resResumo.json());
      if (resTransacoes.ok) setTransacoes(await resTransacoes.json());
      if (resMensalidades.ok) setMensalidades(await resMensalidades.json());
      if (resVendas.ok) setVendas(await resVendas.json());
    } finally {
      setCarregando(false);
    }
  }, [mes, ano]);

  useEffect(() => {
    buscarDados();
  }, [buscarDados]);

  function mesAnterior() {
    if (mes === 1) {
      setMes(12);
      setAno((a) => a - 1);
    } else setMes((m) => m - 1);
  }
  function proximoMes() {
    if (mes === 12) {
      setMes(1);
      setAno((a) => a + 1);
    } else setMes((m) => m + 1);
  }

  // ── dados computados ─────────────────────────────────────────────────────────

  const dadosMes = resumoAno?.evolucaoMensal?.find((m) => m.mes === mes);
  const receitasMes = dadosMes?.entradas ?? 0;
  const despesasMes = dadosMes?.saidas ?? 0;
  const saldoMes = receitasMes - despesasMes;

  const aReceber = mensalidades
    .filter((m) => m.status === "pending" || m.status === "late")
    .reduce((s, m) => s + Number(m.amount), 0);

  // Saldo histórico total do clube (todos os anos, sem restrição)
  const caixaTotal = resumoAno?.saldoGlobal ?? 0;

  // Todos os meses do ano com movimentação, em ordem cronológica
  const historicoMeses = (resumoAno?.evolucaoMensal ?? []).filter(
    (m) => m.entradas > 0 || m.saidas > 0,
  );

  const ehAdmin = sessao?.role === "admin" || sessao?.role === "co_admin";

  // Categorias de receita e despesa do mês (a partir das transações)
  const receitasPorCat = transacoes
    .filter((t) => t.type === "income")
    .reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] ?? 0) + Number(t.amount);
      return acc;
    }, {});

  const despesasPorCat = transacoes
    .filter((t) => t.type === "expense")
    .reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] ?? 0) + Number(t.amount);
      return acc;
    }, {});

  const maxReceita = Math.max(...Object.values(receitasPorCat), 0);
  const maxDespesa = Math.max(...Object.values(despesasPorCat), 0);

  const labelMes = `${MESES[mes - 1]} ${ano}`;
  const transacoesRecentes = [...transacoes].slice(0, 6);

  async function marcarPago(id: string) {
    const res = await fetch(`/api/financial/monthly-fees/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "paid" }),
    });
    if (res.ok) {
      setMensalidades((prev) =>
        prev.map((m) =>
          m.id === id
            ? { ...m, status: "paid", paid_at: new Date().toISOString() }
            : m,
        ),
      );
    }
  }

  // ── render ────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Conteúdo */}
      <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
        <Tabs value={abaAtiva} onValueChange={setAbaAtiva}>
          {/* Header: tabs em cima + seletor de mês em baixo no mobile; lado a lado no desktop */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
            <div className="overflow-x-auto pb-0.5">
              <TabsList>
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="fees">Mensalidades</TabsTrigger>
                <TabsTrigger value="transactions">Transações</TabsTrigger>
                {/* <TabsTrigger value="jerseys">Camisas</TabsTrigger> */}
              </TabsList>
            </div>

            <div className="flex items-center justify-between md:justify-end gap-2 md:gap-3">
              {/* Seletor de mês */}
              <div className="flex items-center rounded-lg border border-border overflow-hidden bg-white">
                <button
                  onClick={mesAnterior}
                  className="px-2.5 py-2 hover:bg-muted transition-colors bg-white"
                  aria-label="Mês anterior"
                >
                  <ChevronLeft className="size-4 text-foreground" />
                </button>
                <span className="px-3 text-sm font-medium text-foreground whitespace-nowrap min-w-[110px] text-center">
                  {labelMes}
                </span>
                <button
                  onClick={proximoMes}
                  className="px-2.5 py-2 hover:bg-muted transition-colors bg-white"
                  aria-label="Próximo mês"
                >
                  <ChevronRight className="size-4 text-foreground " />
                </button>
              </div>

              {/* Botão lançar — visível apenas para admin e co_admin */}
              {ehAdmin && (
                <Button
                  onClick={() => setDialogoAberto(true)}
                  className="gap-1.5"
                  size="sm"
                >
                  <Plus className="size-3.5" />
                  <span className="inline">Lançar</span>
                </Button>
              )}
            </div>
          </div>

          {/* ── aba: visão geral ─────────────────────────────────────────────── */}
          <TabsContent value="overview" className="space-y-6">
            {/* Card de caixa total visível apenas no mobile, acima dos cartões de resumo */}
            <div className="lg:hidden">
              <CardCaixaTotal
                carregando={carregando}
                caixaTotal={caixaTotal}
                historicoMeses={historicoMeses}
                ano={ano}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
              {/* Coluna principal */}
              <div className="space-y-6">
                {/* Cards de resumo */}
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                  <CartaoResumo
                    titulo="Receitas no mês"
                    valor={receitasMes}
                    variante="receita"
                    carregando={carregando}
                  />
                  <CartaoResumo
                    titulo="Despesas no mês"
                    valor={despesasMes}
                    variante="despesa"
                    carregando={carregando}
                  />
                  <CartaoResumo
                    titulo="Saldo do mês"
                    valor={saldoMes}
                    variante="saldo"
                    carregando={carregando}
                  />
                  <CartaoResumo
                    titulo="Mensalidades a receber"
                    valor={aReceber}
                    variante="receber"
                    carregando={carregando}
                  />
                </div>

                {/* Receitas e despesas por categoria */}
                <Card>
                  <CardHeader className="pb-2 pt-5 px-5">
                    <div className="flex items-center gap-2">
                      <Receipt className="size-4 text-muted-foreground" />
                      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Receitas por Categoria · {labelMes}
                      </h2>
                    </div>
                  </CardHeader>
                  <CardContent className="px-5 pb-5 space-y-3">
                    {carregando ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="space-y-1.5">
                          <div className="flex justify-between">
                            <div className="h-3.5 w-32 bg-muted animate-pulse rounded" />
                            <div className="h-3.5 w-16 bg-muted animate-pulse rounded" />
                          </div>
                          <div className="h-1.5 w-full bg-muted animate-pulse rounded" />
                        </div>
                      ))
                    ) : Object.keys(receitasPorCat).length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">
                        Nenhuma receita lançada neste mês.
                      </p>
                    ) : (
                      Object.entries(receitasPorCat).map(([cat, total]) => {
                        const info = CATEGORIAS_RECEITA[cat] ?? {
                          label: cat,
                          cor: "bg-muted-foreground",
                        };
                        return (
                          <BarraCategoria
                            key={cat}
                            label={info.label}
                            valor={total}
                            max={maxReceita}
                            cor={info.cor}
                            tipo="income"
                          />
                        );
                      })
                    )}

                    {/* Despesas */}
                    {(carregando || Object.keys(despesasPorCat).length > 0) && (
                      <>
                        <div className="pt-2 pb-1">
                          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                            Despesas
                          </p>
                        </div>
                        {carregando
                          ? Array.from({ length: 2 }).map((_, i) => (
                              <div key={i} className="space-y-1.5">
                                <div className="flex justify-between">
                                  <div className="h-3.5 w-32 bg-muted animate-pulse rounded" />
                                  <div className="h-3.5 w-16 bg-muted animate-pulse rounded" />
                                </div>
                                <div className="h-1.5 w-full bg-muted animate-pulse rounded" />
                              </div>
                            ))
                          : Object.entries(despesasPorCat).map(
                              ([cat, total]) => {
                                const info = CATEGORIAS_DESPESA[cat] ?? {
                                  label: cat,
                                  cor: "bg-destructive",
                                };
                                return (
                                  <BarraCategoria
                                    key={cat}
                                    label={info.label}
                                    valor={total}
                                    max={maxDespesa}
                                    cor={info.cor}
                                    tipo="expense"
                                  />
                                );
                              },
                            )}
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Transações recentes */}
                <Card>
                  <CardHeader className="pb-2 pt-5 px-5">
                    <div className="flex items-center gap-2">
                      <Receipt className="size-4 text-muted-foreground" />
                      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Transações Recentes
                      </h2>
                    </div>
                  </CardHeader>
                  <CardContent className="px-5 pb-3 divide-y divide-border">
                    {carregando ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 py-3">
                          <div className="size-9 rounded-lg bg-muted animate-pulse shrink-0" />
                          <div className="flex-1 space-y-1.5">
                            <div className="h-3.5 w-40 bg-muted animate-pulse rounded" />
                            <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                          </div>
                          <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                        </div>
                      ))
                    ) : transacoesRecentes.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-6 text-center">
                        Nenhuma transação neste mês.
                      </p>
                    ) : (
                      transacoesRecentes.map((t) => (
                        <ItemTransacao key={t.id} transacao={t} />
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Coluna lateral — visível apenas no desktop (lg+) */}
              <div className="hidden lg:block space-y-4">
                <CardCaixaTotal
                  carregando={carregando}
                  caixaTotal={caixaTotal}
                  historicoMeses={historicoMeses}
                  ano={ano}
                />
              </div>
            </div>
          </TabsContent>

          {/* ── aba: mensalidades ────────────────────────────────────────────── */}
          <TabsContent value="fees">
            <Button
              className="gap-1.5 sm:w-45 w-full mb-3"
              size="sm"
              onClick={() => setDialogoMensalistasAberto(true)}
            >
              <Users className="size-3.5" />
              <span className="inline">Gerenciar Mensalistas</span>
            </Button>
            <Card>
              <CardContent className="p-0">
                {carregando ? (
                  <div className="p-6 space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between"
                      >
                        <div className="h-4 w-40 bg-muted animate-pulse rounded" />
                        <div className="h-6 w-20 bg-muted animate-pulse rounded" />
                      </div>
                    ))}
                  </div>
                ) : mensalidades.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground text-sm">
                    Nenhuma mensalidade registrada em {labelMes}.
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {mensalidades.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between px-5 py-3.5 gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground leading-none truncate">
                            {m.users.nickname ?? m.users.name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {MESES[m.month - 1]} {m.year} ·{" "}
                            {brl(Number(m.amount))}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <BadgeStatusMensalidade status={m.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── aba: transações ──────────────────────────────────────────────── */}
          <TabsContent value="transactions">
            <Card>
              <CardContent className="p-0">
                {carregando ? (
                  <div className="p-6 space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="size-9 rounded-lg bg-muted animate-pulse shrink-0" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3.5 w-40 bg-muted animate-pulse rounded" />
                          <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                        </div>
                        <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                      </div>
                    ))}
                  </div>
                ) : transacoes.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground text-sm">
                    Nenhuma transação em {labelMes}.
                  </div>
                ) : (
                  <div className="divide-y divide-border px-5">
                    {transacoes.map((t) => (
                      <ItemTransacao key={t.id} transacao={t} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── aba: camisas ─────────────────────────────────────────────────── */}
          <TabsContent value="jerseys">
            <Card>
              <CardContent className="p-0">
                {carregando ? (
                  <div className="p-6 space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between"
                      >
                        <div className="h-4 w-40 bg-muted animate-pulse rounded" />
                        <div className="h-6 w-20 bg-muted animate-pulse rounded" />
                      </div>
                    ))}
                  </div>
                ) : vendas.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground text-sm">
                    Nenhuma venda de camisa registrada.
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {vendas.map((v) => {
                      const nome =
                        v.users?.nickname ??
                        v.users?.name ??
                        v.guest_players?.name ??
                        "—";
                      return (
                        <div
                          key={v.id}
                          className="flex items-center justify-between px-5 py-3.5 gap-3"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground leading-none truncate">
                              {nome}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatarData(v.created_at)} ·{" "}
                              {brl(Number(v.amount))}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                                v.payment_status === "paid"
                                  ? "bg-success/15 text-success"
                                  : "bg-warning/15 text-warning",
                              )}
                            >
                              {v.payment_status === "paid"
                                ? "Pago"
                                : "Pendente"}
                            </span>
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                                v.jersey_status === "delivered"
                                  ? "bg-info/15 text-info"
                                  : "bg-muted text-muted-foreground",
                              )}
                            >
                              {v.jersey_status === "delivered"
                                ? "Entregue"
                                : "Pendente"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Dialogo de novo lançamento */}
      <DialogoNovoLancamento
        aberto={dialogoAberto}
        onFechar={() => setDialogoAberto(false)}
        onSucesso={buscarDados}
        mes={mes}
        ano={ano}
        dia={dia}
      />

      {/* Dialogo de gerenciamento do elenco mensalista */}
      <DialogoGerenciarMensalistas
        aberto={dialogoMensalistasAberto}
        onFechar={() => setDialogoMensalistasAberto(false)}
        onSucesso={buscarDados}
        mes={mes}
        ano={ano}
      />
    </>
  );
}
