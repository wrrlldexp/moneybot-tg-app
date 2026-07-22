import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition-colors rounded-xl disabled:opacity-50 disabled:pointer-events-none active:scale-[0.97] transition-transform",
  {
    variants: {
      variant: {
        primary: "bg-tg-button text-tg-button-text",
        secondary: "bg-tg-secondary text-tg-text border border-white/5",
        danger: "bg-red-500/15 text-red-400 border border-red-500/20",
        ghost: "bg-transparent text-tg-hint hover:bg-white/5",
      },
      size: {
        sm: "text-xs px-3 py-1.5",
        md: "text-sm px-4 py-2.5",
        lg: "text-sm px-5 py-3 w-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      )}
      {children}
    </button>
  ),
);

Button.displayName = "Button";
