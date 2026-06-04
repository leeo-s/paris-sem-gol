// TODO: buscar dados de /api/financial/monthly-fees, /api/financial/transactions, /api/financial/summary
'use client'
import { useState } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StatCard } from '@/components/ui/stat-card'
import { MonthSelector } from '@/components/ui/month-selector'
import { DataTable, CellUser, type Column } from '@/components/ui/table'
import { Avatar } from '@/components/ui/avatar'
import { IconPlus } from '@tabler/icons-react'
import { cn } from '@/lib/utils'

type Aba = 'mensalidades' | 'transacoes' | 'camisas' | 'transparencia'
type StatusMensalidade = 'pending' | 'paid' | 'late' | 'cancelled'

interface Mensalidade {
  id:      string
  jogador: string
  mes:     string
  valor:   number
  status:  StatusMensalidade
  pagoEm?: string
}

/* ─── MOCK DATA ─── */
const MOCK_MENSALIDADES: Mensalidade[] = [
  { id: '1', jogador: 'Matheus Lima',  mes: 'Jun/2026', valor: 80, status: 'paid',    pagoEm: '02/06' },
  { id: '2', jogador: 'João Victor',   mes: 'Jun/2026', valor: 80, status: 'pending'  },
  { id: '3', jogador: 'Rodrigo Neves', mes: 'Jun/2026', valor: 80, status: 'late'     },
  { id: '4', jogador: 'André Costa',   mes: 'Jun/2026', valor: 80, status: 'paid',    pagoEm: '01/06' },
  { id: '5', jogador: 'Felipe Ramos',  mes: 'Jun/2026', valor: 80, status: 'cancelled'},
]

// Mapeamento de status para tom e rótulo do badge
const badgeStatus: Record<StatusMensalidade, { tone: 'green' | 'amber' | 'red' | 'muted'; label: string }> = {
  paid:      { tone: 'green', label: 'Pago'      },
  pending:   { tone: 'amber', label: 'Pendente'  },
  late:      { tone: 'red',   label: 'Atrasado'  },
  cancelled: { tone: 'muted', label: 'Cancelado' },
}

// Colunas da tabela de mensalidades
const COLUNAS_MENSALIDADES: Column<Mensalidade>[] = [
  {
    key: 'jogador',
    header: 'Jogador',
    cell: (r) => (
      <CellUser name={r.jogador} avatarSlot={<Avatar name={r.jogador} size="sm" />} />
    ),
  },
  { key: 'mes',   header: 'Mês',   cell: (r) => r.mes },
  {
    key: 'valor', header: 'Valor', align: 'right',
    cell: (r) => <span className="font-cond font-bold">R$ {r.valor}</span>,
  },
  {
    key: 'status', header: 'Status', align: 'right',
    cell: (r) => {
      const s = badgeStatus[r.status]
      return <Badge tone={s.tone}>{s.label}</Badge>
    },
  },
  {
    key: 'pagoEm', header: 'Pago em', align: 'right',
    cell: (r) => <span className="text-ink-3">{r.pagoEm ?? '—'}</span>,
  },
]

// Abas da página financeiro
const ABAS: { key: Aba; label: string }[] = [
  { key: 'mensalidades',  label: 'Mensalidades' },
  { key: 'transacoes',    label: 'Transações'   },
  { key: 'camisas',       label: 'Camisas'      },
  { key: 'transparencia', label: 'Transparência'},
]

export default function FinanceiroPage() {
  const [aba,  setAba]  = useState<Aba>('mensalidades')
  const [mes,  setMes]  = useState(6)
  const [ano,  setAno]  = useState(2026)

  // Navega entre meses com wrap de ano
  function mesAnterior() {
    if (mes === 1) { setMes(12); setAno(a => a - 1) }
    else setMes(m => m - 1)
  }
  function proximoMes() {
    if (mes === 12) { setMes(1); setAno(a => a + 1) }
    else setMes(m => m + 1)
  }

  return (
    <AppLayout title="Financeiro" user={{ name: 'Admin', role: 'admin' }}>
      {/* Cards de resumo financeiro */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard value="R$ 2.840" label="Saldo geral"  accent="green" valueColor="green" />
        <StatCard value="R$ 4.160" label="Entradas"     accent="navy"  />
        <StatCard value="R$ 1.320" label="Saídas"       accent="red"   valueColor="red"  />
        <StatCard value="3"        label="Em aberto"    accent="gold"  valueColor="gold" />
      </div>

      {/* Navegação por abas */}
      <div className="flex gap-0 border-b border-border mb-5 overflow-x-auto">
        {ABAS.map(a => (
          <button
            key={a.key}
            type="button"
            onClick={() => setAba(a.key)}
            className={cn(
              'px-4 py-3 text-[14px] font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors',
              aba === a.key
                ? 'border-navy text-navy'
                : 'border-transparent text-ink-2 hover:text-ink',
            )}
          >
            {a.label}
          </button>
        ))}
      </div>

      {/* Conteúdo: mensalidades */}
      {aba === 'mensalidades' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <MonthSelector month={mes} year={ano} onPrev={mesAnterior} onNext={proximoMes} />
            <div className="flex-1" />
            <Button variant="primary" icon={<IconPlus size={16} />} size="sm">
              Gerar cobrança
            </Button>
          </div>
          <DataTable
            columns={COLUNAS_MENSALIDADES}
            rows={MOCK_MENSALIDADES}
            keyFn={r => r.id}
            rowState={r => r.status === 'late' ? 'late' : 'default'}
          />
        </div>
      )}

      {/* Conteúdo: transações */}
      {aba === 'transacoes' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-end">
            <Button variant="primary" icon={<IconPlus size={16} />} size="sm">
              Nova transação
            </Button>
          </div>
          <p className="text-ink-3 text-center py-10">
            {/* TODO: listar /api/financial/transactions */}
            Conecte ao endpoint para exibir transações.
          </p>
        </div>
      )}

      {/* Abas camisas e transparência — implementar com endpoints reais */}
      {(aba === 'camisas' || aba === 'transparencia') && (
        <p className="text-ink-3 text-center py-10">
          Em breve — implementar com dados de{' '}
          <code>/api/financial/{aba === 'camisas' ? 'jersey-sales' : 'summary'}</code>
        </p>
      )}
    </AppLayout>
  )
}
