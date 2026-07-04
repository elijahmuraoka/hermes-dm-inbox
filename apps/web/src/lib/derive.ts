// The ONE derivation of "what rows does this view show" — shared by the store
// getter and the list's useMemo so the two can never drift apart.
// Default sort orders are SPEC (Elijah v5/v6): each view's order is the
// argument for its existence — see DESIGN.md §4. Overrides exist (⌘K), and a
// non-default sort is always visibly chipped in the filter bar.
import type { Conversation, SourceId, Urgency, ViewId } from "./types";
import { STALE_DAYS } from "./types";
import { daysSince } from "./utils";

// Filters apply on EVERY view (v5) and are ⌘K-reachable; the chip bar under
// the list header keeps active filters visible wherever they're biting.
export interface InboxFilters {
  source: SourceId | "all";
  personId: string | null;
  unreadOnly: boolean;
  hasDraftOnly: boolean;
}

export const NO_FILTERS: InboxFilters = {
  source: "all",
  personId: null,
  unreadOnly: false,
  hasDraftOnly: false,
};

export function anyFilterActive(f: InboxFilters): boolean {
  return f.source !== "all" || f.personId !== null || f.unreadOnly || f.hasDraftOnly;
}

/** Per-view sort override. "default" = the specced order. */
export type SortMode = "default" | "newest" | "oldest";
export const DEFAULT_SORTS: Record<ViewId, SortMode> = {
  important: "default",
  sent: "default",
  all: "default",
};

/** A Hermes draft exists on this thread and hasn't been sent yet. */
export function hasDraft(c: Conversation): boolean {
  return c.draft.versions.length > 0 && c.draft.status !== "sent_mock";
}

/** Sent thread quiet long enough to deserve a follow-up (>= STALE_DAYS). */
export function isStale(c: Conversation, now: number): boolean {
  return c.status === "sent" && daysSince(c.lastActivity, now) >= STALE_DAYS;
}

/** Snoozed = hidden from the working views until it returns; never a view of
    its own, and never hidden from All — All is the trust anchor. */
export function isSnoozed(c: Conversation, now: number): boolean {
  return !!c.snoozedUntil && +new Date(c.snoozedUntil) > now;
}

/** A done thread whose last word was yours — Sent's "Show done" population. */
export function isSentDone(c: Conversation): boolean {
  return c.status === "done" && c.messages[c.messages.length - 1]?.direction === "out";
}

/** Which Sent section a row belongs to (drives the group headers). */
export function sentGroup(c: Conversation, now: number): "followup" | "awaiting" | "done" {
  if (c.status === "done") return "done";
  return isStale(c, now) ? "followup" : "awaiting";
}

/** Admission to the Important view (v6): importance is the gate, the ball's
    court is only the section. Unimportant items of both kinds live in All. */
export function isImportant(c: Conversation, now: number): boolean {
  return (
    c.important &&
    !isSnoozed(c, now) &&
    (c.status === "needs_reply" || c.status === "fyi")
  );
}

/** An unacknowledged important-FYI thread — Important's second section. */
export function isImportantFyi(c: Conversation, now: number): boolean {
  return c.important && c.status === "fyi" && !isSnoozed(c, now);
}

/** Which Important section a row belongs to (drives the group headers). */
export function importantGroup(c: Conversation): "needs_reply" | "fyi" {
  return c.status === "fyi" ? "fyi" : "needs_reply";
}

const URGENCY_RANK: Record<Urgency, number> = { high: 0, medium: 1, normal: 2 };

export function deriveVisible(
  conversations: Conversation[],
  view: ViewId,
  filters: InboxFilters,
  sortMode: SortMode,
  showDoneInSent: boolean,
  fyiCollapsed: boolean,
  now: number,
): Conversation[] {
  const inView = (c: Conversation) => {
    if (view === "all") return true;
    if (isSnoozed(c, now)) return false;
    if (view === "important") {
      if (!isImportant(c, now)) return false;
      // Collapse hides the FYI SECTION — a grouped-display concept, so it
      // only bites in the default (grouped) order. Under a flat override
      // there is no section header to vouch for hidden rows, and rows with
      // no visible header would silently disappear.
      if (c.status === "fyi" && fyiCollapsed && sortMode === "default") return false;
      return true;
    }
    // Sent = open threads on your side of the net; done rides along only
    // behind the "Show done" toggle (and only if the last word was yours).
    return c.status === "sent" || (showDoneInSent && isSentDone(c));
  };
  const matches = (c: Conversation) =>
    inView(c) &&
    (filters.source === "all" || c.source === filters.source) &&
    (!filters.personId || c.personId === filters.personId) &&
    (!filters.unreadOnly || c.unread) &&
    (!filters.hasDraftOnly || hasDraft(c));
  const newest = (a: Conversation, b: Conversation) =>
    +new Date(b.lastActivity) - +new Date(a.lastActivity);
  const oldest = (a: Conversation, b: Conversation) => -newest(a, b);

  const list = conversations.filter(matches);

  if (sortMode !== "default") {
    // An override flattens Sent's grouping — one honest order, no sections.
    return list.sort(sortMode === "newest" ? newest : oldest);
  }

  if (view === "important") {
    // Two sections (v6): NEEDS REPLY above FYI. Within needs-reply: priority
    // desc → draft-ready boost within tier → oldest first — a triage queue;
    // old debt surfaces. Within FYI: priority desc → newest first — info is
    // not debt, fresh intel matters most, and acknowledging isn't answering.
    const groupRank = { needs_reply: 0, fyi: 1 } as const;
    return list.sort((a, b) => {
      const ga = importantGroup(a);
      const gb = importantGroup(b);
      if (ga !== gb) return groupRank[ga] - groupRank[gb];
      const byUrgency = URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency];
      if (byUrgency) return byUrgency;
      if (ga === "needs_reply")
        return Number(hasDraft(b)) - Number(hasDraft(a)) || oldest(a, b);
      return newest(a, b);
    });
  }
  if (view === "sent") {
    // Needs follow-up (stalest first) → Awaiting (fresh, newest first) →
    // Done (when shown, newest first). Flat order matches the group order so
    // the list can insert headers at boundaries.
    const groupRank = { followup: 0, awaiting: 1, done: 2 } as const;
    return list.sort((a, b) => {
      const ga = sentGroup(a, now);
      const gb = sentGroup(b, now);
      if (ga !== gb) return groupRank[ga] - groupRank[gb];
      if (ga === "followup") return daysSince(b.lastActivity, now) - daysSince(a.lastActivity, now);
      return newest(a, b);
    });
  }
  // All: newest first — the familiar skim; trust comes from omitting nothing.
  return list.sort(newest);
}
