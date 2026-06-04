import { cn } from '@/lib/utils'
import Image from 'next/image'
import { IconBell } from '@tabler/icons-react'
import type { ReactNode } from 'react'

interface TopBarProps {
  title:      string
  crumb?:     string
  actions?:   ReactNode
  user?:      { name: string; role: string; avatarUrl?: string | null }
  className?: string
}

// Barra superior do layout desktop com título, ações, notificações e avatar do usuário
export function TopBar({ title, crumb, actions, user, className }: TopBarProps) {
  return (
    <header
      className={cn(
        'h-[60px] bg-surface border-b border-border flex items-center gap-3.5 px-6 shrink-0',
        className,
      )}
    >
      <div className="flex flex-col">
        {crumb && <span className="text-13 font-medium text-ink-3 leading-none mb-0.5">{crumb}</span>}
        <h1 className="font-cond uppercase text-20 tracking-[.01em] leading-none">{title}</h1>
      </div>
      <div className="flex-1" />
      {actions}

      {/* Sino de notificações com indicador vermelho */}
      <button
        type="button"
        aria-label="Notificações"
        className="relative w-[38px] h-[38px] rounded-lg flex items-center justify-center text-ink-2 text-[19px] hover:bg-surface-2 transition-colors"
      >
        <IconBell size={19} />
        <span className="absolute top-[7px] right-2 w-[7px] h-[7px] bg-red rounded-full border-[1.5px] border-white" />
      </button>

      {user && (
        <div className="flex items-center gap-2.5 pl-1.5">
          <div className="text-right leading-[1.15]">
            <p className="text-[13.5px] font-semibold">{user.name}</p>
            <p className="text-[11.5px] text-ink-3 capitalize">{user.role}</p>
          </div>
          {/* Avatar do usuário logado com fallback de iniciais */}
          <div className="w-9 h-9 rounded-full bg-navy-600 text-white flex items-center justify-center font-semibold text-13 shrink-0 overflow-hidden">
            {user.avatarUrl
              ? <Image src={user.avatarUrl} alt={user.name} width={36} height={36} className="object-cover w-full h-full" />
              : user.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
            }
          </div>
        </div>
      )}
    </header>
  )
}
