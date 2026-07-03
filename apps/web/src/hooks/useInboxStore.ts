import { create } from "zustand";
import type { Bucket, Conversation, DraftAngle, DraftAngleTone, DraftChatMsg, SourceId } from "@/lib/types";
import { ANGLES_BY_BODY, AUDIT_EVENTS, CONVERSATIONS, MOCK_NOW, type AngleSet } from "@/lib/mock-data";
import type { AuditEvent } from "@/lib/types";

type LoadState = "loading" | "ready" | "error";

// Studio quick-chips: they INSERT text into the chat input (the user can edit
// before sending) — they are not separate controls (Elijah v4).
export const QUICK_CHIPS: { label: string; insert: string }[] = [
  { label: "Warmer", insert: "Make it warmer" },
  { label: "Shorter", insert: "Make it shorter" },
  { label: "More direct", insert: "Make it more direct" },
  { label: "Add context", insert: "Add that " },
  { label: "My voice", insert: "Keep my voice, just polish it" },
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

  // composer — the ONE editing surface (drafts are prefills, not editors)
  composerText: string;
  composerAttach: boolean; // mock attachment intent (v0 records intent only)
  composerFocusTick: number; // bump → the thread composer focuses itself
  studioFocusTick: number; // bump → the studio chat input focuses itself (r)

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

  // hermes draft — the drafting studio
  requestDraft: () => void; // → 3 angled candidates (angles_ready)
  chooseAngle: (n: 1 | 2 | 3) => void; // number-key pick → generated (read-only card)
  iterateDraft: (instruction: string) => void; // studio chat turn → NEW version
  setActiveVersion: (id: string) => void; // stepper navigation (v1/v2/v3)
  focusStudio: () => void; // r: focus the studio chat input (intent required — no bare regen)
  addToChat: () => void; // e: prefill the composer with the active draft version

  // composer
  setComposerText: (text: string) => void;
  toggleAttach: () => void; // mock affordance — records intent, delivers nothing
  focusComposer: () => void;
  sendMock: () => void; // ⌘Enter: local mock append, honestly labeled

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
  composerText: "",
  composerAttach: false,
  composerFocusTick: 0,
  studioFocusTick: 0,

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
    // Composer is per-thread: never let text bleed across conversations.
    if (next.id !== get().selectedId)
      set({ selectedId: next.id, composerText: "", composerAttach: false });
  },

  selectPrev: () => {
    const list = get().visibleConversations();
    if (!list.length) return;
    const idx = list.findIndex((c) => c.id === get().selectedId);
    const prev = list[Math.max(idx - 1, 0)] ?? list[0];
    if (prev.id !== get().selectedId)
      set({ selectedId: prev.id, composerText: "", composerAttach: false });
  },

  selectId: (id) =>
    set((s) => ({
      selectedId: id,
      mobilePane: "thread",
      ...(id !== s.selectedId ? { composerText: "", composerAttach: false } : {}),
    })),
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

  requestDraft: () => {
    const conv = get().selected();
    if (!conv) return;
    // Drafting means Hermes reads the thread — full stop, no badges, no
    // switches (Elijah v4). lifecycle: requested → angles_ready → pick 1/2/3.
    // Open the sheet too: below xl the side panel doesn't exist, and a state
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
          const set = anglesFor(c);
          // Three angled candidates: 1 warm · 2 direct · 3 brief (pick by number key).
          const angles: DraftAngle[] = (["warm", "direct", "brief"] as DraftAngleTone[]).map(
            (tone, i) => ({ id: `${c.id}a${i + 1}`, tone, text: set[tone] }),
          );
          return { ...c, draft: { ...c.draft, status: "angles_ready", angles } };
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

  // The drafting studio: one chat turn = one instruction = one NEW version.
  // The chat log IS the instruction record (no meta rows on the card).
  iterateDraft: (instruction) => {
    const conv = get().selected();
    const text = instruction.trim();
    if (!conv || !text) return;
    const base = conv.draft.versions.find((v) => v.id === conv.draft.activeVersionId);
    if (!base) return;
    const userMsg: DraftChatMsg = { id: `${conv.id}ch${(conv.draft.chat?.length ?? 0) + 1}`, role: "user", text };
    // N2 class: every draft mutation opens its feedback surface (sheet <xl).
    set((s) => ({
      drafting: true,
      draftSheetOpen: true,
      conversations: s.conversations.map((c) =>
        c.id === conv.id
          ? { ...c, draft: { ...c.draft, chat: [...(c.draft.chat ?? []), userMsg] } }
          : c,
      ),
    }));
    window.setTimeout(() => {
      set((s) => ({
        drafting: false,
        conversations: s.conversations.map((c) => {
          if (c.id !== conv.id) return c;
          const vid = `${c.id}d${c.draft.versions.length + 1}`;
          const { text: newText, ack } = applyInstruction(base.text, text);
          const hermesMsg: DraftChatMsg = {
            id: `${c.id}ch${(c.draft.chat?.length ?? 0) + 1}`,
            role: "hermes",
            text: ack,
            versionId: vid,
          };
          return {
            ...c,
            draft: {
              ...c.draft,
              status: "iterated",
              chat: [...(c.draft.chat ?? []), hermesMsg],
              versions: [
                ...c.draft.versions,
                { id: vid, createdAt: new Date(s.now).toISOString(), instructions: text, text: newText },
              ],
              activeVersionId: vid,
            },
          };
        }),
        audit: pushAudit(
          s.audit,
          { actor: "hermes", surface: "ui", action: "draft.iterate", resource: conv.id, result: "allowed" },
          s.now,
        ),
      }));
    }, 520);
  },

  // `r`: focus the studio chat input — refinement always carries intent
  // (typed words or a quick chip); there is no bare Regenerate anywhere.
  focusStudio: () => {
    const conv = get().selected();
    if (!conv || conv.draft.versions.length === 0) return;
    set((s) => ({
      draftSheetOpen: true, // below xl the studio lives in the sheet
      mobilePane: "thread",
      studioFocusTick: s.studioFocusTick + 1,
    }));
  },

  // Stepper navigation — any version can be inspected and added to chat.
  setActiveVersion: (id) => {
    const conv = get().selected();
    if (!conv || !conv.draft.versions.some((v) => v.id === id)) return;
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === conv.id ? { ...c, draft: { ...c.draft, activeVersionId: id } } : c,
      ),
    }));
  },

  // "Add to chat": the draft becomes a PREFILL in the composer — the one
  // editing surface. The panel card stays read-only. (Guard: no phantom adds.)
  addToChat: () => {
    const conv = get().selected();
    const version = conv?.draft.versions.find((v) => v.id === conv.draft.activeVersionId);
    if (!conv || !version) return;
    set((s) => ({
      composerText: version.text,
      composerFocusTick: s.composerFocusTick + 1,
      draftSheetOpen: false, // the action moves to the composer; clear the way
      mobilePane: "thread",
      conversations: s.conversations.map((c) =>
        c.id === conv.id ? { ...c, draft: { ...c.draft, status: "added_to_chat" } } : c,
      ),
      audit: pushAudit(
        s.audit,
        { actor: "human", surface: "ui", action: "draft.added_to_chat", resource: conv.id, result: "allowed" },
        s.now,
      ),
    }));
  },

  setComposerText: (text) => {
    const conv = get().selected();
    const active = conv?.draft.versions.find((v) => v.id === conv.draft.activeVersionId);
    // Hermes-originated prefill that diverges from the draft → status "edited".
    const diverged =
      conv &&
      active &&
      (conv.draft.status === "added_to_chat" || conv.draft.status === "edited") &&
      text !== active.text;
    set((s) => ({
      composerText: text,
      conversations: diverged
        ? s.conversations.map((c) =>
            c.id === conv.id ? { ...c, draft: { ...c.draft, status: "edited" } } : c,
          )
        : s.conversations,
    }));
  },

  // Mock affordance: records the intent, delivers nothing (honesty guardrail).
  toggleAttach: () => {
    const conv = get().selected();
    const next = !get().composerAttach;
    set((s) => ({
      composerAttach: next,
      audit: conv
        ? pushAudit(
            s.audit,
            {
              actor: "human",
              surface: "ui",
              action: next ? "attachment.intent" : "attachment.intent_removed",
              resource: conv.id,
              result: "allowed",
            },
            s.now,
          )
        : s.audit,
    }));
  },

  focusComposer: () => {
    if (!get().selectedId) return;
    set((s) => ({ mobilePane: "thread", composerFocusTick: s.composerFocusTick + 1 }));
  },

  // v0 send = LOCAL MOCK: appends to the thread, honestly labeled, never
  // delivered. Sending a Hermes-originated draft is the intent gesture that
  // replaced the approve-intent ceremony (same audit semantics, natural act).
  sendMock: () => {
    const conv = get().selected();
    const text = get().composerText.trim();
    if (!conv || !text) return;
    const active = conv.draft.versions.find((v) => v.id === conv.draft.activeVersionId);
    const fromHermes =
      conv.draft.status === "added_to_chat" ||
      (conv.draft.status === "edited" && !!active);
    set((s) => {
      const nowIso = new Date(s.now).toISOString();
      return {
        composerText: "",
        composerAttach: false,
        conversations: s.conversations.map((c) => {
          if (c.id !== conv.id) return c;
          const mid = `${c.id}m${c.messages.length + 1}`;
          return {
            ...c,
            // You replied — the ball is in their court now.
            bucket: c.bucket === "needs" || c.bucket === "drafted" ? "waiting" : c.bucket,
            unread: false,
            lastActivity: nowIso,
            messages: [
              ...c.messages,
              {
                id: mid,
                authorId: "me",
                direction: "out" as const,
                timestamp: nowIso,
                preview: text.length > 64 ? `${text.slice(0, 61)}…` : text,
                body: text,
                mockSent: true,
              },
            ],
            draft: fromHermes ? { ...c.draft, status: "sent_mock" as const } : c.draft,
          };
        }),
        audit: pushAudit(
          s.audit,
          {
            actor: "human",
            surface: "ui",
            action: fromHermes ? "draft.sent_mock" : "message.sent_mock",
            resource: conv.id,
            result: "allowed",
          },
          s.now,
        ),
      };
    });
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
// Each thread gets three GENUINELY distinct, thread-aware drafts:
//   WARM   = relational open + soft commit
//   DIRECT = answer first, one line, no cushioning
//   BRIEF  = the shortest honest reply
// Hand-written sets keyed by conversation id (base fixtures) or by the last
// incoming body (generator pool snippets, via ANGLES_BY_BODY).
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

// Last-resort trio (drafting from a bucket whose content has no tailored set).
const ANGLE_FALLBACK: AngleSet = {
  warm: "Really glad you flagged this — thank you. Let me give it proper thought today and come back tomorrow with a real answer instead of a rushed one.",
  direct: "Got it. I'll confirm one detail and have an answer for you tomorrow.",
  brief: "On it — answer by tomorrow.",
};

function anglesFor(conv: Conversation): AngleSet {
  const byId = MOCK_ANGLE_SETS[conv.id];
  if (byId) return byId;
  const lastIncoming = [...conv.messages].reverse().find((m) => m.direction === "in");
  return (lastIncoming && ANGLES_BY_BODY.get(lastIncoming.body)) ?? ANGLE_FALLBACK;
}

// Applies a studio-chat instruction to the active draft VISIBLY — the change
// must be obvious in the new version, and the ack reads like Hermes talking.
function applyInstruction(text: string, instruction: string): { text: string; ack: string } {
  const r = instruction.toLowerCase();
  const sentences = text.split(/(?<=[.!?])\s+/);

  if (/(warm|friendl|soft)/.test(r)) {
    const t = `Really glad you reached out — ${text.charAt(0).toLowerCase()}${text.slice(1)}`;
    return { text: t, ack: "Warmed it up." };
  }
  if (/(short|brief|tight|trim|concise)/.test(r)) {
    return { text: sentences[0] ?? text, ack: "Tightened it to the essentials." };
  }
  if (/(direct|blunt|straight)/.test(r)) {
    const t = text
      .replace(/\b(really|genuinely|honestly|so much|great|happy to|of course,?)\b/gi, "")
      .replace(/\s+/g, " ")
      .replace(/\s+([,.!?])/g, "$1")
      .trim();
    return { text: t, ack: "Made it more direct." };
  }
  const addMatch = instruction.match(/^\s*(?:add|mention|include|note)\s+(?:that\s+)?(.+)$/i);
  if (addMatch) {
    const detail = addMatch[1].replace(/\.$/, "");
    const t = `${text} One more thing — ${detail.charAt(0).toLowerCase()}${detail.slice(1)}.`;
    return { text: t, ack: "Added that in." };
  }
  if (/(voice|polish|keep)/.test(r)) {
    return { text, ack: "Kept your voice — just smoothed the edges." };
  }
  if (/(another|different|again|new take|retry)/.test(r)) {
    // Answer-first restructure: lead with the closing commitment.
    const t = sentences.length > 1 ? [sentences[sentences.length - 1], ...sentences.slice(0, -1)].join(" ") : text;
    return { text: t, ack: "Here's another take — leads with the point." };
  }
  // Default: answer-first restructure (visible, plausible interpretation).
  const t = sentences.length > 1 ? [sentences[sentences.length - 1], ...sentences.slice(0, -1)].join(" ") : `${text} Happy to adjust further.`;
  return { text: t, ack: "Reworked it — see what you think." };
}
