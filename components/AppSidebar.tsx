"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Trophy,
  Users,
  BarChart2,
  Settings,
  Swords,
} from "lucide-react";

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
} from "@/components/ui/sidebar";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";

const navItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Partidas", href: "/matches", icon: Swords },
  { title: "Jogadores", href: "/players", icon: Users },
  { title: "Classificação", href: "/rank", icon: BarChart2 },
  { title: "Torneios", href: "/championships", icon: Trophy },
];

const bottomItems = [
  { title: "Configurações", href: "/configuration", icon: Settings },
];

type SessionUser = {
  name: string;
  nickname: string | null;
  role: string;
  photo_url: string | null;
};

function getInitials(name: string): string {
  return name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AppSidebar({ user }: { user: SessionUser | null }) {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="px-11 py-5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Avatar className="size-20 md:size-20 after:hidden">
            <AvatarImage src="/logo.png" alt="Paris Sem Gol" />
            <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground font-heading text-xl">
              PSG
            </AvatarFallback>
          </Avatar>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive}
                      tooltip={item.title}
                      className="data-active:bg-sidebar-primary data-active:text-sidebar-primary-foreground"
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          {bottomItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  render={<Link href={item.href} />}
                  isActive={isActive}
                  tooltip={item.title}
                  className="data-active:bg-sidebar-primary data-active:text-sidebar-primary-foreground"
                >
                  <item.icon />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
