// TODO: substituir MOCK_* pelos dados reais da API (/api/dashboard?month=X&year=Y)
import { AppLayout } from '@/components/layout/app-layout'
import { Card } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { RankList, type RankEntry } from '@/components/ui/rank-row'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import {
  IconBallFootball, IconUsers, IconShieldHalf,
  IconStar, IconCalendar, IconCake,
} from '@tabler/icons-react'

/* ─── MOCK DATA (substituir por fetch dos endpoints) ─── */
const MOCK_SCORERS: RankEntry[] = [
  { position: 1, name: 'Matheus Lima',  sub: 'Atacante', value: 8, barPct: 100 },
  { position: 2, name: 'João Victor',   sub: 'Meia',     value: 6, barPct: 75  },
  { position: 3, name: 'Rodrigo Neves', sub: 'Atacante', value: 5, barPct: 62  },
  { position: 4, name: 'Felipe Ramos',  sub: 'Meia',     value: 4, barPct: 50  },
  { position: 5, name: 'André Costa',   sub: 'Atacante', value: 3, barPct: 37  },
]

const MOCK_PRESENCE: RankEntry[] = [
  { position: 1, name: 'João Victor',   value: 4, unit: 'jg', barPct: 100 },
  { position: 2, name: 'Matheus Lima',  value: 4, unit: 'jg', barPct: 100 },
  { position: 3, name: 'André Costa',   value: 3, unit: 'jg', barPct: 75  },
  { position: 4, name: 'Rodrigo Neves', value: 3, unit: 'jg', barPct: 75  },
  { position: 5, name: 'Felipe Ramos',  value: 2, unit: 'jg', barPct: 50  },
]

const MOCK_GK: RankEntry[] = [
  { position: 1, name: 'Diego Mota',  sub: '1,2 gols/jg', value: 6,  isGk: true },
  { position: 2, name: 'Bruno Alves', sub: '1,5 gols/jg', value: 9,  isGk: true },
  { position: 3, name: 'Paulo Serra', sub: '2,0 gols/jg', value: 14, isGk: true },
]

const MOCK_MVP_HISTORY = [
  { date: '07/06', name: 'João Victor'   },
  { date: '14/06', name: 'Matheus Lima'  },
  { date: '21/06', name: 'Rodrigo Neves' },
]

const MOCK_BIRTHDAYS = [
  { name: 'André Costa',  date: '03/06', isToday: true  },
  { name: 'Felipe Ramos', date: '15/06', isToday: false },
]

export default function DashboardPage() {
  // TODO: const data = await fetch('/api/dashboard?month=6&year=2026').then(r => r.json())
  return (
    <AppLayout
      title="Destaques"
      crumb="Junho 2026"
      user={{ name: 'Admin', role: 'admin' }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

        {/* Próxima partida */}
        <Card title="Próxima partida" icon={<IconCalendar size={16} />} className="md:col-span-2 xl:col-span-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-cond font-bold text-24 leading-none">Sábado, 07/06</p>
              <p className="text-ink-2 text-[13.5px] mt-1">Campo do Parque Ibirapuera · 08h00</p>
            </div>
            <div className="text-right">
              <p className="font-cond font-bold text-30 text-green leading-none">18</p>
              <p className="text-[12px] text-ink-3">confirmados</p>
            </div>
          </div>
        </Card>

        {/* Saldo do caixa */}
        <StatCard value="R$ 2.840" label="Saldo do caixa" accent="green" valueColor="green" />

        {/* MVP do mês */}
        <Card title="MVP do mês" icon={<IconStar size={16} />} className="bg-navy border-navy text-white">
          <div className="flex items-center gap-4 pt-1">
            <Avatar name="Matheus Lima" size="lg" kind="member" />
            <div>
              <p className="font-cond font-bold text-[22px] leading-tight">Matheus Lima</p>
              <p className="text-navy-200 text-[13px] mt-0.5">12 votos em junho</p>
              <Badge tone="gold" className="mt-2">🏆 Craque do mês</Badge>
            </div>
          </div>
        </Card>

        {/* MVP por partida */}
        <Card title="MVP por partida" icon={<IconStar size={16} />}>
          <div className="space-y-2.5">
            {MOCK_MVP_HISTORY.map((m) => (
              <div key={m.date} className="flex items-center justify-between text-[13.5px]">
                <span className="font-cond font-bold text-[15px] text-ink-3">{m.date}</span>
                <span className="font-semibold">{m.name}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Artilheiros */}
        <Card title="Artilheiros do mês" icon={<IconBallFootball size={16} />}>
          <RankList entries={MOCK_SCORERS} />
        </Card>

        {/* Mais presentes */}
        <Card title="Mais presentes" icon={<IconUsers size={16} />}>
          <RankList entries={MOCK_PRESENCE} />
        </Card>

        {/* Goleiros */}
        <Card title="Goleiros menos vazados" icon={<IconShieldHalf size={16} />}>
          <RankList entries={MOCK_GK} barColor="gold" />
        </Card>

        {/* Aniversariantes */}
        <Card title="Aniversariantes" icon={<IconCake size={16} />}>
          <div className="space-y-3">
            {MOCK_BIRTHDAYS.map((b) => (
              <div key={b.name} className="flex items-center gap-3">
                <Avatar name={b.name} size="sm" />
                <span className="flex-1 font-semibold text-[14px]">{b.name}</span>
                <span className="text-[12px] text-ink-3">{b.date}</span>
                {b.isToday && <Badge tone="red">Hoje!</Badge>}
              </div>
            ))}
          </div>
        </Card>

      </div>
    </AppLayout>
  )
}
