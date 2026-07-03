"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Instagram,
  UsersRound,
  Plug,
  ShieldAlert,
  Wallet,
  ListChecks,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { RanchoMark } from "@/components/brand/rancho-mark";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/contas", label: "Contas", icon: Instagram },
  { href: "/operadores", label: "Operadores", icon: UsersRound },
  { href: "/gateways", label: "Gateways", icon: Plug },
  { href: "/restricoes", label: "Restrições", icon: ShieldAlert },
  { href: "/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/tarefas", label: "Tarefas", icon: ListChecks },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border/80 bg-gradient-to-b from-card to-background/60 md:flex">
      <div className="flex items-center gap-3 border-b border-border/70 px-5 py-6">
        <RanchoMark size="md" />
        <div className="min-w-0">
          <p className="rancho-brand truncate text-[1.05rem] leading-tight text-gold-gradient">
            RANCHO
            <br />
            MANAGER
          </p>
        </div>
      </div>

      <div className="px-5 pt-4">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">
          Painel de operação
        </p>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "nav-item-active text-primary"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors",
                  active
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : "border-border/70 bg-secondary/40 text-muted-foreground group-hover:border-primary/25 group-hover:text-primary"
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="gold-divider mx-4" />
      <div className="space-y-0.5 p-4">
        <p className="text-xs font-medium text-muted-foreground">Rancho Manager</p>
        <p className="text-[0.7rem] text-muted-foreground/60">
          &copy; {new Date().getFullYear()} &middot; gestão interna
        </p>
      </div>
    </aside>
  );
}
