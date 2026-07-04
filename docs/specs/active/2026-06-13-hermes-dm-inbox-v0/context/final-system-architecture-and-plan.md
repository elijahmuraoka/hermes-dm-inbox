# Final System Architecture and Plan

## Verdict

The best architecture for Hermes DM Inbox is:

> **Local SQLite spine + TypeScript application primitives + Hono REST API + React UI + `hdi` CLI + `/hermes-dm-inbox` Hermes resolver skill, with privacy enforced by body-vault/reveal policy and no send path until a separate spec.**

This is the right system after pressure-testing against:

- local-first app architecture
- Cloudflare Agentic Inbox-style per-mailbox SQLite + AI side-panel/tools + explicit send confirmation
- AgenticMail-style structured agent/tool interfaces
- Hermes Agent's skill/tool/gateway model
- private-message security constraints
- open-source packaging constraints

The key principle: **the canonical abstraction is application primitives.** Every surface wraps the same primitives.

## Why TypeScript won

Originally considered Python/FastAPI, but TypeScript is the better backend for this project:

1. **Single language monorepo.** Bun workspace for everything — one package manager, one test runner, one build system, one type system.
2. **Shared types between frontend and backend.** Privacy-sensitive DTOs (redacted vs revealed vs shared-with-Hermes) are defined once in `packages/shared/` and imported everywhere. No hand-maintained Python ↔ TypeScript contract.
3. **`bun:sqlite` is built-in and excellent.** Zero-dependency, synchronous, WAL mode, no async overhead for local operations.
4. **Connector tools are all CLI wrappers anyway.** `imsg`, `xurl`, `linkedin-os`, `gog`, `hermes` are all subprocess calls. No Python dependency in the connector layer.
5. **Hono + Zod = FastAPI + Pydantic.** Type-safe HTTP, Zod validation, middleware, native Bun support.
6. **Drizzle ORM** for type-safe SQLite queries and migrations.

## Monorepo structure

```text
hermes-dm-inbox/
├── package.json              Bun workspace root
├── bun.lock
├── tsconfig.json             base TypeScript config
├── packages/
│   ├── shared/               DTOs, types, body policies, connector contracts
│   ├── db/                   schema, migrations (drizzle-kit), repositories
│   ├── primitives/           application services / domain logic
│   ├── connectors/           connector adapters (mock, future imsg/linkedin/xurl)
│   └── hermes/               mock adapter, local adapter interface
├── apps/
│   ├── server/               Hono HTTP server
│   ├── web/                  React 19 + Vite UI
│   └── cli/                  hdi CLI (imports primitives directly, not REST)
└── docs/                     VISION, ARCHITECTURE, specs, plans
```

Single command for everything:

```bash
bun install && bun run dev    # starts server + Vite + watch
bun test                      # all tests
bun run build                 # production build
```

## Architecture

```text
External messaging systems
  ├─ iMessage via imsg
  ├─ LinkedIn via linkedin-os
  ├─ X/Twitter via xurl
  ├─ Gmail via gog — deferred
  └─ future connectors
        ↓
Connector adapters
  - read-only in early phases
  - paginated/cursor-based
  - normalize source payloads
        ↓
Sync engine
  - idempotent upserts
  - connector health/cursors
  - redacted audit events
        ↓
SQLite local store (~/.hermes-dm-inbox/)
  ├─ inbox.db: metadata, redacted previews, drafts, audit, sync state
  └─ vault.db: raw message bodies behind reveal policy
        ↓
Application primitives (packages/primitives/)
  ├─ sync
  ├─ list_conversations
  ├─ get_thread
  ├─ reveal_message_body
  ├─ search
  ├─ draft_reply
  ├─ triage
  └─ approve_draft
        ↓
Surfaces
  ├─ apps/web/    React UI over Hono REST
  ├─ apps/cli/    hdi CLI (imports primitives directly)
  ├─ skill        /hermes-dm-inbox skill (resolver/safety wrapper)
  └─ future       MCP adapter over the same primitives
```

## Dependency direction

```text
UI / CLI / Skill / future MCP
        ↓
Transport: REST routes, CLI command handlers, skill recipes
        ↓
Application primitives (packages/primitives/)
        ↓
Domain contracts (packages/shared/)
        ↓
Infrastructure: Drizzle repos, connector subprocesses, Hermes adapter, audit
```

Key rule: **CLI imports primitives directly, not via REST.** The CLI is a peer surface alongside the server. REST is for the browser UI only. This avoids an unnecessary HTTP hop for local CLI use and keeps the CLI fast.

## Technology stack

| Layer | Choice |
|---|---|
| Runtime | Bun |
| Package manager | Bun workspaces |
| Language | TypeScript strict |
| HTTP framework | Hono + Zod |
| Database | `bun:sqlite` (WAL mode) |
| ORM / migrations | Drizzle ORM + drizzle-kit |
| Frontend | React 19 + Vite |
| Frontend tests | Vitest + Testing Library |
| Backend/CLI tests | Vitest or `bun test` |
| Hermes adapter | Mock default, local Hermes subprocess opt-in |
| Config location | `~/.hermes-dm-inbox/` (overridable via `HDI_HOME`) |
| License | Apache 2.0 |

## Canonical primitives

Phase 0 primitives:

| Primitive | Purpose | Surface |
|---|---|---|
| `sync(source?)` | ingest mock/source records | REST + CLI |
| `list_conversations(filter)` | redacted conversation list | REST + CLI + skill |
| `get_thread(conversation_id)` | redacted thread view | REST + CLI + skill |
| `reveal_message_body(message_id, reason)` | audited body reveal | REST + CLI (human policy) |
| `search(query, filters)` | local redacted search | REST + CLI + skill |
| `draft_reply(conversation_id, instructions, body_policy)` | create draft via mock/Hermes adapter | REST + CLI + skill |
| `triage(scope, policy)` | classify/prioritize messages | REST + CLI + skill |
| `approve_draft(draft_id)` | records approval intent only | REST + CLI |

Deferred primitives:

| Primitive | Gate |
|---|---|
| `label(target, labels)` | Phase 1 — freeform labels |
| `summarize_thread` | Phase 2 — after reveal/prompt policy proven |
| `create_task_from_message` | Phase 2 — needs task model design |
| `enqueue_send` | Phase 4 — separate send-path spec |
| `background_triage` | Phase 3 — background sync/orchestration spec |
| `mcp_*` wrappers | After primitives stabilize |

## Data model

### Phase 0 tables

Index store (`inbox.db`):

| Table | Purpose |
|---|---|
| `sources` | registered connector/source metadata |
| `source_accounts` | local accounts/personas per source |
| `conversations` | source/source_id, latest time, unread, triage state |
| `participants` | source participant id, display alias |
| `conversation_participants` | join table |
| `messages` | metadata + redacted preview only |
| `drafts` | generated/edited drafts |
| `approvals` | approval/rejection/send-intent records |
| `sync_runs` | connector sync history |
| `connector_state` | cursors, health, last successful sync |
| `audit_logs` | append-only redacted audit events |

Body vault (`vault.db`):

| Table | Purpose |
|---|---|
| `message_bodies` | raw message body (Phase 0: separate DB, policy boundary; Phase 1+: encrypted) |

### Deferred to later phases

| Table | When |
|---|---|
| `draft_versions` | Phase 1 — version history |
| `labels` + `conversation_labels` | Phase 1 — freeform labels |
| `tasks` | Phase 2 — follow-up task model |
| `attachment_blobs` | Phase 2 — attachment handling |
| `encryption_metadata` | Phase 1+ — vault key management |

## REST API

Phase 0 routes (Hono):

```text
GET  /healthz
GET  /api/sources
POST /api/sync
GET  /api/conversations
GET  /api/conversations/{conversation_id}
GET  /api/conversations/{conversation_id}/messages
POST /api/messages/{message_id}/reveal
POST /api/drafts
GET  /api/drafts?conversation_id=...
POST /api/drafts/{draft_id}/approve
GET  /api/audit
```

Server binds `127.0.0.1` by default. Reveal is `POST` because it is a stateful audited privacy action.

## CLI contract

`hdi` imports primitives from `packages/primitives/` directly.

```bash
hdi health --json
hdi sync --source mock --json
hdi inbox --unread --json
hdi search "follow up" --source linkedin --json
hdi thread <conversation-id> --json
hdi reveal <message-id> --reason "reply drafting" --json
hdi draft <conversation-id> --instructions "warm but concise" --json
hdi triage --scope unread --json
hdi approve <draft-id> --json
hdi audit tail --json
```

CLI defaults: redacted, `--json` always available, stable exit codes, no raw SQL.

## Hermes integration

### Level 1 — Hermes as caller
Hermes uses `/hermes-dm-inbox` skill + `hdi` CLI. Safest first integration.

### Level 2 — Hermes as app service adapter
UI calls local Hermes adapter for drafts/summaries. Mock by default; local Hermes subprocess opt-in.

### Level 3 — Hermes as orchestrator
Future background workflows. Separate design required.

## `/hermes-dm-inbox` skill

Should: map user intent to safe CLI commands, enforce redacted-by-default, instruct Hermes to ask before body reveal, forbid send behavior.

Should not: duplicate backend logic, know schema internals, query SQLite directly, expose vault paths/keys/tokens, auto-load globally.

## Product direction

Triage cockpit, not chronological feed. Three views — **Needs Reply / Sent / All** (DECISION v5,
2026-07-03; see the ux-contract) — with view-specific sort orders and filters on every view. Bodies are
always visible to the human (v1); Hermes reads a thread only via a draft request, with no in-product
share signaling (v2/v4) — the boundary lives in the request pipeline, not the UI.

```text
┌────────────────────────────────────────────────────────────────┐
│ top bar: search, sync status, Cmd+K                            │
├───────────────┬────────────────────────────────────────────────┤
│ views/sources │ conversation list │ thread + composer          │
│ + filters     │ (view-aware rows) │ + Hermes drafting studio   │
└───────────────┴────────────────────────────────────────────────┘
```

## Phase plan

### Design Gate — complete

- System architecture: ✓ (this doc)
- Security/privacy invariants: ✓
- Product/UX contract: ✓
- Spec synced: ✓ (SPEC.md updated to the TypeScript stack, 2026-07-03)
- Tech stack decision: ✓ (`decisions/0001-tech-stack.md` accepted as amended, 2026-07-03)
- Phase 0 implementation plan: next

### Phase 0 — mock vertical slice

Build the full architecture with mock data only:

- Bun monorepo workspace
- Drizzle schema + migrations
- `bun:sqlite` with WAL
- MockConnector with deterministic data
- Sync engine
- Application primitives
- Hono REST API
- `hdi` CLI skeleton
- React keyboard shell
- MockHermesAdapter
- Body reveal as audited `POST`
- Privacy leak tests (scan index DB, audit logs, API responses for canary text)
- No real connector data, no local Hermes invocation, no send path

### Phase 1 — first real connector

Exactly one real connector. Manual sync. No sends.

### Phase 1.5 — second real connector

Prove connector abstraction across two real sources.

### Phase 2 — Hermes-native workflows

LocalHermesAdapter opt-in, richer drafts/triage, `/hermes-dm-inbox` skill hardening, labels, follow-up tasks.

### Phase 3 — scale/polish

Search quality, virtualized lists, local auth, Tailscale view, background sync proposal.

### Phase 4 — send path

Separate spec only: send queue, dry-run, per-message confirmation, audit trail.

## Mandatory decisions

1. Product is **DM-first**.
2. Gmail is deferred.
3. SQLite is canonical local state.
4. TypeScript owns everything — Bun workspace, Hono, Drizzle, `bun:sqlite`.
5. Primitives are the canonical API. REST/CLI/skill/future MCP are wrappers.
6. CLI imports primitives directly, not via REST.
7. `hdi` CLI skeleton ships in Phase 0.
8. `/hermes-dm-inbox` skill ships as resolver/wrapper.
9. Mock connector and MockHermesAdapter are defaults.
10. No real connector data in Phase 0.
11. No local Hermes invocation in Phase 0.
12. No send path until separate spec.
13. Public repo: synthetic fixtures only.
14. Config at `~/.hermes-dm-inbox/`, overridable via `HDI_HOME`.
