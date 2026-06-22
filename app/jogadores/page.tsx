"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  UserPlus,
  MoreHorizontal,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Users,
  Plus,
  Minus,
  Trash2,
  Pencil,
  X,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

// ─── tipos ────────────────────────────────────────────────────────────────────

type StatusMensalidade = "pending" | "paid" | "late" | "cancelled";

type Jogador = {
  id: string;
  name: string;
  nickname: string | null;
  photo_url: string | null;
  phone: string | null;
  position: string | null;
  is_goalkeeper: boolean;
  is_active: boolean;
  role: string;
  player_ratings: { overall: number | null } | null;
  monthly_fees: { status: StatusMensalidade }[];
  monthly_roster: { status: string }[];
};

type RespostaApi = {
  data: Jogador[];
  total: number;
  page: number;
  pageSize: number;
};

type SessaoUsuario = {
  id: string;
  name: string;
  role: string;
} | null;

type FiltroTab = "todos" | "ativos" | "inadimplente" | "gk" | "suspensos";

// Dados de um jogador avulso/genérico (guest_player) retornado pela API
type JogadorAvulso = {
  id: string;
  name: string;
  phone: string | null;
  position: string | null;
  is_goalkeeper: boolean;
  overall: number;
  linked_user_id: string | null;
  created_at: string;
};

// Posições disponíveis para o seletor de posição do avulso
type PosicaoAvulso = "GK" | "DEF" | "MEI" | "ATA";

const POSICOES_AVULSO: {
  valor: PosicaoAvulso;
  label: string;
  sublabel: string;
}[] = [
  { valor: "GK", label: "GK", sublabel: "Goleiro" },
  { valor: "DEF", label: "DEF", sublabel: "Defensor" },
  { valor: "MEI", label: "MEI", sublabel: "Meia" },
  { valor: "ATA", label: "ATA", sublabel: "Atacante" },
];

// Estado do formulário de criação/edição de jogador avulso
type FormularioAvulso = {
  name: string;
  phone: string;
  posicao: PosicaoAvulso | null;
  overall: number;
};

const FORMULARIO_AVULSO_VAZIO: FormularioAvulso = {
  name: "",
  phone: "",
  posicao: null,
  overall: 5,
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function construirParams(
  filtro: FiltroTab,
  busca: string,
  pagina: number,
): string {
  const params = new URLSearchParams();
  params.set("page", pagina.toString());
  if (busca) params.set("search", busca);

  // "Ativos" não envia parâmetro extra: a API já filtra por is_active = true
  // por padrão quando includeInactive não é informado.
  if (filtro === "todos") params.set("includeInactive", "true");
  if (filtro === "inadimplente") params.set("filter", "inadimplente");
  if (filtro === "gk") params.set("is_goalkeeper", "true");

  return params.toString();
}

// ─── sub-componentes ─────────────────────────────────────────────────────────

function BadgePosicao({
  position,
  isGoalkeeper,
}: {
  position: string | null;
  isGoalkeeper: boolean;
}) {
  const label = isGoalkeeper ? "GK" : (position ?? "—");

  const estilos: Record<string, string> = {
    GK: "bg-muted text-foreground border border-border",
    ATA: "bg-destructive/15 text-destructive",
    DEF: "bg-primary/10 text-primary",
    MEI: "bg-info/15 text-info",
  };

  const estilo = estilos[label] ?? "bg-muted text-muted-foreground";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold",
        estilo,
      )}
    >
      {label}
    </span>
  );
}

function BadgeMensalidade({ jogador }: { jogador: Jogador }) {
  const noRoster = jogador.monthly_roster?.[0]?.status !== "active";

  if (jogador.is_goalkeeper || noRoster) {
    return (
      <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
        Isento
      </span>
    );
  }

  const taxa = jogador.monthly_fees?.[0];

  if (taxa?.status === "paid") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-medium text-success">
        <CheckCircle2 className="size-3" />
        Pago
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-2.5 py-0.5 text-xs font-medium text-destructive">
      <AlertCircle className="size-3" />
      Pendente
    </span>
  );
}

function ColunaAvaliacao({
  rating,
}: {
  rating: { overall: number | null } | null;
}) {
  // Converte a escala 1–10 para exibição 10–100
  const overall = rating?.overall ?? 5;
  const displayValue = overall;

  return (
    <div className="flex items-center gap-2 min-w-27.5">
      <span className="font-heading text-base text-foreground w-8 shrink-0 leading-none">
        {displayValue}
      </span>
      <Progress value={displayValue * 10} className="h-1.5 flex-1" />
    </div>
  );
}

function Paginacao({
  pagina,
  total,
  pageSize,
  onMudar,
}: {
  pagina: number;
  total: number;
  pageSize: number;
  onMudar: (p: number) => void;
}) {
  const totalPaginas = Math.ceil(total / pageSize);
  if (totalPaginas <= 1) return null;

  const inicio = (pagina - 1) * pageSize + 1;
  const fim = Math.min(pagina * pageSize, total);

  return (
    <div className="flex items-center justify-between px-2 py-4">
      <span className="text-xs text-muted-foreground">
        {inicio}–{fim} de {total} jogadores
      </span>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          disabled={pagina <= 1}
          onClick={() => onMudar(pagina - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft className="size-4" />
        </Button>

        {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((p) => (
          <Button
            key={p}
            variant={p === pagina ? "default" : "outline"}
            size="icon"
            className="size-8 text-xs"
            onClick={() => onMudar(p)}
            aria-label={`Página ${p}`}
          >
            {p}
          </Button>
        ))}

        <Button
          variant="outline"
          size="icon"
          className="size-8"
          disabled={pagina >= totalPaginas}
          onClick={() => onMudar(pagina + 1)}
          aria-label="Próxima página"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── modal de jogadores genéricos ────────────────────────────────────────────

// Gera as iniciais a partir do nome completo (até 2 palavras)
function gerarIniciais(nomeCompleto: string): string {
  return nomeCompleto
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((palavra) => palavra[0])
    .join("")
    .toUpperCase();
}

// Aplica máscara de telefone no formato (11) 9 1111-4444
function aplicarMascaraTelefone(valor: string): string {
  const digitos = valor.replace(/\D/g, "").slice(0, 11);
  if (digitos.length === 0) return "";
  if (digitos.length <= 2) return `(${digitos}`;
  if (digitos.length === 3)
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  if (digitos.length <= 7)
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 3)} ${digitos.slice(3)}`;
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 3)} ${digitos.slice(3, 7)}-${digitos.slice(7)}`;
}

// Stepper numérico com botões de incremento e decremento
function NumericStepperAvulso({
  valor,
  aoMudar,
  min = 1,
  max = 10,
}: {
  valor: number;
  aoMudar: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex flex-col items-center border border-border rounded-xl overflow-hidden w-full">
      <button
        type="button"
        onClick={() => aoMudar(Math.min(max, valor + 1))}
        className="w-full flex items-center justify-center py-1.5 hover:bg-muted transition-colors text-muted-foreground"
        aria-label="Aumentar"
      >
        <Plus className="size-3" />
      </button>
      <div className="py-2.5 font-heading text-xl text-foreground border-y border-border w-full text-center select-none">
        {valor}
      </div>
      <button
        type="button"
        onClick={() => aoMudar(Math.max(min, valor - 1))}
        className="w-full flex items-center justify-center py-1.5 hover:bg-muted transition-colors text-muted-foreground"
        aria-label="Diminuir"
      >
        <Minus className="size-3" />
      </button>
    </div>
  );
}

// Modal de listagem, criação e edição de jogadores genéricos (guest_players)
function ModalJogadoresGenericos({
  aberto,
  onFechar,
}: {
  aberto: boolean;
  onFechar: () => void;
}) {
  const [listaAvulsos, setListaAvulsos] = useState<JogadorAvulso[]>([]);
  const [carregandoLista, setCarregandoLista] = useState(false);
  // "lista" exibe todos os avulsos; "form" exibe o formulário de criação/edição
  const [modoExibicao, setModoExibicao] = useState<"lista" | "form">("lista");
  const [idEditando, setIdEditando] = useState<string | null>(null);
  const [formulario, setFormulario] = useState<FormularioAvulso>(
    FORMULARIO_AVULSO_VAZIO,
  );
  const [salvando, setSalvando] = useState(false);
  const [idDeletando, setIdDeletando] = useState<string | null>(null);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  // Busca todos os jogadores avulsos cadastrados na API
  const carregarAvulsos = useCallback(async () => {
    setCarregandoLista(true);
    try {
      const resposta = await fetch("/api/guest-players");
      if (resposta.ok) setListaAvulsos(await resposta.json());
    } finally {
      setCarregandoLista(false);
    }
  }, []);

  // Recarrega a lista e volta ao modo lista sempre que o modal abre
  useEffect(() => {
    if (aberto) {
      carregarAvulsos();
      setModoExibicao("lista");
      setMensagemErro(null);
    }
  }, [aberto, carregarAvulsos]);

  // Abre o formulário em branco para criação de novo avulso
  function abrirFormularioNovo() {
    setFormulario(FORMULARIO_AVULSO_VAZIO);
    setIdEditando(null);
    setMensagemErro(null);
    setModoExibicao("form");
  }

  // Preenche o formulário com os dados do avulso selecionado para edição
  function abrirFormularioEdicao(avulso: JogadorAvulso) {
    // Determina a posição selecionada: GK se goleiro, ou a abreviação da posição
    const posicaoAtual: PosicaoAvulso | null = avulso.is_goalkeeper
      ? "GK"
      : ((avulso.position as PosicaoAvulso) ?? null);

    setFormulario({
      name: avulso.name,
      // Aplica a máscara ao carregar, pois o banco armazena apenas os dígitos
      phone: avulso.phone ? aplicarMascaraTelefone(avulso.phone) : "",
      posicao: posicaoAtual,
      overall: avulso.overall,
    });
    setIdEditando(avulso.id);
    setMensagemErro(null);
    setModoExibicao("form");
  }

  // Volta para a lista sem salvar
  function voltarParaLista() {
    setModoExibicao("lista");
    setMensagemErro(null);
  }

  // Salva o avulso via POST (novo) ou PATCH (edição) e retorna à lista
  async function salvarAvulso() {
    if (!formulario.name.trim()) {
      setMensagemErro("Nome é obrigatório.");
      return;
    }
    setSalvando(true);
    setMensagemErro(null);
    try {
      const ehGoleiro = formulario.posicao === "GK";
      const dadosParaEnvio = {
        name: formulario.name.trim(),
        // Remove a máscara antes de enviar — o banco armazena apenas dígitos
        phone: formulario.phone.replace(/\D/g, "") || null,
        position: ehGoleiro ? null : (formulario.posicao ?? null),
        is_goalkeeper: ehGoleiro,
        overall: formulario.overall,
      };

      const url = idEditando
        ? `/api/guest-players/${idEditando}`
        : "/api/guest-players";

      const resposta = await fetch(url, {
        method: idEditando ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dadosParaEnvio),
      });

      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => ({}));
        setMensagemErro(
          (corpo as { error?: string }).error ?? "Erro ao salvar.",
        );
        return;
      }

      await carregarAvulsos();
      voltarParaLista();
    } finally {
      setSalvando(false);
    }
  }

  // Remove permanentemente o avulso após confirmação do usuário
  async function deletarAvulso(id: string) {
    if (!confirm("Tem certeza que deseja remover este jogador genérico?"))
      return;
    setIdDeletando(id);
    try {
      await fetch(`/api/guest-players/${id}`, { method: "DELETE" });
      setListaAvulsos((anterior) => anterior.filter((a) => a.id !== id));
    } finally {
      setIdDeletando(null);
    }
  }

  return (
    <Dialog
      open={aberto}
      onOpenChange={(estaAberto) => {
        if (!estaAberto) onFechar();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-lg max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden"
      >
        {/* Cabeçalho com navegação e botão fechar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            {modoExibicao === "form" && (
              <button
                onClick={voltarParaLista}
                className="text-muted-foreground hover:text-foreground transition-colors -ml-0.5"
              >
                <ArrowLeft className="size-4" />
              </button>
            )}
            <DialogTitle>
              {modoExibicao === "lista"
                ? "Jogadores Genéricos"
                : idEditando
                  ? "Editar Jogador"
                  : "Novo Jogador"}
            </DialogTitle>
          </div>
          <DialogClose className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-sm">
            <X className="size-4" />
          </DialogClose>
        </div>

        {modoExibicao === "lista" ? (
          <>
            {/* Lista scrollável de avulsos cadastrados */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {carregandoLista ? (
                // Skeletons de carregamento
                <div className="p-4 space-y-2">
                  {[...Array(4)].map((_, indice) => (
                    <div
                      key={indice}
                      className="h-14 rounded-lg bg-muted animate-pulse"
                    />
                  ))}
                </div>
              ) : listaAvulsos.length === 0 ? (
                // Estado vazio
                <div className="flex flex-col items-center justify-center py-14 gap-2 text-muted-foreground">
                  <Users className="size-8 opacity-30" />
                  <p className="text-sm">Nenhum jogador genérico cadastrado.</p>
                </div>
              ) : (
                // Linha de cada avulso com ações de editar e remover
                <div className="divide-y divide-border">
                  {listaAvulsos.map((avulso) => (
                    <div
                      key={avulso.id}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      {/* Avatar com iniciais */}
                      <div className="size-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <span className="text-xs font-medium text-muted-foreground">
                          {gerarIniciais(avulso.name)}
                        </span>
                      </div>

                      {/* Nome e posição/overall */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {avulso.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {avulso.is_goalkeeper
                            ? "Goleiro"
                            : (avulso.position ?? "Sem posição")}
                          {" · "}OVR {avulso.overall}
                        </p>
                      </div>

                      {/* Botões de ação */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => abrirFormularioEdicao(avulso)}
                          className="size-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title="Editar"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                        {/* <button
                          onClick={() => deletarAvulso(avulso.id)}
                          disabled={idDeletando === avulso.id}
                          className="size-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-40"
                          title="Remover"
                        >
                          <Trash2 className="size-3.5" />
                        </button> */}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Rodapé com botão de adicionar novo avulso */}
            <div className="shrink-0 flex justify-end px-4 py-3 border-t border-border bg-muted/30">
              <Button size="sm" onClick={abrirFormularioNovo}>
                <Plus className="size-3.5 mr-1.5" />
                Novo Jogador
              </Button>
            </div>
          </>
        ) : (
          <>
            {/* Formulário scrollável de criação/edição */}
            <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4">
              {/* Campo: Nome */}
              <div className="space-y-1.5">
                <Label htmlFor="avulso-nome">Nome *</Label>
                <Input
                  id="avulso-nome"
                  value={formulario.name}
                  onChange={(e) =>
                    setFormulario((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="Nome do jogador"
                  className="bg-white"
                />
              </div>

              {/* Campo: Telefone com máscara (11) 9 1111-4444 */}
              <div className="space-y-1.5">
                <Label htmlFor="avulso-telefone">Telefone</Label>
                <Input
                  id="avulso-telefone"
                  type="tel"
                  value={formulario.phone}
                  onChange={(e) =>
                    setFormulario((f) => ({
                      ...f,
                      phone: aplicarMascaraTelefone(e.target.value),
                    }))
                  }
                  placeholder="(11) 9 ____-____"
                  className="bg-white"
                />
              </div>

              {/* Seletor de posição: 4 botões idênticos à tela de novo jogador */}
              <div className="space-y-1.5">
                <Label>Posição</Label>
                <div className="grid grid-cols-4 gap-2">
                  {POSICOES_AVULSO.map(({ valor, label, sublabel }) => {
                    const selecionado = formulario.posicao === valor;
                    return (
                      <button
                        key={valor}
                        type="button"
                        onClick={() =>
                          setFormulario((f) => ({ ...f, posicao: valor }))
                        }
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
                            "text-[10px]",
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

              {/* Overall com stepper numérico (escala 1–10) */}
              <div className="space-y-1.5">
                <Label>Overall</Label>
                <p className="text-xs text-muted-foreground -mt-0.5">
                  Escala de 1 a 10
                </p>
                <div className="flex items-center gap-4">
                  <div className="w-24">
                    <NumericStepperAvulso
                      valor={formulario.overall}
                      aoMudar={(v) =>
                        setFormulario((f) => ({ ...f, overall: v }))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Mensagem de erro de validação ou da API */}
              {mensagemErro && (
                <p className="text-sm text-destructive">{mensagemErro}</p>
              )}
            </div>

            {/* Rodapé com ações de cancelar e salvar */}
            <div className="shrink-0 flex justify-end gap-2 px-4 py-3 border-t border-border bg-muted/30">
              <Button variant="outline" size="sm" onClick={voltarParaLista}>
                Cancelar
              </Button>
              <Button size="sm" onClick={salvarAvulso} disabled={salvando}>
                {salvando ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── página ───────────────────────────────────────────────────────────────────

const TABS: { label: string; value: FiltroTab }[] = [
  { label: "Todos", value: "todos" },
  { label: "Ativos", value: "ativos" },
  { label: "Inadimplentes", value: "inadimplente" },
  { label: "GK", value: "gk" },
];

export default function ElencoPage() {
  const router = useRouter();
  const [filtro, setFiltro] = useState<FiltroTab>("todos");
  const [busca, setBusca] = useState("");
  const [buscaDebounced, setBuscaDebounced] = useState("");
  const [pagina, setPagina] = useState(1);
  const [jogadores, setJogadores] = useState<Jogador[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [carregando, setCarregando] = useState(true);
  const [contadorInadimplentes, setContadorInadimplentes] = useState(0);
  const [sessao, setSessao] = useState<SessaoUsuario>(null);
  const [suspendendo, setSuspendendo] = useState<string | null>(null);
  // Controla a abertura do modal de jogadores genéricos
  const [modalAvulsosAberto, setModalAvulsosAberto] = useState(false);

  // Debounce da busca — evita chamadas a cada tecla
  useEffect(() => {
    const t = setTimeout(() => {
      setBuscaDebounced(busca);
      setPagina(1);
    }, 300);
    return () => clearTimeout(t);
  }, [busca]);

  // Busca o total de inadimplentes uma vez ao carregar
  useEffect(() => {
    fetch("/api/users?filter=inadimplente&page=1")
      .then((r) => r.json())
      .then((d: RespostaApi) => setContadorInadimplentes(d.total))
      .catch(() => setContadorInadimplentes(0));
  }, []);

  const buscarJogadores = useCallback(async () => {
    // "Suspensos" não tem suporte no banco; exibe tabela vazia
    if (filtro === "suspensos") {
      setJogadores([]);
      setTotal(0);
      setCarregando(false);
      return;
    }

    setCarregando(true);
    try {
      const params = construirParams(filtro, buscaDebounced, pagina);
      const [resSessao, res] = await Promise.all([
        fetch("/api/auth/me"),
        fetch(`/api/users?${params}`),
      ]);
      if (!res.ok) throw new Error("Erro ao buscar jogadores");
      const [dadosSessao, dados]: [SessaoUsuario, RespostaApi] =
        await Promise.all([resSessao.json(), res.json()]);
      setSessao(dadosSessao?.id ? dadosSessao : null);
      setJogadores(dados.data);
      setTotal(dados.total);
      setPageSize(dados.pageSize);
    } catch {
      setJogadores([]);
      setTotal(0);
    } finally {
      setCarregando(false);
    }
  }, [filtro, buscaDebounced, pagina]);

  useEffect(() => {
    buscarJogadores();
  }, [buscarJogadores]);

  function trocarFiltro(novoFiltro: FiltroTab) {
    setFiltro(novoFiltro);
    setPagina(1);
  }

  async function toggleAtivo(jogador: Jogador) {
    setSuspendendo(jogador.id);
    try {
      const res = await fetch(`/api/users/${jogador.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !jogador.is_active }),
      });
      if (res.ok) {
        setJogadores((prev) =>
          prev.map((j) =>
            j.id === jogador.id ? { ...j, is_active: !j.is_active } : j,
          ),
        );
      }
    } finally {
      setSuspendendo(null);
    }
  }

  const nomeExibido = (j: Jogador) => j.name;
  const nicknameExibido = (j: Jogador) => (j.nickname ? j.nickname : "");

  const ehAdmin = sessao?.role === "admin" || sessao?.role === "co_admin";

  return (
    <div className="space-y-4">
      {/* Barra de busca, filtros e botão de ação */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Buscar jogador..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>

        {/* Abas de filtro */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {TABS.map((tab) => {
            const ativo = filtro === tab.value;
            const contador =
              tab.value === "todos"
                ? total
                : tab.value === "inadimplente"
                  ? contadorInadimplentes
                  : null;

            return (
              <button
                key={tab.value}
                onClick={() => trocarFiltro(tab.value)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                  ativo
                    ? "bg-foreground text-background"
                    : "bg-card text-foreground border border-border hover:bg-muted",
                  tab.value === "inadimplente" &&
                    !ativo &&
                    "border-destructive/40",
                )}
              >
                {tab.label}
                {contador !== null && (
                  <span
                    className={cn(
                      "inline-flex items-center justify-center rounded-full text-xs font-bold min-w-4.5 h-4.5 px-1",
                      ativo
                        ? "bg-background/20 text-background"
                        : tab.value === "inadimplente"
                          ? "bg-destructive text-destructive-foreground"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {contador}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Botões de ação — posicionados após os filtros */}
        {ehAdmin && (
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={() => setModalAvulsosAberto(true)}
              className="gap-2 bg-white"
            >
              <Users className="size-4" />
              Jogadores Genéricos
            </Button>
            <Link
              href="/jogadores/novo"
              className={buttonVariants({ className: "gap-2" })}
            >
              <UserPlus className="size-4" />
              Adicionar Jogador
            </Link>
          </div>
        )}
      </div>

      {/* Tabela de jogadores */}
      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-70">Jogador</TableHead>
              <TableHead>Posição</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Mensalidade</TableHead>
              <TableHead>Avaliação</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>

          <TableBody>
            {carregando ? (
              // Esqueleto de carregamento
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}>
                      <div className="h-4 rounded bg-muted animate-pulse" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : jogadores.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-32 text-center text-muted-foreground"
                >
                  Nenhum jogador encontrado.
                </TableCell>
              </TableRow>
            ) : (
              jogadores.map((j) => (
                <TableRow
                  key={j.id}
                  className={cn(j.is_goalkeeper && "bg-accent/5")}
                >
                  {/* Coluna jogador: avatar + nome + subtítulo */}
                  <TableCell>
                    <Link
                      href={`/jogadores/${j.id}`}
                      className="flex items-center gap-3 hover:opacity-80 transition-opacity w-fit"
                    >
                      <PlayerAvatar
                        name={j.name}
                        src={j.photo_url ?? undefined}
                        size="md"
                      />
                      <div className="min-w-0 flex flex-col">
                        <p className="font-medium text-foreground leading-none truncate">
                          {nomeExibido(j)}
                        </p>
                        {nicknameExibido(j) !== "" && (
                          <p className="text-xs font-light text-gray-500 truncate mt-0.5">
                            {nicknameExibido(j)}
                          </p>
                        )}
                      </div>
                    </Link>
                  </TableCell>

                  {/* Posição */}
                  <TableCell>
                    <BadgePosicao
                      position={j.position}
                      isGoalkeeper={j.is_goalkeeper}
                    />
                  </TableCell>

                  {/* Status de ativação do jogador no sistema */}
                  <TableCell>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                        j.is_active
                          ? "bg-success/15 text-success"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {j.is_active ? "Ativo" : "Inativo"}
                    </span>
                  </TableCell>

                  {/* Situação da mensalidade */}
                  <TableCell>
                    <BadgeMensalidade jogador={j} />
                  </TableCell>

                  {/* Avaliação geral */}
                  <TableCell>
                    <ColunaAvaliacao rating={j.player_ratings} />
                  </TableCell>

                  {/* Menu de ações */}
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="flex items-center justify-center size-8 rounded-md text-muted-foreground hover:bg-muted transition-colors focus:outline-none"
                        aria-label="Ações do jogador"
                      >
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => router.push(`/jogadores/${j.id}`)}
                        >
                          Ver perfil
                        </DropdownMenuItem>
                        {ehAdmin && (
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/jogadores/${j.id}/editar`)
                            }
                          >
                            Editar dados
                          </DropdownMenuItem>
                        )}

                        {ehAdmin && (
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => toggleAtivo(j)}
                            disabled={suspendendo === j.id}
                          >
                            {j.is_active ? "Desativar" : "Reativar"}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Paginação */}
        {!carregando && total > pageSize && (
          <div className="border-t border-border">
            <Paginacao
              pagina={pagina}
              total={total}
              pageSize={pageSize}
              onMudar={setPagina}
            />
          </div>
        )}
      </div>

      {/* Modal de gerenciamento de jogadores genéricos */}
      <ModalJogadoresGenericos
        aberto={modalAvulsosAberto}
        onFechar={() => setModalAvulsosAberto(false)}
      />
    </div>
  );
}
