import type { BodyPolicy, Conversation, DraftStatus } from "@/lib/types";
import { useInboxStore, TONE_CONTROLS } from "@/hooks/useInboxStore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Check, RotateCw, SendHorizontal, X } from "lucide-react";
import { HermesMark } from "@/components/HermesMark";

// Rail has four segments; angles_ready sits inside "requested" territory.
const RANK: Record<DraftStatus, number> = {
  not_started: -1,
  requested: 0,
  angles_ready: 0,
  generated: 1,
  added_to_chat: 2,
  edited: 2,
  sent_mock: 3,
};
const LIFECYCLE_LABEL: Record<DraftStatus, string> = {
  not_started: "Not started",
  requested: "Requested",
  angles_ready: "Pick an angle",
  generated: "Generated",
  added_to_chat: "In composer",
  edited: "Edited in composer",
  sent_mock: "Sent",
};

const POLICY_LABEL: Record<BodyPolicy, string> = {
  metadata_only: "Metadata only",
  full_thread: "Full thread",
};

const ANGLE_LABEL: Record<string, string> = {
  warm: "Warm",
  direct: "Direct",
  brief: "Brief",
};

export function HermesDraftPanel({
  conversation: c,
  mode = "side",
}: {
  conversation: Conversation;
  mode?: "side" | "sheet";
}) {
  const drafting = useInboxStore((s) => s.drafting);
  const requestDraft = useInboxStore((s) => s.requestDraft);
  const chooseAngle = useInboxStore((s) => s.chooseAngle);
  const regenerateDraft = useInboxStore((s) => s.regenerateDraft);
  const applyTone = useInboxStore((s) => s.applyTone);
  const addToChat = useInboxStore((s) => s.addToChat);
  const setDraftSheet = useInboxStore((s) => s.setDraftSheet);

  const draft = c.draft;
  const active = draft.versions.find((v) => v.id === draft.activeVersionId);
  const hasVersion = draft.versions.length > 0;
  const anglesPending = draft.status === "angles_ready" && !!draft.angles;
  const sent = draft.status === "sent_mock";

  // What Hermes sees for the NEXT draft, derived live from the thread state:
  // full thread by default (that's the point of asking), metadata if blocked.
  const livePolicy: BodyPolicy = c.hermesBlocked ? "metadata_only" : "full_thread";

  return (
    <aside
      aria-label="Hermes draft panel"
      className={cn(
        "flex flex-col bg-card/40",
        mode === "side" ? "h-full w-[21.25rem] shrink-0 border-l border-border" : "h-full w-full",
      )}
    >
      {/* header */}
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3.5">
        <span
          className="flex size-5 items-center justify-center rounded-md text-primary"
          style={{ background: "color-mix(in oklch, var(--primary) 14%, transparent)" }}
        >
          <HermesMark className="size-3.5" strokeWidth={2.4} />
        </span>
        <span className="text-[0.78125rem] font-semibold tracking-[-0.01em]">Hermes draft</span>
        <span
          className="tnum ml-auto rounded-[5px] border px-1.5 py-px font-mono text-[0.625rem]"
          style={{
            color: livePolicy === "full_thread" ? "var(--priv-shared)" : "var(--muted-foreground)",
            borderColor:
              livePolicy === "full_thread"
                ? "color-mix(in oklch, var(--priv-shared) 45%, transparent)"
                : "var(--border)",
          }}
          title={`Hermes drafts from: ${POLICY_LABEL[livePolicy]}`}
        >
          {POLICY_LABEL[livePolicy]}
        </span>
        {mode === "sheet" && (
          <button
            type="button"
            onClick={() => setDraftSheet(false)}
            aria-label="Close draft panel"
            className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
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
          {LIFECYCLE_LABEL[draft.status]}
        </span>
      </div>

      {/* body */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3.5 py-3">
        {!hasVersion && !anglesPending && !drafting && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <p className="max-w-[14.375rem] text-[0.78125rem] text-muted-foreground">
              {c.hermesBlocked
                ? "Hermes is blocked on this thread — drafts will use metadata only."
                : "Asking for a draft shares this thread with Hermes — that's the point. You can block it per thread."}
            </p>
            <Button variant="primary" size="sm" onClick={() => requestDraft()} disabled={drafting}>
              <HermesMark className="size-3.5" strokeWidth={2.2} /> Draft reply{" "}
              <Kbd className="ml-0.5 border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground">
                d
              </Kbd>
            </Button>
          </div>
        )}

        {drafting && (
          <div className="space-y-2">
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
          <div className="animate-stream space-y-2">
            <p className="text-[0.6875rem] text-muted-foreground">
              Three angles — pick one with <Kbd>1</Kbd> <Kbd>2</Kbd> <Kbd>3</Kbd> or click:
            </p>
            {/* Provenance of THESE candidates — the header pill only describes the next draft. */}
            <p className="text-[0.65625rem] text-muted-foreground">
              Drafted from:{" "}
              <span
                style={
                  draft.anglesFrom === "full_thread" ? { color: "var(--priv-shared)" } : undefined
                }
              >
                {POLICY_LABEL[draft.anglesFrom ?? "full_thread"].toLowerCase()}
              </span>
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
                    {ANGLE_LABEL[a.tone]}
                  </span>
                  <span className="text-[0.78125rem] leading-relaxed text-foreground">{a.text}</span>
                </span>
              </button>
            ))}
          </div>
        )}

        {hasVersion && !drafting && !anglesPending && active && (
          <div className="animate-stream space-y-3">
            <div className="rounded-lg border border-border bg-background/60 p-3 text-[0.8125rem] leading-relaxed text-foreground">
              {active.text}
            </div>

            <div className="space-y-1 text-[0.6875rem] text-muted-foreground">
              <p>
                <span className="text-muted-foreground">Instructions:</span> {active.instructions}
              </p>
              {active.reason && (
                <p>
                  <span className="text-muted-foreground">Regenerated:</span> {active.reason}
                </p>
              )}
              <p>
                <span className="text-muted-foreground">Model:</span>{" "}
                {draft.modelLocality === "mock" ? "local" : draft.modelLocality} ·{" "}
                <span className="text-muted-foreground">version</span>{" "}
                {draft.versions.findIndex((v) => v.id === active.id) + 1}/{draft.versions.length}
              </p>
              <p>
                <span className="text-muted-foreground">Drafted from:</span>{" "}
                <span
                  style={active.from === "full_thread" ? { color: "var(--priv-shared)" } : undefined}
                >
                  {POLICY_LABEL[active.from].toLowerCase()}
                </span>
              </p>
            </div>

            {draft.versions.length > 1 && (
              <div className="space-y-1">
                <p className="text-[0.625rem] font-medium uppercase tracking-wider text-muted-foreground">
                  Versions
                </p>
                {draft.versions.map((v, i) => (
                  <div
                    key={v.id}
                    className={cn(
                      "truncate rounded-md border px-2 py-1 text-[0.6875rem]",
                      v.id === active.id
                        ? "border-primary/30 bg-primary/5 text-foreground"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    <span className="tnum mr-1.5 font-mono text-[0.625rem] text-muted-foreground">
                      v{i + 1}
                    </span>
                    {v.reason ?? v.instructions}
                  </div>
                ))}
              </div>
            )}

            {/* Controls belong with the draft they control — grouped under it,
                dead space falls below (not pinned to the panel bottom). */}
            <div className="space-y-2.5 border-t border-border pt-3">
              <div className="flex flex-wrap gap-1.5">
                {TONE_CONTROLS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => applyTone(t.id)}
                    disabled={drafting}
                    className={cn(
                      "rounded-full border border-border px-2 py-0.5 text-[0.6875rem] text-muted-foreground",
                      "transition-colors hover:border-primary/30 hover:bg-accent hover:text-foreground",
                      "disabled:opacity-40",
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() => regenerateDraft("Regenerate")}
                  disabled={drafting}
                >
                  <RotateCw /> Regenerate <Kbd className="ml-0.5">r</Kbd>
                </Button>
                {/* PRIMARY action: the draft is a prefill — editing happens in
                    the composer, the one editing surface. Approve-intent
                    ceremony retired; sending IS the intent gesture. */}
                <Button
                  variant={sent ? "secondary" : "primary"}
                  size="sm"
                  className="flex-1"
                  onClick={addToChat}
                  disabled={drafting}
                >
                  {sent ? <Check /> : <SendHorizontal />}{" "}
                  {sent ? "Sent" : "Add to chat"}{" "}
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
              <p className="text-[0.65625rem] leading-snug text-muted-foreground">
                This card is read-only — edit in the composer. Hermes drafts; you send.
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
