"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Swords,
  Users,
  BarChart2,
  MoreHorizontal,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { MobileMenu } from "@/components/MobileMenu"

const primaryItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Partidas", href: "/dashboard/partidas", icon: Swords },
  { title: "Jogadores", href: "/dashboard/jogadores", icon: Users },
  { title: "Ranking", href: "/dashboard/classificacao", icon: BarChart2 },
]

export function BottomNav() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-stretch border-t border-sidebar-border bg-sidebar md:hidden">
        {primaryItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.title}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 text-xs transition-colors",
                isActive
                  ? "text-sidebar-primary"
                  : "text-sidebar-foreground/60 hover:text-sidebar-foreground"
              )}
            >
              <item.icon
                className={cn("size-5 transition-transform", isActive && "scale-110")}
                strokeWidth={isActive ? 2.5 : 1.75}
              />
              <span className={cn("font-sans", isActive && "font-semibold")}>
                {item.title}
              </span>
            </Link>
          )
        })}

        {/* More button */}
        <button
          onClick={() => setMenuOpen(true)}
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1 text-xs transition-colors",
            menuOpen
              ? "text-sidebar-primary"
              : "text-sidebar-foreground/60 hover:text-sidebar-foreground"
          )}
        >
          <MoreHorizontal
            className={cn("size-5 transition-transform", menuOpen && "scale-110")}
            strokeWidth={menuOpen ? 2.5 : 1.75}
          />
          <span className={cn("font-sans", menuOpen && "font-semibold")}>Mais</span>
        </button>
      </nav>

      <MobileMenu open={menuOpen} onOpenChange={setMenuOpen} />
    </>
  )
}
