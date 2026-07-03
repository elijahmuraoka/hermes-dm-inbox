import { useInboxStore } from "@/hooks/useInboxStore";
import { Kbd } from "@/components/ui/kbd";
import { Menu, Search } from "lucide-react";

export function Topbar() {
  const setPalette = useInboxStore((s) => s.setPalette);
  const setDrawer = useInboxStore((s) => s.setDrawer);
  const loadState = useInboxStore((s) => s.loadState);
  const synced = loadState === "ready";

  return (
    <header className="flex h-11 min-w-0 shrink-0 items-center gap-3 border-b border-border bg-background/80 px-3 backdrop-blur">
      {/* Mobile (<md): hamburger opens the bucket/source drawer. */}
      <button
        type="button"
        onClick={() => setDrawer(true)}
        aria-label="Open buckets and sources"
        className="-ml-1 flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
      >
        <Menu className="size-4" />
      </button>

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
        {/* One clean keycap — not two command symbols side by side. */}
        <button
          type="button"
          onClick={() => setPalette(true)}
          aria-label="Open command palette"
          className="flex items-center rounded-md p-0.5 transition-colors hover:bg-accent"
        >
          <Kbd className="h-6 px-2 text-[11px]">⌘K</Kbd>
        </button>
      </div>
    </header>
  );
}
