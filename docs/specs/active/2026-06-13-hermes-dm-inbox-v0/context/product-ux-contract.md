# Product UX Contract

## Product stance

Hermes DM Inbox should feel like:

> **A local, keyboard-first DM cockpit where Hermes pre-sorts conversations, drafts replies, and makes every share-to-agent or external action explicit and reversible.**

It is not just a chronological feed. It is a triage and drafting cockpit.

## UX principles

1. **Triage first.** Default home answers “what needs my attention?” not “what arrived newest?”
2. **Keyboard is product, not polish.** Hotkeys and command palette ship in Phase 0.
3. **Hermes is visible but not intrusive.** The agent suggests, drafts, classifies, and explains; the human remains in control.
4. **Hermes presence is visible, sharing chrome is not (v4).** Amber marks where the agent is working; asking for a draft means Hermes reads the thread — no badges, no switches.
5. **Drafts are review objects.** Drafts need versions, status, evidence, and approval state.
6. **Source differences are metadata, not separate apps.** iMessage/LinkedIn/X should feel unified while preserving source capabilities.
7. **Speed over configurability in v0.** Avoid complex rules/settings until the loop is excellent.
8. **Mouse parity, fast path, motion-causality (v7).** Every hotkey action has a visible hover
   affordance; replying never requires a Hermes step (drafting is assistive, not modal); motion exists
   only to explain a state change, and reduced motion kills all of it.

## Primary information architecture

### Surfaces

| Surface | Purpose |
|---|---|
| Inbox/Triage | process conversations by view (Important / Sent / All) |
| Thread | read selected conversation with privacy state |
| Draft panel | ask Hermes, edit/regenerate/approve draft intent |
| Command palette | execute all actions without leaving keyboard |
| Draft queue | review pending generated drafts |
| Search | find people/messages/tasks across sources |
| Audit/share log | inspect share-to-agent and other privacy-sensitive events |
| Settings/connectors | source health, sync, connector setup guidance |

### Core views (v6 — Important is home; supersedes v5's Needs Reply home)

> **DECISION v6 — Elijah, 2026-07-04 (revises v5's home view).** Home is renamed **IMPORTANT** and
> gains two SECTIONS, grouped like Sent's needs-follow-up/awaiting pattern (headers, not toggles):
> **NEEDS REPLY** on top (ball-in-your-court, priority-sorted exactly as v5's home) and **FYI** below
> (collapsible, honest count) — important info to know, no reply expected; `e` **acknowledges** an FYI
> row (it leaves Important, lives on in All; audited `triage.ack`). **The admission gate is
> importance** (Hermes triage, human-correctable): unimportant items of BOTH kinds live only in All.
>
> **Triage policy (spec):** direct questions default INTO Important **regardless of sender** — err
> inclusive on needs-reply; a missed real question costs more than skimming past noise. **FYI errs
> exclusive** — a section you must sweep is only worth sweeping if everything in it matters.
>
> **Reasoning:** v5's Needs Reply answered "whose court is the ball in?" but never "does it matter?" —
> cold outreach ranked beside investor questions, and important context (an intro landing tomorrow, a
> teammate's ship note, a portfolio update) had no home at all. v5's harder call stands: FYI is NOT a
> view — this is the important slice of "know this," surfaced where you already look, drained by `e`.

> **DECISION v5 — Elijah, 2026-07-03 (kept for the trail; home view revised by v6).** The five buckets
> (Needs Reply / Drafted / Waiting / FYI / Done) collapse to **three views**, and the parked
> four-bucket proposal is superseded with them.
>
> **Reasoning:** the bucket model's internal logic — "whose court is the ball in?" — was right, but five
> resting places meant five inboxes to check, and FYI/Done overlapped because "no action" is not a place
> you visit; it's the absence of a place. A **view is a way of looking, not a place things live**.
> **Naming:** a symmetric turn-based pair ("Your turn / Their turn") was considered, but **familiar
> names won** — Needs Reply and Sent are words every inbox user already owns; the one novel move is
> Sent-as-open-threads, not the vocabulary.

- **Important** — home/default; subtitle "What matters now". Two sections behind one importance gate:
  **NEEDS REPLY** (everything waiting on you — reply or act; absorbs the old Needs Reply and Drafted;
  threads with a ready Hermes draft show a draft chip and boost within their priority tier) above
  **FYI** (important info to know, no reply expected — `e` acknowledges; the section header is the
  fold control and its count stays honest while collapsed). Every row carries a **priority slot**
  (red dot high / amber dot medium / empty normal — Hermes-computed urgency, words in the tooltip;
  visible in All too). Each section shows a calm one-line empty state rather than vanishing.
- **Sent** — open threads only by default, grouped: **"Needs follow-up"** (sent, no response, ≥ 3 days
  quiet) on top — `d` there drafts an angle-aware nudge (gentle nudge / direct ask / brief bump) — then
  **"Awaiting"** (fresh). Sent-and-done threads hide behind a subtle **"Show done"** toggle (honest
  count) at the top of the list; `e` on a sent thread marks it done and it leaves the default view.
  Sent = open-threads-on-my-side-of-the-net.
- **All** — everything, newest first. The trust anchor and skim surface; unimportant and acknowledged
  items live only here (and behind Sent's toggle when the last word was yours).

**Default sort orders are spec:** Important's needs-reply section sorts by priority desc → draft-ready
boost within tier → oldest first (a triage queue; old debt surfaces); its FYI section by priority desc
→ newest first (info is not debt — fresh intel first). Sent groups by obligation (needs-follow-up
stalest first, then awaiting fresh). All sorts newest-first. **Sort controls** exist on every view
(⌘K-reachable: default / newest / oldest); an override flattens the grouping in Sent and Important
(the FYI fold only exists while grouped) and is always visibly chipped.

**Filters** (source / person / unread / has-draft) apply on every view, render as a chip bar under the
list header, and are ⌘K-reachable (person picking is a palette sub-page).

**Snoozed is not a view:** a snoozed thread hides from the working views until it returns, with an
honest count in the rail; All still shows it (marked), because All omits nothing.

**Post-send routing:** a send always lands the thread in Sent (open); Hermes only **suggests**
done-vs-open in one quiet strip with the action one tap away ("Mark done" / "Reopen").

Underneath, a thread's status is `needs_reply | sent | done` — local state derived from message
metadata, user corrections, and Hermes suggestions; not source-native folders.

## Main layout

```text
┌────────────────────────────────────────────────────────────────┐
│ top bar: source filter, search, sync status, command palette    │
├───────────────┬──────────────────────────────┬─────────────────┤
│ views         │ conversation list             │ thread + draft  │
│ sources       │ triage state / preview        │ messages        │
│ saved filters │ urgency / draft status        │ Hermes panel    │
└───────────────┴──────────────────────────────┴─────────────────┘
```

Phase 0 can simplify to two columns plus modal command palette:

- left: conversation list
- right: thread + draft panel

## Keyboard contract

> **DECISION v7 — Elijah, 2026-07-04 (the feel pass).** "Still a little hard to use" was the unlabeled
> cockpit and the ceremony, not the model — so keyboard-first gains a standing **mouse-parity rule**:
> every action below also has a visible mouse path. Row hover fades the time into a quiet action
> cluster (done/ack · draft/nudge · snooze; tooltips carry the keys); the thread header carries
> done/snooze; every grouped section header is a fold control with an honest count (FYI's fold
> persists, the rest are session-only; Sent's Done keeps the toggle as its one control); priority
> cycles via `p` and a palette command; keys render as subtle keycaps ON their controls. **Fast path
> first:** clicking the composer (or `c`) is just replying — zero Hermes steps; a ghost "Draft with
> Hermes" button at the composer's right edge (amber wing) makes drafting discoverable from where
> people already are, and yields once you type or a draft exists. The top three jobs — reply,
> follow-up nudge, triage-to-zero — each take ≤2 decisions with zero prior knowledge.
> **Motion-causality:** triaged/sent rows animate out (150ms exit-then-commit — the data flips when
> the row is already gone; instant under reduced motion), counts tick, view switches cross-fade
> (<120ms); nothing moves for decoration. **First-run affordance:** one dismissible hint line under
> the topbar ("Press ? for shortcuts · j/k to move"), localStorage-dismissed — not a tour.

Global:

| Key | Action |
|---|---|
| `Cmd+K` | command palette |
| `?` | shortcut help |
| `/` | search |
| `g i` | Important |
| `g s` | Sent |
| `g a` | All |

Conversation navigation:

| Key | Action |
|---|---|
| `j/k` | move selection |
| `Enter` | open thread |
| `u` | back to list |
| `e` | mark done/archive locally (acknowledges an FYI — leaves Important, stays in All) |
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
| `a` | add picked draft to chat (R20: dedicated key — `e` is mark-done everywhere; one key for two semantically distant actions on hidden draft state was a slip hazard; `e` stays a no-op while a draft is in flight or handed to the composer) |
| `r` | refine: focus the studio chat input |
| `x` | reject draft |

Drafting means Hermes reads the thread (see Privacy/sharing UX) — no share signaling, no opt-out switch (v4).

| Key | Action |
|---|---|
| `1` `2` `3` | pick a draft angle (warm / direct / brief) |
| `Esc` | close modal / sheet / drawer |

## Command palette taxonomy

Command categories:

- Navigate: Important, Sent, All, shortcuts
- Filter: source, unread only, has draft, filter by person (sub-page), sort override, Sent show-done, section folds for the active view (v7), clear filters
- Sync: sync all, sync source, connector health (Phase 1 — no fake commands before real sync)
- Search: global search, source search
- Triage: mark done (acknowledge on FYI), snooze, cycle priority (v7)
- Draft: draft reply/follow-up, add draft to chat, focus composer, send
- Tasks: create follow-up, show tasks, mark complete (Phase 1+)
- Labels: add/remove label, saved filters (Phase 1+)

Rules:

- Every command has a keyboard path.
- Every command has a primitive/CLI equivalent where practical.
- Privacy-sensitive commands require visible confirmation.
- Commands should show scope: selected conversation, thread, source, or global.

## Triage workflow

Human loop:

1. Open Important (home).
2. Move with `j/k` — the needs-reply queue already leads with leverage (drafts, urgency, oldest debt).
3. Use Hermes suggested label/priority.
4. Press `d` to generate draft or `e` to mark done (`a` adds the picked draft to the chat).
5. Press `s` to snooze if no action now (hidden until it returns; counted in the rail).
6. Sweep the FYI section; `e` acknowledges each item once seen (it drains into All).
7. Sweep Sent for "Needs follow-up" threads; `d` there drafts a nudge.
8. Correct Hermes classification when wrong (post-send routing has a one-tap flip; importance and
   priority are human-correctable).

Hermes should compute:

- likely needs reply
- importance (the Important view's admission gate — questions err inclusive, FYI errs exclusive)
- urgency
- relationship/source context
- likely follow-up task
- suggested post-send routing (done vs open)
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
→ iterated(n)          (refined via the studio chat — each instruction = a new version
                        on the navigable stepper; the chat is the instruction record)
→ added_to_chat        (prefilled into the composer)
→ edited               (composer text diverged from the Hermes draft)
→ sent_mock            (sent from the composer — v0 = LOCAL MOCK, no real delivery,
                        presented in the UI as a real send; audited as draft.sent_mock)
→ future: real send path (send_queued / sent) replaces the mock
```

Draft panel requirements (v4 — the drafting studio):

- surface anchoring is responsive (R20, Elijah): persistent side panel at `xl+`;
  below that an overlay with the SAME state/trap/key-matrix whose anchor follows
  the breakpoint — right-anchored drawer `md`–`xl` (horizontal room; the bottom
  sheet is a phone pattern), bottom sheet under `md`
- read-only draft card + navigable version stepper (v1/v2/v3)
- a lightweight chat with Hermes under the card; each Hermes reply = a new version
- the chat is the instruction record (no Instructions/Model/policy meta rows)
- tone chips are quick-inserts into the chat input, not separate controls
- **every control carries intent — no bare Regenerate** (`r` focuses the chat input)
- stores versions
- sending a Hermes-originated draft from the composer records the intent (audit `draft.sent_mock`);
  v0 "send" is a local mock append — no real delivery exists. Per the diegetic-prototype guardrail
  (DESIGN.md §7, Elijah 2026-07-03) the UI presents it as a real send: implementation honesty lives in
  code/commits/PR, never rendered on the surface

Draft controls:

- make warmer
- make shorter
- make more direct
- add context
- remove apology
- preserve my voice
- regenerate from selected messages

## Privacy/sharing UX

> **DECISION v4 — Elijah, 2026-07-03 (supersedes v2's signaling apparatus).** Consent theater collapsed:
> the "Hermes sees this thread" chip, the Block/Allow per-thread switch, the amber row tick, the
> body-policy pill, and "Drafted from" provenance rows are ALL removed. Your agent reading your thread
> when you ask it to draft needs no badge or off-switch. **Amber is reframed as Hermes's PRESENCE color**
> (the mark chip, the drafting studio, the HERMES strip label) — never a "what Hermes sees" signal.
>
> (Still standing: v1 — bodies always fully visible to the user, no reveal machinery; v2's core — drafting
> means Hermes reads the thread, metadata-only until you ask.)

The model in one line: **metadata-only until you ask for a draft; asking means Hermes reads the thread.**

| State | Meaning | Visual treatment |
|---|---|---|
| Resting (default) | bodies visible to you; Hermes has metadata only | no chrome |
| Drafting | Hermes reads the thread to draft (the point of asking) | no privacy chrome; amber presence on Hermes surfaces only |

Rules:

- Hermes drafts from **metadata only** until you ask for a draft; the ask means Hermes reads the thread
  (audited as `draft.request`).
- The agent still cannot grant itself body access: thread reads happen only as a consequence of the
  human's draft request.

### Bucket semantics (Elijah addendum, 2026-07-03) — SUPERSEDED by v5

> **Superseded the same day** by DECISION v5 (see "Core views" above): the structural question this
> section left open (FYI vs Done overlap) was resolved by deleting both as places — three views now
> stand (Needs Reply / Sent / All), and the four-bucket proposal below was never implemented.

Kept for the decision trail: Elijah flagged that Needs Reply / Waiting / FYI read as overlapping. The
internal model was crisp — the buckets answer **"whose court is the ball in?"** — but the names didn't
carry it. The interim resolution (renames + one-line `desc` under the list header + bucket-coherent
fixture pools) shipped, and its parts survive in v5: the descriptions, the coherent per-status fixture
pools, and the whose-court model itself — now expressed as two symmetric views instead of five buckets.

## Search UX

Default search should be safe/redacted:

- searches metadata, participants/aliases, labels, redacted previews, task text
- body search requires explicit body-search design later
- results show source, participant, date, status (whose turn), redacted preview

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
- view model (Important / Sent / All) + sort orders + the importance gate
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

1. see a fast inbox list (three views: Important / Sent / All; Important = needs-reply + FYI sections)
2. navigate with keyboard
3. open a thread and read every message body
4. see threads carry zero privacy chrome (v4 — the boundary is architectural)
5. ask mock Hermes to draft — the ask means Hermes reads the thread (v2/v4)
6. refine the draft in the studio chat, add it to the composer, send (v3/v4)
7. see the post-send routing suggestion and flip it in one tap (v5)
8. inspect audit events
9. run matching `hdi` commands
10. do all of it mouse-only OR keyboard-only (v7): the three jobs — reply, follow-up nudge,
    triage-to-zero — complete either way with zero prior knowledge; rows animate out on triage/send
    and counts tick (none of it under reduced motion); a first-run hint line shows until dismissed

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
