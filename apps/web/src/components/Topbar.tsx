import { useInboxStore } from "@/hooks/useInboxStore";
import { Kbd } from "@/components/ui/kbd";
import { Search, Command } from "lucide-react";

export function Topbar() {
  const setPalette = useInboxStore((s) => s.setPalette);
  const loadState = useInboxStore((s) => s.loadState);
  const synced = loadState === "ready";

  return (
    <header className="flex h-11 min-w-0 shrink-0 items-center gap-3 border-b border-border bg-background/80 px-3 backdrop-blur">
      <button
        type="button"
        onClick={() => setPalette(true)}
        className="group flex h-7 min-w-0 max-w-[340px] flex-1 items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 text-left text-[12px] text-muted-foreground transition-colors hover:border-primary/25 hover:bg-muted/60"
      >
        <Search className="size-3.5 shrink-0" />
        <span className="flex-1 truncate">Search people, messages, tasks…</span>
        <Kbd className="hidden sm:inline-flex">/</Kbd>
      </button>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        <span className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
          <span
            className="size-1.5 rounded-full"
            style={{
              background: synced ? "var(--bucket-done)" : "var(--bucket-waiting)",
              boxShadow: synced ? "0 0 6px var(--bucket-done)" : "0 0 6px var(--bucket-waiting)",
            }}
          />
          {synced ? "Synced" : "Syncing…"}
        </span>
        <button
          type="button"
          onClick={() => setPalette(true)}
          className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[11.5px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <Command className="size-3.5" />
          <Kbd>⌘K</Kbd>
        </button>
      </div>
    </header>
  );
}
