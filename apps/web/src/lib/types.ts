// Domain types for the inbox slice. Mirrors the spec's index-store vocabulary.
// NOTE (Elijah, 2026-07-03, v4): single-user local app — bodies are always
// visible to the human, and drafting means Hermes reads the thread, full stop.
// No share badges, no per-thread block switch (consent theater collapsed);
// amber is Hermes's PRESENCE color, not a "what Hermes sees" signal.

export type SourceId = "imessage" | "linkedin" | "x";

// A thread's resting state: needs_reply = your reply is owed; fyi = your
// ATTENTION is owed — info to know, no reply expected (`e` acknowledges it
// into done); sent = you replied, open until they respond (your side of the
// net); done = closed — nothing owed. Done surfaces in All, and in Sent
// behind its "Show done" toggle when the last word was yours.
export type ThreadStatus = "needs_reply" | "fyi" | "sent" | "done";

// v6 (Elijah, 2026-07-04): home is IMPORTANT — two sections (needs-reply on
// top, FYI below) behind ONE admission gate: importance. The rail reads
// Important / Sent / All. (v5's collapse from five buckets to three views
// stands; v6 renames home and gives it the gate.)
export type ViewId = "important" | "sent" | "all";

/** A sent thread this quiet (days since last activity) needs a follow-up —
    it groups to the top of Sent and grows a nudge affordance. */
export const STALE_DAYS = 3;

// Hermes-computed priority: red dot high · amber dot medium · empty normal.
export type Urgency = "high" | "medium" | "normal";

// Composer-first lifecycle (Elijah, 2026-07-03 v3+v4): drafts are PREFILLS,
// iterated conversationally in the drafting studio. "Add to chat" drops the
// text into the composer — the one editing surface — and sending from there
// is the intent gesture. (Code-level truth: v0 send is a local mock append.)
export type DraftStatus =
  | "not_started"
  | "requested"
  | "angles_ready" // three angled candidates await a 1/2/3 pick
  | "generated" // picked angle, read-only card in the studio
  | "iterated" // refined via studio chat; versions.length > 1
  | "added_to_chat" // prefilled into the composer
  | "edited" // composer text diverged from the Hermes draft
  | "sent_mock"; // sent from the composer (local mock append)

export type DraftAngleTone = "warm" | "direct" | "brief";

export interface Person {
  id: string;
  name: string;
  handle: string;
  initials: string;
}

export interface Message {
  id: string;
  authorId: string; // person id or "me"
  direction: "in" | "out";
  timestamp: string; // ISO
  preview: string; // list snippet (first line of body); density, not redaction
  body: string; // always visible to the human — this is a single-user local app
}

export interface DraftAngle {
  id: string;
  tone: DraftAngleTone;
  text: string;
}

export interface DraftVersion {
  id: string;
  createdAt: string;
  instructions: string; // the studio-chat instruction that produced this version
  text: string;
}

/** One turn in the drafting studio's chat — the instruction record. */
export interface DraftChatMsg {
  id: string;
  role: "user" | "hermes";
  text: string;
  versionId?: string; // a hermes turn points at the version it produced
}

export interface Draft {
  status: DraftStatus;
  angles?: DraftAngle[]; // present while status === "angles_ready"
  versions: DraftVersion[];
  activeVersionId?: string;
  chat?: DraftChatMsg[]; // the studio conversation (instruction history)
}

export interface Conversation {
  id: string;
  personId: string;
  source: SourceId;
  status: ThreadStatus;
  // The Important view's admission gate (v6): Hermes triage, human-correctable.
  // Policy: direct questions default INTO Important regardless of sender (err
  // inclusive on needs-reply); FYI errs exclusive. Unimportant lives only in All.
  important: boolean;
  urgency: Urgency;
  unread: boolean;
  lastActivity: string; // ISO
  hermesSuggestion?: string; // one-line triage rationale
  // Post-send routing (v5 final): sending always lands the thread in Sent
  // (open); Hermes only SUGGESTS done-vs-open. This records the suggestion so
  // the thread can show the one-tap strip (Mark done / Reopen).
  routedAfterSend?: ThreadStatus;
  // Snoozed threads hide from the working views until this time (v5: snooze
  // is not a view — just a small rail count while hidden; All still shows them).
  snoozedUntil?: string; // ISO
  messages: Message[];
  draft: Draft;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: "human" | "hermes" | "sync" | "system";
  surface: "ui" | "cli" | "skill" | "rest";
  action: string;
  resource: string;
  result: "allowed" | "denied" | "error";
}

// View semantics (v6, Elijah): IMPORTANT / SENT / ALL. `desc` renders under
// the list header so each view's job is self-evident.
export const VIEW_META: Record<
  ViewId,
  { label: string; desc: string; key: string; token: string }
> = {
  important: {
    label: "Important",
    desc: "What matters now",
    key: "g i",
    token: "var(--view-important)",
  },
  sent: {
    label: "Sent",
    desc: "You replied — open until they respond",
    key: "g s",
    token: "var(--view-sent)",
  },
  all: {
    label: "All",
    desc: "Everything, newest first",
    key: "g a",
    token: "var(--view-all)",
  },
};

export const SOURCE_META: Record<SourceId, { label: string }> = {
  imessage: { label: "iMessage" },
  linkedin: { label: "LinkedIn" },
  x: { label: "X" },
};
