"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  LogOut,
  Menu,
  Search,
  Plus,
  Instagram,
  UsersRound,
  Plug,
  ListChecks,
  LayoutDashboard,
  ShieldAlert,
  Wallet,
} from "lucide-react";

import { RanchoMark } from "@/components/brand/rancho-mark";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/utils";
import { signOut } from "@/lib/actions/auth";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/contas", label: "Contas", icon: Instagram },
  { href: "/operadores", label: "Operadores", icon: UsersRound },
  { href: "/gateways", label: "Gateways", icon: Plug },
  { href: "/restricoes", label: "Restrições", icon: ShieldAlert },
  { href: "/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/tarefas", label: "Tarefas", icon: ListChecks },
];

const PAGE_INFO: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": { title: "Dashboard", subtitle: "Visão geral do rancho e da operação" },
  "/contas": { title: "Contas", subtitle: "Todas as contas do Instagram sob gestão" },
  "/operadores": { title: "Operadores", subtitle: "Equipe responsável pelas contas" },
  "/gateways": { title: "Gateways", subtitle: "Integrações de pagamento por operador" },
  "/restricoes": { title: "Restrições", subtitle: "Histórico de restrições e bloqueios" },
  "/financeiro": { title: "Financeiro", subtitle: "Faturamento consolidado da operação" },
  "/tarefas": { title: "Tarefas", subtitle: "Rotina diária da equipe" },
};

const QUICK_ACTIONS = [
  { href: "/contas", label: "Nova conta", icon: Instagram },
  { href: "/operadores", label: "Novo operador", icon: UsersRound },
  { href: "/tarefas", label: "Nova tarefa", icon: ListChecks },
];

export function Header({ name, email }: { name: string; email: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [search, setSearch] = useState("");

  const info =
    Object.entries(PAGE_INFO).find(([href]) => pathname.startsWith(href))?.[1] ??
    { title: "Rancho Manager", subtitle: "Painel interno" };

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!search.trim()) return;
    router.push(`/contas?q=${encodeURIComponent(search.trim())}`);
  }

  return (
    <header className="flex flex-col gap-4 border-b border-border/70 bg-card/30 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="md:hidden">
              <Menu />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel className="flex items-center gap-2 text-primary">
              <RanchoMark size="sm" /> Rancho Manager
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {NAV_ITEMS.map((item) => (
              <DropdownMenuItem key={item.href} asChild>
                <Link href={item.href} className="flex items-center gap-2">
                  <item.icon className="h-4 w-4" /> {item.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight text-foreground">{info.title}</h1>
          <p className="truncate text-xs text-muted-foreground">{info.subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <form onSubmit={handleSearch} className="relative hidden sm:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar conta por @..."
            className="w-48 rounded-full pl-9 lg:w-64"
          />
        </form>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" title="Ações rápidas">
              <Plus />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>Ações rápidas</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {QUICK_ACTIONS.map((action) => (
              <DropdownMenuItem key={action.label} asChild>
                <Link href={action.href} className="flex items-center gap-2">
                  <action.icon className="h-4 w-4 text-primary" /> {action.label}
                </Link>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 hover:border-border hover:bg-secondary/60">
              <Avatar className="h-8 w-8 border border-primary/40">
                <AvatarFallback>{initials(name || email)}</AvatarFallback>
              </Avatar>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-medium leading-tight">{name || "Operador"}</p>
                <p className="text-xs text-muted-foreground leading-tight">{email}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Minha conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <form action={signOut}>
              <DropdownMenuItem asChild>
                <button type="submit" className="flex w-full items-center gap-2 text-destructive">
                  <LogOut className="h-4 w-4" /> Sair
                </button>
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
