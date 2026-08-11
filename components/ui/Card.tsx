import { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-anthracite-100/80 bg-white p-6 shadow-card transition-shadow duration-300 ${className}`}
      {...props}
    />
  );
}
