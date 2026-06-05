import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/AppSidebar"
import { BottomNav } from "@/components/BottomNav"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden md:flex">
        <AppSidebar />
      </div>

      <SidebarInset className="flex flex-col min-h-svh">
        {/* Top bar with sidebar trigger (desktop only) */}
        <header className="hidden md:flex h-12 shrink-0 items-center border-b border-border px-4">
          <SidebarTrigger />
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </SidebarInset>

      {/* Mobile bottom nav — hidden on desktop */}
      <BottomNav />
    </SidebarProvider>
  )
}
