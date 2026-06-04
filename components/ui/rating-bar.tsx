import { cn } from '@/lib/utils'

export interface PlayerRating {
  speed:     number  // velocidade
  finishing: number  // finalização
  passing:   number  // passe
  dribbling: number  // drible
  defense:   number  // defesa
  overall:   number  // calculado automaticamente pelo banco
}

// Atributos exibidos na barra de rating com seus rótulos em português
const ATRIBUTOS: { key: keyof Omit<PlayerRating, 'overall'>; label: string }[] = [
  { key: 'speed',     label: 'Velocidade'  },
  { key: 'finishing', label: 'Finalização' },
  { key: 'passing',   label: 'Passe'       },
  { key: 'dribbling', label: 'Drible'      },
  { key: 'defense',   label: 'Defesa'      },
]

interface RatingBarProps {
  rating:     PlayerRating
  className?: string
}

// Barras de atributos com gradiente navy para visualizar o rating de habilidade
export function RatingBar({ rating, className }: RatingBarProps) {
  return (
    <div className={cn('space-y-2.5', className)}>
      {ATRIBUTOS.map(({ key, label }) => (
        <div key={key} className="flex items-center gap-3">
          <span className="text-13 text-ink-2 w-24 shrink-0">{label}</span>
          <div className="flex-1 h-2 bg-surface-3 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-navy-400 to-navy"
              style={{ width: `${(rating[key] / 10) * 100}%` }}
            />
          </div>
          <span className="font-cond font-bold text-[16px] text-ink w-5 text-right tabular-nums">
            {rating[key]}
          </span>
        </div>
      ))}
    </div>
  )
}

interface OverallBadgeProps {
  value:      number
  size?:      'sm' | 'md' | 'lg'
  className?: string
}

// Badge circular que exibe o overall do jogador em destaque
export function OverallBadge({ value, size = 'md', className }: OverallBadgeProps) {
  const tamanhos = {
    sm: 'w-10 h-10 text-[16px]',
    md: 'w-14 h-14 text-20',
    lg: 'w-[76px] h-[76px] text-[28px]',
  }
  return (
    <div
      className={cn(
        'rounded-full bg-navy text-white flex items-center justify-center font-cond font-bold tabular-nums',
        tamanhos[size],
        className,
      )}
    >
      {value}
    </div>
  )
}
