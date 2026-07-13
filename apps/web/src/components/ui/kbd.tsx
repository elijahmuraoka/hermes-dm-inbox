import { cn } from "@/lib/utils";

/** Keycap — mono, hairline, tabular. The keyboard path is first-class. */
export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex min-w-[1.25rem] items-center justify-center rounded-[5px] border border-border",
        "bg-muted/60 px-1.5 py-0.5 font-mono text-[0.6875rem] leading-none text-muted-foreground",
        "shadow-[0_1px_0_0_var(--border)]",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
