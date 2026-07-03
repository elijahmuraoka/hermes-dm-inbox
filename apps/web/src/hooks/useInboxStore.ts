import { create } from "zustand";
import type { Bucket, Conversation, DraftAngle, DraftAngleTone, SourceId } from "@/lib/types";
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
  draftSheetOpen: boolean; // bottom-sheet draft panel below xl — the hero loop must be visible everywhere
  drawerOpen: boolean; // mobile (<md) hamburger drawer holding the bucket/source rail
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
  setDrawer: (open: boolean) => void;

  // triage
  markDone: (id?: string) => void;
  snooze: (id?: string) => void;
  togglePriority: (id?: string) => void;

  // privacy — thread-level gate: drafting shares the thread unless blocked
  toggleHermesAccess: () => void; // per-thread opt-out: block/allow Hermes body access

  // hermes draft
  requestDraft: () => void; // → 3 angled candidates (angles_ready)
  chooseAngle: (n: 1 | 2 | 3) => void; // number-key pick → generated
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
  drawerOpen: false,
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
    set({ activeBucket: b, mobilePane: "list", draftSheetOpen: false, drawerOpen: false }); // list-level action
    const first = get().visibleConversations()[0] ?? null;
    set({ selectedId: first?.id ?? null });
  },

  setSourceFilter: (s) => {
    set({ sourceFilter: s, mobilePane: "list", drawerOpen: false }); // list-level action
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
  setDrawer: (open) => set({ drawerOpen: open }),
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

  // Per-thread opt-out toggle. Blocking does not un-happen a past share
  // (threadShared stays true as historical fact); it stops future drafts
  // from reading bodies. Both directions are audited.
  toggleHermesAccess: () => {
    const conv = get().selected();
    if (!conv) return;
    const blocking = !conv.hermesBlocked;
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === conv.id ? { ...c, hermesBlocked: blocking } : c,
      ),
      audit: pushAudit(
        s.audit,
        {
          actor: "human",
          surface: "ui",
          action: blocking ? "hermes.thread_block" : "hermes.thread_allow",
          resource: conv.id,
          result: "allowed",
        },
        s.now,
      ),
    }));
  },

  requestDraft: () => {
    const conv = get().selected();
    if (!conv) return;
    // Thread-level default-on sharing (Elijah, 2026-07-03 v2): asking for a
    // draft IS the share — Hermes reads the full thread unless this thread is
    // blocked. The share is audited once, when it first happens.
    const sharesNow = !conv.hermesBlocked && !conv.threadShared;
    // lifecycle: requested -> (mock latency) -> angles_ready -> pick 1/2/3
    // Open the sheet too: below xl the side panel doesn't exist, and a state
    // mutation with no visible feedback is a contract violation.
    set((s) => {
      let audit = pushAudit(
        s.audit,
        { actor: "hermes", surface: "ui", action: "draft.request", resource: conv.id, result: "allowed" },
        s.now,
      );
      if (sharesNow) {
        audit = pushAudit(
          audit,
          { actor: "human", surface: "ui", action: "hermes.thread_share", resource: conv.id, result: "allowed" },
          s.now,
        );
      }
      return {
        drafting: true,
        draftSheetOpen: true,
        conversations: s.conversations.map((c) =>
          c.id === conv.id
            ? {
                ...c,
                threadShared: c.threadShared || !c.hermesBlocked,
                draft: { ...c.draft, status: "requested" },
              }
            : c,
        ),
        audit,
      };
    });

    window.setTimeout(() => {
      set((s) => ({
        drafting: false,
        conversations: s.conversations.map((c) => {
          if (c.id !== conv.id) return c;
          const set = anglesFor(c.id);
          // Three angled candidates: 1 warm · 2 direct · 3 brief (pick by number key).
          const angles: DraftAngle[] = (["warm", "direct", "brief"] as DraftAngleTone[]).map(
            (tone, i) => ({ id: `${c.id}a${i + 1}`, tone, text: set[tone] }),
          );
          return {
            ...c,
            draft: {
              ...c.draft,
              bodyPolicy: c.hermesBlocked ? "metadata_only" : "full_thread",
              status: "angles_ready",
              angles,
            },
          };
        }),
        audit: pushAudit(
          s.audit,
          { actor: "hermes", surface: "ui", action: "draft.angles", resource: conv.id, result: "allowed" },
          s.now,
        ),
      }));
    }, 620);
  },

  chooseAngle: (n) => {
    const conv = get().selected();
    if (!conv || conv.draft.status !== "angles_ready" || !conv.draft.angles) return;
    const angle = conv.draft.angles[n - 1];
    if (!angle) return;
    set((s) => ({
      draftSheetOpen: true,
      conversations: s.conversations.map((c) => {
        if (c.id !== conv.id) return c;
        const vid = `${c.id}d${c.draft.versions.length + 1}`;
        return {
          ...c,
          bucket: c.bucket === "needs" ? "drafted" : c.bucket,
          draft: {
            ...c.draft,
            status: "generated",
            angles: undefined,
            versions: [
              ...c.draft.versions,
              {
                id: vid,
                createdAt: new Date(s.now).toISOString(),
                instructions: `Angle: ${angle.tone}`,
                text: angle.text,
              },
            ],
            activeVersionId: vid,
          },
        };
      }),
      audit: pushAudit(
        s.audit,
        { actor: "human", surface: "ui", action: `draft.angle_pick.${angle.tone}`, resource: conv.id, result: "allowed" },
        s.now,
      ),
    }));
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
// Each fixture gets three GENUINELY distinct drafts, not one text re-dressed:
//   WARM   = relational open + soft commit
//   DIRECT = answer first, one line, no cushioning
//   BRIEF  = the shortest honest reply
type AngleSet = Record<DraftAngleTone, string>;

const MOCK_ANGLE_SETS: Record<string, AngleSet> = {
  // Dana: reviewed the deck? + move call to 3pm
  c1: {
    warm: "Dana! Yes — went through the deck last night and it's honestly in great shape. I'll send one small note on the pricing slide inline. And of course, 3pm is no problem at all — see you then.",
    direct: "Deck's reviewed — send it after one fix on the pricing slide, note incoming. 3pm works.",
    brief: "Deck looks good — one note coming. 3pm works.",
  },
  // Priya: warm intro request
  c2: {
    warm: "Thank you — that talk was a joy to give and I'm really glad it landed. I'd be happy to meet your head of platform; connect us over email whenever suits and I'll pick it up from there.",
    direct: "Yes — happy to take the intro. Connect us over email and I'll take it from there.",
    brief: "Sure — intro over email works.",
  },
  // Marco: webhook signing docs
  c3: {
    warm: "Great timing — you're right, it isn't documented yet, and I'd genuinely welcome the help. If you're up for the PR I'll make sure it gets a fast review, and I can point you at the signing helper to start from.",
    direct: "Not documented yet. A PR would be welcome — I'll review it fast. Start from the signing helper.",
    brief: "Not yet — a PR would be very welcome.",
  },
};

// Generic trio for generated fixtures — still three different replies.
const ANGLE_FALLBACK: AngleSet = {
  warm: "Really glad you flagged this — thank you. Let me give it proper thought today and come back tomorrow with a real answer instead of a rushed one.",
  direct: "Got it. I'll confirm one detail and have an answer for you tomorrow.",
  brief: "On it — answer by tomorrow.",
};

function anglesFor(conversationId: string): AngleSet {
  return MOCK_ANGLE_SETS[conversationId] ?? ANGLE_FALLBACK;
}

function regenerate(text: string, reason: string): string {
  const r = reason.toLowerCase();
  if (r.includes("short")) return text.split(". ").slice(0, 1).join(". ") + ".";
  if (r.includes("warm")) return `Really appreciate you reaching out. ${text}`;
  if (r.includes("direct")) return text.replace(/\b(really|genuinely|so much|great)\b/gi, "").replace(/\s+/g, " ").trim();
  if (r.includes("context")) return `${text} For context, I'm mid-build on the inbox this week, so timing matters.`;
  return `${text}`;
}
