import { useEffect, useRef, useState } from "react";
import { useInboxStore } from "@/hooks/useInboxStore";
import { BUCKET_META, SOURCE_META, type Bucket, type SourceId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Check, ListFilter } from "lucide-react";

const ORDER: Bucket[] = ["needs", "drafted", "waiting", "fyi", "done"];
const SOURCES: (SourceId | "all")[] = ["all", "imessage", "linkedin", "x"];

// Touch-reachable bucket switch for narrow widths where the left rail is hidden.
// Keyboard stays primary (g-keys / ⌘K); this is the dual-mode parity fallback.
// Right edge: a fixed source-filter chip (outside the scroller so it's always reachable).
export function BucketBar() {
  const conversations = useInboxStore((s) => s.conversations);
  const activeBucket = useInboxStore((s) => s.activeBucket);
  const setBucket = useInboxStore((s) => s.setBucket);
  const sourceFilter = useInboxStore((s) => s.sourceFilter);

  const count = (b: Bucket) =>
    conversations.filter(
      (c) => c.bucket === b && (sourceFilter === "all" || c.source === sourceFilter),
    ).length;
  const unread = (b: Bucket) =>
    conversations.filter((c) => c.bucket === b && c.unread).length;

  return (
    <nav
      aria-label="Buckets and source filter"
      className="flex shrink-0 items-center gap-1.5 border-b border-border bg-background/70 py-1.5 pl-2.5 pr-2 xl:hidden"
    >
      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
        {ORDER.map((b) => {
          const active = b === activeBucket;
          const n = count(b);
          const u = unread(b);
          return (
            <button
              key={b}
              type="button"
              onClick={() => setBucket(b)}
              aria-current={active ? "true" : undefined}
              className={cn(
                "flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-[12.5px]",
                "transition-colors duration-[var(--transition-duration)] ease-[var(--ease-house)]",
                active
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              <span
                className="size-1.5 shrink-0 rounded-full"
                style={{
                  background: BUCKET_META[b].token,
                  boxShadow: active ? `0 0 6px ${BUCKET_META[b].token}` : undefined,
                }}
              />
              <span className="whitespace-nowrap font-medium">{BUCKET_META[b].label}</span>
              {u > 0 && (
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={{ background: "var(--status-unread)" }}
                  title={`${u} unread`}
                />
              )}
              <span className="tnum font-mono text-[11px] tabular-nums text-muted-foreground">
                {n}
              </span>
            </button>
          );
        })}
      </div>

      <SourceChip />
    </nav>
  );
}

function SourceChip() {
  const sourceFilter = useInboxStore((s) => s.sourceFilter);
  const setSourceFilter = useInboxStore((s) => s.setSourceFilter);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on click-outside / Escape — standard popover hygiene.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const filtered = sourceFilter !== "all";
  const label = filtered ? SOURCE_META[sourceFilter].glyph : "All";

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Filter by source (current: ${filtered ? SOURCE_META[sourceFilter].label : "all sources"})`}
        className={cn(
          "flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12px]",
          "transition-colors duration-[var(--transition-duration)] ease-[var(--ease-house)]",
          filtered || open
            ? "border-primary/40 bg-primary/10 text-foreground"
            : "border-border text-muted-foreground hover:bg-accent/50 hover:text-foreground",
        )}
      >
        <ListFilter className="size-3.5" strokeWidth={2.25} />
        <span className="font-mono text-[11px]">{label}</span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Source filter"
          className="animate-scale-in absolute right-0 top-[calc(100%+4px)] z-40 w-[168px] rounded-lg border border-border bg-popover p-1 shadow-xl"
        >
          {SOURCES.map((s) => {
            const active = sourceFilter === s;
            const meta = s === "all" ? { label: "All sources", glyph: "∗" } : SOURCE_META[s];
            return (
              <button
                key={s}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  setSourceFilter(s);
                  setOpen(false);
                }}
                className={cn(
                  "flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[12.5px]",
                  active
                    ? "bg-accent/70 text-foreground"
                    : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
                )}
              >
                <span className="flex w-5 shrink-0 justify-center font-mono text-[10px]">
                  {meta.glyph}
                </span>
                <span className="flex-1 truncate">{meta.label}</span>
                {active && <Check className="size-3.5 shrink-0 text-primary" strokeWidth={2.5} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
