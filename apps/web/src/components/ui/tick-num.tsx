import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** A count that ticks when its value changes (v7 motion-causality) — the new
    number drops in so a shrinking queue visibly reacts to triage. First paint
    never animates; reduced motion kills the tick via the global media rule. */
export function TickNum({ value, className }: { value: number | string; className?: string }) {
  const prev = useRef(value);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (prev.current !== value) {
      prev.current = value;
      setTick((t) => t + 1);
    }
  }, [value]);
  return (
    <span key={tick} className={cn("inline-block", tick > 0 && "animate-count-tick", className)}>
      {value}
    </span>
  );
}
