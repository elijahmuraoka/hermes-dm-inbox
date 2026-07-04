# Decision 0001: Use Bun + TypeScript end-to-end + SQLite

**Status:** accepted
**Date:** 2026-06-13 (amended 2026-07-03: FastAPI/Python backend replaced by TypeScript while still *proposed* — never accepted in the Python form)

## Decision

Hermes DM Inbox uses:

- **Bun** as the runtime/package manager/script runner (workspace monorepo)
- **TypeScript strict throughout** — one language for frontend, backend, CLI, shared contracts
- **React 19 + Vite** for the web UI
- **Hono + Zod** for the local HTTP API
- **`bun:sqlite` (WAL) + Drizzle ORM/drizzle-kit** for storage and migrations
- **Tomoji doc-maintenance** for docs lifecycle
- **wt worktrees** for all non-main work

## Why Bun

Bun is the chosen runtime/package manager for this repo. It simplifies local developer experience:

```bash
bun install
bun run dev
bun test
bun run build
```

Fast installs, one script runner, one test runner, built-in SQLite — and enough Node compatibility for Vite/Vitest.

## Why not pnpm

pnpm matched HVC, but this project should use Bun. Any existing pnpm references from the initial prototype are stale and should be removed.

## Why TypeScript beat the FastAPI/Python backend (2026-07-03 amendment)

The original proposal kept a Python backend on the theory that CLI-heavy connectors suit Python. Pressure-testing flipped it:

1. **Single-language monorepo.** One package manager, one test runner, one build, one type system.
2. **Shared types across the privacy boundary.** Redacted/revealed/shared DTOs are defined once in `packages/shared/` and imported by server, CLI, and UI — no hand-maintained Python ↔ TypeScript contract, which is exactly where a privacy bug would hide.
3. **Connectors are subprocess wrappers either way.** `imsg`, `linkedin-os`, `xurl`, `gog`, `hermes` are CLI calls; `Bun.spawn` does this as naturally as Python.
4. **`bun:sqlite` is built-in and synchronous** — no async overhead for a local single-user store.
5. **Hono + Zod ≈ FastAPI + Pydantic** for type-safe routes and validation.
6. **Drizzle** gives typed queries + migrations without an ORM runtime tax.

Full rationale: `context/final-system-architecture-and-plan.md` ("Why TypeScript won").

## Consequences

- Root `package.json` uses `packageManager: "bun@1.3.11"`; everything is a Bun workspace package.
- All commands are `bun ...`, never `pnpm ...`; there is no `uv`/pytest surface anymore.
- The CLI imports primitives directly (no HTTP hop); REST serves the browser UI only.
- Docs and implementation work happen in worktrees, not the main checkout.
