import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-wide transition-colors",
  {
    variants: {
      variant: {
        default: "border-primary/30 bg-primary/15 text-primary",
        secondary: "border-border bg-secondary text-secondary-foreground",
        outline: "border-border text-foreground",
        destructive: "border-destructive/30 bg-destructive/15 text-destructive",
        success: "border-success/30 bg-success/15 text-success",
        warning: "border-warning/30 bg-warning/15 text-warning",
        ember: "border-ember/30 bg-ember/15 text-ember",
        muted: "border-border bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const DOT_COLOR: Record<string, string> = {
  default: "bg-primary",
  secondary: "bg-muted-foreground",
  outline: "bg-muted-foreground",
  destructive: "bg-destructive",
  success: "bg-success",
  warning: "bg-warning",
  ember: "bg-ember",
  muted: "bg-muted-foreground",
};

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

function Badge({ className, variant, dot = false, children, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DOT_COLOR[variant ?? "default"])} />}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
