import { type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const ACCENTS: Record<string, { icon: string; glow: string }> = {
  gold: { icon: "text-primary bg-primary/15 border-primary/30", glow: "hsl(var(--gold) / 0.18)" },
  ember: { icon: "text-ember bg-ember/15 border-ember/30", glow: "hsl(var(--ember) / 0.18)" },
  success: { icon: "text-success bg-success/15 border-success/30", glow: "hsl(var(--success) / 0.18)" },
  destructive: { icon: "text-destructive bg-destructive/15 border-destructive/30", glow: "hsl(var(--destructive) / 0.18)" },
  muted: { icon: "text-muted-foreground bg-muted border-border", glow: "transparent" },
};

export function MetricCard({
  label,
  value,
  icon: Icon,
  accent = "gold",
  hint,
  emphasis = false,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: "gold" | "ember" | "success" | "destructive" | "muted";
  hint?: string;
  emphasis?: boolean;
}) {
  const a = ACCENTS[accent];

  return (
    <div className="card-premium group relative overflow-hidden p-5 transition-transform duration-200 hover:-translate-y-0.5">
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-70 blur-2xl transition-opacity group-hover:opacity-100"
        style={{ background: a.glow }}
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p
            className={cn(
              "mt-2 truncate font-semibold text-foreground",
              emphasis ? "text-gold-gradient font-display text-2xl" : "text-2xl"
            )}
          >
            {value}
          </p>
          {hint && <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border", a.icon)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
