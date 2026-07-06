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

/** The ONE filter lens — every surface that filters or counts uses this. */
export function matchesFilters(c: Conversation, f: InboxFilters): boolean {
  return (
    (f.source === "all" || c.source === f.source) &&
    (!f.personId || c.personId === f.personId) &&
    (!f.unreadOnly || c.unread) &&
    (!f.hasDraftOnly || hasDraft(c))
  );
}

/** THE population count (review H2, F1's third recurrence): what a view
    honestly holds under the CURRENT filters. Rail counts, the list-title
    count, and Sent's done-toggle count all read this one lens so they can
    never disagree. Folds are display-only (never counted out); Sent's
    population is open threads only — done rows are accounted separately by
    the toggle's own count (sentDoneCount). */
export function population(
  conversations: Conversation[],
  view: ViewId,
  filters: InboxFilters,
  now: number,
): Conversation[] {
  return deriveVisible(conversations, view, filters, "default", false, null, now);
}

/** Sent's hidden-done tally, under the same filter AND snooze lens as the
    rows it vouches for — "Show done (5)" must never reveal fewer because a
    source chip was active (H2) or a done row was snoozed away (R5: snooze
    hides it from Sent via deriveVisible, so the count must not see it). */
export function sentDoneCount(
  conversations: Conversation[],
  filters: InboxFilters,
  now: number,
): number {
  return conversations.filter(
    (c) => isSentDone(c) && !isSnoozed(c, now) && matchesFilters(c, filters),
  ).length;
}

/** Per-view sort override. "default" = the specced order. */
export type SortMode = "default" | "newest" | "oldest";
export const DEFAULT_SORTS: Record<ViewId, SortMode> = {
  important: "default",
  sent: "default",
  all: "default",
};

/** v7: every grouped section header is a fold control (chevron + honest
    count), generalizing v6's FYI fold. Sent's Done section is deliberately
    absent — the "Show done" toggle is already its one control. */
export type SectionKey =
  | "important.needs_reply"
  | "important.fyi"
  | "sent.followup"
  | "sent.awaiting";
export type CollapsedSections = Partial<Record<SectionKey, boolean>>;

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

/** R14: drafting on a last-word-yours thread is CHASING, whether the thread
    is open (sent) or closed (done, last outgoing) — Sent's Show-done rows
    must get follow-up angles/labels, not reply angles against no incoming
    message. One key for every followup-shaped surface (panel, angles, CTA). */
export function isFollowupShaped(c: Conversation): boolean {
  return c.status === "sent" || isSentDone(c);
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
  collapsed: CollapsedSections | null, // null = population mode: ignore folds
  now: number,
): Conversation[] {
  // A collapse hides a SECTION — a grouped-display concept, so it only bites
  // in the default (grouped) order. Under a flat override there is no section
  // header to vouch for hidden rows, and rows with no visible header would
  // silently disappear. Callers pass null to count a view's honest population
  // (title/rail counts, F1 rule) regardless of what's folded away.
  const folded = (key: SectionKey) =>
    !!collapsed && sortMode === "default" && !!collapsed[key];
  const inView = (c: Conversation) => {
    if (view === "all") return true;
    if (isSnoozed(c, now)) return false;
    if (view === "important") {
      if (!isImportant(c, now)) return false;
      return !folded(`important.${importantGroup(c)}`);
    }
    // Sent = open threads on your side of the net; done rides along only
    // behind the "Show done" toggle (and only if the last word was yours).
    if (!(c.status === "sent" || (showDoneInSent && isSentDone(c)))) return false;
    const group = sentGroup(c, now);
    return group === "done" || !folded(`sent.${group}`);
  };
  const matches = (c: Conversation) => inView(c) && matchesFilters(c, filters);
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
