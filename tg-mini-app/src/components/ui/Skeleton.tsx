import { cn } from "./cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg bg-tg-secondary animate-pulse",
        className,
      )}
    />
  );
}
