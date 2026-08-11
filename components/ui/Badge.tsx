import { HTMLAttributes } from "react";

type Tone = "gold" | "success" | "neutral" | "danger";

const toneClasses: Record<Tone, string> = {
  gold: "bg-gradient-to-b from-gold-100 to-gold-200/70 text-gold-800 border border-gold-300/80 shadow-sm",
  success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  neutral: "bg-anthracite-100 text-anthracite-600 border border-anthracite-200",
  danger: "bg-red-50 text-red-700 border border-red-200",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ tone = "neutral", className = "", ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${toneClasses[tone]} ${className}`}
      {...props}
    />
  );
}
