import { cn } from "@/lib/utils";

const SIZES = {
  sm: 32,
  md: 44,
  lg: 64,
  xl: 160,
} as const;

export function RanchoMark({
  size = "md",
  className,
}: {
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const px = SIZES[size];

  return (
    <svg
      viewBox="0 0 64 64"
      width={px}
      height={px}
      className={cn("shrink-0 drop-shadow-[0_0_10px_hsl(var(--gold)/0.35)]", className)}
      role="img"
      aria-label="Rancho Manager"
    >
      <defs>
        <linearGradient id="rancho-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(var(--gold-soft))" />
          <stop offset="55%" stopColor="hsl(var(--gold))" />
          <stop offset="100%" stopColor="hsl(var(--ember))" />
        </linearGradient>
        <radialGradient id="rancho-bg" cx="50%" cy="35%" r="75%">
          <stop offset="0%" stopColor="hsl(22 20% 14%)" />
          <stop offset="100%" stopColor="hsl(20 22% 6%)" />
        </radialGradient>
      </defs>

      <circle cx="32" cy="32" r="30.5" fill="url(#rancho-bg)" stroke="url(#rancho-gold)" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="25.5" fill="none" stroke="url(#rancho-gold)" strokeWidth="0.75" opacity="0.55" />

      {/* four cardinal ticks, evoking a compass / brand mark */}
      <g stroke="url(#rancho-gold)" strokeWidth="1.4" strokeLinecap="round" opacity="0.9">
        <path d="M32 5.5V10" />
        <path d="M32 54V58.5" />
        <path d="M5.5 32H10" />
        <path d="M54 32H58.5" />
      </g>

      <text
        x="32"
        y="41.5"
        textAnchor="middle"
        fontSize="26"
        fontFamily="var(--font-cinzel, serif)"
        fontWeight="700"
        fill="url(#rancho-gold)"
      >
        R
      </text>
    </svg>
  );
}
