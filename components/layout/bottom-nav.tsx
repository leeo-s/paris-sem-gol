'use client'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  IconHome, IconUsers, IconCoin, IconBallFootball, IconMenu2,
} from '@tabler/icons-react'

// Navegação inferior mobile — exibe 4 rotas principais e um "Mais" para o resto
const BOTTOM_ITEMS = [
  { key: 'dashboard',  label: 'Início',   href: '/dashboard',  Icon: IconHome },
  { key: 'elenco',     label: 'Elenco',   href: '/elenco',     Icon: IconUsers },
  { key: 'financeiro', label: 'Finanças', href: '/financeiro', Icon: IconCoin },
  { key: 'partidas',   label: 'Partidas', href: '/partidas',   Icon: IconBallFootball },
  { key: 'mais',       label: 'Mais',     href: '/mais',       Icon: IconMenu2 },
]

// Barra de navegação inferior em navy para uso em telas mobile (md:hidden)
export function BottomNav({ className }: { className?: string }) {
  const pathname = usePathname()
  return (
    <nav
      className={cn(
        'bg-navy flex justify-around px-1.5 pb-[env(safe-area-inset-bottom,14px)] pt-2 shrink-0',
        className,
      )}
    >
      {BOTTOM_ITEMS.map(({ key, label, href, Icon }) => {
        const ativo = pathname.startsWith(href) && href !== '/mais'
        return (
          <Link
            key={key}
            href={href}
            className={cn(
              'flex flex-col items-center gap-[3px] flex-1 no-underline',
              'text-[10px] font-semibold',
              ativo ? 'text-white' : 'text-navy-200',
            )}
          >
            {/* Ícone em dourado quando ativo */}
            <Icon size={23} className={ativo ? 'text-gold' : undefined} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
