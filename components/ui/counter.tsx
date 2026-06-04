'use client'
import { cn } from '@/lib/utils'

interface CounterProps {
  value:      number
  min?:       number
  max?:       number
  onChange:   (v: number) => void
  className?: string
}

// Contador incrementável/decrementável para registro de gols por jogador
export function Counter({ value, min = 0, max = 99, onChange, className }: CounterProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="w-7 h-7 rounded-full border border-border-strong bg-surface flex items-center justify-center text-ink-2 text-[17px] leading-none disabled:opacity-40 hover:bg-surface-2 transition-colors"
        aria-label="Diminuir"
      >
        −
      </button>
      {/* Número fica em vermelho quando maior que zero para indicar registro ativo */}
      <span
        className={cn(
          'font-cond font-bold text-[18px] min-w-[22px] text-center tabular-nums',
          value > 0 ? 'text-red' : 'text-ink',
        )}
      >
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="w-7 h-7 rounded-full border border-border-strong bg-surface flex items-center justify-center text-ink-2 text-[17px] leading-none disabled:opacity-40 hover:bg-surface-2 transition-colors"
        aria-label="Aumentar"
      >
        +
      </button>
    </div>
  )
}
