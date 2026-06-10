"use client";

import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type SessionUser = {
  name: string;
  nickname: string | null;
  role: string;
  photo_url: string | null;
};

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/partidas": "Partidas",
  "/dashboard/classificacao": "Classificação",
  "/dashboard/torneios": "Torneios",
  "/jogadores": "Elenco",
  "/jogadores/novo": "Novo Jogador",
  "/financeiro": "Financeiro",
  "/configuration": "Configurações",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  co_admin: "Co-admin",
  player: "Jogador",
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

export function AppHeader({ user }: { user: SessionUser | null }) {
  const pathname = usePathname();

  const title = PAGE_TITLES[pathname] ?? "Dashboard";
  const now = new Date();
  const month = now.toLocaleDateString("pt-BR", { month: "long" });
  const monthYear = `${month.charAt(0).toUpperCase() + month.slice(1)} ${now.getFullYear()}`;

  const displayName = user ? (user.nickname ?? user.name) : "";
  const initials = user ? getInitials(user.name) : "";
  const roleLabel = user ? (ROLE_LABELS[user.role] ?? user.role) : "";

  return (
    <header className="flex h-14 md:h-16 shrink-0 items-center justify-between border-b border-border px-4 md:px-6 bg-card">
      {/* Left */}
      <div className="flex items-center gap-3">
        <SidebarTrigger className="hidden md:flex" />
        <div className="flex flex-col leading-none">
          <h1 className="font-heading text-xl md:text-2xl tracking-wide text-foreground">
            {title.toUpperCase()}
          </h1>
          <span className="text-xs text-muted-foreground md:hidden mt-0.5">
            {monthYear}
          </span>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center">
        {/* User avatar — mobile only */}
        <Avatar className="size-9 md:hidden after:hidden">
          {user?.photo_url && (
            <AvatarImage src={user.photo_url} alt={displayName} />
          )}
          <AvatarFallback className="bg-primary text-primary-foreground font-heading text-xs">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* User info — desktop only */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex flex-col items-end leading-tight">
            <span className="text-sm font-medium text-foreground">
              {displayName}
            </span>
            <span className="text-xs text-muted-foreground">{roleLabel}</span>
          </div>
          <Avatar className="size-9">
            {user?.photo_url && (
              <AvatarImage src={user.photo_url} alt={displayName} />
            )}
            <AvatarFallback className="bg-primary text-primary-foreground font-heading text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
