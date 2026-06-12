"use client"

import { useState } from "react"
import {
  LayoutDashboard,
  Swords,
  Users,
  BarChart2,
  Trophy,
  Settings,
  MoreHorizontal,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet"

/* ── helpers ── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      <h2 className="font-heading text-2xl tracking-widest uppercase text-foreground mb-6 pb-2 border-b border-border">
        {title}
      </h2>
      {children}
    </section>
  )
}

function Code({ children }: { children: string }) {
  return (
    <pre className="mt-3 rounded-lg bg-muted p-4 text-xs font-mono text-muted-foreground overflow-x-auto whitespace-pre-wrap">
      {children}
    </pre>
  )
}

/* ── shared data ── */

const navItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Partidas", href: "/dashboard/partidas", icon: Swords },
  { title: "Jogadores", href: "/dashboard/jogadores", icon: Users },
  { title: "Classificação", href: "/dashboard/classificacao", icon: BarChart2 },
  { title: "Torneios", href: "/dashboard/torneios", icon: Trophy },
]

const primaryItems = navItems.slice(0, 4)

/* ── BottomNav preview ── */

function BottomNavPreview({
  activeHref,
  onMoreClick,
  menuOpen,
}: {
  activeHref: string
  onMoreClick: () => void
  menuOpen: boolean
}) {
  return (
    <div className="flex h-16 w-full max-w-sm rounded-xl overflow-hidden border border-sidebar-border bg-sidebar mx-auto">
      {primaryItems.map((item) => {
        const isActive = activeHref === item.href
        return (
          <div
            key={item.title}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 text-[10px]",
              isActive ? "text-sidebar-primary" : "text-sidebar-foreground/60"
            )}
          >
            <item.icon
              className={cn("size-4", isActive && "scale-110")}
              strokeWidth={isActive ? 2.5 : 1.75}
            />
            <span className={cn(isActive && "font-semibold")}>{item.title}</span>
          </div>
        )
      })}
      <button
        onClick={onMoreClick}
        className={cn(
          "flex flex-1 flex-col items-center justify-center gap-1 text-[10px] transition-colors",
          menuOpen ? "text-sidebar-primary" : "text-sidebar-foreground/60"
        )}
      >
        <MoreHorizontal className="size-4" strokeWidth={menuOpen ? 2.5 : 1.75} />
        <span className={cn(menuOpen && "font-semibold")}>Mais</span>
      </button>
    </div>
  )
}

/* ── page ── */

export default function MobileMenuShowcasePage() {
  const [open, setOpen] = useState(false)
  const [activeHref, setActiveHref] = useState("/dashboard")

  return (
    <div className="px-10 py-10 max-w-5xl">
      <div className="mb-12">
        <h1 className="font-heading text-5xl tracking-widest uppercase text-foreground">
          Mobile Menu
        </h1>
        <p className="text-muted-foreground mt-1">
          Sheet side=left triggered by the "Mais" button on BottomNav · Mobile only
        </p>
      </div>

      {/* ── Interactive demo ── */}
      <Section title="Interactive Demo">
        <p className="text-sm text-muted-foreground mb-4">
          Tap <strong>Mais</strong> on the bottom nav below to open the side menu.
        </p>
        <BottomNavPreview
          activeHref={activeHref}
          onMoreClick={() => setOpen(true)}
          menuOpen={open}
        />
        <p className="text-xs text-muted-foreground mt-3 text-center">
          ↑ Tap "Mais" to open the menu
        </p>

        {/* The actual Sheet — mocked with fixed active route */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            side="left"
            showCloseButton={false}
            className="flex flex-col gap-0 p-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border w-72"
          >
            <SheetHeader className="px-5 py-6 border-b border-sidebar-border">
              <SheetTitle className="font-heading text-2xl tracking-wide text-sidebar-primary">
                PARIS SEM GOL
              </SheetTitle>
            </SheetHeader>

            <nav className="flex-1 overflow-y-auto py-3 px-3">
              <p className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/50">
                Menu
              </p>
              <ul className="space-y-0.5">
                {navItems.map((item) => {
                  const isActive = activeHref === item.href
                  return (
                    <li key={item.title}>
                      <button
                        onClick={() => {
                          setActiveHref(item.href)
                          setOpen(false)
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
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
                      </button>
                    </li>
                  )
                })}
              </ul>
            </nav>

            <SheetFooter className="flex-col gap-0 p-3 border-t border-sidebar-border">
              <button
                onClick={() => {
                  setActiveHref("/dashboard/configuracoes")
                  setOpen(false)
                }}
                className={cn(
                  "w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  activeHref === "/dashboard/configuracoes"
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <Settings className="size-4 shrink-0" />
                Configurações
              </button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        <div className="mt-4 flex flex-wrap gap-2">
          <p className="w-full text-sm text-muted-foreground">Active route:</p>
          {[...navItems, { title: "Configurações", href: "/dashboard/configuracoes", icon: Settings }].map((item) => (
            <button
              key={item.href}
              onClick={() => setActiveHref(item.href)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-medium border transition-colors",
                activeHref === item.href
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {item.title}
            </button>
          ))}
        </div>
      </Section>

      {/* ── Anatomy ── */}
      <Section title="Anatomy">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2 p-5 bg-card rounded-xl border border-border">
            <p className="text-sm font-semibold">BottomNav</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>4 primary Link items (visible at all times)</li>
              <li>"Mais" button → sets <code className="font-mono text-xs">menuOpen = true</code></li>
              <li>Renders <code className="font-mono text-xs">&lt;MobileMenu /&gt;</code> alongside</li>
            </ul>
          </div>
          <div className="space-y-2 p-5 bg-card rounded-xl border border-border">
            <p className="text-sm font-semibold">MobileMenu</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Controlled Sheet (<code className="font-mono text-xs">open / onOpenChange</code>)</li>
              <li><code className="font-mono text-xs">side="left"</code> — slides in from left</li>
              <li>Navy bg using <code className="font-mono text-xs">bg-sidebar</code> tokens</li>
              <li>Active item has gold text + dot indicator</li>
              <li>SheetClose wraps each nav Link — closes on tap</li>
            </ul>
          </div>
        </div>
      </Section>

      {/* ── Code examples ── */}
      <Section title="Usage">
        <Code>{`// BottomNav.tsx (simplified)
import { useState } from "react"
import { MobileMenu } from "@/components/MobileMenu"

export function BottomNav() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 md:hidden ...">
        {/* 4 primary Link items */}
        <button onClick={() => setMenuOpen(true)}>
          <MoreHorizontal />
          <span>Mais</span>
        </button>
      </nav>

      <MobileMenu open={menuOpen} onOpenChange={setMenuOpen} />
    </>
  )
}`}
        </Code>

        <Code>{`// MobileMenu.tsx (simplified)
import { Sheet, SheetContent, SheetClose } from "@/components/ui/sheet"
import Link from "next/link"

interface MobileMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MobileMenu({ open, onOpenChange }: MobileMenuProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="bg-sidebar text-sidebar-foreground w-72 p-0">
        {/* Brand header */}
        {/* Nav items — each wrapped in SheetClose + Link */}
        {/* Footer — Configurações */}
      </SheetContent>
    </Sheet>
  )
}`}
        </Code>
      </Section>

      {/* ── Props ── */}
      <Section title="Props & API">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-2 text-left font-semibold">Prop</th>
                <th className="px-4 py-2 text-left font-semibold">Type</th>
                <th className="px-4 py-2 text-left font-semibold">Required</th>
                <th className="px-4 py-2 text-left font-semibold">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-2 font-mono text-xs">open</td>
                <td className="px-4 py-2 font-mono text-xs">boolean</td>
                <td className="px-4 py-2 text-muted-foreground">Yes</td>
                <td className="px-4 py-2 text-muted-foreground">Controls sheet visibility</td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-mono text-xs">onOpenChange</td>
                <td className="px-4 py-2 font-mono text-xs">(open: boolean) =&gt; void</td>
                <td className="px-4 py-2 text-muted-foreground">Yes</td>
                <td className="px-4 py-2 text-muted-foreground">Called when sheet opens/closes (backdrop click, Esc, nav tap)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── Accessibility ── */}
      <Section title="Accessibility">
        <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
          <li>Sheet is a Base UI Dialog — traps focus when open, restores on close.</li>
          <li>Backdrop click and <kbd className="px-1 py-0.5 rounded border border-border font-mono text-xs">Esc</kbd> key both close the menu.</li>
          <li>SheetTitle provides the accessible name for screen readers.</li>
          <li>Each nav item is a focusable element with visible text label.</li>
          <li>Active item is visually differentiated (gold text + dot indicator).</li>
        </ul>
      </Section>
    </div>
  )
}
