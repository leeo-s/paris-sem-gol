import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export interface Column<T> {
  key:        string
  header:     string
  cell:       (row: T) => ReactNode
  align?:     'left' | 'right' | 'center'
  className?: string
}

type EstadoDaLinha = 'default' | 'late' | 'exempt'

interface TableProps<T> {
  columns:       Column<T>[]
  rows:          T[]
  rowState?:     (row: T) => EstadoDaLinha
  keyFn?:        (row: T) => string | number
  className?:    string
  emptyMessage?: string
}

// Cor de fundo por estado da linha: atrasado em vermelho suave, isento em dourado suave
const rowStateClass: Record<EstadoDaLinha, string> = {
  default: '',
  late:    'bg-[#FDF3F4]',
  exempt:  'bg-gold-light',
}

const alignClass = { left: 'text-left', right: 'text-right', center: 'text-center' }

// Tabela de dados genérica com suporte a colunas tipadas e estados de linha
export function DataTable<T>({
  columns, rows, rowState, keyFn, className, emptyMessage = 'Nenhum registro.',
}: TableProps<T>) {
  return (
    <div className={cn('bg-surface border border-border rounded-lg overflow-hidden shadow-sm', className)}>
      <table className="w-full border-collapse text-[13.5px]">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-3.5 py-[11px] text-[11.5px] font-bold text-ink-2 uppercase tracking-[.04em]',
                  'bg-surface-2 border-b border-border',
                  alignClass[col.align ?? 'left'],
                  col.className,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3.5 py-6 text-center text-ink-3">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => {
              const state = rowState?.(row) ?? 'default'
              return (
                <tr
                  key={keyFn ? keyFn(row) : i}
                  className={cn('border-b border-line last:border-0', rowStateClass[state])}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn('px-3.5 py-[11px] align-middle', alignClass[col.align ?? 'left'], col.className)}
                    >
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}

// Célula auxiliar para exibir nome, subtítulo e avatar dentro de uma coluna
export function CellUser({ name, sub, avatarSlot }: { name: string; sub?: string; avatarSlot?: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      {avatarSlot}
      <div>
        <p className="font-semibold">{name}</p>
        {sub && <p className="text-[11.5px] text-ink-3">{sub}</p>}
      </div>
    </div>
  )
}
