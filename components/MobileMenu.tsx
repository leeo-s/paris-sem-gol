"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Swords,
  Users,
  BarChart2,
  Trophy,
  Settings,
  CircleDollarSign,
  User,
  LogOut,
} from "lucide-react";

import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { createBrowserSupabaseClient } from "@/config/supabase/client";

const navItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Partidas", href: "/partidas", icon: Swords },
  { title: "Jogadores", href: "/jogadores", icon: Users },
  { title: "Financeiro", href: "/financeiro", icon: CircleDollarSign },
  // { title: "Classificação", href: "/rank", icon: BarChart2 },
  // { title: "Torneios", href: "/campeonatos", icon: Trophy },
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

interface MobileMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: SessionUser | null;
}

export function MobileMenu({ open, onOpenChange, user }: MobileMenuProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Encerra a sessão do usuário no Supabase e redireciona para o login
  async function handleLogout() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    onOpenChange(false);
    router.push("/login");
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        showCloseButton={false}
        className="flex flex-col gap-0 p-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border w-72"
      >
        {/* Header */}
        <SheetHeader className="px-5 py-6 border-b border-sidebar-border flex flex-row">
          <Avatar className="mr-8 size-15 md:size-15 after:hidden">
            <AvatarImage src="/logo.png" alt="Paris Sem Gol" />
            <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground font-heading text-xl">
              PSG
            </AvatarFallback>
          </Avatar>
          <SheetTitle className="font-heading text-2xl tracking-wide text-sidebar-primary flex items-center">
            PARIS SEM GOL
          </SheetTitle>
        </SheetHeader>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3 px-3">
          <p className="px-3 py-2 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/50">
            Menu
          </p>
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.title}>
                  <SheetClose render={<Link href={item.href} />}>
                    <span
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-primary"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
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
                    </span>
                  </SheetClose>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer com configurações, perfil e logout */}
        <SheetFooter className="flex-col gap-0 p-3 border-t border-sidebar-border">
          {/* Configurações — visível apenas para admins */}
          {user?.role === "admin" &&
            itensRodapePadrao.map((item) => {
              const isActive = pathname === item.href;
              return (
                <SheetClose key={item.title} render={<Link href={item.href} />}>
                  <span
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-primary"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                    )}
                  >
                    <item.icon
                      className="size-4 shrink-0"
                      strokeWidth={isActive ? 2.5 : 1.75}
                    />
                    {item.title}
                  </span>
                </SheetClose>
              );
            })}

          {/* Link para o perfil do próprio usuário logado */}
          {user && (
            <SheetClose render={<Link href={`/jogadores/${user.id}`} />}>
              <span
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  pathname === `/jogadores/${user.id}`
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
              >
                <User
                  className="size-4 shrink-0"
                  strokeWidth={
                    pathname === `/jogadores/${user.id}` ? 2.5 : 1.75
                  }
                />
                Perfil
              </span>
            </SheetClose>
          )}

          {/* Botão de logout — encerra a sessão e redireciona para o login */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors text-red-500 hover:bg-red-500/10"
          >
            <LogOut className="size-4 shrink-0" strokeWidth={1.75} />
            Sair
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
