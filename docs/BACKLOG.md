# Backlog

Deferred items, with provenance. Phase 0 = mock UI slice; Phase 1 = first real backend/sync work.

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
- **N6 — `d` row-teleport feedback.** Drafting from Needs Reply moves the conversation to Drafted;
  in the list the row silently vanishes from the current bucket. Add a transient cue (row exit
  animation, toast, or bucket-count pulse) so the move is legible.
- **N7 — Ultra-wide app frame.** Message measure is capped (68ch / 720px column), but the app shell
  itself stretches edge-to-edge at 2560+. Consider a max-width frame or a third meta column.
- **Nit — `r` keybinding conflict with the keyboard contract.** The ux-contract assigns `r` to
  sync/refresh globally and regenerate when draft-focused; the slice binds `r` only to regenerate.
  The phantom "Sync all sources" palette command was deleted (honesty guardrail). When real mock
  sync lands, implement it and resolve the `r` scoping (contextual binding or a new key).
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
- **Bucket taxonomy decision (awaiting Elijah).** Five buckets stand; the ux-contract records a
  four-bucket proposal (merge FYI+Done into "No action") if the FYI/Done overlap keeps biting.

## Phase 0 leftovers (pre-review)

- Draft panel below `lg` is a bottom sheet (shipped); evaluate whether a persistent mini-bar beats
  the sheet once real usage data exists.
- Search (`/`) currently opens the palette; real search is unbuilt.
