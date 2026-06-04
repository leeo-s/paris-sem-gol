import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface CardProps {
  title?:     string
  icon?:      ReactNode
  actions?:   ReactNode
  tone?:      'default' | 'navy'
  padding?:   boolean
  className?: string
  children:   ReactNode
}

// Card com variante navy para painéis de destaque e variante padrão para conteúdo geral
export function Card({
  title, icon, actions, tone = 'default', padding = true, className, children,
}: CardProps) {
  const ehNavy = tone === 'navy'
  return (
    <div
      className={cn(
        'rounded-xl border shadow-sm',
        ehNavy
          ? 'bg-navy border-navy text-white'
          : 'bg-surface border-border',
        padding && 'p-[18px]',
        className,
      )}
    >
      {/* Cabeçalho com título e ícone (sem actions) */}
      {title && !actions && (
        <div
          className={cn(
            'flex items-center gap-1.5 text-13 font-bold uppercase tracking-[.05em] mb-3.5',
            ehNavy ? 'text-navy-200' : 'text-ink-2',
          )}
        >
          {icon && <span className="text-[16px]">{icon}</span>}
          {title}
        </div>
      )}

      {/* Cabeçalho com título, ícone e ações no lado direito */}
      {actions && (
        <div className="flex items-center justify-between mb-3.5">
          <div className={cn('flex items-center gap-1.5 text-13 font-bold uppercase tracking-[.05em]', ehNavy ? 'text-navy-200' : 'text-ink-2')}>
            {icon && <span className="text-[16px]">{icon}</span>}
            {title}
          </div>
          {actions}
        </div>
      )}

      {children}
    </div>
  )
}

// Divisor horizontal para separar seções dentro de um Card
export function CardDivider({ className }: { className?: string }) {
  return <hr className={cn('border-0 border-t border-line my-3.5', className)} />
}
