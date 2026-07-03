// Domain types for the inbox slice. Mirrors the spec's index-store vocabulary.
// NOTE (Elijah, 2026-07-03, v4): single-user local app — bodies are always
// visible to the human, and drafting means Hermes reads the thread, full stop.
// No share badges, no per-thread block switch (consent theater collapsed);
// amber is Hermes's PRESENCE color, not a "what Hermes sees" signal.

export type SourceId = "imessage" | "linkedin" | "x";

export type Bucket = "needs" | "drafted" | "waiting" | "fyi" | "done";

export type Urgency = "high" | "normal" | "low";

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
  mockSent?: boolean; // v0 composer send: local append only, never delivered
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
  modelLocality: "mock" | "local" | "cloud";
  angles?: DraftAngle[]; // present while status === "angles_ready"
  versions: DraftVersion[];
  activeVersionId?: string;
  chat?: DraftChatMsg[]; // the studio conversation (instruction history)
}

export interface Conversation {
  id: string;
  personId: string;
  source: SourceId;
  bucket: Bucket;
  urgency: Urgency;
  unread: boolean;
  lastActivity: string; // ISO
  hermesSuggestion?: string; // one-line triage rationale
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

// Bucket semantics (Elijah addendum, 2026-07-03): names must carry the model —
// whose court is the ball in? `desc` renders under the list header so the
// distinction is self-evident, not tribal knowledge.
export const BUCKET_META: Record<
  Bucket,
  { label: string; desc: string; key: string; token: string }
> = {
  needs: {
    label: "Needs Reply",
    desc: "The ball is in your court",
    key: "g i",
    token: "var(--bucket-needs)",
  },
  drafted: {
    label: "Drafted",
    desc: "Hermes drafted — review and approve",
    key: "g d",
    token: "var(--bucket-drafted)",
  },
  waiting: {
    label: "Waiting on them",
    desc: "You acted; the ball is in their court",
    key: "",
    token: "var(--bucket-waiting)",
  },
  fyi: {
    label: "FYI",
    desc: "No reply expected — read and move on",
    key: "",
    token: "var(--bucket-fyi)",
  },
  done: {
    label: "Done",
    desc: "Handled — nothing left to do",
    key: "",
    token: "var(--bucket-done)",
  },
};

export const SOURCE_META: Record<SourceId, { label: string }> = {
  imessage: { label: "iMessage" },
  linkedin: { label: "LinkedIn" },
  x: { label: "X" },
};
