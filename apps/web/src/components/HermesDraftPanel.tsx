import type { BodyPolicy, Conversation, DraftStatus } from "@/lib/types";
import { useInboxStore, TONE_CONTROLS } from "@/hooks/useInboxStore";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Check, RotateCw, Sparkles, Wand2, X } from "lucide-react";

const LIFECYCLE: DraftStatus[] = [
  "requested",
  "generated",
  "edited",
  "approved_intent",
];
const LIFECYCLE_LABEL: Record<DraftStatus, string> = {
  not_started: "Not started",
  requested: "Requested",
  generated: "Generated",
  edited: "Edited",
  approved_intent: "Approved (intent)",
};

const POLICY_LABEL: Record<BodyPolicy, string> = {
  metadata_only: "Metadata only",
  explicit_full_body: "Full body (explicit)",
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
  const regenerateDraft = useInboxStore((s) => s.regenerateDraft);
  const applyTone = useInboxStore((s) => s.applyTone);
  const approveDraft = useInboxStore((s) => s.approveDraft);
  const setDraftSheet = useInboxStore((s) => s.setDraftSheet);

  const draft = c.draft;
  const active = draft.versions.find((v) => v.id === draft.activeVersionId);
  const hasDraft = draft.versions.length > 0;
  const approved = draft.status === "approved_intent";

  // Body policy is derived LIVE from the thread's share state — it must never
  // lag behind a share/unshare (it describes what Hermes sees right now).
  const livePolicy: BodyPolicy = c.messages.some((m) => m.sharedWithHermes)
    ? "explicit_full_body"
    : "metadata_only";

  return (
    <aside
      aria-label="Hermes draft panel"
      className={cn(
        "flex flex-col bg-card/40",
        mode === "side" ? "h-full w-[340px] shrink-0 border-l border-border" : "h-full w-full",
      )}
    >
      {/* header */}
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3.5">
        <span
          className="flex size-5 items-center justify-center rounded-md text-primary"
          style={{ background: "color-mix(in oklch, var(--primary) 14%, transparent)" }}
        >
          <Sparkles className="size-3" strokeWidth={2.5} />
        </span>
        <span className="text-[12.5px] font-semibold tracking-[-0.01em]">Hermes draft</span>
        <span
          className="tnum ml-auto rounded-[5px] border px-1.5 py-px font-mono text-[10px]"
          style={{
            color:
              livePolicy === "explicit_full_body" ? "var(--priv-shared)" : "var(--muted-foreground)",
            borderColor:
              livePolicy === "explicit_full_body"
                ? "color-mix(in oklch, var(--priv-shared) 45%, transparent)"
                : "var(--border)",
          }}
          title={`Body policy right now: ${POLICY_LABEL[livePolicy]}`}
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
        {LIFECYCLE.map((step, i) => {
          const reached =
            draft.status !== "not_started" &&
            LIFECYCLE.indexOf(draft.status as DraftStatus) >= i;
          return (
            <div key={step} className="flex flex-1 items-center gap-1">
              <span
                className={cn(
                  "flex-1 rounded-full",
                  reached ? "h-[3px]" : "h-[2px]",
                )}
                style={{
                  background: reached ? "var(--primary)" : "var(--border)",
                  boxShadow: reached ? "0 0 6px var(--glow-primary)" : undefined,
                }}
              />
            </div>
          );
        })}
        <span className="tnum ml-2 shrink-0 font-mono text-[10.5px] text-muted-foreground">
          {LIFECYCLE_LABEL[draft.status]}
        </span>
      </div>

      {/* body */}
      <div className="min-h-0 flex-1 overflow-y-auto px-3.5 py-3">
        {!hasDraft && !drafting && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <p className="max-w-[220px] text-[12.5px] text-muted-foreground">
              Ask Hermes to draft a reply in your voice. Hermes drafts from metadata only — it sees
              full message bodies only when you explicitly share them.
            </p>
            <Button variant="primary" size="sm" onClick={() => requestDraft()} disabled={drafting}>
              <Wand2 /> Draft reply <Kbd className="ml-0.5 border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground">d</Kbd>
            </Button>
          </div>
        )}

        {drafting && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
              <RotateCw className="size-3 animate-spin" /> Hermes is drafting…
            </div>
            <div className="skeleton h-3 w-full rounded" />
            <div className="skeleton h-3 w-[92%] rounded" />
            <div className="skeleton h-3 w-3/4 rounded" />
          </div>
        )}

        {hasDraft && !drafting && active && (
          <div className="animate-stream space-y-3">
            <div
              className="rounded-lg border border-border bg-background/60 p-3 text-[13px] leading-relaxed text-foreground"
            >
              {active.text}
            </div>

            <div className="space-y-1 text-[11px] text-muted-foreground">
              <p>
                <span className="text-muted-foreground">Instructions:</span>{" "}
                {active.instructions}
              </p>
              {active.reason && (
                <p>
                  <span className="text-muted-foreground">Regenerated:</span> {active.reason}
                </p>
              )}
              <p>
                <span className="text-muted-foreground">Model:</span> {draft.modelLocality} ·{" "}
                <span className="text-muted-foreground">version</span>{" "}
                {draft.versions.findIndex((v) => v.id === active.id) + 1}/{draft.versions.length}
              </p>
            </div>

            {draft.versions.length > 1 && (
              <div className="space-y-1">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Versions
                </p>
                {draft.versions.map((v, i) => (
                  <div
                    key={v.id}
                    className={cn(
                      "truncate rounded-md border px-2 py-1 text-[11px]",
                      v.id === active.id
                        ? "border-primary/30 bg-primary/5 text-foreground"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    <span className="tnum mr-1.5 font-mono text-[10px] text-muted-foreground">
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
                      "rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground",
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
                <Button
                  variant={approved ? "secondary" : "primary"}
                  size="sm"
                  className="flex-1"
                  onClick={approveDraft}
                  disabled={drafting || approved}
                >
                  <Check /> {approved ? "Approved" : "Approve"} <Kbd className={cn("ml-0.5", !approved && "border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground")}>a</Kbd>
                </Button>
              </div>
              <p className="text-[10.5px] leading-snug text-muted-foreground">
                Approve records <span className="text-muted-foreground">intent only</span>. No send
                path exists in v0 — Hermes drafts, never sends.
              </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
