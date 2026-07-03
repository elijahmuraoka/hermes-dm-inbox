import { memo } from "react";
import type { Conversation } from "@/lib/types";
import { SOURCE_META } from "@/lib/types";
import { PEOPLE } from "@/lib/mock-data";
import { cn, relTime } from "@/lib/utils";
import { SourceIcon } from "@/components/SourceIcon";

interface RowProps {
  conversation: Conversation;
  selected: boolean;
  now: number;
  onClick: () => void;
}

// LOCKED (§8 variant bake-off, Elijah 2026-07-03): the "ledger" treatment.
// Single-line 40px max density. The edge language is the identity move:
//   cyan  = where you are  (selection: full-row primary wash + inset ring)
//   amber = what Hermes sees (thread shared: glowing amber tick on the row edge)
// Losing variants ("edge", "card") deleted from the codebase.
function ConversationRowImpl({ conversation: c, selected, now, onClick }: RowProps) {
  const person = PEOPLE[c.personId];
  const lastMsg = c.messages[c.messages.length - 1];
  const shared = c.threadShared;
  const drafted = c.draft.status !== "not_started";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "group relative flex h-10 w-full items-center gap-2.5 border-b border-border/60 pl-3 pr-4 text-left",
        "transition-colors duration-[120ms] ease-[var(--ease-house)]",
        selected
          ? "bg-primary/10 shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--primary)_35%,transparent)]"
          : "hover:bg-accent/25",
      )}
    >
      {/* shared = amber tick on the row edge — the one original signal, made loud.
          Blocked-after-share: muted tick, no glow — the history stands, the door is shut. */}
      {shared && (
        <span
          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full"
          style={
            c.hermesBlocked
              ? { background: "var(--muted-foreground)", opacity: 0.55 }
              : { background: "var(--priv-shared)", boxShadow: "0 0 8px var(--priv-shared)" }
          }
          title={
            c.hermesBlocked
              ? "This thread was shared with Hermes; Hermes is now blocked here"
              : "This thread is shared with Hermes"
          }
        />
      )}

      <span className="flex w-2 shrink-0 justify-center">
        {c.unread && (
          <span className="size-1.5 rounded-full" style={{ background: "var(--status-unread)" }} />
        )}
      </span>

      <span
        className="flex w-8 shrink-0 justify-center text-muted-foreground"
        title={SOURCE_META[c.source].label}
      >
        <SourceIcon source={c.source} className="size-3.5" />
      </span>

      <span
        className={cn(
          "w-[148px] shrink-0 truncate text-[12.5px] tracking-[-0.005em]",
          c.unread ? "font-semibold text-foreground" : "font-medium text-foreground/90",
        )}
      >
        {person.name}
      </span>

      {c.urgency === "high" && (
        <span
          className="size-1.5 shrink-0 rounded-full"
          style={{ background: "var(--urgency-high)" }}
          title="Urgent"
        />
      )}
      {drafted && (
        <span
          className="size-1.5 shrink-0 rounded-full"
          style={{ background: "var(--bucket-drafted)" }}
          title="Draft in progress"
        />
      )}

      <span className="min-w-0 flex-1 truncate text-[12px] text-muted-foreground">
        {lastMsg?.preview}
      </span>

      <span className="tnum shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
        {relTime(c.lastActivity, now)}
      </span>
    </button>
  );
}

export const ConversationRow = memo(ConversationRowImpl);
