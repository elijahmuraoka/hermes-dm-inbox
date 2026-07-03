import type { Conversation, Message } from "@/lib/types";
import { SOURCE_META } from "@/lib/types";
import { PEOPLE } from "@/lib/mock-data";
import { useInboxStore } from "@/hooks/useInboxStore";
import { cn, relTime } from "@/lib/utils";
import { SharedBadge } from "@/components/SharedBadge";
import { ChevronLeft, Share2, Wand2, X } from "lucide-react";

export function Thread({ conversation: c }: { conversation: Conversation }) {
  const person = PEOPLE[c.personId];
  const now = useInboxStore((s) => s.now);
  const backToList = useInboxStore((s) => s.backToList);
  const setDraftSheet = useInboxStore((s) => s.setDraftSheet);
  const hasDraft = c.draft.versions.length > 0;

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
        <span className="tnum ml-1 rounded-[5px] border border-border px-1.5 py-px font-mono text-[10px] text-muted-foreground">
          {SOURCE_META[c.source].label}
        </span>
        <span className="ml-auto hidden truncate font-mono text-[11px] text-muted-foreground sm:inline">
          {person.handle}
        </span>
        {/* Below lg the side panel doesn't exist — the hero loop needs a visible door. */}
        <button
          type="button"
          onClick={() => setDraftSheet(true)}
          className="ml-auto flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-primary/35 bg-primary/10 px-2.5 text-[12px] font-medium text-foreground transition-colors hover:bg-primary/20 sm:ml-2 lg:hidden"
        >
          <Wand2 className="size-3.5 text-primary" strokeWidth={2.25} />
          {hasDraft ? "View draft" : "Draft"}
        </button>
      </div>

      {/* hermes triage rationale */}
      {c.hermesSuggestion && (
        <div className="flex items-start gap-2 border-b border-border bg-muted/25 px-4 py-2">
          <span
            className="mt-px font-mono text-[9.5px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--agent-label)" }}
          >
            Hermes
          </span>
          <p className="text-[12px] leading-snug text-muted-foreground">{c.hermesSuggestion}</p>
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

function MessageBubble({ message: m, now }: { message: Message; now: number }) {
  const shareWithHermes = useInboxStore((s) => s.shareWithHermes);
  const unshareFromHermes = useInboxStore((s) => s.unshareFromHermes);
  const mine = m.direction === "out";
  const author = mine ? PEOPLE.me : PEOPLE[m.authorId];

  return (
    <div className={cn("flex flex-col gap-1", mine ? "items-end" : "items-start")}>
      <div className="flex items-center gap-2 px-1">
        <span className="text-[11px] font-medium text-muted-foreground">{author?.name}</span>
        <span className="tnum font-mono text-[10px] tabular-nums text-muted-foreground">
          {relTime(m.timestamp, now)}
        </span>
        <SharedBadge shared={m.sharedWithHermes} />
      </div>

      <div
        className={cn(
          "group max-w-[min(85%,68ch)] rounded-xl border px-3 py-2 text-[13px] leading-relaxed",
          mine
            ? "border-primary/25 bg-[color-mix(in_oklch,var(--primary)_12%,var(--card))]"
            : "border-border bg-card",
          m.sharedWithHermes && "border-[color-mix(in_oklch,var(--priv-shared)_35%,transparent)]",
        )}
      >
        <p className="text-foreground">{m.body}</p>

        {/* The one gate: opt a body into Hermes' context. Only for incoming bodies. */}
        {!mine &&
          (m.sharedWithHermes ? (
            <button
              type="button"
              onClick={() => unshareFromHermes(m.id)}
              className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground"
              title="Remove this body from Hermes' context"
            >
              <X className="size-3" /> Unshare from Hermes
            </button>
          ) : (
            <button
              type="button"
              onClick={() => shareWithHermes(m.id)}
              className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground"
              title="Include this body in Hermes' context for drafting"
            >
              <Share2 className="size-3" /> Share with Hermes
            </button>
          ))}
      </div>
    </div>
  );
}
