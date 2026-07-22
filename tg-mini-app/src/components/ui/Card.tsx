import { type HTMLAttributes, forwardRef } from "react";
import { cn } from "./cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, title, children, onClick, ...props }, ref) => (
    <div
      ref={ref}
      onClick={onClick}
      className={cn(
        "rounded-xl bg-tg-secondary p-4 border border-white/5",
        onClick && "cursor-pointer active:bg-white/5 transition-colors",
        className,
      )}
      {...props}
    >
      {title && (
        <h3 className="text-sm font-semibold text-tg-hint mb-3">{title}</h3>
      )}
      {children}
    </div>
  ),
);

Card.displayName = "Card";
