# Architecture

## System shape

Hermes DM Inbox follows the Hermes Voice Control pattern, adapted for DMs:

```text
┌──────────────┐      ┌──────────────────┐      ┌──────────────────┐
│   Browser    │─────>│  FastAPI Server   │─────>│  SQLite Store    │
│  React/Vite  │      │  (127.0.0.1)     │      │  hdi.sqlite3     │
│  keyboard UI │      │                   │      └──────────────────┘
└──────┬───────┘      │  ┌──────────────┐ │      ┌──────────────────┐
       │ REST         │  │ Connectors   │ │      │ Hermes Adapter   │
       │              │  │ imsg         │ │      │ mock/local       │
       │              │  │ linkedin-os  │ │      └──────────────────┘
       │              │  │ xurl         │ │
       │              │  │ gog          │ │
       │              │  │ mock         │ │
       │              │  └──────────────┘ │
       │              └──────────────────┘
```

## Repo layout

```text
hermes-dm-inbox/
  apps/
    server/        Python FastAPI backend, uv
    web/           React + Vite + TypeScript frontend, Bun-managed
  docs/
    INDEX.md
    VISION.md
    ARCHITECTURE.md
    BACKLOG.md
    specs/
      active/
      archived/
  package.json     Bun workspace root
```

## Worktree policy

The main checkout at `<repo-root>` stays on `main` and is not used for feature work.

All spec, code, and review work happens in `wt` worktrees, for example:

```bash
cd <repo-root>
wt new "hermes dm inbox phase 0 scaffold"
```

Never use raw `git worktree add/remove`; use `wt` so the registry, cleanup flow, and status classifications stay accurate.

## Stack

- Frontend package manager/runtime: **Bun**
- Frontend: React 19, Vite, TypeScript strict, Vitest
- Backend: Python 3.11+, FastAPI, SQLite, uv
- Docs lifecycle: `tomoji docs ...` via doc-maintenance
- Agent: local Hermes Agent, mock by default

## Security invariants

- Server binds `127.0.0.1` only in Phase 0/1.
- Connectors are read-only until an explicit write-path phase.
- Message bodies live in a separate SQLite table.
- List endpoints and logs never return raw message bodies.
- Audit logs redact `body`, `text`, `content`, `message`, `draft`, and `snippet` payload keys.
- Connector credentials are owned by the underlying CLI tools, not this app.
