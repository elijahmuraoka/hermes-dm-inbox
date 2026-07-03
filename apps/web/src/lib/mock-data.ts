// SYNTHETIC fixtures only (public-repo safety invariant #9). No real people,
// handles, or message content. Fixed clock so relative times are deterministic.
// Volume matters: the §4 density rhythm only reads with a realistically full
// inbox, so hand-written conversations are extended by a deterministic generator.
import type {
  AuditEvent,
  Bucket,
  Conversation,
  DraftAngleTone,
  Person,
  SourceId,
} from "./types";

export type AngleSet = Record<DraftAngleTone, string>;

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
    threadShared: false,
    hermesBlocked: false,
    hermesSuggestion: "Direct question about Thursday; likely needs a reply today.",
    messages: [
      {
        id: "c1m1",
        authorId: "p1",
        direction: "in",
        timestamp: iso(41),
        preview: "Hey — did you get a chance to look at the deck?",
        body: "Hey — did you get a chance to look at the deck? I want to send it out before the Thursday sync so we're all aligned.",
      },
      {
        id: "c1m2",
        authorId: "p1",
        direction: "in",
        timestamp: iso(7),
        preview: "Also can we push our call to 3pm?",
        body: "Also can we push our call to 3pm? Something came up in the morning and I'd hate to rush it.",
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
    threadShared: false,
    hermesBlocked: false,
    hermesSuggestion: "Warm intro request; a short yes/no keeps momentum.",
    messages: [
      {
        id: "c2m1",
        authorId: "p2",
        direction: "in",
        timestamp: iso(52),
        preview: "Loved your talk — would you be open to a quick intro to…",
        body: "Loved your talk at the meetup — would you be open to a quick intro to our head of platform? She's exploring exactly the local-first space you described.",
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
    threadShared: false,
    hermesBlocked: false,
    hermesSuggestion: "Follow-up on the API question you left open two days ago.",
    messages: [
      {
        id: "c3m1",
        authorId: "p3",
        direction: "in",
        timestamp: iso(96),
        preview: "Any update on whether the webhook signing is documented?",
        body: "Any update on whether the webhook signing is documented anywhere? Happy to open a PR if not.",
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
    threadShared: true,
    hermesBlocked: false,
    hermesSuggestion: "Draft ready for your review — declines politely, keeps the door open.",
    messages: [
      {
        id: "c4m1",
        authorId: "p4",
        direction: "in",
        timestamp: iso(140),
        preview: "Would you be interested in advising our seed round?",
        body: "Would you be interested in advising our seed round? We're assembling a small group of operators and your name came up twice.",
      },
    ],
    draft: {
      status: "generated",
      bodyPolicy: "full_thread",
      modelLocality: "mock",
      activeVersionId: "c4d1",
      versions: [
        {
          id: "c4d1",
          createdAt: iso(120),
          from: "full_thread",
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
    threadShared: true,
    hermesBlocked: false,
    hermesSuggestion: "Casual thanks reply drafted; low stakes, send when convenient.",
    messages: [
      {
        id: "c5m1",
        authorId: "p5",
        direction: "in",
        timestamp: iso(210),
        preview: "Thanks again for the recommendation!",
        body: "Thanks again for the recommendation! The call went really well and they moved me to the final round.",
      },
    ],
    draft: {
      status: "edited",
      bodyPolicy: "full_thread",
      modelLocality: "mock",
      activeVersionId: "c5d2",
      versions: [
        {
          id: "c5d1",
          createdAt: iso(200),
          from: "full_thread",
          instructions: "Warm, brief congratulations.",
          text: "That's fantastic news — not surprised at all. Go get the final round!",
        },
        {
          id: "c5d2",
          createdAt: iso(196),
          from: "full_thread",
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
    threadShared: false,
    hermesBlocked: false,
    hermesSuggestion: "You replied yesterday; waiting on their confirmation.",
    messages: [
      {
        id: "c6m1",
        authorId: "me",
        direction: "out",
        timestamp: iso(1500),
        preview: "Sent — let me know if Tuesday still works on your end.",
        body: "Sent — let me know if Tuesday still works on your end.",
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
    threadShared: false,
    hermesBlocked: false,
    hermesSuggestion: "They owe you the one-pager — nothing for you to do until it lands.",
    messages: [
      {
        id: "c7m1",
        authorId: "p7",
        direction: "in",
        timestamp: iso(2880),
        preview: "Will send the one-pager over by end of week.",
        body: "Will send the one-pager over by end of week — thanks for your patience on this.",
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
    threadShared: false,
    hermesBlocked: false,
    hermesSuggestion: "Informational; no reply expected.",
    messages: [
      {
        id: "c8m1",
        authorId: "p8",
        direction: "in",
        timestamp: iso(320),
        preview: "FYI the venue moved to the third floor.",
        body: "FYI the venue moved to the third floor — same building, just take the elevator past the lobby.",
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
    threadShared: false,
    hermesBlocked: false,
    hermesSuggestion: "Shared a link you might find useful; no action needed.",
    messages: [
      {
        id: "c9m1",
        authorId: "p9",
        direction: "in",
        timestamp: iso(600),
        preview: "Thought of you when I saw this piece on local-first sync.",
        body: "Thought of you when I saw this piece on local-first sync — the CRDT section especially.",
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
    threadShared: true,
    hermesBlocked: false,
    hermesSuggestion: "Resolved — you confirmed the details.",
    messages: [
      {
        id: "c10m1",
        authorId: "me",
        direction: "out",
        timestamp: iso(4300),
        preview: "Perfect, see you then.",
        body: "Perfect, see you then.",
      },
    ],
    draft: {
      status: "approved_intent",
      bodyPolicy: "full_thread",
      modelLocality: "mock",
      activeVersionId: "c10d1",
      versions: [
        {
          id: "c10d1",
          createdAt: iso(4320),
          from: "full_thread",
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

// Bucket-coherent content (Elijah addendum, 2026-07-03): every snippet belongs
// to exactly ONE bucket's semantics — a fixture must never plausibly straddle two.
//   needs   = a direct question TO you (incoming; your court)
//   waiting = YOUR last message asked for something (outgoing; their court)
//   fyi     = pure broadcast info, no question, nothing owed either way
//   done    = closed confirmation, nothing pending
// Needs-bucket snippets carry their own THREAD-AWARE angle trios (warm =
// relational open + soft commit · direct = answer first · brief = shortest
// honest reply) — drafting mostly happens here, and thread-blind fallback
// angles read as broken. Keyed by body text at draft time.
const NEEDS_ITEMS: { body: string; angles: AngleSet }[] = [
  {
    body: "Quick one — does the pricing page copy still say early access? Someone asked me today.",
    angles: {
      warm: "Good catch — and thanks for flagging it. Checking the live copy right now; I'll confirm within the hour.",
      direct: "Yes, it still says early access — updating it today.",
      brief: "Still says early access — fixing now.",
    },
  },
  {
    body: "We're finalizing the panel lineup this week. Are you in if it's the 24th?",
    angles: {
      warm: "Honored to be asked — the 24th works on my end. Count me in, and send over whatever prep you need.",
      direct: "Yes to the 24th. Send the format and my slot.",
      brief: "In for the 24th.",
    },
  },
  {
    body: "Loved the write-up. One question about the sync engine — is it CRDT-based or op-log?",
    angles: {
      warm: "Thank you — really glad it landed. It's op-log under the hood; happy to walk through why we passed on CRDTs if that's useful.",
      direct: "Op-log, not CRDT — deterministic replay mattered more than concurrent merge.",
      brief: "Op-log — happy to elaborate.",
    },
  },
  {
    body: "Can you resend the invite? It went to my old address.",
    angles: {
      warm: "Of course — just resent it to this address. Shout if it doesn't land in a few minutes.",
      direct: "Resent to this address just now.",
      brief: "Done — check your inbox.",
    },
  },
  {
    body: "Saw the launch — congrats! How's the first week looking?",
    angles: {
      warm: "Thank you! Week one has been wild in the best way — signups ahead of plan. Let's catch up properly soon.",
      direct: "Strong — ahead of plan on signups. Retention read comes next week.",
      brief: "Great so far — ahead of plan.",
    },
  },
  {
    body: "Are you around Thursday afternoon for a quick call about the roadmap?",
    angles: {
      warm: "Thursday afternoon works — anytime after 2. Looking forward to it.",
      direct: "Yes — Thursday after 2pm. Send an invite.",
      brief: "Yes, after 2pm Thursday.",
    },
  },
  {
    body: "The venue needs a headcount by Friday — can you confirm yours?",
    angles: {
      warm: "Thanks for staying on top of this — I'll be there, plus one. Confirming now so you're set well before Friday.",
      direct: "Confirmed: two from my side.",
      brief: "Confirmed — two.",
    },
  },
  {
    body: "Did the contract come back from legal yet? We'd like to sign this week.",
    angles: {
      warm: "Appreciate the patience on this — legal returned it this morning with two minor notes. Clean version to you tomorrow so you can sign this week.",
      direct: "Back from legal today, two minor notes. Clean copy tomorrow — signing this week works.",
      brief: "Back today — clean copy tomorrow.",
    },
  },
  {
    body: "What's the best way to cite your local-first talk in our internal doc?",
    angles: {
      warm: "That's kind of you to ask — a link to the recording plus the talk title and my name is perfect. Glad it's useful internally!",
      direct: "Link the recording + title + my name. No other permission needed.",
      brief: "Recording link + title is perfect.",
    },
  },
  {
    body: "We hit the rate limit on the staging key — can you bump it?",
    angles: {
      warm: "Sorry you hit that wall — bumping the staging key's limit now. Give it ten minutes and you should be clear.",
      direct: "Bumped to 10x — live in ten minutes.",
      brief: "Bumped — live in ~10 min.",
    },
  },
  {
    body: "Is the beta open to teams yet, or individuals only?",
    angles: {
      warm: "Great question — individuals only for another couple of weeks, but send me a team size and I'll put you at the top of the list.",
      direct: "Individuals only for now. Teams open in ~2 weeks — I can waitlist yours today.",
      brief: "Individuals for now — teams in ~2 weeks.",
    },
  },
  {
    body: "Your invoice for June is missing the PO number — can you resend?",
    angles: {
      warm: "Ah, my mistake — thanks for catching it. Resending with the PO number this afternoon.",
      direct: "Fixed — corrected invoice with the PO goes out today.",
      brief: "On it — corrected invoice today.",
    },
  },
];

export const ANGLES_BY_BODY = new Map(NEEDS_ITEMS.map((i) => [i.body, i.angles]));

const GEN_BY_BUCKET: Record<
  Bucket,
  { snippets: string[]; direction: "in" | "out"; suggestion?: string }
> = {
  needs: {
    direction: "in",
    suggestion: "Open question in the last message; a short reply keeps it moving.",
    snippets: NEEDS_ITEMS.map((i) => i.body),
  },
  drafted: {
    direction: "in",
    suggestion: "Draft ready for your review.",
    snippets: [
      "Following up on my last note — any thoughts on the proposal?",
      "Sent over the contract redlines. Two small changes — OK to proceed?",
      "I owe you an intro to that designer I mentioned. Still interested?",
    ],
  },
  waiting: {
    direction: "out", // your message closed the turn; the ball is in their court
    suggestion: "You asked; nothing to do until they answer.",
    snippets: [
      "Sent the deck over — let me know which direction lands better.",
      "Just shared the doc with you — flag anything that reads wrong.",
      "Offer's in your inbox. Take your time, no rush on my end.",
      "Pinged the venue about the 24th — will confirm as soon as they do.",
      "Draft agenda's with you — add anything before I circulate it.",
      "Sent the revised quote over — your move whenever you're ready.",
    ],
  },
  fyi: {
    direction: "in",
    suggestion: "Informational; no reply expected.",
    snippets: [
      "Heads up: the API version you're on sunsets at the end of the month.",
      "New build is up. The keyboard nav feels dramatically better.",
      "FYI — moved our standup doc to the shared drive, same link structure.",
      "The panel got moved to the main hall, same start time.",
      "Office is closed Monday for the holiday — plan around it.",
      "We renamed the shared channel; you're already in the new one.",
    ],
  },
  done: {
    direction: "in",
    suggestion: "Resolved — nothing left to do.",
    snippets: [
      "Perfect, that answers it — thanks!",
      "All sorted on our end. Appreciate the quick turnaround.",
      "Got it, see you there.",
      "Confirmed for Thursday — thanks again!",
      "Payment received — receipt's in the system.",
    ],
  },
};
const GEN_DRAFT_TEXT =
  "Thanks for the nudge — I looked through it this morning and it's in good shape. Let me confirm one detail on my end and I'll get you a proper answer by tomorrow.";

const GENERATED_PEOPLE: Record<string, Person> = {};
const bucketCounters: Record<string, number> = {};
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
  const spec = GEN_BY_BUCKET[bucket];
  const nth = (bucketCounters[bucket] = (bucketCounters[bucket] ?? 0) + 1);
  const body = spec.snippets[(nth - 1) % spec.snippets.length];
  const minAgo = 25 + i * 47 + (i % 5) * 13; // spread over ~28h, deterministic
  const drafted = bucket === "drafted";
  const outgoing = spec.direction === "out";

  return {
    id: `cg${i}`,
    personId: pid,
    source,
    bucket,
    urgency: bucket === "needs" && i % 9 === 0 ? "high" : i % 4 === 0 ? "low" : "normal",
    unread: bucket === "needs" && i % 3 === 0,
    lastActivity: iso(minAgo),
    threadShared: drafted, // generated drafts came from a thread share (default-on)
    hermesBlocked: false,
    hermesSuggestion: spec.suggestion,
    messages: [
      {
        id: `cg${i}m1`,
        authorId: outgoing ? "me" : pid,
        direction: spec.direction,
        timestamp: iso(minAgo),
        preview: body.length > 64 ? `${body.slice(0, 61)}…` : body,
        body,
      },
    ],
    draft: drafted
      ? {
          status: "generated" as const,
          bodyPolicy: "full_thread" as const,
          modelLocality: "mock" as const,
          activeVersionId: `cg${i}d1`,
          versions: [
            {
              id: `cg${i}d1`,
              createdAt: iso(minAgo - 10),
          from: "full_thread",
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
    action: "hermes.thread_share",
    resource: "c4",
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
