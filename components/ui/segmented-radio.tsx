'use client'
import { cn } from '@/lib/utils'

interface SegOption<T> {
  value:     T
  title:     string
  subtitle?: string
  tone?:     'default' | 'green' | 'red'
}

interface SegmentedRadioProps<T extends string> {
  options:    SegOption<T>[]
  value:      T
  onChange:   (v: T) => void
  className?: string
}

// Classes de seleção por tom — usadas para indicar estados positivo/negativo
const selectedClasses = {
  default: 'border-navy bg-[#EFF3FB] shadow-[0_0_0_1px_#0D1B3E_inset]',
  green:   'border-green bg-green-light',
  red:     'border-red bg-red-light',
}

// Seletor de opções em forma de cartões empilhados (ex: resultado de rodada)
export function SegmentedRadio<T extends string>({ options, value, onChange, className }: SegmentedRadioProps<T>) {
  return (
    <div className={cn('grid gap-2.5', className)}>
      {options.map((opcao) => {
        const estaSelecionado = opcao.value === value
        const tom = opcao.tone ?? 'default'
        return (
          <button
            key={opcao.value}
            type="button"
            onClick={() => onChange(opcao.value)}
            className={cn(
              'border rounded-xl p-3.5 text-left bg-surface transition-all duration-150',
              'border-border-strong',
              estaSelecionado && selectedClasses[tom],
            )}
          >
            <p className="font-semibold text-[14px] text-ink">{opcao.title}</p>
            {opcao.subtitle && <p className="text-[12px] text-ink-2 mt-0.5">{opcao.subtitle}</p>}
          </button>
        )
      })}
    </div>
  )
}
