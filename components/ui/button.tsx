'use client'
import { cn } from '@/lib/utils'
import { IconLoader2 } from '@tabler/icons-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'red' | 'gold' | 'ghost' | 'danger'
export type ButtonSize    = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?:    ButtonSize
  block?:   boolean
  loading?: boolean
  icon?:    ReactNode
}

// Mapeamento de variante → classes de cor e borda
const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-navy text-white hover:bg-navy-700',
  red:     'bg-red text-white hover:bg-red-dark',
  gold:    'bg-gold text-[#3a2a00] hover:bg-gold-deep',
  ghost:   'bg-surface text-ink-2 border border-border-strong hover:bg-surface-2',
  danger:  'bg-surface text-red border border-red/30 hover:bg-red-light',
}

// Mapeamento de tamanho → padding, texto e raio
const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-13 rounded-md gap-1.5',
  md: 'px-4 py-2.5 text-sm  rounded-lg gap-1.5',
  lg: 'px-5 py-3   text-15  rounded-xl gap-2',
}

// Botão principal do design system com suporte a variantes, tamanhos e estado de loading
export function Button({
  variant = 'primary',
  size    = 'md',
  block   = false,
  loading = false,
  icon,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-semibold',
        'transition-colors duration-150 ease-brand',
        'focus-visible:outline-none focus-visible:shadow-focus',
        'disabled:opacity-50 disabled:pointer-events-none',
        variantClasses[variant],
        sizeClasses[size],
        block && 'w-full',
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading
        ? <IconLoader2 size={16} className="animate-spin" />
        : icon}
      {children}
    </button>
  )
}
