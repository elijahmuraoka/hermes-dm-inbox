import { create } from "zustand";
import type { Bucket, Conversation, SourceId } from "@/lib/types";
import { AUDIT_EVENTS, CONVERSATIONS, MOCK_NOW } from "@/lib/mock-data";
import type { AuditEvent } from "@/lib/types";

type LoadState = "loading" | "ready" | "error";

interface DraftToneOption {
  id: string;
  label: string;
}

export const TONE_CONTROLS: DraftToneOption[] = [
  { id: "warmer", label: "Warmer" },
  { id: "shorter", label: "Shorter" },
  { id: "direct", label: "More direct" },
  { id: "context", label: "Add context" },
  { id: "voice", label: "Preserve my voice" },
];

interface InboxState {
  now: number;
  loadState: LoadState;
  conversations: Conversation[];
  audit: AuditEvent[];
  activeBucket: Bucket;
  sourceFilter: SourceId | "all";
  selectedId: string | null;
  mobilePane: "list" | "thread"; // active pane below the lg breakpoint
  draftSheetOpen: boolean; // bottom-sheet draft panel below lg — the hero loop must be visible everywhere
  paletteOpen: boolean;
  shortcutsOpen: boolean;
  drafting: boolean;

  // derived
  visibleConversations: () => Conversation[];
  selected: () => Conversation | null;

  // nav
  setBucket: (b: Bucket) => void;
  setSourceFilter: (s: SourceId | "all") => void;
  selectNext: () => void;
  selectPrev: () => void;
  selectId: (id: string | null) => void;
  openThread: () => void;
  backToList: () => void;
  setPalette: (open: boolean) => void;
  setShortcuts: (open: boolean) => void;
  setDraftSheet: (open: boolean) => void;

  // triage
  markDone: (id?: string) => void;
  snooze: (id?: string) => void;
  togglePriority: (id?: string) => void;

  // privacy — the ONE gate: sharing a body into Hermes' context
  shareWithHermes: (messageId: string) => void;
  unshareFromHermes: (messageId: string) => void;
  shareNext: () => void; // ⇧V: share the next unshared incoming body in the selected thread
  unshareLast: () => void; // z: undo — unshare the most recent shared body

  // hermes draft
  requestDraft: (instructions?: string) => void;
  regenerateDraft: (reason: string) => void;
  applyTone: (toneId: string) => void;
  approveDraft: () => void;

  // lifecycle
  retryLoad: () => void;

  // dev-only demo triggers for render-verifying empty/error states
  demoState: (mode: "empty" | "error") => void;
}

function pushAudit(
  list: AuditEvent[],
  ev: Omit<AuditEvent, "id" | "timestamp">,
  now: number,
): AuditEvent[] {
  return [
    { id: `a${list.length + 1}_${ev.action}`, timestamp: new Date(now).toISOString(), ...ev },
    ...list,
  ];
}

export const useInboxStore = create<InboxState>((set, get) => ({
  now: MOCK_NOW,
  loadState: "loading",
  conversations: CONVERSATIONS,
  audit: AUDIT_EVENTS,
  activeBucket: "needs",
  sourceFilter: "all",
  selectedId: null,
  mobilePane: "list",
  draftSheetOpen: false,
  paletteOpen: false,
  shortcutsOpen: false,
  drafting: false,

  visibleConversations: () => {
    const { conversations, activeBucket, sourceFilter } = get();
    return conversations
      .filter((c) => c.bucket === activeBucket)
      .filter((c) => sourceFilter === "all" || c.source === sourceFilter)
      .sort((a, b) => +new Date(b.lastActivity) - +new Date(a.lastActivity));
  },

  selected: () => {
    const { conversations, selectedId } = get();
    return conversations.find((c) => c.id === selectedId) ?? null;
  },

  setBucket: (b) => {
    set({ activeBucket: b, mobilePane: "list", draftSheetOpen: false }); // list-level action
    const first = get().visibleConversations()[0] ?? null;
    set({ selectedId: first?.id ?? null });
  },

  setSourceFilter: (s) => {
    set({ sourceFilter: s, mobilePane: "list" }); // filtering is a list-level action
    const first = get().visibleConversations()[0] ?? null;
    set({ selectedId: first?.id ?? null });
  },

  selectNext: () => {
    const list = get().visibleConversations();
    if (!list.length) return;
    const idx = list.findIndex((c) => c.id === get().selectedId);
    const next = list[Math.min(idx + 1, list.length - 1)] ?? list[0];
    set({ selectedId: next.id });
  },

  selectPrev: () => {
    const list = get().visibleConversations();
    if (!list.length) return;
    const idx = list.findIndex((c) => c.id === get().selectedId);
    const prev = list[Math.max(idx - 1, 0)] ?? list[0];
    set({ selectedId: prev.id });
  },

  selectId: (id) => set({ selectedId: id, mobilePane: "thread" }),
  openThread: () => {
    if (get().selectedId) set({ mobilePane: "thread" });
  },
  backToList: () => set({ mobilePane: "list", draftSheetOpen: false }),
  setPalette: (open) => set({ paletteOpen: open }),
  setDraftSheet: (open) => set({ draftSheetOpen: open }),
  setShortcuts: (open) => set({ shortcutsOpen: open }),

  markDone: (id) => {
    const target = id ?? get().selectedId;
    if (!target) return;
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === target ? { ...c, bucket: "done", unread: false } : c,
      ),
      audit: pushAudit(
        s.audit,
        { actor: "human", surface: "ui", action: "triage.done", resource: target, result: "allowed" },
        s.now,
      ),
    }));
    const first = get().visibleConversations()[0] ?? null;
    set({ selectedId: first?.id ?? null });
  },

  snooze: (id) => {
    const target = id ?? get().selectedId;
    if (!target) return;
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === target ? { ...c, bucket: "waiting" } : c,
      ),
    }));
    const first = get().visibleConversations()[0] ?? null;
    set({ selectedId: first?.id ?? null });
  },

  togglePriority: (id) => {
    const target = id ?? get().selectedId;
    if (!target) return;
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === target
          ? { ...c, urgency: c.urgency === "high" ? "normal" : "high" }
          : c,
      ),
    }));
  },

  shareWithHermes: (messageId) => {
    set((s) => ({
      conversations: s.conversations.map((c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.id === messageId ? { ...m, sharedWithHermes: true } : m,
        ),
      })),
      audit: pushAudit(
        s.audit,
        { actor: "human", surface: "ui", action: "hermes.share", resource: messageId, result: "allowed" },
        s.now,
      ),
    }));
  },

  unshareFromHermes: (messageId) => {
    set((s) => ({
      conversations: s.conversations.map((c) => ({
        ...c,
        messages: c.messages.map((m) =>
          m.id === messageId ? { ...m, sharedWithHermes: false } : m,
        ),
      })),
      audit: pushAudit(
        s.audit,
        { actor: "human", surface: "ui", action: "hermes.unshare", resource: messageId, result: "allowed" },
        s.now,
      ),
    }));
  },

  shareNext: () => {
    const m = get()
      .selected()
      ?.messages.find((x) => x.direction === "in" && !x.sharedWithHermes);
    if (m) get().shareWithHermes(m.id);
  },

  // Undo for the sharing gate: unshare the most recent shared incoming body.
  unshareLast: () => {
    const shared = get()
      .selected()
      ?.messages.filter((x) => x.direction === "in" && x.sharedWithHermes);
    const last = shared?.[shared.length - 1];
    if (last) get().unshareFromHermes(last.id);
  },

  requestDraft: (instructions) => {
    const conv = get().selected();
    if (!conv) return;
    const instr = instructions ?? "Draft a reply in my voice.";
    // lifecycle: requested -> (mock latency) -> generated
    // Open the sheet too: below lg the side panel doesn't exist, and a state
    // mutation with no visible feedback is a contract violation.
    set((s) => ({
      drafting: true,
      draftSheetOpen: true,
      conversations: s.conversations.map((c) =>
        c.id === conv.id ? { ...c, draft: { ...c.draft, status: "requested" } } : c,
      ),
      audit: pushAudit(
        s.audit,
        { actor: "hermes", surface: "ui", action: "draft.request", resource: conv.id, result: "allowed" },
        s.now,
      ),
    }));

    window.setTimeout(() => {
      set((s) => ({
        drafting: false,
        conversations: s.conversations.map((c) => {
          if (c.id !== conv.id) return c;
          const vid = `${c.id}d${c.draft.versions.length + 1}`;
          const text = MOCK_DRAFTS[c.id] ?? MOCK_DRAFT_FALLBACK;
          // Default: draft from metadata. Full bodies only if the human shared them.
          const usedFullBody = c.messages.some((m) => m.sharedWithHermes);
          return {
            ...c,
            bucket: c.bucket === "needs" ? "drafted" : c.bucket,
            draft: {
              ...c.draft,
              bodyPolicy: usedFullBody ? "explicit_full_body" : "metadata_only",
              status: "generated",
              versions: [
                ...c.draft.versions,
                { id: vid, createdAt: new Date(s.now).toISOString(), instructions: instr, text },
              ],
              activeVersionId: vid,
            },
          };
        }),
        audit: pushAudit(
          s.audit,
          { actor: "hermes", surface: "ui", action: "draft.generate", resource: conv.id, result: "allowed" },
          s.now,
        ),
      }));
    }, 620);
  },

  regenerateDraft: (reason) => {
    const conv = get().selected();
    if (!conv || conv.draft.versions.length === 0) return;
    // N2: every draft mutation opens its feedback surface (sheet below lg;
    // harmless at lg+ where the sheet container isn't rendered).
    set({ drafting: true, draftSheetOpen: true });
    window.setTimeout(() => {
      set((s) => ({
        drafting: false,
        conversations: s.conversations.map((c) => {
          if (c.id !== conv.id) return c;
          const last = c.draft.versions[c.draft.versions.length - 1];
          const vid = `${c.id}d${c.draft.versions.length + 1}`;
          return {
            ...c,
            draft: {
              ...c.draft,
              status: "generated",
              versions: [
                ...c.draft.versions,
                {
                  id: vid,
                  createdAt: new Date(s.now).toISOString(),
                  instructions: last.instructions,
                  reason,
                  text: regenerate(last.text, reason),
                },
              ],
              activeVersionId: vid,
            },
          };
        }),
      }));
    }, 520);
  },

  applyTone: (toneId) => {
    const label = TONE_CONTROLS.find((t) => t.id === toneId)?.label ?? toneId;
    get().regenerateDraft(label);
  },

  approveDraft: () => {
    const conv = get().selected();
    // N1 guard: approving a draft that doesn't exist must be impossible from
    // EVERY surface — no lifecycle write, no audit event for a phantom draft.
    if (!conv || conv.draft.versions.length === 0) return;
    set((s) => ({
      draftSheetOpen: true, // N2: feedback surface must be visible below lg
      conversations: s.conversations.map((c) =>
        c.id === conv.id ? { ...c, draft: { ...c.draft, status: "approved_intent" } } : c,
      ),
      audit: pushAudit(
        s.audit,
        { actor: "human", surface: "ui", action: "draft.approve_intent", resource: conv.id, result: "allowed" },
        s.now,
      ),
    }));
  },

  // Recoverable by design: retry runs a fresh mock sync and restores the fixtures.
  retryLoad: () => {
    set({ loadState: "loading" });
    window.setTimeout(() => {
      set({ loadState: "ready", conversations: CONVERSATIONS });
      get().setBucket(get().activeBucket);
    }, 650);
  },

  demoState: (mode) => {
    if (mode === "empty") {
      set({ loadState: "ready", conversations: [], selectedId: null, mobilePane: "list" });
    } else {
      set({ loadState: "error", selectedId: null, mobilePane: "list" });
    }
  },
}));

// ── mock Hermes text (clearly illustrative; honesty guardrail) ──────────────
const MOCK_DRAFTS: Record<string, string> = {
  c1: "Yep — went through the deck last night, it's in good shape. One note on the pricing slide I'll flag inline. And 3pm works great, let's do that.",
  c2: "Thanks so much — really glad it landed. Happy to be introduced; feel free to connect us over email and I'll take it from there.",
  c3: "Good catch — it isn't documented yet. A PR would be genuinely welcome; I'll make sure it gets reviewed quickly. Want me to point you at the signing helper?",
};
const MOCK_DRAFT_FALLBACK =
  "Thanks for this — give me a day to think it through and I'll come back with a proper reply.";

function regenerate(text: string, reason: string): string {
  const r = reason.toLowerCase();
  if (r.includes("short")) return text.split(". ").slice(0, 1).join(". ") + ".";
  if (r.includes("warm")) return `Really appreciate you reaching out. ${text}`;
  if (r.includes("direct")) return text.replace(/\b(really|genuinely|so much|great)\b/gi, "").replace(/\s+/g, " ").trim();
  if (r.includes("context")) return `${text} For context, I'm mid-build on the inbox this week, so timing matters.`;
  return `${text}`;
}
