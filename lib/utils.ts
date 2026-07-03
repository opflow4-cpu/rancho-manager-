import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value ?? 0);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

export function daysInProject(entryDate: string): number {
  const start = new Date(`${entryDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return 0;
  const now = new Date();
  const diff = now.setHours(0, 0, 0, 0) - start.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

/**
 * Mascara um segredo (API key, webhook secret) para exibição segura no
 * frontend: mantém só um pequeno prefixo e os últimos 4 caracteres.
 * Nunca deve receber o valor bruto vindo direto de uma Server Action pro
 * client — só deve ser chamada dentro de Server Components, que passam
 * apenas o resultado já mascarado como prop.
 */
export function maskSecret(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.length <= 8) return "*".repeat(value.length);
  const prefix = value.slice(0, 4);
  const suffix = value.slice(-4);
  return `${prefix}${"*".repeat(Math.max(4, value.length - 8))}${suffix}`;
}
