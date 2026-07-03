import { cn } from "@/lib/utils";

export function TableToolbar({
  children,
  actions,
  className,
}: {
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "card-premium flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between",
        className
      )}
    >
      <div className="flex flex-1 flex-wrap items-center gap-2">{children}</div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
