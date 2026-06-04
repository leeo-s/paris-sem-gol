'use client'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface PillProps {
  selected?:  boolean
  tone?:      'navy' | 'red'
  className?: string
  children:   ReactNode
  onClick?:   () => void
}

// Pill/chip de filtro com estado ativo por tom de cor
export function Pill({ selected, tone = 'navy', className, children, onClick }: PillProps) {
  const activeClass =
    tone === 'red'
      ? 'bg-red-light border-red/30 text-red-dark'
      : 'bg-navy text-white border-navy'

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'bg-surface border border-border-strong rounded-pill px-3.5 py-1.5',
        'text-13 font-medium text-ink-2 transition-colors duration-150',
        'hover:bg-surface-2',
        selected && activeClass,
        className,
      )}
    >
      {children}
    </button>
  )
}

interface PillGroupProps<T extends string> {
  options:  { value: T; label: string }[]
  value:    T
  onChange: (v: T) => void
  tone?:    'navy' | 'red'
}

// Grupo de pills para barra de filtros com seleção exclusiva
export function PillGroup<T extends string>({ options, value, onChange, tone }: PillGroupProps<T>) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opcao) => (
        <Pill
          key={opcao.value}
          selected={value === opcao.value}
          tone={tone}
          onClick={() => onChange(opcao.value)}
        >
          {opcao.label}
        </Pill>
      ))}
    </div>
  )
}
