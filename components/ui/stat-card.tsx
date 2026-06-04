import { cn } from '@/lib/utils'

export type StatAccent      = 'navy' | 'red' | 'gold' | 'green' | 'none'
export type StatValueColor  = 'default' | 'green' | 'red' | 'gold' | 'navy'

interface StatCardProps {
  value:       string | number
  label:       string
  accent?:     StatAccent
  valueColor?: StatValueColor
  className?:  string
}

// Borda esquerda colorida por acento para indicar categoria da métrica
const accentBorder: Record<StatAccent, string> = {
  navy:  'border-l-4 border-l-navy',
  red:   'border-l-4 border-l-red',
  gold:  'border-l-4 border-l-gold',
  green: 'border-l-4 border-l-green',
  none:  '',
}

// Cor do valor numérico por contexto (positivo, negativo, destaque)
const valueColors: Record<StatValueColor, string> = {
  default: 'text-ink',
  green:   'text-green',
  red:     'text-red',
  gold:    'text-gold-deep',
  navy:    'text-navy',
}

// Card de estatística com valor grande em destaque e rótulo descritivo
export function StatCard({ value, label, accent = 'none', valueColor = 'default', className }: StatCardProps) {
  return (
    <div
      className={cn(
        'bg-surface border border-border rounded-lg px-4 py-3.5 shadow-sm',
        accentBorder[accent],
        className,
      )}
    >
      <p className={cn('font-cond font-bold text-30 leading-none tabular-nums', valueColors[valueColor])}>
        {value}
      </p>
      <p className="text-[12.5px] text-ink-2 mt-1">{label}</p>
    </div>
  )
}
