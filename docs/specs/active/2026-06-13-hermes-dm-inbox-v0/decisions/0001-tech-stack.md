# Decision 0001: Use Bun + FastAPI + SQLite

**Status:** proposed
**Date:** 2026-06-13

## Decision

Hermes DM Inbox uses:

- **Bun** as the JS runtime/package manager/script runner
- **React 19 + Vite + TypeScript strict** for the web UI
- **FastAPI + SQLite + uv** for the backend
- **Tomoji doc-maintenance** for docs lifecycle
- **wt worktrees** for all non-main work

## Why Bun

Bun is the chosen JavaScript runtime/package manager for this repo. It simplifies local developer experience:

```bash
bun install
bun run dev
bun test
bun run build
```

Bun gives us fast package installs, simple script execution, and enough Node compatibility for Vite/Vitest. The backend remains Python because connector wrapping, SQLite, subprocesses, and Hermes integration are all more natural there.

## Why not pnpm

pnpm matched HVC, but this project should use Bun. Any existing pnpm references from the initial prototype are stale and should be removed.

## Why not a TypeScript backend

The connector ecosystem is CLI-heavy and local-machine-heavy (`imsg`, `linkedin-os`, `xurl`, `gog`, `hermes`). Python is a better control plane for subprocess management, SQLite handling, typed API contracts with Pydantic, and fast tests via pytest.

## Consequences

- Root `package.json` uses `packageManager: "bun@1.3.11"`.
- Future JS commands are `bun ...`, never `pnpm ...`.
- Frontend build can still use Vite under Bun.
- Python backend still uses uv.
- Docs and implementation work happen in worktrees, not the main checkout.
