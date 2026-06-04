import { cn } from '@/lib/utils'
import { Avatar } from './avatar'

export interface RankEntry {
  position:   number
  name:       string
  sub?:       string
  avatarUrl?: string | null
  value:      number | string
  unit?:      string
  barPct?:    number  // 0-100 para barra de progresso visual
  isGk?:      boolean
}

interface RankRowProps {
  entry:      RankEntry
  barColor?:  'navy' | 'gold'
  className?: string
}

// Cor do número de posição: dourado para 1º, prata para 2º, bronze para 3º
const coresPorPosicao: Record<number, string> = {
  1: 'text-gold-deep',
  2: 'text-[#8a8d99]',
  3: 'text-[#B07B2E]',
}

// Linha de ranking com posição, avatar, nome e valor numérico
export function RankRow({ entry, barColor = 'navy', className }: RankRowProps) {
  const { position, name, sub, avatarUrl, value, unit, barPct, isGk } = entry
  return (
    <div className={cn('flex items-center gap-3 py-2 border-b border-line last:border-0', className)}>
      <span
        className={cn(
          'font-cond font-bold text-[17px] w-[22px] text-center shrink-0',
          coresPorPosicao[position] ?? 'text-ink-3',
        )}
      >
        {position}
      </span>
      <Avatar src={avatarUrl} name={name} size="sm" kind={isGk ? 'gk' : 'member'} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[14px] truncate">{name}</p>
        {sub && <p className="text-[11.5px] text-ink-3 truncate">{sub}</p>}
      </div>
      {/* Barra de progresso visível apenas em telas maiores */}
      {barPct !== undefined && (
        <div className="w-[120px] h-1.5 bg-surface-3 rounded-full overflow-hidden hidden sm:block">
          <div
            className={cn('h-full rounded-full', barColor === 'gold' ? 'bg-gold' : 'bg-navy')}
            style={{ width: `${barPct}%` }}
          />
        </div>
      )}
      <span className="font-cond font-bold text-[18px] min-w-[26px] text-right tabular-nums">
        {value}
        {unit && <span className="text-[12px] text-ink-3 font-normal ml-0.5">{unit}</span>}
      </span>
    </div>
  )
}

interface RankListProps {
  entries:    RankEntry[]
  barColor?:  'navy' | 'gold'
  className?: string
}

// Lista completa de ranking renderizando múltiplas linhas
export function RankList({ entries, barColor, className }: RankListProps) {
  return (
    <div className={className}>
      {entries.map((entrada) => (
        <RankRow key={entrada.position} entry={entrada} barColor={barColor} />
      ))}
    </div>
  )
}
