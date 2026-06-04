// TODO: buscar dados de /api/matches?status=...&month=X&year=Y
'use client'
import { useState } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PillGroup } from '@/components/ui/pill'
import { MonthSelector } from '@/components/ui/month-selector'
import { IconPlus, IconMapPin, IconUsers, IconChevronRight } from '@tabler/icons-react'

type StatusPartida = 'all' | 'scheduled' | 'completed' | 'cancelled'

// Opções de filtro por status
const OPCOES_STATUS: { value: StatusPartida; label: string }[] = [
  { value: 'all',       label: 'Todas'      },
  { value: 'scheduled', label: 'Agendadas'  },
  { value: 'completed', label: 'Concluídas' },
  { value: 'cancelled', label: 'Canceladas' },
]

interface Partida {
  id:       string
  data:     string
  local:    string
  status:   StatusPartida
  jogadores: number
  placarA?: number
  placarB?: number
  times?:   [string, string]
}

/* ─── MOCK DATA ─── */
const MOCK_PARTIDAS: Partida[] = [
  { id: '1', data: 'Sáb, 07/06/2026 · 08h00', local: 'Campo Ibirapuera',    status: 'scheduled', jogadores: 18 },
  { id: '2', data: 'Sáb, 31/05/2026 · 08h00', local: 'Campo Ibirapuera',    status: 'completed', jogadores: 20, placarA: 3, placarB: 2, times: ['Time A', 'Time B'] },
  { id: '3', data: 'Sáb, 24/05/2026 · 08h00', local: 'Campo Vila Madalena', status: 'completed', jogadores: 16, placarA: 1, placarB: 1, times: ['Time A', 'Time B'] },
  { id: '4', data: 'Sáb, 17/05/2026 · 08h00', local: 'Campo Ibirapuera',    status: 'cancelled', jogadores: 0  },
]

// Mapeamento de status para tom e rótulo do badge
const badgeStatus: Record<string, { tone: 'green' | 'amber' | 'red' | 'muted'; label: string }> = {
  scheduled: { tone: 'amber', label: 'Agendada'  },
  completed: { tone: 'green', label: 'Concluída' },
  cancelled: { tone: 'muted', label: 'Cancelada' },
}

const IS_ADMIN = true

export default function PartidasPage() {
  const [status, setStatus] = useState<StatusPartida>('all')
  const [mes,    setMes]    = useState(6)
  const [ano,    setAno]    = useState(2026)

  // Navega entre meses com wrap de ano
  function mesAnterior() {
    if (mes === 1) { setMes(12); setAno(a => a - 1) }
    else setMes(m => m - 1)
  }
  function proximoMes() {
    if (mes === 12) { setMes(1); setAno(a => a + 1) }
    else setMes(m => m + 1)
  }

  const partidasFiltradas = MOCK_PARTIDAS.filter(
    p => status === 'all' || p.status === status,
  )

  return (
    <AppLayout title="Partidas" user={{ name: 'Admin', role: 'admin' }}>
      {/* Barra de filtros e botão de nova partida */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5">
        <MonthSelector month={mes} year={ano} onPrev={mesAnterior} onNext={proximoMes} />
        <PillGroup options={OPCOES_STATUS} value={status} onChange={setStatus} />
        <div className="flex-1" />
        {IS_ADMIN && (
          <Button variant="primary" icon={<IconPlus size={16} />} size="sm">
            Nova partida
          </Button>
        )}
      </div>

      {/* Lista de partidas como cards clicáveis */}
      <div className="flex flex-col gap-3">
        {partidasFiltradas.map(partida => (
          <a
            key={partida.id}
            href={`/partidas/${partida.id}`}
            className="bg-surface border border-border rounded-xl p-4 shadow-sm hover:shadow hover:-translate-y-0.5 transition-all duration-150 no-underline text-ink flex items-center gap-4"
          >
            {/* Placar para partidas concluídas, badge de status para as demais */}
            {partida.status === 'completed' && partida.placarA !== undefined ? (
              <div className="shrink-0 text-center w-[72px]">
                <p className="font-cond font-bold text-30 leading-none">
                  {partida.placarA}<span className="text-ink-3 mx-1">×</span>{partida.placarB}
                </p>
                {partida.times && (
                  <p className="text-[11px] text-ink-3 mt-1">
                    {partida.times[0]} vs {partida.times[1]}
                  </p>
                )}
              </div>
            ) : (
              <div className="shrink-0 w-[72px] flex items-center justify-center">
                <Badge tone={badgeStatus[partida.status].tone}>
                  {badgeStatus[partida.status].label}
                </Badge>
              </div>
            )}

            <div className="w-px h-10 bg-line shrink-0" />

            {/* Data e local */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[14px] truncate">{partida.data}</p>
              <p className="text-[13px] text-ink-2 flex items-center gap-1 mt-0.5">
                <IconMapPin size={13} className="shrink-0" />
                {partida.local}
              </p>
            </div>

            {/* Contagem de jogadores presentes */}
            {partida.jogadores > 0 && (
              <div className="shrink-0 flex items-center gap-1.5 text-[13px] text-ink-3">
                <IconUsers size={14} />
                {partida.jogadores}
              </div>
            )}

            <IconChevronRight size={16} className="text-ink-3 shrink-0" />
          </a>
        ))}

        {partidasFiltradas.length === 0 && (
          <p className="text-center text-ink-3 py-10">Nenhuma partida encontrada.</p>
        )}
      </div>
    </AppLayout>
  )
}
