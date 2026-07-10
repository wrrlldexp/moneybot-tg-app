import { cn } from "./ui/cn";

export function PnlCard({ label, value, suffix = "", className }: { label: string; value: number; suffix?: string; className?: string }) {
  const pos = value > 0;
  const zero = value === 0;
  return (
    <div className={cn("rounded-xl bg-tg-secondary p-3 border border-white/5", className)}>
      <p className="text-xs text-tg-hint mb-1">{label}</p>
      <p className={cn("text-lg font-semibold tabular-nums", zero ? "text-tg-text" : pos ? "text-emerald-400" : "text-red-400")}>
        {pos && "+"}{value.toFixed(2)}{suffix && <span className="text-xs text-tg-hint ml-1">{suffix}</span>}
      </p>
    </div>
  );
}
