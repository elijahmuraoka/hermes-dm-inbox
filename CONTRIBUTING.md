# Contributing to Hermes DM Inbox

Thanks for your interest in contributing. This document covers the toolchain, the workflow, and what we expect from a pull request.

## Toolchain

The project uses [Bun](https://bun.sh) (>= 1.3) as package manager and script runner. Node >= 22 is required by the engine constraints.

```bash
bun install
bun run --cwd apps/web dev        # dev server
bun run --cwd apps/web typecheck  # TypeScript
bun run --cwd apps/web build      # production build
```

Note: while Phase 0 is still under review in PR #1, the `apps/web` code lives on the `feat/hermes-dm-inbox-phase-0-web-slice` branch, not on `main`. See the README's Status section.

## Workflow

- **Never commit to `main` directly.** All work happens on branches (we use git worktrees locally, but any branch workflow is fine) and lands through pull requests into `main`.
- Use descriptive branch names with a conventional prefix: `feat/...`, `fix/...`, `docs/...`, `chore/...`.
- Keep PRs focused. One concern per PR; unrelated changes belong in separate PRs.

## Before you open a PR

These gates must pass locally:

```bash
bun run --cwd apps/web typecheck
bun run --cwd apps/web build
```

A PR that fails typecheck or build will not be reviewed until it passes.

## What we expect in a PR

- **Describe the what and the why.** A reviewer should understand the motivation without reading the diff first.
- **Verified findings, not speculation.** If you claim a bug, show how to reproduce it. If you claim a fix, show how you verified it. "This might fix it" is not a finding.
- **No secrets in commits.** No API keys, tokens, credentials, or private data anywhere in the history of your branch. Fixture data must stay fictional.

## Licensing of contributions

This project is licensed under the [Apache License 2.0](LICENSE). Per Section 5 of that license, any contribution intentionally submitted for inclusion in the project is licensed under Apache-2.0, with no additional terms. Inbound = outbound; there is no CLA to sign.

## Questions

Open a regular GitHub issue for questions, bugs (non-security), and proposals. For security vulnerabilities, follow [SECURITY.md](SECURITY.md) instead of opening a public issue.
