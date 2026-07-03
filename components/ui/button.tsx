import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium tracking-wide ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-gold-gradient text-primary-foreground shadow-[0_1px_0_0_hsl(0_0%_100%/0.25)_inset,0_6px_16px_-6px_hsl(var(--gold)/0.55)] hover:brightness-110 hover:shadow-[0_1px_0_0_hsl(0_0%_100%/0.25)_inset,0_10px_22px_-6px_hsl(var(--gold)/0.65)]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-border bg-transparent text-foreground shadow-sm hover:border-primary/50 hover:bg-primary/10 hover:text-primary",
        secondary:
          "border border-border/80 bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/70 hover:border-primary/30",
        ghost: "hover:bg-secondary hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        ember:
          "bg-gradient-to-br from-ember-soft to-ember text-white shadow-[0_6px_16px_-6px_hsl(var(--ember)/0.6)] hover:brightness-110",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-md px-8 text-[0.95rem]",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
