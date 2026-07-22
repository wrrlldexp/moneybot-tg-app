import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./cn";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full border",
  {
    variants: {
      variant: {
        success: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
        warning: "bg-amber-500/15 text-amber-400 border-amber-500/20",
        error: "bg-red-500/15 text-red-400 border-red-500/20",
        info: "bg-blue-500/15 text-blue-400 border-blue-500/20",
        neutral: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

const DOT_COLORS: Record<string, string> = {
  success: "bg-emerald-400",
  warning: "bg-amber-400",
  error: "bg-red-400",
  info: "bg-blue-400",
  neutral: "bg-zinc-400",
};

interface BadgeProps extends VariantProps<typeof badgeVariants> {
  children: React.ReactNode;
  pulse?: boolean;
  className?: string;
}

export function Badge({ variant = "neutral", pulse, children, className }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)}>
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full shrink-0",
          DOT_COLORS[variant ?? "neutral"],
          pulse && "animate-pulse",
        )}
      />
      {children}
    </span>
  );
}

/** Map legacy status strings to Badge variant */
const STATUS_MAP: Record<string, NonNullable<BadgeProps["variant"]>> = {
  running: "success",
  ok: "success",
  stopped: "neutral",
  error: "error",
  draft: "warning",
  timeout: "warning",
  unknown: "neutral",
};

/** Drop-in replacement for the old StatusBadge */
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const variant = STATUS_MAP[status] ?? "neutral";
  const isAlive = status === "running" || status === "ok";
  return (
    <Badge variant={variant} pulse={isAlive} className={className}>
      {status}
    </Badge>
  );
}
