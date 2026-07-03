import { useInboxStore } from "@/hooks/useInboxStore";
import { BUCKET_META, SOURCE_META, type Bucket, type SourceId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ModeToggle } from "@/components/mode-toggle";
import { Kbd } from "@/components/ui/kbd";
import { SourceIcon } from "@/components/SourceIcon";
import { HermesMark } from "@/components/HermesMark";
import { Layers } from "lucide-react";

const ORDER: Bucket[] = ["needs", "drafted", "waiting", "fyi", "done"];

export function BucketNav() {
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
      aria-label="Buckets and sources"
      className="flex h-full w-[188px] shrink-0 flex-col gap-4 border-r border-sidebar-border bg-sidebar px-2.5 py-3"
    >
      <div className="flex items-center gap-2 px-1.5">
        <div
          className="flex size-6 items-center justify-center rounded-md text-primary"
          style={{ background: "color-mix(in oklch, var(--primary) 14%, transparent)" }}
        >
          <HermesMark className="size-4" strokeWidth={2.2} />
        </div>
        <span className="text-[12.5px] font-semibold tracking-[-0.01em]">Hermes Inbox</span>
      </div>

      <div className="flex flex-col gap-0.5">
        <p className="px-1.5 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Buckets
        </p>
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
                "group relative flex h-8 items-center gap-2 rounded-md px-2 text-left text-[12.5px]",
                "transition-colors duration-[var(--transition-duration)] ease-[var(--ease-house)]",
                active
                  ? "bg-accent/70 text-foreground"
                  : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
              )}
            >
              {active && (
                <span
                  className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full"
                  style={{
                    background: BUCKET_META[b].token,
                    boxShadow: `0 0 8px ${BUCKET_META[b].token}`,
                  }}
                />
              )}
              <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ background: BUCKET_META[b].token }}
              />
              <span className="flex-1 truncate">{BUCKET_META[b].label}</span>
              {u > 0 && (
                <span
                  className="tnum size-1.5 rounded-full"
                  style={{ background: "var(--status-unread)" }}
                  title={`${u} unread`}
                />
              )}
              <span className="tnum text-[11px] tabular-nums text-muted-foreground">{n}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-0.5">
        <p className="px-1.5 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Sources
        </p>
        <SourceItem id="all" label="All sources" />
        {(Object.keys(SOURCE_META) as SourceId[]).map((s) => (
          <SourceItem key={s} id={s} label={SOURCE_META[s].label} />
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between px-1.5">
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Kbd>?</Kbd> shortcuts
        </span>
        <ModeToggle />
      </div>
    </nav>
  );
}

function SourceItem({ id, label }: { id: SourceId | "all"; label: string }) {
  const sourceFilter = useInboxStore((s) => s.sourceFilter);
  const setSourceFilter = useInboxStore((s) => s.setSourceFilter);
  const active = sourceFilter === id;
  return (
    <button
      type="button"
      onClick={() => setSourceFilter(id)}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex h-7 items-center gap-2 rounded-md px-2 text-left text-[12px]",
        "transition-colors duration-[var(--transition-duration)]",
        active
          ? "bg-accent/70 text-foreground"
          : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
      )}
    >
      <span className="flex w-5 shrink-0 justify-center text-muted-foreground">
        {id === "all" ? (
          <Layers className="size-3.5" strokeWidth={2} />
        ) : (
          <SourceIcon source={id} className="size-3.5" muted={!active} />
        )}
      </span>
      <span className="truncate">{label}</span>
    </button>
  );
}
