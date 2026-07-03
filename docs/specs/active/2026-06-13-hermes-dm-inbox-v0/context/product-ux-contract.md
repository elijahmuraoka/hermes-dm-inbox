# Product UX Contract

## Product stance

Hermes DM Inbox should feel like:

> **A local, keyboard-first DM cockpit where Hermes pre-sorts conversations, drafts replies, and makes every share-to-agent or external action explicit and reversible.**

It is not just a chronological feed. It is a triage and drafting cockpit.

## UX principles

1. **Triage first.** Default home answers “what needs my attention?” not “what arrived newest?”
2. **Keyboard is product, not polish.** Hotkeys and command palette ship in Phase 0.
3. **Hermes is visible but not intrusive.** The agent suggests, drafts, classifies, and explains; the human remains in control.
4. **Sharing state is always visible.** Bodies are always readable by you; *not-shared* (default, quiet) vs *shared-with-Hermes* must feel different.
5. **Drafts are review objects.** Drafts need versions, status, evidence, and approval state.
6. **Source differences are metadata, not separate apps.** iMessage/LinkedIn/X should feel unified while preserving source capabilities.
7. **Speed over configurability in v0.** Avoid complex rules/settings until the loop is excellent.

## Primary information architecture

### Surfaces

| Surface | Purpose |
|---|---|
| Inbox/Triage | process conversations by priority/action bucket |
| Thread | read selected conversation with privacy state |
| Draft panel | ask Hermes, edit/regenerate/approve draft intent |
| Command palette | execute all actions without leaving keyboard |
| Draft queue | review pending generated drafts |
| Search | find people/messages/tasks across sources |
| Audit/share log | inspect share-to-agent and other privacy-sensitive events |
| Settings/connectors | source health, sync, connector setup guidance |

### Core buckets

Default buckets:

- Needs Reply
- Drafted
- Waiting
- FYI
- Done

These are local states derived from message metadata, user corrections, and Hermes suggestions. They are not the same as source-native folders.

## Main layout

```text
┌────────────────────────────────────────────────────────────────┐
│ top bar: source filter, search, sync status, command palette    │
├───────────────┬──────────────────────────────┬─────────────────┤
│ buckets       │ conversation list             │ thread + draft  │
│ sources       │ triage state / preview        │ messages        │
│ saved filters │ urgency / draft status        │ Hermes panel    │
└───────────────┴──────────────────────────────┴─────────────────┘
```

Phase 0 can simplify to two columns plus modal command palette:

- left: conversation list
- right: thread + draft panel

## Keyboard contract

Global:

| Key | Action |
|---|---|
| `Cmd+K` | command palette |
| `?` | shortcut help |
| `/` | search |
| `g i` | inbox |
| `g d` | drafts |
| `g a` | audit/share log |
| `r` | sync/refresh |

Conversation navigation:

| Key | Action |
|---|---|
| `j/k` | move selection |
| `Enter` | open thread |
| `u` | back to list |
| `e` | mark done/archive locally |
| `s` | snooze/later |
| `l` | label |
| `p` | priority toggle |

Hermes/draft:

| Key | Action |
|---|---|
| `d` | draft reply |
| `c` | focus composer (reply) |
| `Cmd+Enter` | send from composer (v0: local mock) |
| `Shift+D` | draft with custom instructions |
| `t` | triage selected/thread |
| `m` | summarize thread |
| `e` | add picked draft to chat (contextual; otherwise mark done) |
| `r` | regenerate draft when draft focused |
| `x` | reject draft |

Sharing is thread-level and default-on for drafting (see Privacy/sharing UX) — `d` is the share; the
per-thread Block/Allow opt-out lives in the thread strip and palette.

| Key | Action |
|---|---|
| `1` `2` `3` | pick a draft angle (warm / direct / brief) |
| `Esc` | close modal / sheet / drawer |

## Command palette taxonomy

Command categories:

- Navigate: inbox, drafts, audit, settings
- Sync: sync all, sync source, connector health
- Search: global search, source search, person search
- Triage: classify unread, mark done, waiting, FYI, noise
- Draft: draft reply, regenerate, change tone, shorten, approve intent
- Privacy: share with Hermes, unshare, view audit log
- Tasks: create follow-up, show tasks, mark complete
- Labels: add/remove label, saved filters

Rules:

- Every command has a keyboard path.
- Every command has a primitive/CLI equivalent where practical.
- Privacy-sensitive commands require visible confirmation.
- Commands should show scope: selected conversation, thread, source, or global.

## Triage workflow

Human loop:

1. Open Needs Reply.
2. Move with `j/k`.
3. Use Hermes suggested label/priority.
4. Press `d` to generate draft or `e` to mark done.
5. Press `s` to snooze if no action now.
6. Correct Hermes classification when wrong.

Hermes should compute:

- likely needs reply
- urgency
- relationship/source context
- likely follow-up task
- suggested bucket
- suggested draft availability

Hermes should not:

- auto-send
- auto-share raw bodies
- auto-delete/archive source messages in v0

## Draft workflow

Draft lifecycle (v3, composer-first — Elijah 2026-07-03: drafts are PREFILLS; the composer is the ONE
editing surface; the approve-intent ceremony is retired — sending is the intent gesture):

```text
not_started
→ requested            (thread shared with Hermes here, unless blocked)
→ angles_ready         (three candidates: warm/direct/brief; pick with 1/2/3)
→ generated            (picked; read-only card, "Add to chat" is the primary action)
→ added_to_chat        (prefilled into the composer)
→ edited               (composer text diverged from the Hermes draft)
→ sent_mock            (sent from the composer — v0 = LOCAL MOCK, no real delivery;
                        audited as draft.sent_mock, the intent record)
→ future: real send path (send_queued / sent) replaces the mock
```

Draft panel requirements:

- shows instructions used
- shows body policy used: metadata/full-body
- shows model/locality: mock/local/cloud if applicable
- supports regenerate with reason
- supports tone/length controls
- stores versions
- sending a Hermes-originated draft from the composer records the intent (audit `draft.sent_mock`);
  v0 "send" is a local mock append, honestly labeled — no real delivery exists

Draft controls:

- make warmer
- make shorter
- make more direct
- add context
- remove apology
- preserve my voice
- regenerate from selected messages

## Privacy/sharing UX

> **DECISION v2 — Elijah, 2026-07-03 (supersedes per-message sharing).** Sharing is **thread-level and
> default-on for drafting**: pressing `d` means Hermes reads the full thread — that is the point of asking
> it to draft. Per-message share links and the `⇧V`/`z` machinery are removed.
>
> (v1, same day, still holds: this is a single-user local app — bodies are **always fully visible to the
> user**; no blur, no reveal step, no human-view audit events.)

The model in one line: **metadata-only until you ask for a draft; asking = the thread is shared.**

| State | Meaning | Visual treatment |
|---|---|---|
| Unshared (default) | bodies visible to you; Hermes has metadata only | **no chrome at all** |
| Shared thread | thread bodies are in Hermes' context (a draft was requested) | amber "Hermes sees this thread" chip + amber row tick (+ audit) |
| Blocked (opt-out) | per-thread toggle: Hermes stays metadata-only even for drafts | quiet "Hermes blocked" chip + Allow toggle |

Rules:

- Hermes drafts from **metadata only** until you ask for a draft; the ask shares the full thread (audited
  once, as `hermes.thread_share`).
- The per-thread **opt-out is reversible** (Block/Allow, both audited). Blocking pins future drafts to
  metadata-only; it does not un-happen a past share (the amber state remains as historical fact).
- The draft panel's body-policy pill is **live**: "Full thread" by default, "Metadata only" when blocked.
- The agent still cannot grant itself body access: the share happens only as a consequence of the human's
  draft request, and the opt-out is human-only.

### Bucket semantics (Elijah addendum, 2026-07-03)

Elijah flagged that Needs Reply / Waiting / FYI read as overlapping. The internal model is crisp — the
buckets answer **"whose court is the ball in?"** — but the names didn't carry it. Resolution:

1. **Renames + visible semantics:** "Waiting" → **"Waiting on them"**; every bucket shows a one-line
   description under the list header (Needs Reply = "The ball is in your court"; Waiting on them = "You
   acted; the ball is in their court"; FYI = "No reply expected — read and move on"; Done = "Handled").
2. **Fixture audit:** mock triage content is bucket-coherent by construction — the generator assigns
   snippets from per-bucket pools (needs = direct question to you, incoming; waiting = your outgoing ask;
   fyi = pure broadcast, nothing owed; done = closed confirmation), so no fixture plausibly straddles two.
3. **Structural question (open, for Elijah):** the residual overlap is **FYI vs Done** — both are "no
   action". FYI is really a *triage suggestion* ("no reply expected"), not a resting place; after reading,
   an FYI is effectively Done. Proposal if simplification is wanted: **four buckets** — Needs Reply /
   Drafted / Waiting on them / **No action** (FYI+Done merged; unread dots surface the new-but-ignorable
   items). Not implemented — five buckets stand until Elijah picks.

## Search UX

Default search should be safe/redacted:

- searches metadata, participants/aliases, labels, redacted previews, task text
- body search requires explicit body-search design later
- results show source, participant, date, bucket, redacted preview

Possible later modes:

- body search after local-only encrypted/FTS design
- semantic search over locally approved text
- relationship memory search

## Connector UX

Connector settings should show:

- source name
- connected/available/missing tool state
- last sync
- last error
- capabilities: read, write disabled, attachments, pagination
- setup hint

Do not make connector setup block Phase 0. Mock source should work out of the box.

## What to design before implementation

Must define now:

- main layout
- hotkeys
- command palette categories
- bucket model
- share-to-Hermes language
- draft lifecycle
- loading/empty/error states
- performance expectations

Can defer:

- visual theme depth
- animations
- mobile layout
- saved filter customization
- advanced rules
- team collaboration

## Phase 0 UI promise

A public user can run the app with mock data and:

1. see a fast inbox list
2. navigate with keyboard
3. open a thread and read every message body
4. see the default (not-shared) state carry no privacy chrome
5. explicitly share a mock body with Hermes (and unshare it)
6. ask mock Hermes to draft
7. approve draft intent
8. inspect audit events
9. run matching `hdi` commands

## What not to over-design

Do not over-design:

- Gmail-specific email workflows
- sending UI
- multi-account/team collaboration
- complex automation/rules engine
- native desktop app chrome
- CRM graph
- plugin marketplace
- background daemon UI

## Product risks

1. If the UI is chronological-feed-first, it will feel like a worse Messages app.
2. If Hermes is hidden, the product loses its unique value.
3. If Hermes is too autonomous, privacy trust breaks.
4. If the shared-with-Hermes state is subtle, users will not understand what the agent saw.
5. If draft approvals are not durable records, future send path will be unsafe.
6. If connector quirks dominate the UI, it stops feeling unified.

## Recommended design direction

Aesthetic: crisp, dense, power-user, low-latency, calm. More Superhuman command center than chatbot. Hermes should feel like a drafting/triage co-pilot embedded in the workflow, not a generic chat sidebar.

Implementation should optimize:

- 60fps list navigation for mock/large data
- command palette under 100ms perceived open time
- no layout shift while drafting/loading
- clear privacy badges
- fast keyboard recovery from every modal
