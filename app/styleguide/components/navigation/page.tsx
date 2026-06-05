"use client"

import { useState } from "react"
import Link from "next/link"
import {
  LayoutDashboard,
  Swords,
  Users,
  BarChart2,
  Trophy,
  Settings,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar"

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

/* ── nav data shared between previews ── */

const navItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Partidas", href: "/dashboard/partidas", icon: Swords },
  { title: "Jogadores", href: "/dashboard/jogadores", icon: Users },
  { title: "Classificação", href: "/dashboard/classificacao", icon: BarChart2 },
  { title: "Torneios", href: "/dashboard/torneios", icon: Trophy },
]

/* ── sidebar preview ── */

function SidebarPreview({ activeHref }: { activeHref: string }) {
  return (
    <SidebarProvider style={{ "--sidebar-width": "220px" } as React.CSSProperties}>
      <div className="flex h-105 w-full overflow-hidden rounded-xl border border-border">
        <Sidebar className="relative h-full">
          <SidebarHeader className="px-4 py-5">
            <span className="font-heading text-xl text-sidebar-primary tracking-wide">
              PARIS SEM GOL
            </span>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Menu</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton isActive={activeHref === item.href}>
                        <item.icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive={activeHref === "/dashboard/configuracoes"}>
                  <Settings />
                  <span>Configurações</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex flex-1 items-center justify-center bg-background text-muted-foreground text-sm">
          Conteúdo da página
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}

/* ── bottom nav preview ── */

function BottomNavPreview({ activeHref }: { activeHref: string }) {
  return (
    <div className="relative h-45 w-full max-w-sm overflow-hidden rounded-xl border border-border bg-background mx-auto">
      <div className="flex h-[calc(100%-64px)] items-center justify-center text-sm text-muted-foreground">
        Conteúdo da página
      </div>
      <nav className="absolute bottom-0 left-0 right-0 flex h-16 items-stretch border-t border-sidebar-border bg-sidebar">
        {navItems.map((item) => {
          const isActive = activeHref === item.href
          return (
            <button
              key={item.title}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 text-[10px] transition-colors",
                isActive
                  ? "text-sidebar-primary"
                  : "text-sidebar-foreground/60"
              )}
            >
              <item.icon
                className={cn("size-4", isActive && "scale-110")}
                strokeWidth={isActive ? 2.5 : 1.75}
              />
              <span className={cn(isActive && "font-semibold")}>{item.title}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}

/* ── page ── */

export default function NavigationShowcasePage() {
  const [activeHref, setActiveHref] = useState("/dashboard")

  return (
    <div className="px-10 py-10 max-w-5xl">
      <div className="mb-12">
        <h1 className="font-heading text-5xl tracking-widest uppercase text-foreground">
          Navigation
        </h1>
        <p className="text-muted-foreground mt-1">
          AppSidebar (desktop) · BottomNav (mobile) · Paris Sem Gol Design System
        </p>
      </div>

      {/* ── Active state selector ── */}
      <Section title="Active Route Preview">
        <p className="text-sm text-muted-foreground mb-4">
          Select a route to preview active state in both components.
        </p>
        <div className="flex flex-wrap gap-2 mb-6">
          {navItems.map((item) => (
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

      {/* ── Sidebar ── */}
      <Section title="AppSidebar · Desktop">
        <p className="text-sm text-muted-foreground mb-4">
          Uses shadcn <code className="font-mono text-xs">Sidebar</code> primitives.
          Visible on <code className="font-mono text-xs">md:</code> and above.
          The navy background and gold active state come from sidebar CSS variables.
        </p>
        <SidebarPreview activeHref={activeHref} />
        <Code>{`import { AppSidebar } from "@/components/AppSidebar"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"

// In your layout:
<SidebarProvider>
  <div className="hidden md:flex">
    <AppSidebar />
  </div>
  <SidebarInset>
    <header className="hidden md:flex h-12 items-center px-4">
      <SidebarTrigger />
    </header>
    {children}
  </SidebarInset>
</SidebarProvider>`}
        </Code>
      </Section>

      {/* ── Bottom nav ── */}
      <Section title="BottomNav · Mobile">
        <p className="text-sm text-muted-foreground mb-4">
          Custom component fixed to the bottom of the viewport.
          Visible only below <code className="font-mono text-xs">md:</code>.
          Uses the same sidebar CSS variables for a consistent dark navy palette.
        </p>
        <BottomNavPreview activeHref={activeHref} />
        <Code>{`import { BottomNav } from "@/components/BottomNav"

// In your layout (inside SidebarProvider):
<BottomNav />

// Add bottom padding to page content so it isn't hidden behind the nav:
<main className="pb-20 md:pb-6">
  {children}
</main>`}
        </Code>
      </Section>

      {/* ── Props ── */}
      <Section title="Props & API">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-2 text-left font-semibold">Component</th>
                <th className="px-4 py-2 text-left font-semibold">Prop</th>
                <th className="px-4 py-2 text-left font-semibold">Type</th>
                <th className="px-4 py-2 text-left font-semibold">Default</th>
                <th className="px-4 py-2 text-left font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-2 font-mono text-xs">AppSidebar</td>
                <td className="px-4 py-2 font-mono text-xs">—</td>
                <td className="px-4 py-2 text-muted-foreground">—</td>
                <td className="px-4 py-2 text-muted-foreground">—</td>
                <td className="px-4 py-2 text-muted-foreground">No props. Reads pathname internally via <code className="font-mono text-xs">usePathname</code>.</td>
              </tr>
              <tr>
                <td className="px-4 py-2 font-mono text-xs">BottomNav</td>
                <td className="px-4 py-2 font-mono text-xs">—</td>
                <td className="px-4 py-2 text-muted-foreground">—</td>
                <td className="px-4 py-2 text-muted-foreground">—</td>
                <td className="px-4 py-2 text-muted-foreground">No props. Uses <code className="font-mono text-xs">fixed bottom-0</code>, add <code className="font-mono text-xs">pb-20</code> to page content.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      {/* ── Accessibility ── */}
      <Section title="Accessibility">
        <ul className="space-y-2 text-sm text-muted-foreground list-disc list-inside">
          <li>Sidebar links use <code className="font-mono text-xs">asChild</code> with Next.js <code className="font-mono text-xs">Link</code> — full keyboard navigation.</li>
          <li>Active items receive <code className="font-mono text-xs">aria-current</code> via shadcn's <code className="font-mono text-xs">isActive</code> prop.</li>
          <li>Sidebar collapse trigger is a focusable button with tooltip label.</li>
          <li>BottomNav items are anchor tags — screen-reader accessible with visible labels.</li>
        </ul>
      </Section>
    </div>
  )
}
