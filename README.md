# Hermes DM Inbox

Local-first, keyboard-first unified DM inbox for Hermes Agent.

This repository uses a spec-first, worktree-first workflow:

- Main checkout: `<repo-root>`
- All active work: `wt` worktrees under `<worktrees-root>/hermes-dm-inbox/`
- Package manager/runtime: Bun
- Docs lifecycle: Tomoji `doc-maintenance`

## Active spec

Current review worktree:

```text
<worktree-root>
```

Spec bundle:

```text
docs/specs/active/2026-06-13-hermes-dm-inbox-v0/SPEC.md
```

## Workflow

```bash
cd <repo-root>
wt new "hermes dm inbox phase 0 scaffold"
```

Do not implement directly in the main checkout.