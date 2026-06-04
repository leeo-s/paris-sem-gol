// TODO: buscar dados de /api/monthly-awards?month=X&year=Y e /api/dashboard
'use client'
import { useState } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { MonthSelector } from '@/components/ui/month-selector'
import { Note } from '@/components/ui/note'
import {
  IconStar, IconBallFootball, IconShieldHalf,
  IconUsers, IconRefresh, IconInfoCircle,
} from '@tabler/icons-react'
import type { ReactNode } from 'react'

interface Premiacao {
  titulo:  string
  icone:   ReactNode
  tom:     'red' | 'gold' | 'green' | 'navy'
  jogador: { name: string; sub: string; avatarUrl?: string | null; isGk?: boolean }
  stat:    string
}

// Tom → classe de borda lateral colorida
const classesBordaTom = {
  red:   'border-l-4 border-l-red',
  gold:  'border-l-4 border-l-gold',
  green: 'border-l-4 border-l-green',
  navy:  'border-l-4 border-l-navy',
}

/* ─── MOCK DATA — substituir por /api/monthly-awards + /api/dashboard ─── */
const MOCK_PREMIACOES: Premiacao[] = [
  {
    titulo: 'MVP do Mês',
    icone:  <IconStar size={18} />,
    tom:    'gold',
    jogador: { name: 'Matheus Lima', sub: '12 votos no mês' },
    stat:   '🏆 Craque',
  },
  {
    titulo: 'Artilheiro',
    icone:  <IconBallFootball size={18} />,
    tom:    'red',
    jogador: { name: 'João Victor', sub: '8 gols em junho' },
    stat:   '⚽ 8 gols',
  },
  {
    titulo: 'Melhor Goleiro',
    icone:  <IconShieldHalf size={18} />,
    tom:    'green',
    jogador: { name: 'Diego Mota', sub: '1,2 gols sofridos/jogo', isGk: true },
    stat:   '🧤 1,2/jg',
  },
  {
    titulo: 'Mais Presente',
    icone:  <IconUsers size={18} />,
    tom:    'navy',
    jogador: { name: 'André Costa', sub: '4 de 4 partidas' },
    stat:   '✅ 4/4',
  },
]

const IS_ADMIN = true

export default function PremiacoesPage() {
  const [mes,       setMes]       = useState(6)
  const [ano,       setAno]       = useState(2026)
  const [gerado,    setGerado]    = useState(true)

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
    <AppLayout title="Premiações" user={{ name: 'Admin', role: 'admin' }}>
      {/* Toolbar com seletor de mês e botão de gerar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <MonthSelector month={mes} year={ano} onPrev={mesAnterior} onNext={proximoMes} />
        <div className="flex-1" />
        {IS_ADMIN && (
          <Button
            variant="gold"
            icon={<IconRefresh size={16} />}
            size="sm"
            onClick={() => {
              // TODO: POST /api/monthly-awards { month: mes, year: ano }
              setGerado(true)
            }}
          >
            Gerar premiações
          </Button>
        )}
      </div>

      {/* Aviso quando premiações ainda não foram calculadas para o mês */}
      {!gerado && (
        <Note tone="muted" icon={<IconInfoCircle />} className="mb-5">
          Premiações ainda não calculadas para este mês. Clique em &quot;Gerar premiações&quot; para calcular automaticamente.
        </Note>
      )}

      {/* Grid 2×2 de premiados do mês */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {MOCK_PREMIACOES.map(premiacao => (
          <div
            key={premiacao.titulo}
            className={`bg-surface border border-border rounded-xl p-5 shadow-sm ${classesBordaTom[premiacao.tom]}`}
          >
            {/* Cabeçalho com ícone e título da premiação */}
            <div className="flex items-center gap-2 text-[13px] font-bold text-ink-2 uppercase tracking-[.05em] mb-4">
              <span className="text-[16px]">{premiacao.icone}</span>
              {premiacao.titulo}
            </div>

            {/* Avatar e dados do premiado */}
            <div className="flex items-center gap-4">
              <Avatar
                name={premiacao.jogador.name}
                size="lg"
                kind={premiacao.jogador.isGk ? 'gk' : 'member'}
                src={premiacao.jogador.avatarUrl}
              />
              <div className="flex-1 min-w-0">
                <p className="font-cond font-bold text-[20px] leading-tight truncate">
                  {premiacao.jogador.name}
                </p>
                <p className="text-ink-3 text-[13px] mt-0.5">{premiacao.jogador.sub}</p>
                <Badge
                  tone={
                    premiacao.tom === 'gold'  ? 'gold'  :
                    premiacao.tom === 'green' ? 'green' :
                    premiacao.tom === 'red'   ? 'red'   : 'navy'
                  }
                  className="mt-2"
                >
                  {premiacao.stat}
                </Badge>
              </div>
            </div>
          </div>
        ))}
      </div>
    </AppLayout>
  )
}
