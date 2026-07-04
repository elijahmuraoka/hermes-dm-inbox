import { useInboxStore } from "@/hooks/useInboxStore";
import { VIEW_META, SOURCE_META, type SourceId, type ViewId } from "@/lib/types";
import { isSnoozed } from "@/lib/derive";
import { cn } from "@/lib/utils";
import { ModeToggle } from "@/components/mode-toggle";
import { Kbd } from "@/components/ui/kbd";
import { SourceIcon } from "@/components/SourceIcon";
import { HermesMark } from "@/components/HermesMark";
import { Layers, Moon } from "lucide-react";

// v5 final: three views, not five buckets. A view is a way of looking, not a
// place things live — Needs Reply is home, Sent carries the open threads and
// their time pressure, All is the trust anchor that omits nothing.
const ORDER: ViewId[] = ["needs_reply", "sent", "all"];

export function ViewNav() {
  const conversations = useInboxStore((s) => s.conversations);
  const activeView = useInboxStore((s) => s.activeView);
  const setView = useInboxStore((s) => s.setView);
  const filters = useInboxStore((s) => s.filters);
  const now = useInboxStore((s) => s.now);

  const inSource = (c: (typeof conversations)[number]) =>
    filters.source === "all" || c.source === filters.source;
  const count = (v: ViewId) =>
    conversations.filter(
      (c) => inSource(c) && (v === "all" ? true : c.status === v && !isSnoozed(c, now)),
    ).length;
  const unread = (v: ViewId) =>
    conversations.filter((c) => c.unread && (v === "all" ? true : c.status === v)).length;
  const snoozedCount = conversations.filter((c) => isSnoozed(c, now)).length;

  return (
    <nav
      aria-label="Views and sources"
      className="flex h-full w-[11.75rem] shrink-0 flex-col gap-4 border-r border-sidebar-border bg-sidebar px-2.5 py-3"
    >
      <div className="flex items-center gap-2 px-1.5">
        <div
          className="flex size-6 items-center justify-center rounded-md text-primary"
          style={{ background: "color-mix(in oklch, var(--primary) 14%, transparent)" }}
        >
          <HermesMark className="size-4" strokeWidth={2.2} />
        </div>
        <span className="text-[0.78125rem] font-semibold tracking-[-0.01em]">Hermes Inbox</span>
      </div>

      <div className="flex flex-col gap-0.5">
        <p className="px-1.5 pb-1 text-[0.625rem] font-medium uppercase tracking-wider text-muted-foreground">
          Views
        </p>
        {ORDER.map((v) => {
          const active = v === activeView;
          const n = count(v);
          const u = unread(v);
          return (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-current={active ? "true" : undefined}
              className={cn(
                "group relative flex h-8 items-center gap-2 rounded-md px-2 text-left text-[0.78125rem]",
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
                    background: VIEW_META[v].token,
                    boxShadow: `0 0 8px ${VIEW_META[v].token}`,
                  }}
                />
              )}
              <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ background: VIEW_META[v].token }}
              />
              <span className="flex-1 truncate">{VIEW_META[v].label}</span>
              {u > 0 && (
                <span
                  className="tnum size-1.5 rounded-full"
                  style={{ background: "var(--status-unread)" }}
                  title={`${u} unread`}
                />
              )}
              <span className="tnum text-[0.6875rem] tabular-nums text-muted-foreground">{n}</span>
            </button>
          );
        })}
        {/* Snoozed is NOT a view (v5) — just an honest count while threads are
            hidden from the working views. They still appear in All. Solid
            muted-foreground: /80 opacity fails light-mode AA at this size. */}
        {snoozedCount > 0 && (
          <p className="flex h-6 items-center gap-2 px-2 text-[0.6875rem] text-muted-foreground">
            <Moon className="size-3" strokeWidth={2} aria-hidden />
            <span className="flex-1">Snoozed</span>
            <span className="tnum tabular-nums">{snoozedCount}</span>
          </p>
        )}
      </div>

      <div className="flex flex-col gap-0.5">
        <p className="px-1.5 pb-1 text-[0.625rem] font-medium uppercase tracking-wider text-muted-foreground">
          Sources
        </p>
        <SourceItem id="all" label="All sources" />
        {(Object.keys(SOURCE_META) as SourceId[]).map((s) => (
          <SourceItem key={s} id={s} label={SOURCE_META[s].label} />
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between px-1.5">
        <span className="flex items-center gap-1 text-[0.6875rem] text-muted-foreground">
          <Kbd>?</Kbd> shortcuts
        </span>
        <ModeToggle />
      </div>
    </nav>
  );
}

function SourceItem({ id, label }: { id: SourceId | "all"; label: string }) {
  const source = useInboxStore((s) => s.filters.source);
  const setSource = useInboxStore((s) => s.setSource);
  const active = source === id;
  return (
    <button
      type="button"
      onClick={() => setSource(id)}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex h-7 items-center gap-2 rounded-md px-2 text-left text-[0.75rem]",
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
