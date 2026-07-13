import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-[0.75rem] font-medium " +
    "transition-[color,background-color,border-color,box-shadow] duration-[var(--transition-duration)] " +
    "ease-[var(--ease-house)] disabled:pointer-events-none disabled:opacity-45 " +
    "focus-visible:outline-none [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      // Only the variants the slice actually renders (review L11) — grow the
      // kit when a consumer appears, not before.
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:brightness-110 shadow-[0_0_0_1px_color-mix(in_oklch,var(--primary)_60%,transparent),0_6px_20px_-8px_var(--glow-primary)]",
        secondary:
          "bg-secondary text-secondary-foreground border border-border hover:bg-accent",
        ghost: "text-muted-foreground hover:bg-accent hover:text-foreground",
      },
      size: {
        sm: "h-7 px-2.5",
        icon: "h-7 w-7 p-0",
      },
    },
    defaultVariants: { variant: "secondary", size: "sm" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
