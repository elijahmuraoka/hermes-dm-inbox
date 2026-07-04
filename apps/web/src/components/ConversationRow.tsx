import { memo } from "react";
import type { Conversation, ViewId } from "@/lib/types";
import { SOURCE_META } from "@/lib/types";
import { PEOPLE } from "@/lib/mock-data";
import { hasDraft, isSnoozed, isStale } from "@/lib/derive";
import { cn, daysSince, relTime } from "@/lib/utils";
import { SourceIcon } from "@/components/SourceIcon";

interface RowProps {
  conversation: Conversation;
  view: ViewId;
  selected: boolean;
  now: number;
  onClick: () => void;
}

// LOCKED (§8 variant bake-off, Elijah 2026-07-03): the "ledger" treatment.
// Single-line max density; selection = full-row primary wash + inset ring.
// (v4: the amber share tick is gone — consent theater collapsed. Amber is
// Hermes's presence color, and the medium-priority dot qualifies: priority
// IS Hermes's triage voice.)
// v5 final: a fixed PRIORITY slot on every row (red high · amber medium ·
// empty normal), then the active view's language — a Draft chip in Needs
// Reply (leverage), staleness + a nudge affordance in Sent (time pressure),
// and a snoozed chip in All (the skim omits nothing).
function ConversationRowImpl({ conversation: c, view, selected, now, onClick }: RowProps) {
  const person = PEOPLE[c.personId];
  const lastMsg = c.messages[c.messages.length - 1];
  const drafted = hasDraft(c);
  const stale = view === "sent" && isStale(c, now);
  const quietDays = daysSince(c.lastActivity, now);

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

      {/* Priority slot — fixed width so rows align; empty means normal.
          Hermes-computed; the tooltip carries the words. */}
      <span className="flex w-2 shrink-0 justify-center">
        {c.urgency !== "normal" && (
          <span
            className="size-1.5 rounded-full"
            style={{
              background: c.urgency === "high" ? "var(--urgency-high)" : "var(--hermes)",
            }}
            title={c.urgency === "high" ? "Hermes: high priority" : "Hermes: medium priority"}
          />
        )}
      </span>
      {drafted &&
        (view === "needs_reply" ? (
          <span
            className="shrink-0 rounded-[4px] border px-1 py-px text-[0.59375rem] font-medium uppercase tracking-wider"
            style={{
              color: "var(--draft-ready)",
              borderColor: "color-mix(in oklch, var(--draft-ready) 40%, transparent)",
              background: "color-mix(in oklch, var(--draft-ready) 10%, transparent)",
            }}
            title="Hermes draft ready"
          >
            Draft
          </span>
        ) : (
          <span
            className="size-1.5 shrink-0 rounded-full"
            style={{ background: "var(--draft-ready)" }}
            title="Draft in progress"
          />
        ))}
      {view === "all" && isSnoozed(c, now) && (
        <span
          className="shrink-0 rounded-[4px] border border-border bg-muted/40 px-1 py-px font-mono text-[0.59375rem] text-muted-foreground"
          title="Snoozed — hidden from the working views until it returns"
        >
          snoozed
        </span>
      )}

      <span className="min-w-0 flex-1 truncate text-[0.75rem] text-muted-foreground">
        {lastMsg?.preview}
      </span>

      {/* Sent view: the nudge affordance appears once a thread goes stale —
          `d` on it drafts a follow-up (gentle nudge / direct ask / brief bump). */}
      {stale && (
        <span
          className="shrink-0 rounded-[4px] border border-border bg-muted/40 px-1 py-px font-mono text-[0.59375rem] text-muted-foreground"
          title={`Quiet for ${quietDays} days — press d to draft a follow-up`}
        >
          nudge · d
        </span>
      )}
      <span
        className={cn(
          "tnum shrink-0 font-mono text-[0.6875rem] tabular-nums",
          stale ? "font-medium text-foreground/80" : "text-muted-foreground",
        )}
      >
        {view === "sent" && quietDays >= 1 ? `${quietDays}d` : relTime(c.lastActivity, now)}
      </span>
    </button>
  );
}

export const ConversationRow = memo(ConversationRowImpl);
