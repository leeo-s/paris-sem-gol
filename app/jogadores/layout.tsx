import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/config/supabase/server";
import { getSessionUser } from "@/lib/get-session-user";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";

export default async function ElencoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sessionUser = await getSessionUser();

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
