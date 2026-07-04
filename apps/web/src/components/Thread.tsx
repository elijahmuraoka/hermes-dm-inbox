import { useEffect, useRef } from "react";
import type { Conversation, Message } from "@/lib/types";
import { SOURCE_META } from "@/lib/types";
import { PEOPLE } from "@/lib/mock-data";
import { useInboxStore } from "@/hooks/useInboxStore";
import { cn, relTime } from "@/lib/utils";
import { SourceIcon } from "@/components/SourceIcon";
import { ChevronLeft, Paperclip, SendHorizontal } from "lucide-react";
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
          className="flex size-6 items-center justify-center rounded-full text-[0.625rem] font-semibold"
          style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}
        >
          {person.initials}
        </span>
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-[0.78125rem] font-semibold tracking-[-0.01em]">
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
          className="ml-1 flex shrink-0 items-center gap-1 rounded-[5px] border border-border px-1.5 py-px text-[0.625rem] text-muted-foreground"
          title={SOURCE_META[c.source].label}
        >
          <SourceIcon source={c.source} className="size-3" />
          {SOURCE_META[c.source].label}
        </span>
        <span className="ml-auto hidden truncate font-mono text-[0.6875rem] text-muted-foreground sm:inline">
          {person.handle}
        </span>
        {/* Below xl the side panel doesn't exist — the hero loop needs a visible door. */}
        <button
          type="button"
          onClick={() => setDraftSheet(true)}
          className="ml-auto flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-primary/35 bg-primary/10 px-2.5 text-[0.75rem] font-medium text-foreground transition-colors hover:bg-primary/20 sm:ml-2 xl:hidden"
        >
          <HermesMark className="size-3.5 text-primary" strokeWidth={2.2} />
          {hasDraft ? "View draft" : "Draft"}
        </button>
      </div>

      {/* hermes strip: triage rationale. Amber = Hermes's presence color (v4). */}
      {c.hermesSuggestion && (
        <div className="flex items-center gap-2 border-b border-border bg-muted/25 px-4 py-2">
          <span
            className="mt-px shrink-0 font-mono text-[0.59375rem] font-semibold uppercase tracking-wider"
            style={{ color: "var(--hermes)" }}
          >
            Hermes
          </span>
          <p className="min-w-0 truncate text-[0.75rem] leading-snug text-muted-foreground">
            {c.hermesSuggestion}
          </p>
        </div>
      )}

      {/* messages — always fully visible to the human (single-user local app).
          Column + line measure capped so ultra-wide screens don't produce 1300px lines. */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto w-full max-w-[45rem] space-y-3">
          {c.messages.map((m) => (
            <MessageBubble key={m.id} message={m} now={now} />
          ))}
        </div>
      </div>

      <RoutingStrip conversation={c} />
      <Composer />
    </div>
  );
}

/** Post-send routing (v5 final): a send always lands the thread in Sent
    (open); Hermes only SUGGESTS done-vs-open, in one quiet line with the
    action one tap away. Suggestion, not fait accompli. */
function RoutingStrip({ conversation: c }: { conversation: Conversation }) {
  const flipRouting = useInboxStore((s) => s.flipRouting);
  const lastMsg = c.messages[c.messages.length - 1];
  if (!c.routedAfterSend || lastMsg?.direction !== "out") return null;

  const done = c.status === "done";
  const suggestsDone = c.routedAfterSend === "done";
  return (
    <div className="flex items-center gap-2 border-t border-border bg-muted/25 px-4 py-1.5">
      <span
        className="shrink-0 font-mono text-[0.59375rem] font-semibold uppercase tracking-wider"
        style={{ color: "var(--hermes)" }}
      >
        Hermes
      </span>
      <p className="min-w-0 truncate text-[0.71875rem] text-muted-foreground">
        {done
          ? "Marked done — nothing left here."
          : suggestsDone
            ? "This reads like a wrap-up — done?"
            : "Sent — open until they respond."}
      </p>
      <button
        type="button"
        onClick={flipRouting}
        className="ml-auto shrink-0 rounded-md px-1.5 py-0.5 text-[0.71875rem] font-medium text-primary transition-colors hover:bg-accent"
      >
        {done ? "Reopen" : "Mark done"}
      </button>
    </div>
  );
}

/** The one editing surface — a standard messenger composer. Hermes drafts land
    here as prefills ("Add to chat"); ⌘Enter sends.
    IMPLEMENTATION HONESTY (code-level only — the UI is diegetic, per Elijah
    2026-07-03): v0 "send" is a local mock append; nothing is delivered.
    That truth lives HERE, in commits, and in the PR — never on the surface. */
function Composer() {
  const composerText = useInboxStore((s) => s.composerText);
  const setComposerText = useInboxStore((s) => s.setComposerText);
  const composerAttach = useInboxStore((s) => s.composerAttach);
  const toggleAttach = useInboxStore((s) => s.toggleAttach);
  const sendMock = useInboxStore((s) => s.sendMock);
  const focusTick = useInboxStore((s) => s.composerFocusTick);
  const ref = useRef<HTMLTextAreaElement>(null);

  // focusComposer()/addToChat() bump the tick → we take focus on the NEXT
  // frame, after the triggering keydown's default processing has finished —
  // the hotkey character must never leak into the textarea.
  useEffect(() => {
    if (focusTick === 0) return;
    const raf = requestAnimationFrame(() => ref.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [focusTick]);

  // Auto-grow up to ~6 lines, then scroll.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [composerText]);

  return (
    <div className="shrink-0 border-t border-border bg-background/80 px-4 pb-2 pt-2.5">
      <div className="mx-auto w-full max-w-[45rem]">
        {composerAttach && (
          <div className="mb-1.5 flex">
            <span className="flex items-center gap-1 rounded-[5px] border border-border bg-muted/50 px-1.5 py-px text-[0.65625rem] text-muted-foreground">
              <Paperclip className="size-2.5" /> 1 attachment
            </span>
          </div>
        )}
        <div className="flex items-end gap-2 rounded-lg border border-border bg-card px-2 py-1.5 transition-colors focus-within:border-primary/40">
          <button
            type="button"
            onClick={toggleAttach}
            aria-label="Attach file"
            title="Attach file"
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-md transition-colors",
              composerAttach
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Paperclip className="size-3.5" />
          </button>
          <textarea
            ref={ref}
            rows={1}
            value={composerText}
            onChange={(e) => setComposerText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                sendMock();
              } else if (e.key === "Escape") {
                // return to list scope: blur so j/k/global keys take over
                e.currentTarget.blur();
              }
            }}
            placeholder="Reply… (c to focus · ⌘Enter to send)"
            aria-label="Message composer"
            className="max-h-[132px] min-h-[28px] flex-1 resize-none bg-transparent py-1 text-[0.8125rem] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground focus-visible:!shadow-none"
          />
          <button
            type="button"
            onClick={sendMock}
            disabled={!composerText.trim()}
            aria-label="Send message"
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-md transition-colors",
              composerText.trim()
                ? "bg-primary text-primary-foreground hover:brightness-110"
                : "text-muted-foreground/50",
            )}
          >
            <SendHorizontal className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message: m, now }: { message: Message; now: number }) {
  const mine = m.direction === "out";
  const author = mine ? PEOPLE.me : PEOPLE[m.authorId];

  return (
    <div className={cn("flex flex-col gap-1", mine ? "items-end" : "items-start")}>
      <div className="flex items-center gap-2 px-1">
        <span className="text-[0.6875rem] font-medium text-muted-foreground">{author?.name}</span>
        <span className="tnum font-mono text-[0.625rem] tabular-nums text-muted-foreground">
          {relTime(m.timestamp, now)}
        </span>
      </div>

      <div
        className={cn(
          "max-w-[min(85%,68ch)] rounded-xl border px-3 py-2 text-[0.8125rem] leading-relaxed",
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
