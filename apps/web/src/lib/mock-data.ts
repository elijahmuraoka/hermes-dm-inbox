// SYNTHETIC fixtures only (public-repo safety invariant #9). No real people,
// handles, or message content. Fixed clock so relative times are deterministic.
// Volume matters: the §4 density rhythm only reads with a realistically full
// inbox, so hand-written conversations are extended by a deterministic generator.
import type {
  AuditEvent,
  Conversation,
  DraftAngleTone,
  Person,
  SourceId,
  ThreadStatus,
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
  p1: P("p1", "Dana Okonkwo", "@danaokonkwo"),
  p2: P("p2", "Priya Raman", "in/priya-raman"),
  p3: P("p3", "Marco Feld", "@marcofeld"),
  p4: P("p4", "Wei Chen", "in/wei-chen"),
  p5: P("p5", "Sam Ellison", "@sam.ellison"),
  p6: P("p6", "Nadia Farouk", "@nadiafarouk"),
  p7: P("p7", "Tom Byrne", "in/tom-byrne"),
  p8: P("p8", "Aiko Sato", "@aiko.sato"),
  p9: P("p9", "Luis Ortega", "@luisortega"),
};

const iso = (minAgo: number) => new Date(MOCK_NOW - minAgo * 60000).toISOString();

const BASE_CONVERSATIONS: Conversation[] = [
  {
    id: "c1",
    personId: "p1",
    source: "imessage",
    status: "needs_reply",
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
      modelLocality: "mock",
      versions: [],
    },
  },
  {
    id: "c2",
    personId: "p2",
    source: "linkedin",
    status: "needs_reply",
    urgency: "medium",
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
      },
    ],
    draft: {
      status: "not_started",
      modelLocality: "mock",
      versions: [],
    },
  },
  {
    id: "c3",
    personId: "p3",
    source: "x",
    status: "needs_reply",
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
      },
    ],
    draft: {
      status: "not_started",
      modelLocality: "mock",
      versions: [],
    },
  },
  {
    id: "c4",
    personId: "p4",
    source: "linkedin",
    status: "needs_reply",
    urgency: "medium",
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
      },
    ],
    draft: {
      status: "generated",
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
    status: "needs_reply",
    urgency: "normal",
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
      },
    ],
    draft: {
      status: "iterated",
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
          instructions: "Make it a touch more personal.",
          text: "That's fantastic — genuinely not surprised, you were the obvious pick. Go take the final round. Rooting for you.",
        },
      ],
      chat: [
        { id: "c5ch1", role: "user", text: "Make it a touch more personal." },
        { id: "c5ch2", role: "hermes", text: "Here's a more personal take.", versionId: "c5d2" },
      ],
    },
  },
  {
    id: "c6",
    personId: "p6",
    source: "x",
    status: "sent",
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
      },
    ],
    draft: {
      status: "not_started",
      modelLocality: "mock",
      versions: [],
    },
  },
  {
    id: "c7",
    personId: "p7",
    source: "linkedin",
    status: "sent",
    urgency: "medium",
    unread: false,
    lastActivity: iso(4600),
    hermesSuggestion: "You acknowledged three days ago and the one-pager never came — a nudge would be fair.",
    messages: [
      {
        id: "c7m1",
        authorId: "p7",
        direction: "in",
        timestamp: iso(4650),
        preview: "Will send the one-pager over by end of week.",
        body: "Will send the one-pager over by end of week — thanks for your patience on this.",
      },
      {
        id: "c7m2",
        authorId: "me",
        direction: "out",
        timestamp: iso(4600),
        preview: "Sounds good — looking forward to it.",
        body: "Sounds good — looking forward to it.",
      },
    ],
    draft: {
      status: "not_started",
      modelLocality: "mock",
      versions: [],
    },
  },
  {
    id: "c8",
    personId: "p8",
    source: "imessage",
    status: "done",
    urgency: "normal",
    unread: true,
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
      },
    ],
    draft: {
      status: "not_started",
      modelLocality: "mock",
      versions: [],
    },
  },
  {
    id: "c9",
    personId: "p9",
    source: "x",
    status: "done",
    urgency: "normal",
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
      },
    ],
    draft: {
      status: "not_started",
      modelLocality: "mock",
      versions: [],
    },
  },
  {
    id: "c10",
    personId: "p3",
    source: "imessage",
    status: "done",
    urgency: "normal",
    unread: false,
    lastActivity: iso(4300),
    hermesSuggestion: "Resolved — you confirmed the details.",
    routedAfterSend: "done",
    messages: [
      {
        id: "c10m1",
        authorId: "me",
        direction: "out",
        timestamp: iso(4300),
        preview: "Perfect, see you then.",
        body: "Perfect, see you then.",
        mockSent: true,
      },
    ],
    draft: {
      status: "sent_mock",
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
// Weighted so Needs Reply reads as the workhorse view (v5); withDraft items get
// a ready Hermes draft, which chips + boosts them within their priority tier.
const GEN_SPECS: { status: ThreadStatus; withDraft?: boolean }[] = [
  { status: "needs_reply" },
  { status: "needs_reply" },
  { status: "needs_reply", withDraft: true },
  { status: "sent" },
  { status: "needs_reply" },
  { status: "done" },
  { status: "done" },
  { status: "needs_reply" },
  { status: "sent" },
  { status: "done" },
];

// Status-coherent content (v5): every snippet belongs to exactly ONE status's
// semantics — a fixture must never plausibly straddle two.
//   needs_reply = a direct question TO you (incoming; your court)
//   sent        = YOUR last message asked for something (outgoing; open thread)
//   done      = nobody's court — broadcast info or a closed confirmation
// Needs-reply snippets carry their own THREAD-AWARE reply trios (warm =
// relational open + soft commit · direct = answer first · brief = shortest
// honest reply); sent snippets carry FOLLOW-UP trios (gentle nudge /
// direct ask / brief bump) — drafting on a sent thread means chasing, not
// answering, and reply-shaped copy there would read as broken.
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

// Follow-up trios for sent threads: chase without burning goodwill.
//   gentle nudge = warm bump, zero pressure · direct ask = deadline or
//   decision requested · brief bump = the shortest honest poke.
const SENT_ITEMS: { body: string; nudges: AngleSet }[] = [
  {
    body: "Sent the deck over — let me know which direction lands better.",
    nudges: {
      warm: "Hey — no rush at all, just keeping this on your radar. Curious which of the two directions felt stronger when you had a look.",
      direct: "Did either deck direction land for you? I'd like to lock one in this week.",
      brief: "Any read on the two directions yet?",
    },
  },
  {
    body: "Just shared the doc with you — flag anything that reads wrong.",
    nudges: {
      warm: "Morning! Whenever you get a minute, a quick pass on that doc would be a big help — even a thumbs-up works.",
      direct: "Have you had a chance to read the doc? I need your flags before I ship it.",
      brief: "Doc still on your list?",
    },
  },
  {
    body: "Offer's in your inbox. Take your time, no rush on my end.",
    nudges: {
      warm: "Just checking the offer landed OK — happy to walk through any part of it whenever suits you.",
      direct: "Any questions on the offer? I'd love a yes or no by Friday so I can plan either way.",
      brief: "Any thoughts on the offer?",
    },
  },
  {
    body: "Pinged the venue about the 24th — will confirm as soon as they do.",
    nudges: {
      warm: "Following up on the 24th — any word from your side? We're starting to plan around it.",
      direct: "Need the 24th confirmed today — can you get me a yes or no?",
      brief: "Any word on the 24th?",
    },
  },
  {
    body: "Draft agenda's with you — add anything before I circulate it.",
    nudges: {
      warm: "Circulating the agenda tomorrow morning — want to sneak anything in before it goes out?",
      direct: "Last call on the agenda — it goes out tomorrow morning as-is unless you add to it.",
      brief: "Agenda goes out tomorrow — anything to add?",
    },
  },
  {
    body: "Sent the revised quote over — your move whenever you're ready.",
    nudges: {
      warm: "Hope the revised quote made sense — happy to hop on a quick call if any line item needs unpacking.",
      direct: "Where did we land on the revised quote? If the number works, I can start next week.",
      brief: "Any verdict on the quote?",
    },
  },
];

export const ANGLES_BY_BODY = new Map(NEEDS_ITEMS.map((i) => [i.body, i.angles]));
export const NUDGES_BY_BODY = new Map(SENT_ITEMS.map((i) => [i.body, i.nudges]));

// Incoming threads that arrive with a ready draft (chips in Needs Reply).
const DRAFTED_SNIPPETS = [
  "Following up on my last note — any thoughts on the proposal?",
  "Sent over the contract redlines. Two small changes — OK to proceed?",
  "I owe you an intro to that designer I mentioned. Still interested?",
];

// "done" = nobody's court: broadcast info + closed confirmations, merged (v5 —
// FYI and Done are not views; these rows live only in All).
const DONE_ITEMS: { body: string; suggestion: string }[] = [
  { body: "Heads up: the API version you're on sunsets at the end of the month.", suggestion: "Informational; no reply expected." },
  { body: "New build is up. The keyboard nav feels dramatically better.", suggestion: "Informational; no reply expected." },
  { body: "FYI — moved our standup doc to the shared drive, same link structure.", suggestion: "Informational; no reply expected." },
  { body: "Perfect, that answers it — thanks!", suggestion: "Resolved — nothing left to do." },
  { body: "The panel got moved to the main hall, same start time.", suggestion: "Informational; no reply expected." },
  { body: "All sorted on our end. Appreciate the quick turnaround.", suggestion: "Resolved — nothing left to do." },
  { body: "Office is closed Monday for the holiday — plan around it.", suggestion: "Informational; no reply expected." },
  { body: "Got it, see you there.", suggestion: "Resolved — nothing left to do." },
  { body: "We renamed the shared channel; you're already in the new one.", suggestion: "Informational; no reply expected." },
  { body: "Confirmed for Thursday — thanks again!", suggestion: "Resolved — nothing left to do." },
  { body: "Payment received — receipt's in the system.", suggestion: "Resolved — nothing left to do." },
];

const GEN_DRAFT_TEXT =
  "Thanks for the nudge — I looked through it this morning and it's in good shape. Let me confirm one detail on my end and I'll get you a proper answer by tomorrow.";

const GENERATED_PEOPLE: Record<string, Person> = {};
const statusCounters: Record<string, number> = {};
const GENERATED: Conversation[] = Array.from({ length: 35 }, (_, i) => {
  const first = GEN_FIRST[i % GEN_FIRST.length];
  const last = GEN_LAST[(i * 7 + 3) % GEN_LAST.length];
  const name = `${first} ${last}`;
  const pid = `pg${i}`;
  const source = GEN_SOURCES[i % 3];
  const handle =
    source === "linkedin"
      ? `in/${first.toLowerCase()}-${last.toLowerCase()}`
      : `@${first.toLowerCase()}${last.toLowerCase()}`;
  GENERATED_PEOPLE[pid] = P(pid, name, handle);

  const spec = GEN_SPECS[i % GEN_SPECS.length];
  const { status } = spec;
  const counterKey = spec.withDraft ? "needs_reply_drafted" : status;
  const nth = (statusCounters[counterKey] = (statusCounters[counterKey] ?? 0) + 1);

  let body: string;
  let suggestion: string;
  let direction: "in" | "out" = "in";
  if (status === "sent") {
    body = SENT_ITEMS[(nth - 1) % SENT_ITEMS.length].body;
    suggestion = "You asked; nothing to do until they answer.";
    direction = "out"; // your message closed the turn; the thread is open on your side
  } else if (status === "done") {
    const item = DONE_ITEMS[(nth - 1) % DONE_ITEMS.length];
    body = item.body;
    suggestion = item.suggestion;
  } else if (spec.withDraft) {
    body = DRAFTED_SNIPPETS[(nth - 1) % DRAFTED_SNIPPETS.length];
    suggestion = "Draft ready for your review.";
  } else {
    body = NEEDS_ITEMS[(nth - 1) % NEEDS_ITEMS.length].body;
    suggestion = "Open question in the last message; a short reply keeps it moving.";
  }

  // Sent threads spread over ~9 days so staleness (>= 3d) actually shows;
  // everything else stays inside the last ~28h for a lively home view.
  const minAgo =
    status === "sent" ? 1400 + (nth - 1) * 1900 : 25 + i * 47 + (i % 5) * 13;

  return {
    id: `cg${i}`,
    personId: pid,
    source,
    status,
    urgency:
      status === "needs_reply" && i % 9 === 0
        ? "high"
        : status === "needs_reply" && i % 4 === 0
          ? "medium"
          : "normal",
    unread: (status === "needs_reply" && i % 3 === 0) || (status === "done" && i % 7 === 0),
    lastActivity: iso(minAgo),
    hermesSuggestion: suggestion,
    messages: [
      {
        id: `cg${i}m1`,
        authorId: direction === "out" ? "me" : pid,
        direction,
        timestamp: iso(minAgo),
        preview: body.length > 64 ? `${body.slice(0, 61)}…` : body,
        body,
      },
    ],
    draft: spec.withDraft
      ? {
          status: "generated" as const,
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
          modelLocality: "mock" as const,
          versions: [],
        },
  };
});

Object.assign(PEOPLE, GENERATED_PEOPLE);
export const CONVERSATIONS: Conversation[] = [...BASE_CONVERSATIONS, ...GENERATED];

export const AUDIT_EVENTS: AuditEvent[] = [
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
