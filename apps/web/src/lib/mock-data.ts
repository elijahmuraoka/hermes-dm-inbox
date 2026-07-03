// SYNTHETIC fixtures only (public-repo safety invariant #9). No real people,
// handles, or message content. Fixed clock so relative times are deterministic.
// Volume matters: the §4 density rhythm only reads with a realistically full
// inbox, so hand-written conversations are extended by a deterministic generator.
import type { AuditEvent, Bucket, Conversation, Person, SourceId } from "./types";

export const MOCK_NOW = new Date("2026-07-03T17:00:00Z").getTime();

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const P = (id: string, name: string, handle: string): Person => ({
  id,
  name,
  handle,
  initials: initials(name),
});

export const PEOPLE: Record<string, Person> = {
  me: P("me", "You", "@you"),
  p1: P("p1", "Dana Okonkwo", "@dana.mock"),
  p2: P("p2", "Priya Raman", "in/priya-mock"),
  p3: P("p3", "Marco Feld", "@marco_mock"),
  p4: P("p4", "Wei Chen", "in/wei-mock"),
  p5: P("p5", "Sam Ellison", "@sam.mock"),
  p6: P("p6", "Nadia Farouk", "@nadia_mock"),
  p7: P("p7", "Tom Byrne", "in/tom-mock"),
  p8: P("p8", "Aiko Sato", "@aiko.mock"),
  p9: P("p9", "Luis Ortega", "@luis_mock"),
};

const iso = (minAgo: number) => new Date(MOCK_NOW - minAgo * 60000).toISOString();

const BASE_CONVERSATIONS: Conversation[] = [
  {
    id: "c1",
    personId: "p1",
    source: "imessage",
    bucket: "needs",
    urgency: "high",
    unread: true,
    lastActivity: iso(7),
    hermesSuggestion: "Direct question about Thursday; likely needs a reply today.",
    messages: [
      {
        id: "c1m1",
        authorId: "p1",
        direction: "in",
        timestamp: iso(41),
        preview: "Hey — did you get a chance to look at the deck?",
        body: "Hey — did you get a chance to look at the deck? I want to send it out before the Thursday sync so we're all aligned.",
        sharedWithHermes: false,
      },
      {
        id: "c1m2",
        authorId: "p1",
        direction: "in",
        timestamp: iso(7),
        preview: "Also can we push our call to 3pm?",
        body: "Also can we push our call to 3pm? Something came up in the morning and I'd hate to rush it.",
        sharedWithHermes: false,
      },
    ],
    draft: {
      status: "not_started",
      bodyPolicy: "metadata_only",
      modelLocality: "mock",
      versions: [],
    },
  },
  {
    id: "c2",
    personId: "p2",
    source: "linkedin",
    bucket: "needs",
    urgency: "normal",
    unread: true,
    lastActivity: iso(52),
    hermesSuggestion: "Warm intro request; a short yes/no keeps momentum.",
    messages: [
      {
        id: "c2m1",
        authorId: "p2",
        direction: "in",
        timestamp: iso(52),
        preview: "Loved your talk — would you be open to a quick intro to…",
        body: "Loved your talk at the meetup — would you be open to a quick intro to our head of platform? She's exploring exactly the local-first space you described.",
        sharedWithHermes: false,
      },
    ],
    draft: {
      status: "not_started",
      bodyPolicy: "metadata_only",
      modelLocality: "mock",
      versions: [],
    },
  },
  {
    id: "c3",
    personId: "p3",
    source: "x",
    bucket: "needs",
    urgency: "normal",
    unread: false,
    lastActivity: iso(96),
    hermesSuggestion: "Follow-up on the API question you left open two days ago.",
    messages: [
      {
        id: "c3m1",
        authorId: "p3",
        direction: "in",
        timestamp: iso(96),
        preview: "Any update on whether the webhook signing is documented?",
        body: "Any update on whether the webhook signing is documented anywhere? Happy to open a PR if not.",
        sharedWithHermes: false,
      },
    ],
    draft: {
      status: "not_started",
      bodyPolicy: "metadata_only",
      modelLocality: "mock",
      versions: [],
    },
  },
  {
    id: "c4",
    personId: "p4",
    source: "linkedin",
    bucket: "drafted",
    urgency: "normal",
    unread: false,
    lastActivity: iso(140),
    hermesSuggestion: "Draft ready for your review — declines politely, keeps the door open.",
    messages: [
      {
        id: "c4m1",
        authorId: "p4",
        direction: "in",
        timestamp: iso(140),
        preview: "Would you be interested in advising our seed round?",
        body: "Would you be interested in advising our seed round? We're assembling a small group of operators and your name came up twice.",
        sharedWithHermes: true, // shared so Hermes could draft the full-body decline
      },
    ],
    draft: {
      status: "generated",
      bodyPolicy: "explicit_full_body",
      modelLocality: "mock",
      activeVersionId: "c4d1",
      versions: [
        {
          id: "c4d1",
          createdAt: iso(120),
          instructions: "Decline for now, warm, leave the door open for later.",
          text: "Really appreciate you thinking of me, Wei — and congrats on getting the round moving. I'm heads-down on a build right now so I can't take on an advising role this quarter, but I'd love to stay in touch and reconnect once you're past the raise. Keep me posted on how it comes together.",
        },
      ],
    },
  },
  {
    id: "c5",
    personId: "p5",
    source: "imessage",
    bucket: "drafted",
    urgency: "low",
    unread: false,
    lastActivity: iso(210),
    hermesSuggestion: "Casual thanks reply drafted; low stakes, send when convenient.",
    messages: [
      {
        id: "c5m1",
        authorId: "p5",
        direction: "in",
        timestamp: iso(210),
        preview: "Thanks again for the recommendation!",
        body: "Thanks again for the recommendation! The call went really well and they moved me to the final round.",
        sharedWithHermes: false,
      },
    ],
    draft: {
      status: "edited",
      bodyPolicy: "explicit_full_body",
      modelLocality: "mock",
      activeVersionId: "c5d2",
      versions: [
        {
          id: "c5d1",
          createdAt: iso(200),
          instructions: "Warm, brief congratulations.",
          text: "That's fantastic news — not surprised at all. Go get the final round!",
        },
        {
          id: "c5d2",
          createdAt: iso(196),
          instructions: "Warm, brief congratulations.",
          reason: "Make it a touch more personal.",
          text: "That's fantastic — genuinely not surprised, you were the obvious pick. Go take the final round. Rooting for you.",
        },
      ],
    },
  },
  {
    id: "c6",
    personId: "p6",
    source: "x",
    bucket: "waiting",
    urgency: "normal",
    unread: false,
    lastActivity: iso(1500),
    hermesSuggestion: "You replied yesterday; waiting on their confirmation.",
    messages: [
      {
        id: "c6m1",
        authorId: "me",
        direction: "out",
        timestamp: iso(1500),
        preview: "Sent — let me know if Tuesday still works on your end.",
        body: "Sent — let me know if Tuesday still works on your end.",
        sharedWithHermes: false,
      },
    ],
    draft: {
      status: "not_started",
      bodyPolicy: "metadata_only",
      modelLocality: "mock",
      versions: [],
    },
  },
  {
    id: "c7",
    personId: "p7",
    source: "linkedin",
    bucket: "waiting",
    urgency: "low",
    unread: false,
    lastActivity: iso(2880),
    hermesSuggestion: "Awaiting the doc they promised; consider a nudge in 2 days.",
    messages: [
      {
        id: "c7m1",
        authorId: "p7",
        direction: "in",
        timestamp: iso(2880),
        preview: "Will send the one-pager over by end of week.",
        body: "Will send the one-pager over by end of week — thanks for your patience on this.",
        sharedWithHermes: false,
      },
    ],
    draft: {
      status: "not_started",
      bodyPolicy: "metadata_only",
      modelLocality: "mock",
      versions: [],
    },
  },
  {
    id: "c8",
    personId: "p8",
    source: "imessage",
    bucket: "fyi",
    urgency: "low",
    unread: false,
    lastActivity: iso(320),
    hermesSuggestion: "Informational; no reply expected.",
    messages: [
      {
        id: "c8m1",
        authorId: "p8",
        direction: "in",
        timestamp: iso(320),
        preview: "FYI the venue moved to the third floor.",
        body: "FYI the venue moved to the third floor — same building, just take the elevator past the lobby.",
        sharedWithHermes: false,
      },
    ],
    draft: {
      status: "not_started",
      bodyPolicy: "metadata_only",
      modelLocality: "mock",
      versions: [],
    },
  },
  {
    id: "c9",
    personId: "p9",
    source: "x",
    bucket: "fyi",
    urgency: "low",
    unread: false,
    lastActivity: iso(600),
    hermesSuggestion: "Shared a link you might find useful; no action needed.",
    messages: [
      {
        id: "c9m1",
        authorId: "p9",
        direction: "in",
        timestamp: iso(600),
        preview: "Thought of you when I saw this piece on local-first sync.",
        body: "Thought of you when I saw this piece on local-first sync — the CRDT section especially.",
        sharedWithHermes: false,
      },
    ],
    draft: {
      status: "not_started",
      bodyPolicy: "metadata_only",
      modelLocality: "mock",
      versions: [],
    },
  },
  {
    id: "c10",
    personId: "p3",
    source: "imessage",
    bucket: "done",
    urgency: "low",
    unread: false,
    lastActivity: iso(4300),
    hermesSuggestion: "Resolved — you confirmed the details.",
    messages: [
      {
        id: "c10m1",
        authorId: "me",
        direction: "out",
        timestamp: iso(4300),
        preview: "Perfect, see you then.",
        body: "Perfect, see you then.",
        sharedWithHermes: false,
      },
    ],
    draft: {
      status: "approved_intent",
      bodyPolicy: "explicit_full_body",
      modelLocality: "mock",
      activeVersionId: "c10d1",
      versions: [
        {
          id: "c10d1",
          createdAt: iso(4320),
          instructions: "Confirm and close out warmly.",
          text: "Perfect, see you then.",
        },
      ],
    },
  },
];

// ── deterministic volume generator (no Math.random — stable renders) ────────
const GEN_FIRST = ["Ava", "Noah", "Mia", "Leo", "Zoe", "Kai", "Ivy", "Eli", "Uma", "Rex", "Nia", "Jules", "Lia", "Omar", "Ada", "Ben", "Cleo", "Dev", "Esme", "Finn", "Gus", "Hana", "Iris", "Theo", "June", "Marek", "Sana", "Cole", "Rina", "Vic", "Lena", "Otis", "Pia", "Quinn", "Sol"];
const GEN_LAST = ["Kim", "Silva", "Novak", "Reyes", "Moss", "Idris", "Park", "Lund", "Vega", "Osei", "Tanaka", "Baum", "Cruz", "Dorn", "Egan", "Frost", "Gill", "Haas", "Ito", "Joly"];
const GEN_SOURCES: SourceId[] = ["imessage", "linkedin", "x"];
// Weighted so Needs Reply reads as the workhorse bucket.
const GEN_BUCKETS: Bucket[] = ["needs", "needs", "drafted", "waiting", "needs", "fyi", "done", "needs", "waiting", "fyi"];
const GEN_SNIPPETS = [
  "Quick one — does the pricing page copy still say early access? Someone asked me today.",
  "We're finalizing the panel lineup this week. Are you in if it's the 24th?",
  "Sent over the contract redlines. Two small changes, nothing controversial.",
  "Loved the write-up. One question about the sync engine — is it CRDT-based or op-log?",
  "Can you resend the invite? It went to my old address.",
  "The demo went great — they want a follow-up with their platform team next week.",
  "No rush, but the venue needs a headcount by Friday.",
  "Saw the launch — congrats! How's the first week looking?",
  "I owe you an intro to that designer I mentioned. Still interested?",
  "Heads up: the API version you're on sunsets at the end of the month.",
  "Just landed back home. Let's catch up properly this week?",
  "The doc you shared was exactly what we needed — thank you.",
  "Are you around Thursday afternoon for a quick call about the roadmap?",
  "Following up on my last note — any thoughts on the proposal?",
  "New build is up. The keyboard nav feels dramatically better.",
];
const GEN_DRAFT_TEXT =
  "Thanks for the nudge — I looked through it this morning and it's in good shape. Let me confirm one detail on my end and I'll get you a proper answer by tomorrow.";

const GENERATED_PEOPLE: Record<string, Person> = {};
const GENERATED: Conversation[] = Array.from({ length: 35 }, (_, i) => {
  const first = GEN_FIRST[i % GEN_FIRST.length];
  const last = GEN_LAST[(i * 7 + 3) % GEN_LAST.length];
  const name = `${first} ${last}`;
  const pid = `pg${i}`;
  const source = GEN_SOURCES[i % 3];
  const handle =
    source === "linkedin" ? `in/${first.toLowerCase()}-mock` : `@${first.toLowerCase()}.mock`;
  GENERATED_PEOPLE[pid] = P(pid, name, handle);

  const bucket = GEN_BUCKETS[i % GEN_BUCKETS.length];
  const minAgo = 25 + i * 47 + (i % 5) * 13; // spread over ~28h, deterministic
  const body = GEN_SNIPPETS[i % GEN_SNIPPETS.length];
  const drafted = bucket === "drafted";
  const outgoing = bucket === "waiting" && i % 2 === 0;

  return {
    id: `cg${i}`,
    personId: pid,
    source,
    bucket,
    urgency: i % 9 === 0 ? "high" : i % 4 === 0 ? "low" : "normal",
    unread: bucket === "needs" && i % 3 === 0,
    lastActivity: iso(minAgo),
    hermesSuggestion:
      bucket === "needs"
        ? "Open question in the last message; a short reply keeps it moving."
        : undefined,
    messages: [
      {
        id: `cg${i}m1`,
        authorId: outgoing ? "me" : pid,
        direction: outgoing ? "out" : "in",
        timestamp: iso(minAgo),
        preview: body.length > 64 ? `${body.slice(0, 61)}…` : body,
        body,
        sharedWithHermes: false,
      },
    ],
    draft: drafted
      ? {
          status: "generated" as const,
          bodyPolicy: "metadata_only" as const,
          modelLocality: "mock" as const,
          activeVersionId: `cg${i}d1`,
          versions: [
            {
              id: `cg${i}d1`,
              createdAt: iso(minAgo - 10),
              instructions: "Draft a reply in my voice.",
              text: GEN_DRAFT_TEXT,
            },
          ],
        }
      : {
          status: "not_started" as const,
          bodyPolicy: "metadata_only" as const,
          modelLocality: "mock" as const,
          versions: [],
        },
  };
});

Object.assign(PEOPLE, GENERATED_PEOPLE);
export const CONVERSATIONS: Conversation[] = [...BASE_CONVERSATIONS, ...GENERATED];

export const AUDIT_EVENTS: AuditEvent[] = [
  {
    id: "a2",
    timestamp: iso(119),
    actor: "human",
    surface: "ui",
    action: "hermes.share",
    resource: "c4m1",
    result: "allowed",
  },
  {
    id: "a3",
    timestamp: iso(118),
    actor: "hermes",
    surface: "ui",
    action: "draft.generate",
    resource: "c4",
    result: "allowed",
  },
  {
    id: "a4",
    timestamp: iso(30),
    actor: "sync",
    surface: "rest",
    action: "sync.finished",
    resource: "imessage",
    result: "allowed",
  },
];
