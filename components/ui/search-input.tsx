'use client'
import { cn } from '@/lib/utils'
import { IconSearch } from '@tabler/icons-react'
import type { InputHTMLAttributes } from 'react'

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string
}

// Campo de busca com ícone de lupa integrado
export function SearchInput({ className, ...props }: SearchInputProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 bg-surface border border-border-strong rounded-lg px-3 py-2.5',
        className,
      )}
    >
      <IconSearch size={17} className="text-ink-3 shrink-0" />
      <input
        className="flex-1 text-[14px] bg-transparent outline-none text-ink placeholder:text-ink-3"
        {...props}
      />
    </div>
  )
}
