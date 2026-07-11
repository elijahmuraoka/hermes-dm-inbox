# Hermes DM Inbox

Local-first, keyboard-first unified DM inbox for Hermes Agent.

This repository is intentionally kept clean on `main`. Specs, features, and implementation work happen in git worktrees and land back through reviewed branches.

## Workflow

- Main checkout: `/Users/bob/repos/hermes-dm-inbox`
- All work: separate `wt` worktrees
- Package manager: Bun
- Documentation lifecycle: Tomoji `doc-maintenance` (`tomoji docs ...`)

The first review branch contains the product/architecture spec.

## Keyboard map (Phase 0 web slice)

| Key | Action |
| --- | --- |
| `j` / `k` | Next / previous conversation |
| `Enter` | Open thread, then focus composer (defers to a focused control) |
| `g i` / `g s` / `g a` | Go to Important / Sent / All |
| `e` | Mark done (acknowledge on FYI; no-op while a draft is in flight or in the composer) |
| `a` | Add the picked draft to the chat composer |
| `s` | Snooze |
| `p` | Cycle priority |
| `d` | Draft with Hermes (follow-up on Sent threads) |
| `1` `2` `3` | Pick a draft angle |
| `r` | Refine the draft (focus the studio chat) |
| `c` | Focus composer · `⌘⏎` send · `Esc` back to list scope |
| `u` | Back to list (closes the draft surface) |
| `/` or `⌘K` | Command palette · `?` shortcut sheet |

`e` and `a` are deliberately separate keys (R20): one key for two semantically
distant actions on hidden draft state was a slip hazard.