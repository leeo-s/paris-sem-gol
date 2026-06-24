"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  House,
  Users,
  User,
  BarChart2,
  Settings,
  Swords,
  CircleDollarSign,
  Trophy,
  LogOut,
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
import { createBrowserSupabaseClient } from "@/config/supabase/client";

const navItems = [
  { title: "Início", href: "/dashboard", icon: House },
  { title: "Partidas", href: "/partidas", icon: Swords },
  { title: "Jogadores", href: "/jogadores", icon: Users },
  { title: "Financeiro", href: "/financeiro", icon: CircleDollarSign },
  { title: "Destaques", href: "/rank", icon: BarChart2 },
  { title: "Campeonatos", href: "/campeonatos", icon: Trophy },
];

// Itens do rodapé que não precisam de lógica especial
const itensRodapePadrao = [
  { title: "Configurações", href: "/configuration", icon: Settings },
];

type SessionUser = {
  id: string;
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
  const router = useRouter();

  // Encerra a sessão do usuário no Supabase e redireciona para o login
  async function handleLogout() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <Sidebar>
      <SidebarHeader className="p-5 flex flex-col items-center">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Avatar className="size-20 md:size-20 after:hidden">
            <AvatarImage src="/logo.png" alt="Paris Sem Gol" />
            <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground font-heading text-xl">
              PSG
            </AvatarFallback>
          </Avatar>
        </Link>
        <p className="w-30 font-heading text-2xl tracking-wide text-sidebar-primary flex items-center ">
          PARIS SEM GOL
        </p>
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
          {/* Configurações — visível apenas para admins */}
          {user?.role === "admin" &&
            itensRodapePadrao.map((item) => {
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

          {/* Link para o perfil do próprio usuário logado */}
          {user && (
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link href={`/jogadores/${user.id}`} />}
                isActive={pathname === `/jogadores/${user.id}`}
                tooltip="Perfil"
                className="data-active:bg-sidebar-primary data-active:text-sidebar-primary-foreground"
              >
                <User />
                <span>Perfil</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          {/* Botão de logout — encerra a sessão e redireciona para o login */}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              tooltip="Sair"
              className="text-red-500 hover:text-red-500 hover:bg-red-500/10"
            >
              <LogOut />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
