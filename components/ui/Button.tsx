import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-anthracite-800 text-white shadow-[0_4px_14px_-4px_rgba(31,34,39,0.4)] hover:bg-anthracite-700 hover:shadow-[0_6px_20px_-4px_rgba(31,34,39,0.45)] disabled:bg-anthracite-300 disabled:shadow-none",
  secondary:
    "bg-gradient-to-b from-gold-400 to-gold-600 text-white shadow-glow hover:from-gold-500 hover:to-gold-700 disabled:from-gold-200 disabled:to-gold-200 disabled:shadow-none",
  ghost:
    "bg-white text-anthracite-700 border border-anthracite-200 hover:border-gold-300 hover:bg-gold-50/60 disabled:text-anthracite-300",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className = "", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center rounded-xl px-5 py-3 text-sm font-medium tracking-wide transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100 ${variantClasses[variant]} ${className}`}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
