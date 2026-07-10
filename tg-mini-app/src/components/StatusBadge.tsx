import { cn } from "./ui/cn";

const STYLES: Record<string, string> = {
  running: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  stopped: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
  error: "bg-red-500/15 text-red-400 border-red-500/20",
  draft: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  ok: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  timeout: "bg-amber-500/15 text-amber-400 border-amber-500/20",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full border", STYLES[status] ?? STYLES["draft"], className)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", status === "running" || status === "ok" ? "bg-emerald-400 animate-pulse" : "bg-current")} />
      {status}
    </span>
  );
}
