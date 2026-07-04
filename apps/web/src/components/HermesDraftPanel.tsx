import { useEffect, useRef, useState } from "react";
import type { Conversation, DraftStatus } from "@/lib/types";
import { useInboxStore, QUICK_CHIPS } from "@/hooks/useInboxStore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Check, ChevronLeft, ChevronRight, RotateCw, SendHorizontal, X } from "lucide-react";
import { HermesMark } from "@/components/HermesMark";

// The DRAFTING STUDIO (Elijah v4): conversational refinement. Under the draft
// card lives a lightweight chat with Hermes — each Hermes reply is a NEW
// version on the navigable stepper. The chat IS the instruction record (no
// Instructions/Model meta rows). The composer remains the only send surface.
// EVERY CONTROL CARRIES INTENT: there is no bare Regenerate — re-generation
// happens only through the chat, with words attached (`r` focuses the input).
const RANK: Record<DraftStatus, number> = {
  not_started: -1,
  requested: 0,
  angles_ready: 0,
  generated: 1,
  iterated: 1,
  added_to_chat: 2,
  edited: 2,
  sent_mock: 3,
};
const LIFECYCLE_LABEL: Record<DraftStatus, string> = {
  not_started: "Not started",
  requested: "Requested",
  angles_ready: "Pick an angle",
  generated: "Generated",
  iterated: "Iterating",
  added_to_chat: "In composer",
  edited: "Edited in composer",
  sent_mock: "Sent",
};

// Angle labels follow the thread's status (v5): a needs-reply thread gets
// reply angles; a sent thread gets follow-up angles — chasing, not answering.
const ANGLE_LABEL: Record<"reply" | "followup", Record<string, string>> = {
  reply: { warm: "Warm", direct: "Direct", brief: "Brief" },
  followup: { warm: "Gentle nudge", direct: "Direct ask", brief: "Brief bump" },
};

export function HermesDraftPanel({
  conversation: c,
  mode = "side",
}: {
  conversation: Conversation;
  mode?: "side" | "sheet";
}) {
  const drafting = useInboxStore((s) => s.draftingId === c.id);
  const requestDraft = useInboxStore((s) => s.requestDraft);
  const chooseAngle = useInboxStore((s) => s.chooseAngle);
  const setDraftSheet = useInboxStore((s) => s.setDraftSheet);

  const draft = c.draft;
  const hasVersion = draft.versions.length > 0;
  const anglesPending = draft.status === "angles_ready" && !!draft.angles;
  const followup = c.status === "sent"; // drafting here means chasing

  const lifecycleLabel =
    draft.status === "iterated"
      ? `Iterating · v${draft.versions.length}`
      : LIFECYCLE_LABEL[draft.status];

  return (
    <aside
      aria-label="Hermes draft panel"
      className={cn(
        "flex flex-col bg-card/40",
        mode === "side" ? "h-full w-[21.25rem] shrink-0 border-l border-border" : "h-full w-full",
      )}
    >
      {/* header — amber is Hermes's presence color (v4) */}
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3.5">
        <span
          className="flex size-5 items-center justify-center rounded-md"
          style={{
            color: "var(--hermes)",
            background: "color-mix(in oklch, var(--hermes) 14%, transparent)",
          }}
        >
          <HermesMark className="size-3.5" strokeWidth={2.4} />
        </span>
        <span className="text-[0.78125rem] font-semibold tracking-[-0.01em]">Hermes draft</span>
        {mode === "sheet" && (
          <button
            type="button"
            onClick={() => setDraftSheet(false)}
            aria-label="Close draft panel"
            className="ml-auto flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* lifecycle rail */}
      <div className="flex items-center gap-1 border-b border-border px-3.5 py-2.5">
        {[0, 1, 2, 3].map((i) => {
          const reached = RANK[draft.status] >= i;
          return (
            <div key={i} className="flex flex-1 items-center gap-1">
              <span
                className={cn("flex-1 rounded-full", reached ? "h-[3px]" : "h-[2px]")}
                style={{
                  background: reached ? "var(--primary)" : "var(--border)",
                  boxShadow: reached ? "0 0 6px var(--glow-primary)" : undefined,
                }}
              />
            </div>
          );
        })}
        <span className="tnum ml-2 shrink-0 font-mono text-[0.65625rem] text-muted-foreground">
          {lifecycleLabel}
        </span>
      </div>

      {/* body */}
      {!hasVersion && !anglesPending && !drafting && (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-3.5 text-center">
          <p className="max-w-[14.375rem] text-[0.78125rem] text-muted-foreground">
            {followup
              ? "Ask Hermes to draft a follow-up in your voice."
              : "Ask Hermes to draft a reply in your voice."}
          </p>
          <Button variant="primary" size="sm" onClick={() => requestDraft()} disabled={drafting}>
            <HermesMark className="size-3.5" strokeWidth={2.2} /> {followup ? "Draft follow-up" : "Draft reply"}{" "}
            <Kbd className="ml-0.5 border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground">
              d
            </Kbd>
          </Button>
        </div>
      )}

      {drafting && !hasVersion && !anglesPending && (
        <div className="space-y-2 px-3.5 py-3">
          <div className="flex items-center gap-2 text-[0.71875rem] text-muted-foreground">
            <RotateCw className="size-3 animate-spin" /> Hermes is drafting…
          </div>
          <div className="skeleton h-3 w-full rounded" />
          <div className="skeleton h-3 w-[92%] rounded" />
          <div className="skeleton h-3 w-3/4 rounded" />
        </div>
      )}

      {/* three angled candidates — pick with 1 / 2 / 3 */}
      {anglesPending && !drafting && (
        <div className="animate-stream min-h-0 flex-1 space-y-2 overflow-y-auto px-3.5 py-3">
          <p className="text-[0.6875rem] text-muted-foreground">
            Three angles — pick one with <Kbd>1</Kbd> <Kbd>2</Kbd> <Kbd>3</Kbd> or click:
          </p>
          {draft.angles!.map((a, i) => (
            <button
              key={a.id}
              type="button"
              onClick={() => chooseAngle((i + 1) as 1 | 2 | 3)}
              className={cn(
                "flex w-full items-start gap-2.5 rounded-lg border border-border bg-background/60 p-2.5 text-left",
                "transition-colors hover:border-primary/40 hover:bg-accent/40",
              )}
            >
              <Kbd className="mt-0.5">{i + 1}</Kbd>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="text-[0.65625rem] font-semibold uppercase tracking-wider text-muted-foreground">
                  {ANGLE_LABEL[followup ? "followup" : "reply"][a.tone]}
                </span>
                <span className="text-[0.78125rem] leading-relaxed text-foreground">{a.text}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {hasVersion && !anglesPending && <Studio conversation={c} />}
    </aside>
  );
}

/** Version stepper + read-only card + refinement chat + Add to chat.
    No bare Regenerate: every re-generation goes through the chat with intent. */
function Studio({ conversation: c }: { conversation: Conversation }) {
  const drafting = useInboxStore((s) => s.draftingId === c.id);
  const iterateDraft = useInboxStore((s) => s.iterateDraft);
  const setActiveVersion = useInboxStore((s) => s.setActiveVersion);
  const addToChat = useInboxStore((s) => s.addToChat);
  const studioFocusTick = useInboxStore((s) => s.studioFocusTick);
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const draft = c.draft;
  const versions = draft.versions;
  const activeIdx = Math.max(
    0,
    versions.findIndex((v) => v.id === draft.activeVersionId),
  );
  const active = versions[activeIdx];
  const chat = draft.chat ?? [];
  const sent = draft.status === "sent_mock";

  // `r` focuses the chat input — next frame, so the keystroke never leaks in.
  // Track the last-SEEN tick: reacting to the tick's VALUE meant a Studio
  // mounting for another thread (tick already > 0 from an old `r`) stole
  // focus on selection, silently eating the next hotkeys as typed text.
  const seenTick = useRef(studioFocusTick);
  useEffect(() => {
    if (studioFocusTick === seenTick.current) return;
    seenTick.current = studioFocusTick;
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [studioFocusTick]);

  // keep the chat log pinned to the latest turn
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [chat.length, drafting]);

  const submit = () => {
    const text = input.trim();
    if (!text || drafting) return;
    iterateDraft(text);
    setInput("");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={logRef} className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3.5 py-3">
        {/* version stepper */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => activeIdx > 0 && setActiveVersion(versions[activeIdx - 1].id)}
            disabled={activeIdx === 0}
            aria-label="Previous version"
            className="flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <span className="tnum font-mono text-[0.65625rem] tabular-nums text-muted-foreground">
            v{activeIdx + 1}/{versions.length}
          </span>
          <button
            type="button"
            onClick={() =>
              activeIdx < versions.length - 1 && setActiveVersion(versions[activeIdx + 1].id)
            }
            disabled={activeIdx === versions.length - 1}
            aria-label="Next version"
            className="flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30"
          >
            <ChevronRight className="size-3.5" />
          </button>
          {versions.length > 1 && active && (
            <span className="min-w-0 truncate text-[0.625rem] text-muted-foreground">
              {active.instructions}
            </span>
          )}
        </div>

        {/* the active version — read-only; editing happens in the composer */}
        <div className="rounded-lg border border-border bg-background/60 p-3 text-[0.8125rem] leading-relaxed text-foreground">
          {active?.text}
        </div>

        {/* refinement chat — the instruction record */}
        {chat.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <span className="max-w-[85%] rounded-lg rounded-br-sm bg-accent/70 px-2.5 py-1.5 text-[0.75rem] leading-snug text-foreground">
                {m.text}
              </span>
            </div>
          ) : (
            <div key={m.id} className="flex items-start gap-1.5">
              <span
                className="mt-1 flex size-4 shrink-0 items-center justify-center rounded"
                style={{
                  color: "var(--hermes)",
                  background: "color-mix(in oklch, var(--hermes) 14%, transparent)",
                }}
              >
                <HermesMark className="size-2.5" strokeWidth={2.6} />
              </span>
              <button
                type="button"
                onClick={() => m.versionId && setActiveVersion(m.versionId)}
                className={cn(
                  "max-w-[85%] rounded-lg rounded-bl-sm border px-2.5 py-1.5 text-left text-[0.75rem] leading-snug text-muted-foreground",
                  m.versionId ? "hover:text-foreground" : "cursor-default",
                )}
                style={{ borderColor: "color-mix(in oklch, var(--hermes) 25%, transparent)" }}
              >
                {m.text}
                {m.versionId && (
                  <span className="tnum ml-1.5 font-mono text-[0.625rem] text-muted-foreground">
                    v{versions.findIndex((v) => v.id === m.versionId) + 1}
                  </span>
                )}
              </button>
            </div>
          ),
        )}

        {drafting && (
          <div className="flex items-center gap-2 text-[0.71875rem] text-muted-foreground">
            <RotateCw className="size-3 animate-spin" /> Hermes is drafting…
          </div>
        )}
      </div>

      {/* chat input + quick chips + Add to chat */}
      <div className="shrink-0 space-y-2 border-t border-border px-3.5 py-2.5">
        <div className="flex flex-wrap gap-1.5">
          {QUICK_CHIPS.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => {
                setInput((cur) => (cur ? `${cur} ${chip.insert}` : chip.insert));
                inputRef.current?.focus();
              }}
              disabled={drafting}
              className="rounded-full border border-border px-2 py-0.5 text-[0.6875rem] text-muted-foreground transition-colors hover:border-primary/30 hover:bg-accent hover:text-foreground disabled:opacity-40"
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div className="flex items-end gap-1.5 rounded-lg border border-border bg-card px-2 py-1 transition-colors focus-within:border-[color-mix(in_oklch,var(--hermes)_45%,transparent)]">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              } else if (e.key === "Escape") {
                e.currentTarget.blur();
              }
            }}
            placeholder="Tell Hermes what to change…"
            aria-label="Refine the draft"
            className="max-h-[80px] min-h-[24px] flex-1 resize-none bg-transparent py-0.5 text-[0.75rem] leading-snug text-foreground outline-none placeholder:text-muted-foreground focus-visible:!shadow-none"
          />
          <button
            type="button"
            onClick={submit}
            disabled={!input.trim() || drafting}
            aria-label="Send instruction to Hermes"
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-md transition-colors",
              input.trim() && !drafting
                ? "text-[var(--hermes)] hover:bg-accent"
                : "text-muted-foreground/50",
            )}
          >
            <SendHorizontal className="size-3.5" />
          </button>
        </div>

        <Button
          variant={sent ? "secondary" : "primary"}
          size="sm"
          className="w-full"
          onClick={addToChat}
          disabled={drafting}
        >
          {sent ? <Check /> : <SendHorizontal />} {sent ? "Sent" : "Add to chat"}{" "}
          <Kbd
            className={cn(
              "ml-0.5",
              !sent &&
                "border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground",
            )}
          >
            e
          </Kbd>
        </Button>
      </div>
    </div>
  );
}
