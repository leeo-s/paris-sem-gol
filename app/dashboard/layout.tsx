import { getSessionUser } from "@/lib/get-session-user";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  console.log("user:", user);

  return (
    <SidebarProvider style={{ "--sidebar-width": "11rem" } as React.CSSProperties}>
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden md:flex">
        <AppSidebar user={user} />
      </div>

      <SidebarInset className="flex flex-col min-h-svh">
        <AppHeader user={user} />

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">{children}</main>
      </SidebarInset>

      {/* Mobile bottom nav — hidden on desktop */}
      <BottomNav />
    </SidebarProvider>
  );
}
