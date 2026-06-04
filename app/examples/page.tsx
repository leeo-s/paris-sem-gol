'use client'
import { useState } from 'react'
import {
  Button, Badge, Avatar, Card, CardDivider,
  Input, Textarea, Select,
  StatCard, Pill, PillGroup,
  RankRow, RankList,
  RatingBar, OverallBadge,
  DataTable, CellUser,
  IconButton, SearchInput,
  SegmentedRadio, Note, Counter, MonthSelector,
} from '@/components/ui'
import type { Column, RankEntry } from '@/components/ui'
import {
  IconStar, IconShieldFilled, IconInfoCircle, IconAlertTriangle,
  IconBallFootball, IconUsers, IconCoin, IconTrophy,
  IconEdit, IconFilter, IconDownload,
} from '@tabler/icons-react'

// ─── Seção reutilizável para organizar os exemplos ───────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="font-cond font-bold text-20 uppercase tracking-[.04em] text-ink mb-5 pb-2 border-b border-border">
        {title}
      </h2>
      {children}
    </section>
  )
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-13 font-bold text-ink-3 uppercase tracking-[.06em] mb-3">{title}</h3>
      {children}
    </div>
  )
}

// ─── Dados de exemplo ─────────────────────────────────────────────────────────
const rankingExemplo: RankEntry[] = [
  { position: 1, name: 'Léo Silva',    sub: 'Atacante',  value: 12, unit: 'gols', barPct: 100 },
  { position: 2, name: 'Marcos Lima',  sub: 'Meia',      value: 9,  unit: 'gols', barPct: 75  },
  { position: 3, name: 'Pedro Costa',  sub: 'Atacante',  value: 7,  unit: 'gols', barPct: 58  },
  { position: 4, name: 'Rafael Souza', sub: 'Goleiro',   value: 0,  unit: 'gols', barPct: 0, isGk: true },
]

const ratingExemplo = { speed: 8, finishing: 9, passing: 7, dribbling: 8, defense: 3, overall: 7 }

interface JogadorExemplo {
  nome: string
  posicao: string
  gols: number
  status: 'Pago' | 'Pendente' | 'Atrasado'
}

const jogadoresExemplo: JogadorExemplo[] = [
  { nome: 'Léo Silva',    posicao: 'Atacante', gols: 12, status: 'Pago'     },
  { nome: 'Marcos Lima',  posicao: 'Meia',     gols: 9,  status: 'Pago'     },
  { nome: 'Pedro Costa',  posicao: 'Atacante', gols: 7,  status: 'Pendente' },
  { nome: 'Rafael Souza', posicao: 'Goleiro',  gols: 0,  status: 'Atrasado' },
]

const colunasJogadores: Column<JogadorExemplo>[] = [
  {
    key: 'jogador',
    header: 'Jogador',
    cell: (row) => (
      <CellUser
        name={row.nome}
        sub={row.posicao}
        avatarSlot={<Avatar name={row.nome} size="sm" kind={row.posicao === 'Goleiro' ? 'gk' : 'member'} />}
      />
    ),
  },
  {
    key: 'gols',
    header: 'Gols',
    align: 'right',
    cell: (row) => <span className="font-cond font-bold text-[16px] tabular-nums">{row.gols}</span>,
  },
  {
    key: 'status',
    header: 'Mensalidade',
    align: 'center',
    cell: (row) => (
      <Badge
        tone={row.status === 'Pago' ? 'green' : row.status === 'Atrasado' ? 'red' : 'amber'}
      >
        {row.status}
      </Badge>
    ),
  },
]

// ─── Página de exemplos ───────────────────────────────────────────────────────
export default function ExamplesPage() {
  const [mes, setMes] = useState(6)
  const [ano] = useState(2026)
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'pago' | 'pendente'>('todos')
  const [resultado, setResultado] = useState<'vitoria' | 'derrota'>('vitoria')
  const [contadorGols, setContadorGols] = useState(0)
  const [loadingBtn, setLoadingBtn] = useState(false)

  const simularLoading = () => {
    setLoadingBtn(true)
    setTimeout(() => setLoadingBtn(false), 2000)
  }

  return (
    <div className="bg-bg min-h-screen px-6 py-8 max-w-[900px] mx-auto">
      {/* Cabeçalho da página */}
      <div className="mb-10">
        <p className="text-13 font-semibold text-ink-3 uppercase tracking-[.06em] mb-1">Design System</p>
        <h1 className="font-cond font-bold text-34 uppercase tracking-[.02em]">Paris Sem Gol</h1>
        <p className="text-15 text-ink-2 mt-1.5">Componentes, cores e padrões visuais do sistema.</p>
      </div>

      {/* ── 1. PALETA DE CORES ── */}
      <Section title="Paleta de Cores">
        <SubSection title="Brand Primitivos">
          <div className="flex flex-wrap gap-2.5">
            {[
              { label: 'Navy',      bg: 'bg-navy',       text: 'text-white', hex: '#0D1B3E' },
              { label: 'Navy 700',  bg: 'bg-navy-700',   text: 'text-white', hex: '#1B2C57' },
              { label: 'Navy 600',  bg: 'bg-navy-600',   text: 'text-white', hex: '#23386B' },
              { label: 'Navy 400',  bg: 'bg-navy-400',   text: 'text-white', hex: '#5C6E96' },
              { label: 'Navy 200',  bg: 'bg-navy-200',   text: 'text-navy',  hex: '#8DA0C4' },
              { label: 'Red',       bg: 'bg-red',        text: 'text-white', hex: '#C41230' },
              { label: 'Red Dark',  bg: 'bg-red-dark',   text: 'text-white', hex: '#8C0D22' },
              { label: 'Red Light', bg: 'bg-red-light',  text: 'text-red-dark', hex: '#FBEAED' },
              { label: 'Gold',      bg: 'bg-gold',       text: 'text-[#3a2a00]', hex: '#C9A84C' },
              { label: 'Gold Deep', bg: 'bg-gold-deep',  text: 'text-white', hex: '#A6802A' },
              { label: 'Gold Light',bg: 'bg-gold-light', text: 'text-gold-text', hex: '#FAF3E0' },
              { label: 'Green',     bg: 'bg-green',      text: 'text-white', hex: '#1C7C4F' },
              { label: 'Amber',     bg: 'bg-amber',      text: 'text-white', hex: '#9A6A00' },
            ].map(({ label, bg, text, hex }) => (
              <div key={label} className={`${bg} ${text} rounded-lg px-3 py-2 text-[12px] font-semibold`}>
                {label}
                <div className="text-[10px] opacity-70 font-normal">{hex}</div>
              </div>
            ))}
          </div>
        </SubSection>

        <SubSection title="Tokens Semânticos — Superfícies e Texto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: 'bg',        bg: 'bg-bg',        border: true },
              { label: 'surface',   bg: 'bg-surface',   border: true },
              { label: 'surface-2', bg: 'bg-surface-2', border: true },
              { label: 'surface-3', bg: 'bg-surface-3', border: true },
            ].map(({ label, bg, border }) => (
              <div key={label} className={`${bg} ${border ? 'border border-border' : ''} rounded-lg p-3`}>
                <p className="text-13 font-semibold text-ink">{label}</p>
                <p className="text-[11px] text-ink-3 mt-0.5">--{label}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 bg-surface border border-border rounded-lg p-4 space-y-1.5">
            <p className="text-ink">ink — texto principal</p>
            <p className="text-ink-2">ink-2 — texto secundário</p>
            <p className="text-ink-3">ink-3 — texto terciário / placeholder</p>
          </div>
        </SubSection>
      </Section>

      {/* ── 2. TIPOGRAFIA ── */}
      <Section title="Tipografia">
        <div className="space-y-3 bg-surface border border-border rounded-xl p-5">
          <p className="font-cond font-bold text-52 leading-none">52 Condensed Bold</p>
          <p className="font-cond font-bold text-34">34 Condensed Bold</p>
          <p className="font-cond font-bold text-30 tabular-nums">30 Cond — Números 1.234</p>
          <p className="font-cond font-bold text-26">26 Condensed Bold</p>
          <p className="font-bold text-20">20 Sans Bold</p>
          <p className="font-semibold text-18">18 Sans SemiBold</p>
          <p className="font-semibold text-15">15 Sans SemiBold</p>
          <p className="text-[14px]">14px — texto padrão de interface</p>
          <p className="text-13 text-ink-2">13px — labels, subtítulos</p>
          <p className="text-[11.5px] text-ink-3">11.5px — hints, badges, notas</p>
        </div>
      </Section>

      {/* ── 3. BOTÕES ── */}
      <Section title="Botões">
        <SubSection title="Variantes">
          <div className="flex flex-wrap gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="red">Vermelho</Button>
            <Button variant="gold">Dourado</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
          </div>
        </SubSection>
        <SubSection title="Tamanhos">
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Pequeno</Button>
            <Button size="md">Médio</Button>
            <Button size="lg">Grande</Button>
          </div>
        </SubSection>
        <SubSection title="Estados e Ícones">
          <div className="flex flex-wrap gap-3">
            <Button icon={<IconStar size={16} />}>Com ícone</Button>
            <Button loading={loadingBtn} onClick={simularLoading}>
              {loadingBtn ? 'Salvando...' : 'Simular loading'}
            </Button>
            <Button disabled>Desabilitado</Button>
            <Button block className="max-w-[200px]">Largura total</Button>
          </div>
        </SubSection>
      </Section>

      {/* ── 4. BADGES ── */}
      <Section title="Badges">
        <div className="flex flex-wrap gap-2">
          <Badge tone="navy">Mensalista</Badge>
          <Badge tone="red" icon={<IconShieldFilled size={11} />}>Goleiro</Badge>
          <Badge tone="gold">MVP</Badge>
          <Badge tone="green">Pago</Badge>
          <Badge tone="amber">Pendente</Badge>
          <Badge tone="muted">Inativo</Badge>
        </div>
      </Section>

      {/* ── 5. AVATARES ── */}
      <Section title="Avatares">
        <SubSection title="Tamanhos">
          <div className="flex items-end gap-4">
            {(['xs','sm','md','lg','xl'] as const).map((size) => (
              <div key={size} className="flex flex-col items-center gap-1.5">
                <Avatar name="Léo Silva" size={size} />
                <span className="text-[11px] text-ink-3">{size}</span>
              </div>
            ))}
          </div>
        </SubSection>
        <SubSection title="Tipos de jogador">
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center gap-1.5">
              <Avatar name="Léo Silva" kind="member" size="md" />
              <span className="text-[11px] text-ink-3">member</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <Avatar name="Rafael Souza" kind="gk" size="md" />
              <span className="text-[11px] text-ink-3">goleiro</span>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <Avatar name="João" kind="guest" size="md" />
              <span className="text-[11px] text-ink-3">avulso</span>
            </div>
          </div>
        </SubSection>
      </Section>

      {/* ── 6. CARDS ── */}
      <Section title="Cards">
        <div className="grid sm:grid-cols-2 gap-4">
          <Card title="Card padrão" icon={<IconUsers size={14} />}>
            <p className="text-[14px] text-ink-2">Conteúdo do card padrão com fundo surface e borda suave.</p>
          </Card>
          <Card title="Card navy" icon={<IconTrophy size={14} />} tone="navy">
            <p className="text-[14px] text-navy-200">Variante navy para painéis de destaque como premiações.</p>
          </Card>
          <Card title="Com ações" icon={<IconCoin size={14} />} actions={<Button size="sm" variant="ghost">Ver todos</Button>}>
            <p className="text-[14px] text-ink-2">Card com botão de ação no cabeçalho.</p>
          </Card>
          <Card padding={false}>
            <div className="p-4 border-b border-border">
              <p className="font-semibold text-[14px]">Sem padding interno</p>
            </div>
            <div className="p-4">
              <p className="text-[14px] text-ink-2">Conteúdo com espaçamento próprio.</p>
            </div>
          </Card>
        </div>
        <div className="mt-4">
          <Card title="Card com divisor">
            <p className="text-[14px] text-ink-2">Seção superior do card.</p>
            <CardDivider />
            <p className="text-[14px] text-ink-2">Seção inferior separada por divisor.</p>
          </Card>
        </div>
      </Section>

      {/* ── 7. STAT CARDS ── */}
      <Section title="Stat Cards">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard value="R$ 1.200" label="Saldo do caixa" accent="green" valueColor="green" />
          <StatCard value="18"       label="Mensalistas"    accent="navy"  valueColor="navy"  />
          <StatCard value="3"        label="Pendências"     accent="red"   valueColor="red"   />
          <StatCard value="7"        label="Partidas"       accent="gold"  valueColor="gold"  />
        </div>
      </Section>

      {/* ── 8. INPUTS ── */}
      <Section title="Campos de Formulário">
        <div className="grid sm:grid-cols-2 gap-4">
          <Input label="Nome completo" placeholder="Ex: Léo Silva" />
          <Input label="Email" type="email" placeholder="leo@email.com" icon={<IconUsers size={16} />} />
          <Input label="Com erro" placeholder="..." error="Campo obrigatório" />
          <Input label="Com hint" placeholder="..." hint="Máximo 120 caracteres" />
          <Select
            label="Posição"
            options={[
              { value: '', label: 'Selecione...' },
              { value: 'goleiro', label: 'Goleiro' },
              { value: 'defensor', label: 'Defensor' },
              { value: 'meia', label: 'Meia' },
              { value: 'atacante', label: 'Atacante' },
            ]}
          />
          <SearchInput placeholder="Buscar jogador..." />
        </div>
        <div className="mt-4">
          <Textarea label="Observações" placeholder="Adicione notas sobre o jogador..." rows={3} />
        </div>
      </Section>

      {/* ── 9. PILLS ── */}
      <Section title="Pills / Filtros">
        <SubSection title="Individual">
          <div className="flex gap-2">
            <Pill selected>Todos</Pill>
            <Pill>Mensalistas</Pill>
            <Pill>Avulsos</Pill>
            <Pill tone="red" selected>Pendentes</Pill>
          </div>
        </SubSection>
        <SubSection title="Grupo controlado">
          <PillGroup
            options={[
              { value: 'todos',    label: 'Todos'    },
              { value: 'pago',     label: 'Pagos'    },
              { value: 'pendente', label: 'Pendentes'},
            ]}
            value={filtroStatus}
            onChange={setFiltroStatus}
          />
        </SubSection>
      </Section>

      {/* ── 10. SELETORES E CONTADORES ── */}
      <Section title="Controles">
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <p className="text-13 font-bold text-ink-3 uppercase tracking-[.06em] mb-3">Seletor de mês</p>
            <MonthSelector
              month={mes}
              year={ano}
              onPrev={() => setMes(m => m === 1 ? 12 : m - 1)}
              onNext={() => setMes(m => m === 12 ? 1 : m + 1)}
            />
          </div>
          <div>
            <p className="text-13 font-bold text-ink-3 uppercase tracking-[.06em] mb-3">Contador de gols</p>
            <Counter value={contadorGols} onChange={setContadorGols} max={10} />
          </div>
          <div>
            <p className="text-13 font-bold text-ink-3 uppercase tracking-[.06em] mb-3">Rádio segmentado</p>
            <SegmentedRadio
              options={[
                { value: 'vitoria', title: 'Vitória', subtitle: 'Time A venceu', tone: 'green' },
                { value: 'derrota', title: 'Derrota', subtitle: 'Time B venceu', tone: 'red'   },
              ]}
              value={resultado}
              onChange={setResultado}
            />
          </div>
          <div>
            <p className="text-13 font-bold text-ink-3 uppercase tracking-[.06em] mb-3">Icon Buttons</p>
            <div className="flex gap-2">
              <IconButton icon={<IconEdit size={17} />}     label="Editar"    />
              <IconButton icon={<IconFilter size={17} />}   label="Filtrar"   active />
              <IconButton icon={<IconDownload size={17} />} label="Exportar"  />
            </div>
          </div>
        </div>
      </Section>

      {/* ── 11. NOTAS ── */}
      <Section title="Notas Informativas">
        <div className="space-y-3">
          <Note tone="navy" icon={<IconInfoCircle size={18} />}>
            Goleiros fixos são isentos de mensalidade e taxa avulso por definição do clube.
          </Note>
          <Note tone="gold" icon={<IconStar size={18} />}>
            A votação do craque fecha automaticamente após 24h ou quando todos os presentes votarem.
          </Note>
          <Note tone="red" icon={<IconAlertTriangle size={18} />}>
            3 jogadores com mensalidade em atraso. Verifique o módulo financeiro.
          </Note>
          <Note tone="muted">
            Este é um aviso neutro com tom muted para informações secundárias.
          </Note>
        </div>
      </Section>

      {/* ── 12. RATING ── */}
      <Section title="Rating de Jogador">
        <div className="grid sm:grid-cols-2 gap-6">
          <Card title="Atributos" icon={<IconBallFootball size={14} />}>
            <RatingBar rating={ratingExemplo} />
          </Card>
          <Card title="Overall Badges">
            <div className="flex items-end gap-4">
              {(['sm','md','lg'] as const).map((size) => (
                <div key={size} className="flex flex-col items-center gap-1.5">
                  <OverallBadge value={ratingExemplo.overall} size={size} />
                  <span className="text-[11px] text-ink-3">{size}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </Section>

      {/* ── 13. RANKING ── */}
      <Section title="Ranking">
        <div className="grid sm:grid-cols-2 gap-4">
          <Card title="Artilheiros do mês" icon={<IconBallFootball size={14} />}>
            <RankList entries={rankingExemplo} />
          </Card>
          <Card title="Menos vazados" icon={<IconShieldFilled size={14} />} tone="navy">
            <RankList
              entries={rankingExemplo.filter(e => e.isGk || e.position === 1).map(e => ({
                ...e,
                value: '0.5',
                unit: 'g/j',
              }))}
              barColor="gold"
            />
          </Card>
        </div>
      </Section>

      {/* ── 14. TABELA ── */}
      <Section title="Tabela de Dados">
        <DataTable
          columns={colunasJogadores}
          rows={jogadoresExemplo}
          keyFn={(row) => row.nome}
          rowState={(row) =>
            row.status === 'Atrasado' ? 'late' :
            row.posicao === 'Goleiro' ? 'exempt' : 'default'
          }
        />
      </Section>
    </div>
  )
}
