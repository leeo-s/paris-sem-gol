import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export type NoteTone = 'gold' | 'red' | 'navy' | 'muted' | 'amber'

interface NoteProps {
  tone?:      NoteTone
  icon?:      ReactNode
  className?: string
  children:   ReactNode
}

// Classes de cor por contexto de nota: aviso, erro, info, alerta ou neutro
const toneClasses: Record<NoteTone, string> = {
  gold:  'bg-gold-light border border-[#E8D9AC] text-gold-text',
  red:   'bg-red-light border border-red/30 text-red-dark',
  navy:  'bg-[#EFF3FB] border border-[#D2DCEF] text-navy-600',
  muted: 'bg-surface-2 border border-border text-ink-2',
  amber: 'bg-amber-light border border-amber/30 text-amber',
}

// Bloco de nota informativa com ícone e texto contextual
export function Note({ tone = 'muted', icon, className, children }: NoteProps) {
  return (
    <div
      className={cn(
        'rounded-xl p-3 text-13 flex items-start gap-2.5 leading-[1.45]',
        toneClasses[tone],
        className,
      )}
    >
      {icon && <span className="text-[18px] shrink-0 mt-px">{icon}</span>}
      <span>{children}</span>
    </div>
  )
}
