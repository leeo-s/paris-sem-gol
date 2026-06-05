"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { navigation } from "./navigation"

export default function StyleguideLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar - Fixed */}
      <aside className="w-60 border-r border-border bg-sidebar flex flex-col gap-6 fixed top-0 left-0 h-screen overflow-y-auto">
        <div className="px-6 py-5 border-b border-sidebar-border">
          <Link href="/styleguide" className="flex flex-col gap-0.5">
            <span className="font-heading text-xl tracking-widest text-sidebar-primary uppercase">
              Paris Sem Gol
            </span>
            <span className="text-xs text-sidebar-foreground/60">Design System</span>
          </Link>
        </div>

        <nav className="flex flex-col gap-6 px-4 pb-6">
          {navigation.map((section) => (
            <div key={section.title}>
              <h3 className="text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-widest mb-2 px-2">
                {section.title}
              </h3>
              <ul className="flex flex-col gap-0.5">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "block px-3 py-2 rounded-md text-sm transition-colors",
                        pathname === item.href
                          ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-60 overflow-auto">
        {children}
      </main>
    </div>
  )
}
