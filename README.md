# Hermes DM Inbox

Local-first, keyboard-first unified DM inbox for Hermes Agent.

This repository is intentionally kept clean on `main`. Specs, features, and implementation work happen in git worktrees and land back through reviewed branches.

## Workflow

- Main checkout: `/Users/bob/repos/hermes-dm-inbox`
- All work: separate `wt` worktrees
- Package manager: Bun
- Documentation lifecycle: Tomoji `doc-maintenance` (`tomoji docs ...`)

The first review branch contains the product/architecture spec.