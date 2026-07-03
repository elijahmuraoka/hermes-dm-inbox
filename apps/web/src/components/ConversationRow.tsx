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
// Single-line max density; selection = full-row primary wash + inset ring.
// (v4: the amber share tick is gone — consent theater collapsed. Amber is
// Hermes's presence color on Hermes surfaces, not a row signal.)
function ConversationRowImpl({ conversation: c, selected, now, onClick }: RowProps) {
  const person = PEOPLE[c.personId];
  const lastMsg = c.messages[c.messages.length - 1];
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
          "w-[9.25rem] shrink-0 truncate text-[0.78125rem] tracking-[-0.005em]",
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

      <span className="min-w-0 flex-1 truncate text-[0.75rem] text-muted-foreground">
        {lastMsg?.preview}
      </span>

      <span className="tnum shrink-0 font-mono text-[0.6875rem] tabular-nums text-muted-foreground">
        {relTime(c.lastActivity, now)}
      </span>
    </button>
  );
}

export const ConversationRow = memo(ConversationRowImpl);
