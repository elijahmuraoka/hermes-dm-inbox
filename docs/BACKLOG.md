# Backlog

Deferred items, with provenance. Phase 0 = mock UI slice; Phase 1 = first real backend/sync work.

## Polish — from Elijah's v6 pressure-test (2026-07-04, non-blocking)

F1 (title count vs rail disagreement while FYI folded) was fixed pre-ship; the rest were accepted
as polish so they aren't lost:

- **F2 — rail counts don't blank at `?state=error`.** The list header shows an honest "—" when a
  sync error means counts can't be vouched for, but the rail still renders numbers. Same rule
  should apply to ViewNav. (Parked: the state is dev-gated.)
- ~~**F3 — unread dot ignores the source filter.**~~ **Fixed 2026-07-04:** `unread()` now applies
  the same source lens as `count()`.
- ~~**F4 — fixture triage-voice credibility.**~~ **Fixed 2026-07-04:** generator urgency is
  hand-assigned per body (deadlines/blockers high·medium, congrats/curiosity normal), with
  triage-voice suggestion overrides on the high items; the mechanical `i % 9` assignment is gone.
- ~~**F5 — FYI collapse not persisted.**~~ **Fixed 2026-07-04:** the fold persists via
  localStorage (`hdi.fyi-collapsed`); storage-unavailable degrades to session-only.
- **F6 — (documented in DESIGN.md §5.2) both-sections-empty renders ONE view-level empty state**
  rather than two per-section empties — accepted as better than the literal per-section spec.
- **F7 — mobile post-send stays on the thread** rather than returning to the list. Reasonable
  divergence (the routing strip needs to be seen); documented as intended.

## Phase 1 — carried from the 2026-07-03 adversarial UI review

Findings N1–N3 were fixed in Phase 0 (approve guard, mutation→sheet feedback class fix, phantom
sync removed). The following were accepted as Phase 1 work so they aren't lost:

- **N4 — Draft provenance per-version.** Each draft version should record the body policy it was
  generated under and which message IDs were in Hermes' context at generation time. Today the
  panel's policy pill is live-derived (honest about *now*) but versions don't carry their own
  provenance, so an old metadata-only draft is indistinguishable from a full-body one after a share.
- **N5 — `z` undo should follow temporal share order.** `unshareLast` currently unshares the last
  shared *incoming message by position*, not the most *recently shared* body. Track share
  timestamps (or an order counter) for true LIFO undo.
- **N6 — `d` row-teleport feedback.** ~~Drafting from Needs Reply moves the conversation to Drafted;
  the row silently vanishes.~~ **Mostly resolved by v5 (2026-07-03):** the Drafted bucket is gone;
  picking an angle keeps the thread in Needs Reply and re-sorts it to the top with a Draft chip — the
  move is now visible within one list. Residual nit: the re-sort jump itself has no transition cue.
- **N7 — Ultra-wide app frame.** Message measure is capped (68ch / 720px column), but the app shell
  itself stretches edge-to-edge at 2560+. Consider a max-width frame or a third meta column.
- **Nit — `r` keybinding conflict with the keyboard contract.** The ux-contract assigns `r` to
  sync/refresh globally and regenerate when draft-focused; the slice binds `r` only to regenerate.
  The phantom "Sync all sources" palette command was deleted (honesty guardrail). When real mock
  sync lands, implement it and resolve the `r` scoping (contextual binding or a new key).
- **Nit — no keyboard path to archive a drafted thread** (spot-check note, 2026-07-03). On a
  drafted thread `e` = add-to-chat wins over archive — correct priority, but the only way to mark
  a drafted thread done is the palette/mouse. Add a dedicated key (e.g. `shift+E`) for
  archive-regardless-of-draft.
- **Nit — connector settings surface** (contract): source health/last-sync/capabilities screen —
  not started in the slice.
- **Nit — audit/share log surface** (`g a`): audit events are recorded in the store but there is no
  UI to inspect them yet; `g a` currently opens the shortcut sheet as a stand-in.

## Phase 1 — from Elijah's deploy review (2026-07-03)

- **Email connector via `gog`.** Bring Gmail into the inbox. Needs a real modeling pass first:
  subject lines, cc/bcc participants, and email threading (References/In-Reply-To) don't map 1:1
  onto the DM conversation model — decide whether email threads are conversations, how subject
  changes split threads, and how cc/bcc render in the ledger row.
- **Group DMs / group chats.** Current model is strictly 1:1 (one person per conversation).
  Group modeling touches participants, avatars/initials, "needs reply" semantics (who was
  addressed?), and triage suggestions.
- **Chat-iteration on drafts + send-in-place.** After picking an angle: iterate on the draft in a
  chat exchange with Hermes (with thread context), and send directly from the panel. Send requires
  the full send-path spec (single-use approval, expiry, edit-invalidates) — deliberately absent
  from v0, where approve records intent only.
- **Bucket taxonomy decision.** ~~Awaiting Elijah; five buckets stand.~~ **DECIDED — v5, 2026-07-03:**
  three views (Needs Reply / Sent / All); FYI, Done, and the four-bucket proposal are all
  superseded. See DESIGN.md §3 DECISION v5 and the ux-contract's views section.

## Phase 0 leftovers (pre-review)

- Draft panel below `lg` is a bottom sheet (shipped); evaluate whether a persistent mini-bar beats
  the sheet once real usage data exists.
- Search (`/`) currently opens the palette; real search is unbuilt.
