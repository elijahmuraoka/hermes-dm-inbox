// Domain types for the inbox slice. Mirrors the spec's index-store vocabulary.
// NOTE (Elijah, 2026-07-03, v2): bodies are ALWAYS visible to the human — this
// is a single-user local app. Sharing with Hermes is THREAD-level and default-on
// for drafting: pressing `d` shares the full thread into Hermes' context (that's
// the point of asking it to draft). A per-thread opt-out (`hermesBlocked`) keeps
// Hermes at metadata-only. BodyPolicy describes what Hermes sees.

export type SourceId = "imessage" | "linkedin" | "x";

export type Bucket = "needs" | "drafted" | "waiting" | "fyi" | "done";

export type Urgency = "high" | "normal" | "low";

// Composer-first lifecycle (Elijah, 2026-07-03 v3): drafts are PREFILLS.
// "Add to chat" drops the text into the composer — the one editing surface —
// and sending from there is the intent gesture (approve-intent ceremony
// retired). v0 send is a LOCAL MOCK: no real delivery, honestly labeled.
export type DraftStatus =
  | "not_started"
  | "requested"
  | "angles_ready" // three angled candidates await a 1/2/3 pick
  | "generated" // picked angle, read-only card in the panel
  | "added_to_chat" // prefilled into the composer
  | "edited" // composer text diverged from the Hermes draft
  | "sent_mock"; // sent from the composer (local mock append)

// What Hermes sees when it drafts: metadata, or the full thread (default on `d`).
export type BodyPolicy = "metadata_only" | "full_thread";

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
  instructions: string;
  text: string;
  from: BodyPolicy; // provenance: what Hermes actually saw when THIS text was made
  reason?: string; // regeneration reason
}

export interface Draft {
  status: DraftStatus;
  bodyPolicy: BodyPolicy;
  modelLocality: "mock" | "local" | "cloud";
  angles?: DraftAngle[]; // present while status === "angles_ready"
  anglesFrom?: BodyPolicy; // provenance of the pending candidates
  versions: DraftVersion[];
  activeVersionId?: string;
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
  threadShared: boolean; // thread bodies have entered Hermes' context (via `d`)
  hermesBlocked: boolean; // per-thread opt-out: Hermes stays metadata-only here
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
