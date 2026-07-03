import { CheckCircle2, Inbox, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Row skeleton — matches the locked ledger row (h-10 single-line) so there is no shift. */
export function RowSkeleton() {
  return (
    <div className="flex h-10 w-full items-center gap-2.5 border-b border-border/60 pl-3 pr-4">
      <span className="w-2 shrink-0" />
      <span className="skeleton h-2.5 w-8 shrink-0 rounded" />
      <span className="skeleton h-3 w-[9.25rem] shrink-0 rounded" />
      <span className="skeleton h-2.5 flex-1 rounded" />
      <span className="skeleton h-2.5 w-6 shrink-0 rounded" />
    </div>
  );
}

export function ListSkeleton() {
  return (
    <div aria-hidden className="animate-fade-in">
      {Array.from({ length: 12 }).map((_, i) => (
        <RowSkeleton key={i} />
      ))}
    </div>
  );
}

/** Calm empty state — not a sad illustration (DESIGN §5.8). */
export function EmptyBucket({ label }: { label: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
      <div
        className="flex size-10 items-center justify-center rounded-full text-primary"
        style={{ background: "color-mix(in oklch, var(--primary) 12%, transparent)" }}
      >
        <CheckCircle2 className="size-5" strokeWidth={2} />
      </div>
      <p className="text-[0.8125rem] font-medium text-foreground">{label} is clear</p>
      <p className="max-w-[15rem] text-[0.75rem] text-muted-foreground">
        Nothing needs you here right now. Move on with a calm inbox.
      </p>
    </div>
  );
}

export function NoSelection() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-muted/50 text-muted-foreground">
        <Inbox className="size-5" strokeWidth={2} />
      </div>
      <p className="text-[0.8125rem] font-medium text-foreground">No conversation selected</p>
      <p className="max-w-[15rem] text-[0.75rem] text-muted-foreground">
        Pick a row with <span className="font-mono">j / k</span> and press{" "}
        <span className="font-mono">Enter</span>, or click one.
      </p>
    </div>
  );
}

/** Recoverable error — names the source + retry (DESIGN §5.8). */
export function ErrorState({ source, onRetry }: { source: string; onRetry: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <div
        className="flex size-10 items-center justify-center rounded-full text-destructive"
        style={{ background: "color-mix(in oklch, var(--destructive) 12%, transparent)" }}
      >
        <RotateCw className="size-5" strokeWidth={2} />
      </div>
      <p className="text-[0.8125rem] font-medium text-foreground">Couldn’t sync {source}</p>
      <p className="max-w-[16.25rem] text-[0.75rem] text-muted-foreground">
        The connector didn’t respond. Your existing messages are unaffected.
      </p>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        <RotateCw /> Retry sync
      </Button>
    </div>
  );
}
