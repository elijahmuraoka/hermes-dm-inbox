import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-[12px] font-medium " +
    "transition-[color,background-color,border-color,box-shadow] duration-[var(--transition-duration)] " +
    "ease-[var(--ease-house)] disabled:pointer-events-none disabled:opacity-45 " +
    "focus-visible:outline-none [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:brightness-110 shadow-[0_0_0_1px_color-mix(in_oklch,var(--primary)_60%,transparent),0_6px_20px_-8px_var(--glow-primary)]",
        secondary:
          "bg-secondary text-secondary-foreground border border-border hover:bg-accent",
        ghost: "text-muted-foreground hover:bg-accent hover:text-foreground",
        outline: "border border-border text-foreground hover:bg-accent",
        destructive:
          "bg-destructive/12 text-destructive border border-destructive/25 hover:bg-destructive/20",
      },
      size: {
        sm: "h-7 px-2.5",
        md: "h-8 px-3",
        icon: "h-7 w-7 p-0",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
