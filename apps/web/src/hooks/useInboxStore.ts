import { create } from "zustand";
import type {
  Conversation,
  Draft,
  DraftAngle,
  DraftAngleTone,
  DraftChatMsg,
  SourceId,
  ThreadStatus,
  ViewId,
} from "@/lib/types";
import {
  ANGLES_BY_BODY,
  AUDIT_EVENTS,
  CONVERSATIONS,
  MOCK_NOW,
  NUDGES_BY_BODY,
  type AngleSet,
} from "@/lib/mock-data";
import {
  DEFAULT_SORTS,
  NO_FILTERS,
  deriveVisible,
  isFollowupShaped,
  type CollapsedSections,
  type InboxFilters,
  type SectionKey,
  type SortMode,
} from "@/lib/derive";
import {
  EXIT_MS,
  MOCK_ANGLES_MS,
  MOCK_ITERATE_MS,
  MOCK_SYNC_MS,
  XL_QUERY,
  toPreview,
} from "@/lib/constants";
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
  activeView: ViewId;
  filters: InboxFilters;
  sortModes: Record<ViewId, SortMode>; // per-view sort override ("default" = specced order)
  showDoneInSent: boolean; // Sent's "Show done" toggle — done rows hide by default
  collapsed: CollapsedSections; // v7: per-section folds — header + honest count stay visible
  exitingIds: string[]; // v7 motion-causality: rows animating out before their mutation commits
  hintDismissed: boolean; // first-run hint bar under the topbar, gone once dismissed
  selectedId: string | null;
  // Where the selection's row USED to sit when it left the view without a
  // re-anchor (post-send keeps the thread open for the routing strip). The
  // next j/k falls back here instead of yanking to row 0 (review M1).
  orphanIdx: number | null;
  mobilePane: "list" | "thread"; // active pane below the lg breakpoint
  draftSheetOpen: boolean; // bottom-sheet draft panel below xl — the hero loop must be visible everywhere
  drawerOpen: boolean; // mobile (<md) hamburger drawer holding the view/source rail
  paletteOpen: boolean;
  shortcutsOpen: boolean;
  // Conversations Hermes is generating for. A pending SET, not one slot (R5):
  // draft on A, switch to B, draft on B overwrote A's marker, and A's panel
  // fell back to the initial CTA whose click no-ops against the requested-
  // guard — a dead control lying about in-flight work (#4's completion).
  draftingIds: string[];

  // composer — the ONE editing surface (drafts are prefills, not editors)
  composerText: string;
  composerAttach: boolean; // mock attachment intent (v0 records intent only)
  composerFocusTick: number; // bump → the thread composer focuses itself
  studioFocusTick: number; // bump → the studio chat input focuses itself (r)

  // derived
  visibleConversations: () => Conversation[];
  selected: () => Conversation | null;

  // nav
  setView: (v: ViewId) => void;
  selectNext: () => void;
  selectPrev: () => void;
  selectId: (id: string | null) => void;
  openThread: () => void;
  backToList: () => void;
  setPalette: (open: boolean) => void;
  setShortcuts: (open: boolean) => void;
  setDraftSheet: (open: boolean) => void;
  setDrawer: (open: boolean) => void;

  // filters + sort — apply on every view, ⌘K-reachable
  setSource: (s: SourceId | "all") => void;
  setPersonFilter: (personId: string | null) => void;
  toggleUnreadFilter: () => void;
  toggleHasDraftFilter: () => void;
  clearFilters: () => void;
  setSortMode: (mode: SortMode) => void; // for the ACTIVE view
  toggleShowDone: () => void; // Sent only
  toggleSection: (key: SectionKey) => void; // fold/unfold a grouped section (v7)
  dismissHint: () => void; // first-run hint bar — persists via localStorage

  // triage
  markDone: (id?: string) => void;
  snooze: (id?: string) => void;
  togglePriority: (id?: string) => void;
  flipRouting: () => void; // one-tap Waiting ↔ Done flip on the post-send strip

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
  sendMock: () => void; // ⌘Enter: local mock append, presented as a real send (diegetic)

  // lifecycle
  retryLoad: () => void;

  // dev-only demo triggers for render-verifying empty/error states
  demoState: (mode: "empty" | "error") => void;
}

// The FYI fold survives reloads (pressure-test F5) — a deliberate display
// preference, unlike filters/sort which reset to honest defaults. The other
// section folds (v7) are session-only: hiding your own triage queue or Sent's
// groups is a moment's choice, not a standing preference.
const FYI_FOLD_KEY = "hdi.fyi-collapsed";
function readCollapsed(): CollapsedSections {
  try {
    return localStorage.getItem(FYI_FOLD_KEY) === "1" ? { "important.fyi": true } : {};
  } catch {
    return {};
  }
}

// First-run hint bar: one line under the topbar until dismissed once.
const HINT_KEY = "hdi.hint-dismissed";
function readHintDismissed(): boolean {
  try {
    return localStorage.getItem(HINT_KEY) === "1";
  } catch {
    return false;
  }
}

// Motion-causality (v7): a row that a mutation removes from the CURRENT view
// animates out first (slide+fade+collapse, the list closes the gap; EXIT_MS
// from lib/constants), and the data flips when the row is already gone. A row
// that stays visible (done in All, send in Sent) commits instantly — motion
// only where state changes the view. Reduced motion skips the delay entirely.
function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// The draft sheet only exists below xl — at desktop the studio is the side
// panel, and writing draftSheetOpen=true there leaves a stale flag that pops
// the sheet uninvited when the window later narrows (review L5).
function belowXl(): boolean {
  return !window.matchMedia(XL_QUERY).matches;
}

// Write-only in v0 BY DESIGN (review L17): this is Phase-1 plumbing — the
// contract's audit surface (`g a`) will render it; nothing in the slice
// consumes it yet. Kept live so every action site already feeds the trail.
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

// R4 family: marking a thread done cancels an in-flight draft request —
// pending angles must not land on an archived thread (the async flip guard
// then drops them, since status is no longer "requested"/"angles_ready").
// Versions already produced stay — they're real work — and the draft rests
// at the state those versions imply. Snooze deliberately does NOT cancel:
// "later" should come back to finished angles.
function cancelPendingDraft(d: Draft): Draft {
  if (d.status !== "requested" && d.status !== "angles_ready") return d;
  return {
    ...d,
    angles: undefined,
    status:
      d.versions.length > 1 ? "iterated" : d.versions.length === 1 ? "generated" : "not_started",
  };
}

// R14: the terminal state must be TRUE. A receipt (sent_mock) exists only
// when the composer was populated FROM the draft (added_to_chat/edited
// lineage) — a manual send over an unused draft must not display Hermes
// text as Sent (misattribution) or block the fresh-draft mouse path.
// Unused work is superseded: reset clean — the audit trail keeps the
// history, and the thread has moved on. The receipt pins activeVersionId
// to the version ACTUALLY handed over, so the panel shows what was sent
// even if the stepper browsed elsewhere after the add.
function draftAfterSend(d: Draft): Draft {
  if (d.status === "added_to_chat" || d.status === "edited")
    return {
      ...d,
      status: "sent_mock" as const,
      angles: undefined,
      activeVersionId: d.handedVersionId ?? d.activeVersionId,
    };
  if (d.status === "not_started") return d;
  return { status: "not_started" as const, versions: [] };
}

// R7: leaving a thread discards its composer buffer (per-thread integrity),
// so the outgoing thread's draft lifecycle must stop claiming the composer
// holds it. added_to_chat/edited revert to the standing card the versions
// imply — edited otherwise dead-ends: the studio chat stays locked against
// a composer that is now empty, `e` no-ops, and requestDraft is guarded.
// Versions, activeVersionId, and the chat log all stay — they're real work.
function discardComposerHandoff(
  conversations: Conversation[],
  outgoingId: string | null,
): Conversation[] {
  if (!outgoingId) return conversations;
  const c = conversations.find((x) => x.id === outgoingId);
  const ds = c?.draft.status;
  if (ds !== "added_to_chat" && ds !== "edited") return conversations;
  return conversations.map((x) =>
    x.id === outgoingId
      ? {
          ...x,
          draft: {
            ...x.draft,
            status: x.draft.versions.length > 1 ? ("iterated" as const) : ("generated" as const),
            handedVersionId: undefined, // R14: the handoff is discarded with the buffer
          },
        }
      : x,
  );
}

// Post-send suggestion (v5 final): sending always lands the thread in Sent
// (open) — Hermes only SUGGESTS done-vs-open. Asks win when both appear
// ("Thanks! Can you…?" stays open).
function suggestPostSend(text: string): ThreadStatus {
  const t = text.toLowerCase();
  const asks =
    /\?|let me know|lmk|can you|could you|will you|would you|thoughts|keep me posted|circle back|when you get a chance/;
  const closers =
    /\b(sounds good|see you|perfect|confirmed|done|all set|no worries|thanks again|thank you)\b/;
  if (asks.test(t)) return "sent";
  if (closers.test(t)) return "done";
  return "sent";
}

export const useInboxStore = create<InboxState>((set, get) => ({
  now: MOCK_NOW,
  loadState: "loading",
  conversations: CONVERSATIONS,
  audit: AUDIT_EVENTS,
  activeView: "important",
  filters: NO_FILTERS,
  sortModes: { ...DEFAULT_SORTS },
  showDoneInSent: false,
  collapsed: readCollapsed(),
  exitingIds: [],
  hintDismissed: readHintDismissed(),
  selectedId: null,
  orphanIdx: null,
  mobilePane: "list",
  draftSheetOpen: false,
  drawerOpen: false,
  paletteOpen: false,
  shortcutsOpen: false,
  draftingIds: [],
  composerText: "",
  composerAttach: false,
  composerFocusTick: 0,
  studioFocusTick: 0,

  visibleConversations: () => {
    const { conversations, activeView, filters, sortModes, showDoneInSent, collapsed, now } =
      get();
    return deriveVisible(
      conversations,
      activeView,
      filters,
      sortModes[activeView],
      showDoneInSent,
      collapsed,
      now,
    );
  },

  selected: () => {
    const { conversations, selectedId } = get();
    return conversations.find((c) => c.id === selectedId) ?? null;
  },

  setView: (v) => {
    // R5: re-entering the CURRENT view (g i while in Important, clicking the
    // active rail item) is a no-op lens change — it keeps the UI side effects
    // (close drawer/sheet, back to list) but must not yank a mid-list
    // selection to row 0 or clear typed composer text. "keep" still anchors
    // the first row when nothing is selected, so initial anchoring survives.
    const same = v === get().activeView;
    // exitingIds cleared on a REAL change only: an in-flight exit predicted
    // against the OLD view must not keep collapsing its row in the new one
    // (review L4) — but the L4 rationale is cross-view; wiping it on a
    // same-view chord flashed a mid-exit row back until its commit (R6).
    set({
      activeView: v,
      mobilePane: "list",
      draftSheetOpen: false,
      drawerOpen: false,
      ...(same ? {} : { exitingIds: [] }),
    });
    reanchor(set, get, same ? "keep" : "top");
  },

  // Every filter mutation re-anchors selection on the first visible row —
  // a selection the view can no longer show is a lie.
  setSource: (source) => applyFilters(set, get, { source }),
  setPersonFilter: (personId) => applyFilters(set, get, { personId }),
  toggleUnreadFilter: () => applyFilters(set, get, { unreadOnly: !get().filters.unreadOnly }),
  toggleHasDraftFilter: () =>
    applyFilters(set, get, { hasDraftOnly: !get().filters.hasDraftOnly }),
  clearFilters: () => applyFilters(set, get, { ...NO_FILTERS }),

  // Sort override for the active view; selection re-anchors like a filter.
  // R5 family sweep: the palette disables the active sort command, but the
  // store guards the no-op anyway — an unchanged order never re-anchors.
  setSortMode: (mode) => {
    if (get().sortModes[get().activeView] === mode) return;
    set((s) => ({ sortModes: { ...s.sortModes, [s.activeView]: mode } }));
    reanchor(set, get, "top");
  },

  toggleShowDone: () => {
    set((s) => ({ showDoneInSent: !s.showDoneInSent }));
    // Hiding done can orphan the selection; re-anchor only if it vanished.
    reanchor(set, get, "keep");
  },

  // Folding a section can orphan a selected row — same re-anchor rule as above.
  // Only the FYI fold persists (F5); the rest are session-only display moves.
  toggleSection: (key) => {
    const next = { ...get().collapsed, [key]: !get().collapsed[key] };
    if (key === "important.fyi") {
      try {
        localStorage.setItem(FYI_FOLD_KEY, next[key] ? "1" : "0");
      } catch {
        // storage unavailable → the fold is session-only; still fully usable
      }
    }
    set({ collapsed: next });
    reanchor(set, get, "keep");
  },

  dismissHint: () => {
    try {
      localStorage.setItem(HINT_KEY, "1");
    } catch {
      // storage unavailable → the hint returns next session; still dismissible
    }
    set({ hintDismissed: true });
  },

  selectNext: () => {
    const list = get().visibleConversations();
    if (!list.length) return;
    const idx = list.findIndex((c) => c.id === get().selectedId);
    // Orphaned selection (row left the view without a re-anchor, e.g.
    // post-send): fall back to where the row used to sit, not row 0 (M1).
    const at = idx === -1 ? clampIdx(get().orphanIdx ?? 0, list) : Math.min(idx + 1, list.length - 1);
    const next = list[at];
    // Composer is per-thread: never let text bleed across conversations.
    // Leaving reconciles the outgoing thread's handoff draft (R7).
    if (next.id !== get().selectedId)
      set({
        selectedId: next.id,
        orphanIdx: null,
        composerText: "",
        composerAttach: false,
        conversations: discardComposerHandoff(get().conversations, get().selectedId),
      });
  },

  selectPrev: () => {
    const list = get().visibleConversations();
    if (!list.length) return;
    const idx = list.findIndex((c) => c.id === get().selectedId);
    // R12: the orphan fallback has DIRECTION. The row AT the vacated slot
    // is the one that moved UP into it — j landing there reads as "down"
    // (correct); k must land one ABOVE the slot, or it also feels like
    // moving down from a row that no longer exists.
    const at = idx === -1 ? clampIdx((get().orphanIdx ?? 0) - 1, list) : Math.max(idx - 1, 0);
    const prev = list[at];
    if (prev.id !== get().selectedId)
      set({
        selectedId: prev.id,
        orphanIdx: null,
        composerText: "",
        composerAttach: false,
        conversations: discardComposerHandoff(get().conversations, get().selectedId),
      });
  },

  selectId: (id) => {
    // R11: under the Unread filter, READING the row removes it from the
    // view while it stays selected — record where it sat as the orphan
    // slot (the M1 rule advanceSelection gained in R10) instead of
    // nulling, or the next j/k falls back to row 0. The vanish itself is
    // deliberately instant (no exitingIds ride): reading is navigation,
    // not triage — motion-causality reserves the exit animation for row
    // verdicts, and the reader's attention is in the thread pane.
    const willOrphan =
      !!id &&
      get().filters.unreadOnly &&
      get().conversations.some((c) => c.id === id && c.unread);
    const preIdx = willOrphan
      ? get().visibleConversations().findIndex((c) => c.id === id)
      : -1;
    set((s) => ({
      selectedId: id,
      orphanIdx: willOrphan && preIdx !== -1 ? preIdx : null,
      mobilePane: "thread",
      // M2: selecting a thread reads it (reference-inbox behavior). Only
      // write conversations when something actually flips (M6 discipline).
      // On a real move, also reconcile the OUTGOING thread's handoff (R7).
      conversations:
        id !== s.selectedId
          ? discardComposerHandoff(readOne(s.conversations, id), s.selectedId)
          : readOne(s.conversations, id),
      ...(id !== s.selectedId ? { composerText: "", composerAttach: false } : {}),
    }));
  },
  openThread: () => {
    const id = get().selectedId;
    if (!id) return;
    // R11: Enter reads too — same read-orphan rule as selectId (j/k does
    // NOT read, so this is the path that actually bites: filter on, j/k
    // down, Enter to open, u back, j — was yanked to top).
    const willOrphan =
      get().filters.unreadOnly && get().conversations.some((c) => c.id === id && c.unread);
    const preIdx = willOrphan
      ? get().visibleConversations().findIndex((c) => c.id === id)
      : -1;
    set((s) => ({
      mobilePane: "thread",
      conversations: readOne(s.conversations, id),
      ...(willOrphan && preIdx !== -1 ? { orphanIdx: preIdx } : {}),
    }));
  },
  backToList: () => set({ mobilePane: "list", draftSheetOpen: false }),
  setPalette: (open) => set({ paletteOpen: open }),
  setDraftSheet: (open) => set({ draftSheetOpen: open }),
  setDrawer: (open) => set({ drawerOpen: open }),
  setShortcuts: (open) => set({ shortcutsOpen: open }),

  markDone: (id) => {
    const target = id ?? get().selectedId;
    if (!target || get().exitingIds.includes(target)) return;
    const conv = get().conversations.find((c) => c.id === target);
    if (!conv) return;
    // On an FYI thread, `e` is an ACKNOWLEDGE (v6): same done transition —
    // it leaves Important and lives on in All — but the audit trail keeps
    // the distinction between clearing info and closing a conversation.
    const isAck = conv.status === "fyi";
    // Serial triage: remember where we were so selection can ADVANCE to the
    // next row (Superhuman behavior) — yanking to the top made mid-list
    // triage unusable (pressure-test blocker #3).
    const beforeIdx = get()
      .visibleConversations()
      .findIndex((c) => c.id === target);
    const predicted = get().conversations.map((c) =>
      c.id === target ? { ...c, status: "done" as const, unread: false } : c,
    );
    exitThenCommit(set, get, target, predicted, () => {
      // R8: canceling the pending REQUEST also settles its spinner marker and
      // invalidates its timer — the token is what keeps that timer from
      // completing a later request. Iterate ops keep running: typed intent
      // still lands in the stepper, so their spinner stays honest.
      const canceledReq = cancelDraftOps(target, "request");
      set((s) => ({
        draftingIds: removeN(s.draftingIds, target, canceledReq),
        conversations: s.conversations.map((c) =>
          c.id === target
            ? { ...c, status: "done" as const, unread: false, draft: cancelPendingDraft(c.draft) }
            : c,
        ),
        audit: pushAudit(
          s.audit,
          {
            actor: "human",
            surface: "ui",
            action: isAck ? "triage.ack" : "triage.done",
            resource: target,
            result: "allowed",
          },
          s.now,
        ),
      }));
      advanceSelection(set, get, beforeIdx, target);
    });
  },

  // Snooze (v5): hide from the working views until it returns — status is
  // untouched (whose court the ball is in doesn't change because you looked
  // away). Mock return time: tomorrow morning relative to the fixed clock.
  snooze: (id) => {
    const target = id ?? get().selectedId;
    if (!target || get().exitingIds.includes(target)) return;
    const beforeIdx = get()
      .visibleConversations()
      .findIndex((c) => c.id === target);
    const until = new Date(get().now + 16 * 3600_000).toISOString();
    const predicted = get().conversations.map((c) =>
      c.id === target ? { ...c, snoozedUntil: until } : c,
    );
    exitThenCommit(set, get, target, predicted, () => {
      set((s) => ({
        conversations: s.conversations.map((c) =>
          c.id === target ? { ...c, snoozedUntil: until } : c,
        ),
        audit: pushAudit(
          s.audit,
          { actor: "human", surface: "ui", action: "triage.snooze", resource: target, result: "allowed" },
          s.now,
        ),
      }));
      advanceSelection(set, get, beforeIdx, target);
    });
  },

  // Priority is Hermes-computed but human-correctable: p cycles the tiers.
  togglePriority: (id) => {
    const target = id ?? get().selectedId;
    const conv = get().conversations.find((c) => c.id === target);
    if (!target || !conv) return;
    const NEXT = { high: "medium", medium: "normal", normal: "high" } as const;
    const next = NEXT[conv.urgency];
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === target ? { ...c, urgency: next } : c,
      ),
      // L10: the one human triage correction that skipped the audit trail.
      audit: pushAudit(
        s.audit,
        { actor: "human", surface: "ui", action: `triage.priority.${next}`, resource: target, result: "allowed" },
        s.now,
      ),
    }));
  },

  // One-tap on the post-send strip: mark done ↔ reopen (back to Sent).
  // R6: the flip routes through the SAME predict/exit/advance flow as
  // markDone — a bare set changed view membership with no exit animation,
  // and from Sent with done hidden it orphaned the selection with no
  // recorded position (next j/k yanked to row 0). The reopen direction
  // predicts the row stays and commits instantly.
  flipRouting: () => {
    const conv = get().selected();
    if (!conv?.routedAfterSend || get().exitingIds.includes(conv.id)) return;
    const next: ThreadStatus = conv.status === "done" ? "sent" : "done";
    const beforeIdx = get()
      .visibleConversations()
      .findIndex((c) => c.id === conv.id);
    const predicted = get().conversations.map((c) =>
      c.id === conv.id ? { ...c, status: next } : c,
    );
    exitThenCommit(set, get, conv.id, predicted, () => {
      // R8: same pairing as markDone — the done direction settles the
      // canceled request's marker and invalidates its timer token.
      const canceledReq = next === "done" ? cancelDraftOps(conv.id, "request") : 0;
      set((s) => ({
        draftingIds: removeN(s.draftingIds, conv.id, canceledReq),
        conversations: s.conversations.map((c) =>
          c.id === conv.id
            ? {
                ...c,
                status: next,
                // R7: done is done — same rule as markDone. A pending request
                // otherwise survived the flip (the angles timer only checks
                // draft.status) and landed angles on a closed thread. Reopen
                // leaves the draft untouched.
                draft: next === "done" ? cancelPendingDraft(c.draft) : c.draft,
              }
            : c,
        ),
        audit: pushAudit(
          s.audit,
          { actor: "human", surface: "ui", action: `triage.route.${next}`, resource: conv.id, result: "allowed" },
          s.now,
        ),
      }));
      advanceSelection(set, get, beforeIdx, conv.id);
    });
  },

  requestDraft: () => {
    const conv = get().selected();
    // Same guard as done/snooze: a row mid-exit is already leaving — don't
    // start drafting on it in the commit window.
    if (!conv || get().exitingIds.includes(conv.id)) return;
    // M7: no re-request while a draft is in flight or already handed to the
    // composer — double-`d` scheduled duplicate timers, and re-drafting over
    // added_to_chat/edited silently broke divergence + send attribution.
    // (generated/iterated MAY re-draft: fresh angles over a card you haven't
    // committed to is a legitimate move.)
    const ds = conv.draft.status;
    if (ds === "requested" || ds === "angles_ready" || ds === "added_to_chat" || ds === "edited")
      return;
    // Drafting means Hermes reads the thread — full stop, no badges, no
    // switches (Elijah v4). lifecycle: requested → angles_ready → pick 1/2/3.
    // Open the sheet too: below xl the side panel doesn't exist, and a state
    // mutation with no visible feedback is a contract violation.
    const token = beginDraftOp(conv.id, "request");
    set((s) => ({
      draftingIds: [...s.draftingIds, conv.id],
      draftSheetOpen: belowXl() ? true : s.draftSheetOpen,
      conversations: s.conversations.map((c) =>
        c.id === conv.id
          ? {
              ...c,
              // R13: terminal means terminal — a re-draft FROM a sent
              // receipt starts CLEAN. Spreading the receipt forward kept
              // the sent version selectable in the stepper (step back +
              // add-to-chat = double-send bait), and a cancel resurrected
              // it as a live card. The sent text lives in the thread and
              // the audit trail, not the studio. Live generated/iterated
              // re-drafts keep their version history by design (R4).
              draft:
                c.draft.status === "sent_mock"
                  ? { status: "requested" as const, versions: [] }
                  : { ...c.draft, status: "requested" as const },
            }
          : c,
      ),
      audit: pushAudit(
        s.audit,
        { actor: "hermes", surface: "ui", action: "draft.request", resource: conv.id, result: "allowed" },
        s.now,
      ),
    }));

    window.setTimeout(() => {
      set((s) => {
        // R8: superseded (done/flip/send canceled us) — the canceler settled
        // our marker, and completing now would finish a LATER request the
        // status guard cannot tell apart from ours.
        if (!settleDraftOp(conv.id, token)) return {};
        // Settle only OUR pending marker — drafts in flight on other threads
        // (or a second op on this one) keep their own spinners.
        const clearSpin = { draftingIds: removeOne(s.draftingIds, conv.id) };
        // R4-2: the async flip is only valid while the request still stands.
        // A send (draft terminalized), done (request canceled), or any other
        // status move during the window means these angles answer a moment
        // that no longer exists — drop them; the spinner clears either way.
        const cur = s.conversations.find((x) => x.id === conv.id);
        if (cur?.draft.status !== "requested") return clearSpin;
        return {
          ...clearSpin,
          conversations: s.conversations.map((c) => {
            if (c.id !== conv.id) return c;
            const angleSet = anglesFor(c); // (was `set` — shadowed the store setter, review L13)
            // Three angled candidates, picked by number key. On a sent (open)
            // thread these are FOLLOW-UPS (gentle nudge / direct ask / brief
            // bump) — chasing, not answering.
            const angles: DraftAngle[] = (["warm", "direct", "brief"] as DraftAngleTone[]).map(
              (tone, i) => ({ id: `${c.id}a${i + 1}`, tone, text: angleSet[tone] }),
            );
            return { ...c, draft: { ...c.draft, status: "angles_ready", angles } };
          }),
          audit: pushAudit(
            s.audit,
            { actor: "hermes", surface: "ui", action: "draft.angles", resource: conv.id, result: "allowed" },
            s.now,
          ),
        };
      });
    }, MOCK_ANGLES_MS);
  },

  chooseAngle: (n) => {
    const conv = get().selected();
    if (!conv || conv.draft.status !== "angles_ready" || !conv.draft.angles) return;
    const angle = conv.draft.angles[n - 1];
    if (!angle) return;
    set((s) => ({
      draftSheetOpen: belowXl() ? true : s.draftSheetOpen,
      conversations: s.conversations.map((c) => {
        if (c.id !== conv.id) return c;
        const vid = `${c.id}d${c.draft.versions.length + 1}`;
        return {
          ...c,
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
    // R4 sweep: iterate only continues a STANDING draft — never a pending
    // request (stale base + the angles timer would collide), a sent receipt
    // (resurrecting sent_mock re-armed the Draft chip), or a diverged
    // composer (R3 rule: the composer owns the flow once edited). The studio
    // input is disabled in the locked states so this guard isn't a dead end.
    const ds = conv.draft.status;
    if (ds !== "generated" && ds !== "iterated" && ds !== "added_to_chat") return;
    const base = conv.draft.versions.find((v) => v.id === conv.draft.activeVersionId);
    if (!base) return;
    const userMsg: DraftChatMsg = { id: `${conv.id}ch${(conv.draft.chat?.length ?? 0) + 1}`, role: "user", text };
    const token = beginDraftOp(conv.id, "iterate");
    // N2 class: every draft mutation opens its feedback surface (sheet <xl).
    set((s) => ({
      draftingIds: [...s.draftingIds, conv.id],
      draftSheetOpen: belowXl() ? true : s.draftSheetOpen,
      conversations: s.conversations.map((c) =>
        c.id === conv.id
          ? { ...c, draft: { ...c.draft, chat: [...(c.draft.chat ?? []), userMsg] } }
          : c,
      ),
    }));
    window.setTimeout(() => {
      set((s) => {
        // R8: same token rule as the angles timer — a send superseded us and
        // already settled the marker; do nothing at all.
        if (!settleDraftOp(conv.id, token)) return {};
        const clearSpin = { draftingIds: removeOne(s.draftingIds, conv.id) };
        // R4 sweep (same rule as the angles timer): a send or reset during
        // the window supersedes the iteration — drop it. If the draft moved
        // to added_to_chat/edited meanwhile, the new version still joins the
        // stepper but takes NEITHER the status NOR the active pointer: the
        // composer owns the flow, and stealing added_to_chat would break the
        // divergence tracking (M6) that protects the human's edits.
        const cur = s.conversations.find((x) => x.id === conv.id);
        const cs = cur?.draft.status;
        if (cs !== "generated" && cs !== "iterated" && cs !== "added_to_chat" && cs !== "edited")
          return clearSpin;
        const preserve = cs === "added_to_chat" || cs === "edited";
        return {
          ...clearSpin,
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
                status: preserve ? c.draft.status : "iterated",
                chat: [...(c.draft.chat ?? []), hermesMsg],
                versions: [
                  ...c.draft.versions,
                  { id: vid, createdAt: new Date(s.now).toISOString(), instructions: text, text: newText },
                ],
                activeVersionId: preserve ? c.draft.activeVersionId : vid,
              },
            };
          }),
          audit: pushAudit(
            s.audit,
            { actor: "hermes", surface: "ui", action: "draft.iterate", resource: conv.id, result: "allowed" },
            s.now,
          ),
        };
      });
    }, MOCK_ITERATE_MS);
  },

  // `r`: focus the studio chat input — refinement always carries intent
  // (typed words or a quick chip); there is no bare Regenerate anywhere.
  focusStudio: () => {
    const conv = get().selected();
    if (!conv || conv.draft.versions.length === 0) return;
    set((s) => ({
      draftSheetOpen: belowXl() ? true : s.draftSheetOpen, // the studio's sheet only exists below xl
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
    // R3+R4-3: add-to-chat only serves a STANDING draft. edited would
    // overwrite the human's diverged work; requested/angles_ready would
    // prefill a STALE version and the pending timer would then stomp
    // added_to_chat back; sent_mock is a receipt. added_to_chat stays
    // allowed: stepper re-add of an undiverged draft loses nothing.
    const ds = conv.draft.status;
    if (ds !== "generated" && ds !== "iterated" && ds !== "added_to_chat") return;
    // R8 (same class as R4-3): during an iterate the status still reads
    // generated/iterated, but the active version is about to be superseded —
    // adding now copies STALE text the refinement never reaches, and the
    // user can send pre-refinement words. The palette mirrors this guard;
    // `e` no-oping through the window is M3-consistent.
    if (get().draftingIds.includes(conv.id)) return;
    set((s) => ({
      composerText: version.text,
      composerFocusTick: s.composerFocusTick + 1,
      draftSheetOpen: false, // the action moves to the composer; clear the way
      mobilePane: "thread",
      conversations: s.conversations.map((c) =>
        c.id === conv.id
          ? {
              ...c,
              // R14: record WHICH version was copied — attribution
              // (divergence base + receipt) keys off it, so the stepper
              // stays free to browse without corrupting send truth.
              draft: { ...c.draft, status: "added_to_chat", handedVersionId: version.id },
            }
          : c,
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
    // R14: divergence compares against the HANDED version — the stepper may
    // have moved activeVersionId since the add, and the wrong base either
    // missed real edits or flagged phantom ones.
    const base = conv?.draft.versions.find(
      (v) => v.id === (conv.draft.handedVersionId ?? conv.draft.activeVersionId),
    );
    // Hermes-originated prefill that diverges from the draft → status "edited".
    // M6: flip exactly ONCE, on the added_to_chat → edited transition —
    // rewriting the conversations array per keystroke was a render storm.
    // "edited" never flips back: send attribution only needs "did it diverge".
    const diverged =
      conv && base && conv.draft.status === "added_to_chat" && text !== base.text;
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
    // R15: clear the way like addToChat — the action moves to the composer,
    // and a palette-over-sheet Reply otherwise landed focus BEHIND the
    // still-open aria-modal (trap broken, command looked dead).
    set((s) => ({
      mobilePane: "thread",
      draftSheetOpen: false,
      composerFocusTick: s.composerFocusTick + 1,
    }));
  },

  // v0 send = LOCAL MOCK append (code-level truth; the UI is diegetic).
  // Post-send (v5 final): the thread always lands in Sent (open) — Hermes
  // only SUGGESTS done-vs-open, surfaced as a one-tap strip. Sending a nudge
  // from a stale sent thread resets its staleness clock, which is exactly
  // what a chase should do.
  sendMock: () => {
    const conv = get().selected();
    const text = get().composerText.trim();
    if (!conv || !text || get().exitingIds.includes(conv.id)) return;
    // R14: attribution keys off the HANDED version, never the stepper's
    // pointer — browsing versions after add-to-chat must not change what
    // "sent from Hermes" means.
    const handed = conv.draft.versions.find(
      (v) => v.id === (conv.draft.handedVersionId ?? conv.draft.activeVersionId),
    );
    const fromHermes =
      conv.draft.status === "added_to_chat" ||
      (conv.draft.status === "edited" && !!handed);
    const routed = suggestPostSend(text);
    // M1: remember where the row sat — post-send the selection deliberately
    // stays on this thread (routing strip), so when the row leaves the view
    // the next j/k must fall back to its old slot, not row 0.
    const beforeIdx = get()
      .visibleConversations()
      .findIndex((c) => c.id === conv.id);
    // The composer clears the instant you send — that's the send being felt.
    // Only the data flip waits for the row's exit animation (Important only;
    // in Sent/All the row stays visible and everything commits at once).
    set({ composerText: "", composerAttach: false });
    // R6 sweep: the prediction must terminalize the draft the way the commit
    // does — hasDraft flips false on send, and under an active has-draft
    // filter a stays-prediction let the row pop out with no exit animation.
    // R14: both sides now share draftAfterSend so they can never diverge.
    const predicted = get().conversations.map((c) =>
      c.id === conv.id
        ? {
            ...c,
            status: "sent" as const,
            unread: false,
            lastActivity: new Date(get().now).toISOString(),
            draft: draftAfterSend(c.draft),
          }
        : c,
    );
    exitThenCommit(set, get, conv.id, predicted, () => {
      // R8: R4-1's supersede is total — request AND iterate timers die here
      // (both guards would drop their content anyway; now their markers
      // settle at the send instead of lingering until the timers fire).
      const canceledOps = cancelDraftOps(conv.id);
      set((s) => {
      const nowIso = new Date(s.now).toISOString();
      return {
        draftingIds: removeN(s.draftingIds, conv.id, canceledOps),
        conversations: s.conversations.map((c) => {
          if (c.id !== conv.id) return c;
          const mid = `${c.id}m${c.messages.length + 1}`;
          return {
            ...c,
            status: "sent" as const,
            routedAfterSend: routed,
            unread: false,
            lastActivity: nowIso,
            messages: [
              ...c.messages,
              {
                id: mid,
                authorId: "me",
                direction: "out" as const,
                timestamp: nowIso,
                preview: toPreview(text),
                body: text,
              },
            ],
            // R4-1: a send supersedes ANY standing draft, not just the one it
            // came from — a live Draft chip + add-to-chat offering an
            // obsolete reply after a manual send was a lie. R14 sharpens the
            // terminal state: a RECEIPT only for added_to_chat/edited
            // lineage (the composer actually carried the draft); unused
            // work — generated/iterated cards the user typed past, or a
            // pending request — resets clean. Timers skip via R8 tokens.
            draft: draftAfterSend(c.draft),
          };
        }),
        audit: pushAudit(
          pushAudit(
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
          { actor: "hermes", surface: "ui", action: `triage.routed.${routed}`, resource: conv.id, result: "allowed" },
          s.now,
        ),
      };
      });
      // Post-commit truth: the selection stays on this thread for the routing
      // strip, but if its row left the view, j/k needs the old slot (M1).
      // Selection guard (R2): a j/k during the 150ms exit window already
      // moved on — re-arming a stale index would teleport the next j/k.
      if (
        beforeIdx !== -1 &&
        get().selectedId === conv.id &&
        !get().visibleConversations().some((c) => c.id === conv.id)
      )
        set({ orphanIdx: beforeIdx });
    });
  },

  // Recoverable by design: retry runs a fresh mock sync and restores the fixtures.
  retryLoad: () => {
    set({ loadState: "loading" });
    window.setTimeout(() => {
      set({ loadState: "ready", conversations: CONVERSATIONS });
      get().setView(get().activeView);
    }, MOCK_SYNC_MS);
  },

  demoState: (mode) => {
    if (mode === "empty") {
      set({ loadState: "ready", conversations: [], selectedId: null, mobilePane: "list" });
    } else {
      set({ loadState: "error", selectedId: null, mobilePane: "list" });
    }
  },
}));

function clampIdx(idx: number, list: Conversation[]): number {
  return Math.min(Math.max(idx, 0), list.length - 1);
}

// draftingIds is a multiset: request-over-iterate on the SAME thread holds two
// pending ops (iterate on generated, then `d` re-requests), and the first
// timer to settle must not clear the spinner the second still owns — so each
// settle removes exactly ONE instance.
function removeOne(ids: string[], id: string): string[] {
  const i = ids.indexOf(id);
  return i === -1 ? ids : [...ids.slice(0, i), ...ids.slice(i + 1)];
}

function removeN(ids: string[], id: string, n: number): string[] {
  let out = ids;
  for (let i = 0; i < n; i++) out = removeOne(out, id);
  return out;
}

// R8: every async draft op (request/iterate) takes a TOKEN; a timer completes
// only if its own token is still pending, and supersede sites invalidate the
// outstanding tokens AND settle their draftingIds markers at that same
// moment. The status guard alone could not distinguish requests: mark-done
// then immediate re-request left the STALE timer seeing status "requested"
// (the NEW request's) and completing it instantly — and until it fired, a
// closed thread kept a lying spinner. Invariant: a superseded op neither
// leaves its marker nor completes a later op.
let draftOpSeq = 0;
type DraftOpKind = "request" | "iterate";
const pendingDraftOps = new Map<string, { token: number; kind: DraftOpKind }[]>();

function beginDraftOp(id: string, kind: DraftOpKind): number {
  const token = ++draftOpSeq;
  pendingDraftOps.set(id, [...(pendingDraftOps.get(id) ?? []), { token, kind }]);
  return token;
}

/** Timer-side: consume our token. False = superseded — the canceling site
    already settled the marker; the timer must do NOTHING at all. */
function settleDraftOp(id: string, token: number): boolean {
  const ops = pendingDraftOps.get(id) ?? [];
  if (!ops.some((o) => o.token === token)) return false;
  pendingDraftOps.set(
    id,
    ops.filter((o) => o.token !== token),
  );
  return true;
}

/** Supersede-side: invalidate pending ops (optionally just one kind) and
    report how many draftingIds markers the caller must settle with it. */
function cancelDraftOps(id: string, kind?: DraftOpKind): number {
  const ops = pendingDraftOps.get(id) ?? [];
  const keep = kind ? ops.filter((o) => o.kind !== kind) : [];
  pendingDraftOps.set(id, keep);
  return ops.length - keep.length;
}

/** Mark one conversation read; returns the SAME array when nothing flips so
    no-op selections never churn identity (M2 + M6 discipline). */
function readOne(conversations: Conversation[], id: string | null): Conversation[] {
  if (!id || !conversations.some((c) => c.id === id && c.unread)) return conversations;
  return conversations.map((c) => (c.id === id ? { ...c, unread: false } : c));
}

// THE re-anchor path (review H1): every view/filter/sort/fold change that can
// move selectedId funnels here, and a selection move ALWAYS clears the
// composer — typed text must never bleed into another conversation (the same
// invariant j/k/selectId enforce). "top" jumps to the first visible row (a
// new lens starts at the top); "keep" holds a still-visible selection and
// falls back to the first row only when orphaned (display folds/toggles).
function reanchor(
  set: (partial: Partial<InboxState>) => void,
  get: () => InboxState,
  mode: "top" | "keep",
) {
  const list = get().visibleConversations();
  const prev = get().selectedId;
  const next =
    mode === "keep" && list.some((c) => c.id === prev) ? prev : (list[0]?.id ?? null);
  set({
    selectedId: next,
    orphanIdx: null,
    ...(next !== prev
      ? {
          composerText: "",
          composerAttach: false,
          conversations: discardComposerHandoff(get().conversations, prev),
          // R12: the draft sheet is a per-conversation MODAL — it must
          // never survive a selection retarget it did not initiate. Below
          // xl the palette is reachable over the sheet (R7 matrix), and a
          // palette filter/sort/fold lands here: the sheet would silently
          // swap to another conversation's draft.
          draftSheetOpen: false,
        }
      : {}),
  });
}

// Shared by every filter setter: merge the patch, then re-anchor selection.
// R5: a no-op patch (clicking the active "All sources" rail item, clearing
// already-clear filters) still closes the mobile surfaces but never touches
// the filter object, the selection, or the composer — the lens didn't move,
// so it must not cost user state (same family as setView's same-view guard).
function applyFilters(
  set: (partial: Partial<InboxState>) => void,
  get: () => InboxState,
  patch: Partial<InboxFilters>,
) {
  const cur = get().filters;
  const changed = (Object.keys(patch) as (keyof InboxFilters)[]).some(
    (k) => patch[k] !== cur[k],
  );
  if (!changed) {
    // R6: drawer only — forcing mobilePane here navigated a mobile reader
    // out of an open thread just for tapping the already-active source in
    // the drawer. A no-op must not cost the reading position either.
    set({ drawerOpen: false });
    return;
  }
  // exitingIds cleared for the same reason as setView (review L4).
  set({
    filters: { ...cur, ...patch },
    mobilePane: "list",
    drawerOpen: false,
    exitingIds: [],
  });
  reanchor(set, get, "top");
}

// v7 motion-causality core: predict (against the mutated copy) whether the
// row survives the CURRENT view. If it leaves, mark it exiting for EXIT_MS so
// the list can play the slide+fade+collapse, then run the real commit — the
// data flips when the row is already gone. Commits re-read live state, never
// the prediction snapshot: another thread may have mutated in the window.
function exitThenCommit(
  set: (partial: Partial<InboxState>) => void,
  get: () => InboxState,
  id: string,
  predicted: Conversation[],
  commit: () => void,
) {
  const { activeView, filters, sortModes, showDoneInSent, collapsed, now } = get();
  const wouldRemain = deriveVisible(
    predicted,
    activeView,
    filters,
    sortModes[activeView],
    showDoneInSent,
    collapsed,
    now,
  ).some((c) => c.id === id);
  const visibleNow = get()
    .visibleConversations()
    .some((c) => c.id === id);
  if (!visibleNow || wouldRemain || prefersReducedMotion()) {
    commit();
    return;
  }
  set({ exitingIds: [...get().exitingIds, id] });
  window.setTimeout(() => {
    commit();
    set({ exitingIds: get().exitingIds.filter((x) => x !== id) });
  }, EXIT_MS);
}

// After a triage action removes a row from the view, select the row that now
// occupies its slot (i.e. the NEXT one down) — never the top. If the row is
// still visible (e.g. mark-done in All), the selection doesn't move at all.
function advanceSelection(
  set: (partial: Partial<InboxState>) => void,
  get: () => InboxState,
  beforeIdx: number,
  targetId: string,
) {
  const after = get().visibleConversations();
  if (after.some((c) => c.id === get().selectedId)) {
    // R15: the row stayed visible (done in All, Sent + Show-done) so the
    // selection holds — but the verdict still invalidates the buffer the
    // same way it does when the row leaves: preserving a live handoff +
    // stale text on a now-triaged thread let a later ⌘Enter send it and
    // reopen the thread. SCOPED to the selected thread — a hover-Done on
    // a DIFFERENT row must never clear the composer you are typing in.
    if (targetId === get().selectedId)
      set({
        composerText: "",
        composerAttach: false,
        conversations: discardComposerHandoff(get().conversations, targetId),
      });
    return;
  }
  // R10: a hidden-but-open thread (post-send routing strip) reaches here
  // with beforeIdx -1 — the caller couldn't find the row in the view. Fall
  // back to the recorded orphan slot, not row 0: the same M1 rule
  // selectNext/selectPrev already apply to an orphaned selection.
  const at = beforeIdx < 0 ? (get().orphanIdx ?? 0) : beforeIdx;
  const next = after[clampIdx(at, after)] ?? null;
  // Composer is per-thread: a selection move clears it, same as j/k — and
  // the departing thread's handoff draft reconciles the same way (R7): a
  // done/snoozed thread must not keep claiming an emptied composer.
  set({
    selectedId: next?.id ?? null,
    orphanIdx: null,
    composerText: "",
    composerAttach: false,
    // R12 (same invariant as reanchor): a retarget closes the sheet — the
    // palette can run Mark done / Snooze over the open sheet, and the row
    // leaving the view lands here.
    draftSheetOpen: false,
    conversations: discardComposerHandoff(get().conversations, get().selectedId),
  });
}

// ── mock Hermes text (clearly illustrative; honesty guardrail) ──────────────
// Each thread gets three GENUINELY distinct, thread-aware drafts. On a
// your-turn thread they're REPLIES (warm = relational open + soft commit ·
// direct = answer first · brief = shortest honest reply). On a sent thread
// they're FOLLOW-UPS (gentle nudge / direct ask / brief bump). Hand-written
// sets keyed by conversation id (base fixtures) or by the last message body
// (generator pool snippets, via ANGLES_BY_BODY / NUDGES_BY_BODY).
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

// Follow-up trios for the hand-written sent fixtures (nudge, not reply).
const MOCK_NUDGE_SETS: Record<string, AngleSet> = {
  // Nadia: does Tuesday still work?
  c6: {
    warm: "Hey! Just bumping this — does Tuesday still work? All good if things moved around on your end.",
    direct: "Confirming Tuesday — yes or no? I'll hold the slot until tomorrow.",
    brief: "Still good for Tuesday?",
  },
  // Tom: promised the one-pager
  c7: {
    warm: "No pressure at all — just checking in on the one-pager whenever it's ready. Genuinely looking forward to reading it.",
    direct: "Following up on the one-pager — can you send whatever you have by Friday?",
    brief: "Any update on the one-pager?",
  },
};

// Last-resort trios (drafting on content that has no tailored set).
const ANGLE_FALLBACK: AngleSet = {
  warm: "Really glad you flagged this — thank you. Let me give it proper thought today and come back tomorrow with a real answer instead of a rushed one.",
  direct: "Got it. I'll confirm one detail and have an answer for you tomorrow.",
  brief: "On it — answer by tomorrow.",
};
const NUDGE_FALLBACK: AngleSet = {
  warm: "Just floating this back to the top of your inbox — no rush, whenever you get a minute.",
  direct: "Following up — where does this stand on your end?",
  brief: "Any update on this?",
};

function anglesFor(conv: Conversation): AngleSet {
  const lastMsg = conv.messages[conv.messages.length - 1];
  // R14: followup-SHAPED, not just status sent — a done row whose last word
  // was yours (Sent's Show-done) is definitionally a chase; reply angles
  // against no incoming message were the generic fallback lying.
  if (isFollowupShaped(conv)) {
    // Chasing, not answering: key follow-ups off YOUR last outgoing message.
    return (
      MOCK_NUDGE_SETS[conv.id] ??
      (lastMsg && NUDGES_BY_BODY.get(lastMsg.body)) ??
      NUDGE_FALLBACK
    );
  }
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
    // Guard (#6): never gut the draft to a bare greeting ("Dana!") — keep
    // sentences until the result carries real content.
    let t = "";
    for (const s of sentences) {
      t = t ? `${t} ${s}` : s;
      if (t.length >= 40) break;
    }
    return { text: t || text, ack: "Tightened it to the essentials." };
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
