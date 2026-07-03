// Domain types for the inbox slice. Mirrors the spec's index-store vocabulary.
// NOTE (Elijah, 2026-07-03): bodies are ALWAYS visible to the human — this is a
// single-user local app. The only privacy gate is whether a body is shared into
// Hermes' context (`sharedWithHermes`). BodyPolicy describes what Hermes sees.

export type SourceId = "imessage" | "linkedin" | "x";

export type Bucket = "needs" | "drafted" | "waiting" | "fyi" | "done";

export type Urgency = "high" | "normal" | "low";

export type DraftStatus =
  | "not_started"
  | "requested"
  | "generated"
  | "edited"
  | "approved_intent";

// What Hermes sees when it drafts. Binary in this app: metadata, or full bodies you shared.
export type BodyPolicy = "metadata_only" | "explicit_full_body";

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
  sharedWithHermes: boolean; // the ONE gate: is this body in Hermes' context?
}

export interface DraftVersion {
  id: string;
  createdAt: string;
  instructions: string;
  text: string;
  reason?: string; // regeneration reason
}

export interface Draft {
  status: DraftStatus;
  bodyPolicy: BodyPolicy;
  modelLocality: "mock" | "local" | "cloud";
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

export const BUCKET_META: Record<
  Bucket,
  { label: string; key: string; token: string }
> = {
  needs: { label: "Needs Reply", key: "g i", token: "var(--bucket-needs)" },
  drafted: { label: "Drafted", key: "g d", token: "var(--bucket-drafted)" },
  waiting: { label: "Waiting", key: "", token: "var(--bucket-waiting)" },
  fyi: { label: "FYI", key: "", token: "var(--bucket-fyi)" },
  done: { label: "Done", key: "", token: "var(--bucket-done)" },
};

export const SOURCE_META: Record<SourceId, { label: string; glyph: string }> = {
  imessage: { label: "iMessage", glyph: "iMsg" },
  linkedin: { label: "LinkedIn", glyph: "in" },
  x: { label: "X", glyph: "X" },
};
