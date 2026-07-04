import { memo } from "react";
import type { Conversation, ViewId } from "@/lib/types";
import { SOURCE_META } from "@/lib/types";
import { PEOPLE } from "@/lib/mock-data";
import { useInboxStore } from "@/hooks/useInboxStore";
import { hasDraft, isSnoozed, isStale } from "@/lib/derive";
import { cn, daysSince, relTime } from "@/lib/utils";
import { SourceIcon } from "@/components/SourceIcon";
import { HermesMark } from "@/components/HermesMark";
import { Check, Moon } from "lucide-react";

interface RowProps {
  conversation: Conversation;
  view: ViewId;
  selected: boolean;
  exiting: boolean;
  now: number;
  onClick: () => void;
}

// LOCKED (§8 variant bake-off, Elijah 2026-07-03): the "ledger" treatment.
// Single-line max density; selection = full-row primary wash + inset ring.
// (v4: the amber share tick is gone — consent theater collapsed. Amber is
// Hermes's presence color, and the medium-priority dot qualifies: priority
// IS Hermes's triage voice.)
// v5/v6: a fixed PRIORITY slot on every row (red high · amber medium ·
// empty normal), then the active view's language — in Important, a Draft
// chip (leverage) and an `ack · e` affordance on FYI rows (know it, clear
// it); staleness + a nudge affordance in Sent (time pressure); a snoozed
// chip in All (the skim omits nothing).
// v7 (mouse parity): hovering a row fades the time/affordance chips into a
// quiet action cluster — done/ack · draft/nudge · snooze — in the same slot,
// each tooltip carrying its hotkey. The row is a DIV wrapping a main select
// button plus the sibling cluster: buttons never nest (invalid HTML, axe).
// The cluster is tabIndex -1 — the keyboard path is e/d/s, not forty tab
// stops. v7 motion: `exiting` plays the leave animation while the mutation
// waits (store exitThenCommit); the collapsing height closes the gap.
function ConversationRowImpl({ conversation: c, view, selected, exiting, now, onClick }: RowProps) {
  const person = PEOPLE[c.personId];
  const lastMsg = c.messages[c.messages.length - 1];
  const drafted = hasDraft(c);
  const stale = view === "sent" && isStale(c, now);
  const fyi = c.status === "fyi";
  const quietDays = daysSince(c.lastActivity, now);

  // Static dispatch (getState) keeps the memo intact — no extra subscriptions.
  const act = (fn: (s: ReturnType<typeof useInboxStore.getState>) => void) =>
    (e: React.MouseEvent) => {
      e.stopPropagation();
      fn(useInboxStore.getState());
    };

  // The fading right cluster: while hovered, time + affordance chips hand
  // their slot to the buttons — the chip's message IS the button now shown.
  // Hover only — focus-within would pin the cluster open on the selected row
  // (the main button keeps focus after a click) and hide its time for good.
  const fadeOnHover = "transition-opacity duration-[120ms] group-hover:opacity-0";

  return (
    <div
      className={cn(
        "group relative border-b border-border/60",
        "transition-colors duration-[120ms] ease-[var(--ease-house)]",
        selected
          ? "bg-primary/10 shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--primary)_35%,transparent)]"
          : "hover:bg-accent/25",
        exiting && "animate-row-exit",
      )}
    >
      <button
        type="button"
        onClick={onClick}
        aria-current={selected ? "true" : undefined}
        className="flex h-10 w-full items-center gap-2.5 pl-3 pr-4 text-left"
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
            Hermes-computed; the tooltip carries the words (p / ⌘K cycles). */}
        <span className="flex w-2 shrink-0 justify-center">
          {c.urgency !== "normal" && (
            <span
              className="size-1.5 rounded-full"
              style={{
                background: c.urgency === "high" ? "var(--urgency-high)" : "var(--hermes)",
              }}
              title={
                c.urgency === "high"
                  ? "Hermes: high priority — p cycles"
                  : "Hermes: medium priority — p cycles"
              }
            />
          )}
        </span>
        {drafted &&
          (view === "important" ? (
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

        {/* #5: below a few ch the preview is an orphan letter ("S…") — collapse
            it entirely instead of crushing. The flex-1 wrapper still absorbs the
            free space so the time column stays pinned right. */}
        <span className="@container min-w-0 flex-1">
          <span className="hidden truncate text-[0.75rem] text-muted-foreground @[2rem]:block">
            {lastMsg?.preview}
          </span>
        </span>

        {/* Sent view: the nudge affordance appears once a thread goes stale —
            `d` on it drafts a follow-up (gentle nudge / direct ask / brief bump). */}
        {stale && (
          <span
            className={cn(
              "shrink-0 rounded-[4px] border border-border bg-muted/40 px-1 py-px font-mono text-[0.59375rem] text-muted-foreground",
              fadeOnHover,
            )}
            title={`Quiet for ${quietDays} days — press d to draft a follow-up`}
          >
            nudge · d
          </span>
        )}
        {/* Important's FYI section (v6): `e` acknowledges — the row leaves
            Important and lives on in All. Mirrors Sent's nudge affordance. */}
        {view === "important" && fyi && (
          <span
            className={cn(
              "shrink-0 rounded-[4px] border border-border bg-muted/40 px-1 py-px font-mono text-[0.59375rem] text-muted-foreground",
              fadeOnHover,
            )}
            title="Info to know, no reply expected — press e to acknowledge (stays in All)"
          >
            ack · e
          </span>
        )}
        <span
          className={cn(
            "tnum shrink-0 font-mono text-[0.6875rem] tabular-nums",
            stale ? "font-medium text-foreground/80" : "text-muted-foreground",
            fadeOnHover,
          )}
        >
          {view === "sent" && quietDays >= 1 ? `${quietDays}d` : relTime(c.lastActivity, now)}
        </span>
      </button>

      {/* v7 hover actions — Superhuman-style: the time slot becomes the verb
          slot. Solid backdrop matches the hovered/selected row wash so the
          preview never bleeds through underneath. */}
      <span
        className={cn(
          "absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5 rounded-md px-0.5",
          "pointer-events-none opacity-0 transition-opacity duration-[120ms] group-hover:pointer-events-auto group-hover:opacity-100",
        )}
        style={{
          background: selected
            ? "color-mix(in oklab, var(--primary) 10%, var(--background))"
            : "color-mix(in oklab, var(--accent) 25%, var(--background))",
        }}
      >
        <RowAction
          label={fyi ? "Acknowledge · e" : "Mark done · e"}
          sr={`${fyi ? "Acknowledge" : "Mark done"} — ${person.name}`}
          onClick={act((s) => s.markDone(c.id))}
        >
          <Check className="size-3.5" />
        </RowAction>
        <RowAction
          label={view === "sent" ? "Nudge with Hermes · d" : "Draft with Hermes · d"}
          sr={`${view === "sent" ? "Nudge with Hermes" : "Draft with Hermes"} — ${person.name}`}
          onClick={act((s) => {
            s.selectId(c.id);
            s.requestDraft();
          })}
        >
          <HermesMark className="size-3.5" strokeWidth={2.2} />
        </RowAction>
        <RowAction
          label="Snooze · s"
          sr={`Snooze — ${person.name}`}
          onClick={act((s) => s.snooze(c.id))}
        >
          <Moon className="size-3.5" />
        </RowAction>
      </span>
    </div>
  );
}

function RowAction({
  label,
  sr,
  onClick,
  children,
}: {
  label: string; // quiet tooltip: verb + key
  sr: string; // screen readers get the target too — forty rows of bare "Mark done" would be noise
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      tabIndex={-1}
      onClick={onClick}
      aria-label={sr}
      title={label}
      className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      {children}
    </button>
  );
}

export const ConversationRow = memo(ConversationRowImpl);
