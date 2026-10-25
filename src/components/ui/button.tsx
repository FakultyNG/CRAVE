import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "cream" | "ghost" };

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return <button className={cn("inline-flex min-h-12 items-center justify-center rounded-full px-6 text-sm font-semibold transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-3 disabled:cursor-not-allowed disabled:opacity-50", variant === "primary" && "bg-crave-orange text-white hover:-translate-y-0.5 hover:bg-crave-red focus-visible:outline-crave-orange", variant === "cream" && "bg-crave-cream text-crave-ink hover:-translate-y-0.5 hover:bg-white focus-visible:outline-crave-cream", variant === "ghost" && "bg-transparent text-current hover:bg-black/5 focus-visible:outline-current", className)} {...props} />;
}
