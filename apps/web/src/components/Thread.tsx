import type { Conversation, Message } from "@/lib/types";
import { SOURCE_META } from "@/lib/types";
import { PEOPLE } from "@/lib/mock-data";
import { useInboxStore } from "@/hooks/useInboxStore";
import { cn, relTime } from "@/lib/utils";
import { SourceIcon } from "@/components/SourceIcon";
import { ChevronLeft, Share2, ShieldOff } from "lucide-react";
import { HermesMark } from "@/components/HermesMark";

export function Thread({ conversation: c }: { conversation: Conversation }) {
  const person = PEOPLE[c.personId];
  const now = useInboxStore((s) => s.now);
  const backToList = useInboxStore((s) => s.backToList);
  const setDraftSheet = useInboxStore((s) => s.setDraftSheet);
  const hasDraft = c.draft.versions.length > 0 || c.draft.status === "angles_ready";

  return (
    <div className="flex h-full min-w-0 flex-col">
      {/* thread header */}
      <div className="flex h-10 shrink-0 items-center gap-2.5 border-b border-border px-4">
        <button
          type="button"
          onClick={backToList}
          aria-label="Back to list"
          className="-ml-1.5 flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span
          className="flex size-6 items-center justify-center rounded-full text-[10px] font-semibold"
          style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}
        >
          {person.initials}
        </span>
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[12.5px] font-semibold tracking-[-0.01em]">
            {person.name}
          </span>
          {c.urgency === "high" && (
            <span
              className="size-1.5 shrink-0 rounded-full"
              style={{ background: "var(--urgency-high)", boxShadow: "0 0 6px var(--urgency-high)" }}
              title="Urgent"
            />
          )}
        </div>
        <span
          className="ml-1 flex shrink-0 items-center gap-1 rounded-[5px] border border-border px-1.5 py-px text-[10px] text-muted-foreground"
          title={SOURCE_META[c.source].label}
        >
          <SourceIcon source={c.source} className="size-3" />
          {SOURCE_META[c.source].label}
        </span>
        <span className="ml-auto hidden truncate font-mono text-[11px] text-muted-foreground sm:inline">
          {person.handle}
        </span>
        {/* Below xl the side panel doesn't exist — the hero loop needs a visible door. */}
        <button
          type="button"
          onClick={() => setDraftSheet(true)}
          className="ml-auto flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-primary/35 bg-primary/10 px-2.5 text-[12px] font-medium text-foreground transition-colors hover:bg-primary/20 sm:ml-2 xl:hidden"
        >
          <HermesMark className="size-3.5 text-primary" strokeWidth={2.2} />
          {hasDraft ? "View draft" : "Draft"}
        </button>
      </div>

      {/* hermes strip: triage rationale + the thread-level share state */}
      {(c.hermesSuggestion || c.threadShared || c.hermesBlocked) && (
        <div className="flex items-center gap-2 border-b border-border bg-muted/25 px-4 py-2">
          {c.hermesSuggestion && (
            <>
              <span
                className="mt-px shrink-0 font-mono text-[9.5px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--agent-label)" }}
              >
                Hermes
              </span>
              <p className="min-w-0 truncate text-[12px] leading-snug text-muted-foreground">
                {c.hermesSuggestion}
              </p>
            </>
          )}
          <span className="ml-auto shrink-0">
            <ThreadShareState conversation={c} />
          </span>
        </div>
      )}

      {/* messages — always fully visible to the human (single-user local app).
          Column + line measure capped so ultra-wide screens don't produce 1300px lines. */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto w-full max-w-[720px] space-y-3">
          {c.messages.map((m) => (
            <MessageBubble key={m.id} message={m} now={now} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** The thread-level sharing state — the one privacy signal, plus its opt-out. */
function ThreadShareState({ conversation: c }: { conversation: Conversation }) {
  const toggleHermesAccess = useInboxStore((s) => s.toggleHermesAccess);

  if (c.hermesBlocked) {
    return (
      <span className="flex items-center gap-1.5">
        <span
          className="inline-flex items-center gap-1 rounded-[5px] border border-border px-1.5 py-px text-[10.5px] font-medium text-muted-foreground"
          title="Hermes is blocked from this thread — drafts use metadata only"
        >
          <ShieldOff className="size-2.5" strokeWidth={2.5} />
          Hermes blocked
        </span>
        <button
          type="button"
          onClick={toggleHermesAccess}
          className="text-[10.5px] text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground"
        >
          Allow
        </button>
      </span>
    );
  }

  if (c.threadShared) {
    return (
      <span className="flex items-center gap-1.5">
        <span
          role="img"
          aria-label="Hermes sees this thread"
          className="inline-flex items-center gap-1 rounded-[5px] border px-1.5 py-px text-[10.5px] font-medium"
          style={{
            color: "var(--priv-shared)",
            borderColor: "color-mix(in oklch, var(--priv-shared) 45%, transparent)",
            backgroundColor: "color-mix(in oklch, var(--priv-shared) 12%, transparent)",
          }}
          title="This thread's messages are in Hermes' context"
        >
          <Share2 className="size-2.5" strokeWidth={2.5} />
          Hermes sees this thread
        </span>
        <button
          type="button"
          onClick={toggleHermesAccess}
          className="text-[10.5px] text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground"
          title="Block Hermes from reading this thread's bodies in future drafts"
        >
          Block
        </button>
      </span>
    );
  }

  return null; // default state carries zero chrome
}

function MessageBubble({ message: m, now }: { message: Message; now: number }) {
  const mine = m.direction === "out";
  const author = mine ? PEOPLE.me : PEOPLE[m.authorId];

  return (
    <div className={cn("flex flex-col gap-1", mine ? "items-end" : "items-start")}>
      <div className="flex items-center gap-2 px-1">
        <span className="text-[11px] font-medium text-muted-foreground">{author?.name}</span>
        <span className="tnum font-mono text-[10px] tabular-nums text-muted-foreground">
          {relTime(m.timestamp, now)}
        </span>
      </div>

      <div
        className={cn(
          "max-w-[min(85%,68ch)] rounded-xl border px-3 py-2 text-[13px] leading-relaxed",
          mine
            ? "border-primary/25 bg-[color-mix(in_oklch,var(--primary)_12%,var(--card))]"
            : "border-border bg-card",
        )}
      >
        <p className="text-foreground">{m.body}</p>
      </div>
    </div>
  );
}
