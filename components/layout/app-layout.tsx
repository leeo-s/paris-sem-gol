'use client'
import { cn } from '@/lib/utils'
import { Sidebar } from './sidebar'
import { BottomNav } from './bottom-nav'
import { TopBar } from './top-bar'
import type { ReactNode } from 'react'

interface AppLayoutProps {
  title:      string
  crumb?:     string
  actions?:   ReactNode
  user?:      { name: string; role: string; avatarUrl?: string | null }
  children:   ReactNode
  className?: string
}

// Layout principal das páginas autenticadas: sidebar (desktop) + bottom-nav (mobile)
export function AppLayout({ title, crumb, actions, user, children, className }: AppLayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* Sidebar fixa — visível apenas em desktop */}
      <Sidebar className="hidden md:flex"/>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* TopBar — visível apenas em desktop */}
        <TopBar
          title={title}
          crumb={crumb}
          actions={actions}
          user={user}
          className="hidden md:flex"
        />

        {/* Área de conteúdo com scroll independente */}
        <main className={cn('flex-1 overflow-y-auto p-7', className)}>
          {children}
        </main>

        {/* Bottom nav — visível apenas em mobile */}
        <BottomNav className="md:hidden" />
      </div>
    </div>
  )
}
