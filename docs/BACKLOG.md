# Backlog

Deferred items, with provenance. Phase 0 = mock UI slice; Phase 1 = first real backend/sync work.

## Deferred from the 2026-07-04 PR #1 code review (report: docs/reviews/2026-07-04-214005-pr1-web-slice.md)

Fix batch R1 took H1-H3, M1-M7, and the cheap Lows; these were explicitly deferred:

- **M8 — extract the mock-Hermes brain to `lib/mock-hermes.ts`.** ~150 lines of pure logic
  (suggestPostSend precedence, angle sets, applyInstruction's shorten-guard) untestable inside the
  store hook. Deferred because it's refactor-only and lands best TOGETHER with the vitest seam below.
- **L9 — CommandPalette wrapper split** (mount the body only while open). Perf-only at 48 fixtures;
  the ~40-command rebuild per keystroke matters when real data lands, not before.
- **L17 — render the audit trail.** pushAudit is annotated write-only-by-design in code; the surface
  (per the ux-contract) is Phase-1 work alongside real share events worth inspecting.
- **L18 — future-facing perf + CSP.** Row-exit via transform/FLIP at scale, epoch-ms sort keys,
  audit-log cap, "don't use store getters in selectors" note, CSP meta + theme-script hash. All only
  bite with real data volumes / real deployment posture — batched for the Phase-1 hardening pass.
- **vitest seam.** Zero-config under Vite 6; first targets: deriveVisible + predicates (the whole view
  contract, fixed clock), then mock-hermes once extracted (M8), then store transitions with a
  matchMedia stub. Deferred so tests land against the post-M8 module layout, not before it.
- **M3 residual (R2): keyboard archive on draft-active threads — RESOLVED by R20's e/a split**
  (Elijah's call, 2026-07-06: "add to chat and mark as done are both e, that can be dangerous").
  `e` = mark done everywhere; `a` = add draft to chat. `e` now archives STANDING-card threads
  (generated/iterated — versions survive markDone, nothing lost), which was the missing keyboard
  path; the M3 no-op stays for in-flight/handoff states (requested/angles_ready/added_to_chat/
  edited) where a slip would destroy composer-carried work. The `shift+E` question is closed —
  no extra binding needed.

## Polish — from the v7 feel pass (2026-07-04, non-blocking)

- **Touch affordance for row actions.** The v7 hover cluster is hover-only; on touch devices the
  triage mouse-path is tap row → thread-header done/snooze buttons. Fine for the desktop-first
  slice; revisit (swipe actions?) if a real touch audience appears.
- **Send-from-Important commits its data flip at 150ms** (exit-then-commit) — the composer clears
  instantly but the appended bubble lands with the row's exit. Imperceptible in practice;
  documented so nobody "fixes" the delay without knowing why it exists (DESIGN §6 v7).
- **Priority's mouse path is ⌘K only** (Cycle priority command). The row dot is too small to be a
  click target and an empty slot can't be one; acceptable — priority correction is a rare act.

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
- **Nit — no keyboard path to archive a drafted thread — RESOLVED by R20's e/a split** (see the
  M3-residual entry above): `e` now archives standing-card threads directly; in-flight/handoff
  states keep the slip guard. No `shift+E` needed.
- **Nit — connector settings surface** (contract): source health/last-sync/capabilities screen —
  not started in the slice.
- **Nit — audit/share log surface**: audit events are recorded in the store but there is no UI to
  inspect them yet. NOTE (review L15): `g a` is now bound to the All view (v6) — the audit surface
  needs a different affordance when it lands (palette command or a new chord), not `g a`.

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
