import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export type BadgeTone = 'navy' | 'red' | 'gold' | 'green' | 'amber' | 'muted'

interface BadgeProps {
  tone?:      BadgeTone
  icon?:      ReactNode
  className?: string
  children:   ReactNode
}

// Mapeamento de tom → classes de cor para o badge
const toneClasses: Record<BadgeTone, string> = {
  navy:  'bg-[#EBF0FA] text-navy-600',
  red:   'bg-red-light text-red-dark',
  gold:  'bg-gold-light text-gold-text border border-[#E8D9AC]',
  green: 'bg-green-light text-green',
  amber: 'bg-amber-light text-amber',
  muted: 'bg-surface-3 text-ink-2',
}

// Badge/etiqueta para status, categorias e indicadores
export function Badge({ tone = 'muted', icon, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-pill',
        'text-[11.5px] font-semibold leading-[1.3] whitespace-nowrap',
        toneClasses[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  )
}
