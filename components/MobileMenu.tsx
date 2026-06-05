"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Swords,
  Users,
  BarChart2,
  Trophy,
  Settings,
} from "lucide-react"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

const navItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Partidas", href: "/dashboard/partidas", icon: Swords },
  { title: "Jogadores", href: "/dashboard/jogadores", icon: Users },
  { title: "Classificação", href: "/dashboard/classificacao", icon: BarChart2 },
  { title: "Torneios", href: "/dashboard/torneios", icon: Trophy },
]

const footerItems = [
  { title: "Configurações", href: "/dashboard/configuracoes", icon: Settings },
]

interface MobileMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MobileMenu({ open, onOpenChange }: MobileMenuProps) {
  const pathname = usePathname()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        showCloseButton={false}
        className="flex flex-col gap-0 p-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border w-72"
      >
        {/* Header */}
        <SheetHeader className="px-5 py-6 border-b border-sidebar-border">
          <SheetTitle className="font-heading text-2xl tracking-wide text-sidebar-primary">
            PARIS SEM GOL
          </SheetTitle>
        </SheetHeader>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3 px-3">
          <p className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/50">
            Menu
          </p>
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <li key={item.title}>
                  <SheetClose render={<Link href={item.href} />}>
                    <span
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-primary"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                    >
                      <item.icon
                        className="size-4 shrink-0"
                        strokeWidth={isActive ? 2.5 : 1.75}
                      />
                      {item.title}
                      {isActive && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary" />
                      )}
                    </span>
                  </SheetClose>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Footer */}
        <SheetFooter className="flex-col gap-0 p-3 border-t border-sidebar-border">
          {footerItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <SheetClose key={item.title} render={<Link href={item.href} />}>
                <span
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon
                    className="size-4 shrink-0"
                    strokeWidth={isActive ? 2.5 : 1.75}
                  />
                  {item.title}
                </span>
              </SheetClose>
            )
          })}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
