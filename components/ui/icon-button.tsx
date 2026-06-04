'use client'
import { cn } from '@/lib/utils'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon:       ReactNode
  label:      string
  active?:    boolean
}

// Botão quadrado com apenas ícone, ideal para ações secundárias em toolbars
export function IconButton({ icon, label, active, className, ...props }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={cn(
        'w-9 h-9 rounded-lg border border-border flex items-center justify-center',
        'text-ink-2 text-[17px] transition-colors duration-150',
        'hover:bg-surface-2 hover:text-ink',
        'focus-visible:outline-none focus-visible:shadow-focus',
        active && 'bg-surface-3 text-ink',
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  )
}
