import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/get-session-user";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";

export default async function CampeonatosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login");

  return (
    <SidebarProvider
      style={{ "--sidebar-width": "11rem" } as React.CSSProperties}
    >
      <div className="hidden md:flex">
        <AppSidebar user={sessionUser} />
      </div>

      <SidebarInset className="flex flex-col min-h-svh">
        <AppHeader user={sessionUser} />
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">{children}</main>
      </SidebarInset>

      <BottomNav user={sessionUser} />
    </SidebarProvider>
  );
}
