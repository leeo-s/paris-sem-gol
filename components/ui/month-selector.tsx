'use client'
import { cn } from '@/lib/utils'
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

interface MonthSelectorProps {
  month:      number  // 1-12
  year:       number
  onPrev:     () => void
  onNext:     () => void
  className?: string
}

// Seletor de mês/ano com navegação por setas para filtros de período
export function MonthSelector({ month, year, onPrev, onNext, className }: MonthSelectorProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 bg-surface border border-border-strong rounded-lg px-2.5 py-1.5',
        className,
      )}
    >
      <button
        type="button"
        onClick={onPrev}
        className="text-ink-2 hover:text-ink transition-colors"
        aria-label="Mês anterior"
      >
        <IconChevronLeft size={18} />
      </button>
      <span className="font-semibold text-[14px] min-w-[96px] text-center select-none">
        {MESES[month - 1]} {year}
      </span>
      <button
        type="button"
        onClick={onNext}
        className="text-ink-2 hover:text-ink transition-colors"
        aria-label="Próximo mês"
      >
        <IconChevronRight size={18} />
      </button>
    </div>
  )
}
