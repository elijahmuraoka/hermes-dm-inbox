import { useInboxStore } from "@/hooks/useInboxStore";
import { VIEW_META, SOURCE_META, type SourceId, type ViewId } from "@/lib/types";
import { isSnoozed, population } from "@/lib/derive";
import { cn } from "@/lib/utils";
import { ModeToggle } from "@/components/mode-toggle";
import { Kbd } from "@/components/ui/kbd";
import { TickNum } from "@/components/ui/tick-num";
import { SourceIcon } from "@/components/SourceIcon";
import { HermesMark } from "@/components/HermesMark";
import { Layers, Moon } from "lucide-react";

// v6: three views — Important is home (what matters now, gated by Hermes's
// importance triage), Sent carries the open threads and their time pressure,
// All is the trust anchor that omits nothing.
const ORDER: ViewId[] = ["important", "sent", "all"];

export function ViewNav() {
  const conversations = useInboxStore((s) => s.conversations);
  const activeView = useInboxStore((s) => s.activeView);
  const setView = useInboxStore((s) => s.setView);
  const setShortcuts = useInboxStore((s) => s.setShortcuts);
  const filters = useInboxStore((s) => s.filters);
  const now = useInboxStore((s) => s.now);
  // R21: an errored sync can't vouch for counts here either — the list
  // header already shows "—"; the rail must not present stale numbers and
  // unread dots as current (H2 family: the two surfaces may never disagree).
  const errored = useInboxStore((s) => s.loadState) === "error";

  // THE population lens (review H2): the rail, the list title, and Sent's
  // done toggle all count through derive.population under the full active
  // filters — one lens, so the surfaces can never disagree (F1/F3 class).
  const pop = (v: ViewId) => population(conversations, v, filters, now);
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
          const rows = pop(v);
          const n = rows.length;
          const u = rows.filter((c) => c.unread).length;
          return (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-current={active ? "true" : undefined}
              title={`${VIEW_META[v].label} — ${VIEW_META[v].key}`}
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
              {!errored && u > 0 && (
                <span
                  className="tnum size-1.5 rounded-full"
                  style={{ background: "var(--status-unread)" }}
                  title={`${u} unread`}
                />
              )}
              {errored ? (
                <span className="tnum text-[0.6875rem] tabular-nums text-muted-foreground">—</span>
              ) : (
                <TickNum
                  value={n}
                  className="tnum text-[0.6875rem] tabular-nums text-muted-foreground"
                />
              )}
            </button>
          );
        })}
        {/* Snoozed is NOT a view (v5) — just an honest count while threads are
            hidden from the working views. They still appear in All. Solid
            muted-foreground: /80 opacity fails light-mode AA at this size. */}
        {!errored && snoozedCount > 0 && (
          <p className="flex h-6 items-center gap-2 px-2 text-[0.6875rem] text-muted-foreground">
            <Moon className="size-3" strokeWidth={2} aria-hidden />
            <span className="flex-1">Snoozed</span>
            <TickNum value={snoozedCount} className="tnum tabular-nums" />
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
        {/* v7 mouse parity: the hint is also the door — click opens the sheet. */}
        <button
          type="button"
          onClick={() => setShortcuts(true)}
          className="flex items-center gap-1 rounded-md px-1 py-0.5 text-[0.6875rem] text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
        >
          <Kbd>?</Kbd> shortcuts
        </button>
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
