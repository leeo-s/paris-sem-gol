// TODO: substituir MOCK_PLAYERS por fetch de /api/users?includeInactive=false
'use client'
import { useState } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { PillGroup } from '@/components/ui/pill'
import { SearchInput } from '@/components/ui/search-input'
import { Note } from '@/components/ui/note'
import { IconPlus, IconShieldHalf, IconAlertCircle } from '@tabler/icons-react'

type Posicao = 'all' | 'atacante' | 'meia' | 'zagueiro' | 'goleiro'

// Opções de filtro por posição
const OPCOES_POSICAO: { value: Posicao; label: string }[] = [
  { value: 'all',      label: 'Todos'    },
  { value: 'atacante', label: 'Atacante' },
  { value: 'meia',     label: 'Meia'     },
  { value: 'zagueiro', label: 'Zagueiro' },
  { value: 'goleiro',  label: 'Goleiro'  },
]

/* ─── MOCK DATA ─── */
const MOCK_JOGADORES = [
  { id: '1', name: 'Matheus Lima',  nickname: 'Mathinho',    position: 'atacante', overall: 82, isGk: false, isActive: true  },
  { id: '2', name: 'Diego Mota',    nickname: 'Motinha',     position: 'goleiro',  overall: 78, isGk: true,  isActive: true  },
  { id: '3', name: 'João Victor',   nickname: 'JV',          position: 'meia',     overall: 79, isGk: false, isActive: true  },
  { id: '4', name: 'Rodrigo Neves', nickname: 'Rodriguinho', position: 'atacante', overall: 76, isGk: false, isActive: true  },
  { id: '5', name: 'Felipe Ramos',  nickname: 'Felipão',     position: 'zagueiro', overall: 74, isGk: false, isActive: false },
  { id: '6', name: 'André Costa',   nickname: 'Andrézinho',  position: 'atacante', overall: 80, isGk: false, isActive: true  },
]

// TODO: pegar role do contexto de autenticação
const IS_ADMIN = true
const TOTAL_MENSALISTAS_ATIVOS = 18  // buscar de /api/monthly-roster

export default function ElencoPage() {
  const [busca, setBusca] = useState('')
  const [posicao, setPosicao] = useState<Posicao>('all')

  // Filtra por nome e posição simultaneamente
  const jogadoresFiltrados = MOCK_JOGADORES.filter(p => {
    const correspondeBusca  = p.name.toLowerCase().includes(busca.toLowerCase())
    const correspondePosicao = posicao === 'all' || p.position === posicao
    return correspondeBusca && correspondePosicao
  })

  return (
    <AppLayout title="Elenco" user={{ name: 'Admin', role: 'admin' }}>
      {/* Aviso de capacidade quando próximo do limite de 20 mensalistas */}
      {TOTAL_MENSALISTAS_ATIVOS >= 18 && (
        <Note tone="amber" icon={<IconAlertCircle />} className="mb-4">
          {TOTAL_MENSALISTAS_ATIVOS}/20 mensalistas ativos.{' '}
          {TOTAL_MENSALISTAS_ATIVOS >= 20
            ? 'Limite atingido. Novas adições serão bloqueadas.'
            : 'Quase no limite.'}
        </Note>
      )}

      {/* Barra de filtros e botão de adicionar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-5">
        <SearchInput
          placeholder="Buscar jogador…"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="w-full sm:w-64"
        />
        <PillGroup options={OPCOES_POSICAO} value={posicao} onChange={setPosicao} />
        <div className="flex-1" />
        {IS_ADMIN && (
          <Button variant="primary" icon={<IconPlus size={17} />} size="sm">
            Novo jogador
          </Button>
        )}
      </div>

      {/* Grid responsivo de cards de jogadores */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {jogadoresFiltrados.map(jogador => (
          <CardJogador key={jogador.id} jogador={jogador} isAdmin={IS_ADMIN} />
        ))}
        {jogadoresFiltrados.length === 0 && (
          <p className="col-span-full text-center text-ink-3 py-10">Nenhum jogador encontrado.</p>
        )}
      </div>
    </AppLayout>
  )
}

// Card individual de jogador com link para perfil detalhado
function CardJogador({ jogador, isAdmin: _isAdmin }: {
  jogador: typeof MOCK_JOGADORES[0]
  isAdmin: boolean
}) {
  return (
    <a
      href={`/elenco/${jogador.id}`}
      className="bg-surface border border-border rounded-xl p-4 shadow-sm hover:shadow hover:-translate-y-0.5 transition-all duration-150 flex flex-col items-center gap-3 text-center no-underline text-ink"
    >
      <Avatar
        name={jogador.name}
        size="lg"
        kind={jogador.isGk ? 'gk' : 'member'}
      />
      <div>
        <p className="font-semibold text-[14px]">{jogador.name}</p>
        <p className="text-ink-3 text-[12px]">@{jogador.nickname}</p>
      </div>

      {/* Badges de posição, isenção de goleiro e status inativo */}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <Badge tone="muted">{jogador.position}</Badge>
        {jogador.isGk && <Badge tone="gold" icon={<IconShieldHalf size={11} />}>Isento</Badge>}
        {!jogador.isActive && <Badge tone="amber">Inativo</Badge>}
      </div>

      <div className="mt-auto w-full pt-3 border-t border-line flex items-center justify-between">
        <span className="text-[12px] text-ink-3">Overall</span>
        <span className="font-cond font-bold text-20 text-navy">{jogador.overall}</span>
      </div>
    </a>
  )
}
