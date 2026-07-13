import { useRef } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";

/** A div that traps focus for as long as it's mounted (review M5) — render it
    only while the dialog is open; unmounting restores focus to the opener.
    Exists because components that `return null` when closed can't re-arm a
    bare hook on open — the trap must ride the mount. */
export function FocusTrap({
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref);
  return (
    <div ref={ref} {...props}>
      {children}
    </div>
  );
}
