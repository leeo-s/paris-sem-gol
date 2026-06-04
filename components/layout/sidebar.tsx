'use client'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  IconHome, IconUsers, IconCoin, IconBallFootball,
  IconTrophy, IconStar, IconEye, IconSettings,
} from '@tabler/icons-react'

export type NavKey =
  | 'dashboard' | 'elenco' | 'financeiro' | 'partidas'
  | 'campeonatos' | 'destaques' | 'transparencia' | 'config'

// Itens de navegação principal — proteger por role no middleware quando necessário
const NAV_ITEMS: { key: NavKey; label: string; href: string; Icon: React.ElementType }[] = [
  { key: 'dashboard',     label: 'Início',    href: '/dashboard',     Icon: IconHome },
  { key: 'elenco',        label: 'Elenco',    href: '/elenco',        Icon: IconUsers },
  { key: 'financeiro',    label: 'Finanças',  href: '/financeiro',    Icon: IconCoin },
  { key: 'partidas',      label: 'Partidas',  href: '/partidas',      Icon: IconBallFootball },
  { key: 'campeonatos',   label: 'Ligas',     href: '/campeonatos',   Icon: IconTrophy },
  { key: 'destaques',     label: 'Destaques', href: '/destaques',     Icon: IconStar },
  { key: 'transparencia', label: 'Clube',     href: '/transparencia', Icon: IconEye },
]

interface SidebarProps {
  className?: string
}

// Sidebar fixa em navy — visível apenas no desktop (md+)
export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()

  return (
    <nav
      className={cn(
        'w-[78px] bg-navy flex flex-col items-center py-4 gap-1.5 shrink-0',
        className,
      )}
    >
      {/* Logo circular com anel dourado */}
      <div className="relative w-[46px] h-[46px] rounded-full mb-2.5 ring-2 ring-gold/55 overflow-hidden shrink-0">
        <Image src="/assets/logo.jpeg" alt="Paris Sem Gol" fill className="object-cover" />
      </div>

      {/* Itens de navegação principal */}
      {NAV_ITEMS.map(({ key, label, href, Icon }) => {
        const ativo = pathname.startsWith(href)
        return (
          <SidebarItem key={key} href={href} label={label} icon={<Icon size={21} />} active={ativo} />
        )
      })}

      <div className="flex-1" />

      {/* Configurações — visível apenas para admin */}
      <SidebarItem
        href="/configuracoes"
        label="Config"
        icon={<IconSettings size={21} />}
        active={pathname === '/configuracoes'}
      />
    </nav>
  )
}

interface SidebarItemProps {
  href:       string
  label:      string
  icon:       React.ReactNode
  active?:    boolean
  className?: string
}

// Item individual da sidebar com indicador vermelho na borda esquerda quando ativo
export function SidebarItem({ href, label, icon, active, className }: SidebarItemProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        'relative w-[50px] h-[46px] rounded-xl flex flex-col items-center justify-center gap-0.5',
        'text-navy-200 no-underline transition-colors duration-150',
        'hover:text-white hover:bg-white/[.06]',
        active && 'text-white bg-navy-600',
        className,
      )}
    >
      {/* Marcador vermelho na lateral esquerda indica a rota ativa */}
      {active && (
        <span className="absolute -left-[14px] top-1/2 -translate-y-1/2 w-1 h-6 bg-red rounded-r-[3px]" />
      )}
      {icon}
      <span className="text-[9px] font-semibold tracking-[.02em] leading-none">{label}</span>
    </Link>
  )
}
