'use client'
import { cn } from '@/lib/utils'
import type { InputHTMLAttributes, ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?:     string
  hint?:      string
  error?:     string
  icon?:      ReactNode
}

// Campo de texto com suporte a label, hint, estado de erro e ícone à esquerda
export function Input({ label, hint, error, icon, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-[12.5px] font-semibold text-ink-2">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 text-[17px] pointer-events-none">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          className={cn(
            'w-full bg-surface border rounded-lg px-3 py-[11px] text-[14.5px] text-ink',
            'placeholder:text-ink-3 transition-shadow duration-150',
            'focus:outline-none focus:border-navy focus:shadow-focus',
            error ? 'border-red' : 'border-border-strong',
            icon && 'pl-9',
            className,
          )}
          {...props}
        />
      </div>
      {error && <p className="text-[11.5px] text-red">{error}</p>}
      {hint && !error && <p className="text-[11.5px] text-ink-3">{hint}</p>}
    </div>
  )
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?:  string
  error?: string
}

// Área de texto multi-linha com mesma aparência do Input
export function Textarea({ label, hint, error, className, id, ...props }: TextareaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-[12.5px] font-semibold text-ink-2">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={cn(
          'w-full bg-surface border rounded-lg px-3 py-[11px] text-[14.5px] text-ink resize-none',
          'placeholder:text-ink-3 transition-shadow duration-150',
          'focus:outline-none focus:border-navy focus:shadow-focus',
          error ? 'border-red' : 'border-border-strong',
          className,
        )}
        {...props}
      />
      {error && <p className="text-[11.5px] text-red">{error}</p>}
      {hint && !error && <p className="text-[11.5px] text-ink-3">{hint}</p>}
    </div>
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?:   string
  hint?:    string
  error?:   string
  options:  { value: string; label: string }[]
}

// Select nativo com estilo consistente ao Input e Textarea
export function Select({ label, hint, error, options, className, id, ...props }: SelectProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-[12.5px] font-semibold text-ink-2">
          {label}
        </label>
      )}
      <select
        id={inputId}
        className={cn(
          'w-full bg-surface border rounded-lg px-3 py-[11px] text-[14.5px] text-ink appearance-none',
          'focus:outline-none focus:border-navy focus:shadow-focus',
          error ? 'border-red' : 'border-border-strong',
          className,
        )}
        {...props}
      >
        {options.map((opcao) => (
          <option key={opcao.value} value={opcao.value}>{opcao.label}</option>
        ))}
      </select>
      {error && <p className="text-[11.5px] text-red">{error}</p>}
      {hint && !error && <p className="text-[11.5px] text-ink-3">{hint}</p>}
    </div>
  )
}
