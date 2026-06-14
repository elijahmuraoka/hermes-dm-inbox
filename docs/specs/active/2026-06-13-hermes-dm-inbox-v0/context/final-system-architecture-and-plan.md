# Final System Architecture and Plan

## Verdict

The best architecture for Hermes DM Inbox is:

> **Local SQLite spine + Python application primitives + local REST UI + `hdi` CLI + `/hermes-dm-inbox` Hermes resolver skill, with privacy enforced by body-vault/reveal policy and no send path until a separate spec.**

This remains the right system after pressure-testing against:

- local-first app architecture
- Cloudflare Agentic Inbox-style per-mailbox SQLite + AI side-panel/tools + explicit send confirmation
- AgenticMail-style structured agent/tool interfaces
- Hermes Agent's skill/tool/gateway model
- private-message security constraints
- open-source packaging constraints

The key upgrade from the earlier sketch: **the canonical abstraction is not SQLite, REST, CLI, or the UI. The canonical abstraction is application primitives.** Every surface wraps the same primitives.

## North-star product

Hermes DM Inbox is a local communication command center:

- syncs personal/professional messaging sources into local state
- makes triage fast with a keyboard-first UI
- lets the configured Hermes agent search, summarize, classify, and draft
- keeps private bodies behind explicit reveal/share boundaries
- records durable approvals/intents before any future side effects

## Final architecture

```text
External messaging systems
  ├─ iMessage via imsg
  ├─ LinkedIn via linkedin-os
  ├─ X/Twitter via xurl
  ├─ Gmail via gog later / separate email model
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
SQLite local store
  ├─ index DB: metadata, redacted previews, labels, drafts, tasks, audit
  └─ body vault: raw bodies / attachments behind reveal policy
        ↓
Application primitives
  ├─ sync
  ├─ list/search conversations
  ├─ get thread
  ├─ reveal body
  ├─ triage
  ├─ draft reply
  ├─ summarize
  ├─ label/status
  ├─ create follow-up task
  ├─ approve draft intent
  └─ future enqueue send
        ↓
Surfaces
  ├─ React local UI over FastAPI REST
  ├─ hdi CLI for scripts/operators/Hermes
  ├─ /hermes-dm-inbox skill as resolver/safety wrapper
  └─ future MCP adapter over the same primitives
```

## Dependency direction

```text
UI / CLI / Skill / future MCP
        ↓
Transport adapters: REST routes, CLI handlers, skill recipes
        ↓
Application services / primitives
        ↓
Domain contracts: messages, connectors, body policy, drafts, triage
        ↓
Infrastructure: SQLite repos, connector subprocesses, Hermes adapter, audit
```

Rules:

- UI does not talk directly to SQLite.
- CLI does not reimplement business logic.
- Hermes skill does not know schema internals.
- Connectors do not write directly to UI state.
- REST endpoints are wrappers, not the product core.
- Future MCP is a wrapper, not the starting architecture.

## Why this architecture wins

### SQLite spine

SQLite is right because this is private, single-user, local, query-heavy state. It supports fast search, sync cursors, audit trails, drafts, labels, and task extraction without cloud infrastructure.

### Python primitives

Python/FastAPI is right for connector orchestration because the integrations are CLI/subprocess/local-machine heavy (`imsg`, `linkedin-os`, `xurl`, `gog`, `hermes`). Pydantic/FastAPI also gives strong API contracts and testability.

### Local REST UI

React/Vite over localhost REST keeps the browser away from raw DB/vault access while retaining a fast UI and future mobile/Tailscale option.

### CLI from Phase 0

`hdi` should exist early because it is the agent contract, automation contract, and debugging surface. If a primitive cannot be expressed as a deterministic CLI command with `--json`, it is probably underspecified.

### Hermes skill as resolver

The skill maps user intent to safe CLI/API operations. It should be an expert operator manual for Hermes, not a second backend.

### MCP later

MCP is attractive, but not first. Build primitives first; then expose stable primitives through MCP if useful.

## Rejected alternatives

### UI directly reads SQLite

Rejected for v0. It leaks schema to the frontend, weakens privacy boundaries, complicates body reveal audit, and does not fit connector subprocesses.

### Hermes gateway plugin first

Rejected for v0. It over-couples the app to Hermes internals and makes the open-source product less standalone. Hermes integrates through skill/CLI first.

### MCP server first

Deferred. MCP should expose stable primitives after REST/CLI/privacy behavior is proven.

### Browser SQLite / IndexedDB as canonical state

Rejected for v0. The OS-local connectors and Hermes/CLI access need a host-side data plane. Browser storage may become a cache later, not the source of truth.

### Full event sourcing

Rejected for v0. Use relational current-state tables plus append-only audit/sync/outbox-style tables where needed. Full event sourcing is overkill before the domain stabilizes.

### TypeScript-only backend

Rejected. Python remains better for local CLI wrappers, subprocesses, SQLite, Hermes invocation, and connector tests.

## Canonical primitives

Phase 0 primitives:

| Primitive | Purpose | Surface exposure |
|---|---|---|
| `sync(source?)` | ingest mock/source records | REST + CLI |
| `list_conversations(filter)` | redacted conversation list | REST + CLI + skill |
| `get_thread(conversation_id)` | redacted thread view | REST + CLI + skill |
| `reveal_message_body(message_id, reason)` | audited body reveal | REST + CLI with human policy |
| `search(query, filters)` | local redacted search | REST + CLI + skill |
| `draft_reply(conversation_id, instructions, body_policy)` | create draft via mock/Hermes adapter | REST + CLI + skill |
| `triage(scope, policy)` | classify/prioritize messages | REST + CLI + skill |
| `label(target, labels)` | local organization | REST + CLI |
| `create_task_from_message(message_id, task)` | follow-up capture | REST + CLI + skill |
| `approve_draft(draft_id)` | records approval intent only | REST + CLI |

Later primitives:

| Primitive | Gate |
|---|---|
| `summarize_thread` | after reveal/prompt policy is proven |
| `enqueue_send` | separate send-path spec |
| `background_triage` | background sync/orchestration spec |
| `mcp_*` wrappers | after primitives stabilize |

## Data model direction

Use SQLite with a clear split between index data and body/vault data.

Minimum index tables:

- `sources`
- `source_accounts`
- `conversations`
- `participants`
- `conversation_participants`
- `messages`
- `drafts`
- `draft_versions`
- `approvals`
- `labels`
- `conversation_labels`
- `tasks`
- `sync_runs`
- `connector_state`
- `audit_logs`

Body/vault tables or store:

- `message_bodies`
- `attachment_blobs`
- optional encryption metadata/key versions

Default stance for Phase 0: implement schema boundaries and tests first; encryption can be staged if local keychain integration is too large for initial scaffold, but the API/DTO contract must already treat bodies as vault-controlled.

## REST API contract shape

Phase 0 routes:

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

Important: body reveal should be `POST`, not `GET`, because reveal is an audited stateful privacy action.

## CLI contract shape

```bash
hdi health --json
hdi sync --source mock --json
hdi inbox --unread --json
hdi search "follow up" --source linkedin --json
hdi thread <conversation-id> --json
hdi reveal <message-id> --reason "reply drafting" --json
hdi draft <conversation-id> --instructions "warm but concise" --json
hdi triage --scope unread --json
hdi label add <conversation-id> investor --json
hdi task create --message <message-id> --text "follow up Friday" --json
hdi audit tail --json
```

CLI defaults:

- redacted by default
- `--json` always available
- explicit reveal/body policy required for raw bodies
- stable exit codes
- no direct raw SQL command in v0

## Hermes integration plan

### Level 1 — Hermes as caller

Hermes uses `/hermes-dm-inbox` skill and `hdi` CLI. This is the safest first integration.

### Level 2 — Hermes as app service adapter

The UI can ask Hermes for drafts/summaries through the backend Hermes adapter. Mock by default; local Hermes opt-in.

### Level 3 — Hermes as orchestrator

Future background workflows: daily triage, stale follow-ups, suggested replies, task extraction. Requires a separate background/orchestration design.

## `/hermes-dm-inbox` skill responsibilities

The skill should:

- describe when to use the inbox
- map user intents to CLI commands/primitives
- enforce redacted-by-default behavior
- instruct Hermes to ask before full-body reveal/share
- forbid send behavior until send path exists
- use `--json` outputs for reliable parsing
- avoid private/person-specific assumptions

The skill should not:

- duplicate backend logic
- contain DB schema details beyond stable public handles
- query raw SQLite directly
- expose vault paths/keys/tokens
- auto-load globally for unrelated tasks

## Product direction

The UI should be a **triage cockpit**, not just a chronological feed.

Core buckets:

- Needs Reply
- Drafted
- Waiting
- FYI
- Noise
- Done
- Snoozed / Later

Core surfaces:

- source/sidebar filter
- triage inbox list
- thread view
- Hermes draft panel
- command palette
- draft review queue
- audit/reveal indicator

## Phase plan

### Design Gate 0 — current gate

Before implementation:

- final system architecture approved
- security/privacy invariants approved
- product/UX contract approved
- spec patched to match final architecture
- Phase 0 implementation plan written

### Phase 0 — mock vertical slice

Build the whole architecture with fake data only:

- Bun workspace
- FastAPI app
- SQLite schema/migrations
- mock connector
- sync engine
- REST API
- `hdi` CLI skeleton
- React keyboard shell
- mock Hermes adapter
- draft/triage primitives
- redaction/reveal/audit tests
- public README

### Phase 1 — one real connector

Pick exactly one:

- iMessage first if local/macOS proof matters most
- LinkedIn first if product value/public demo matters most

No sends. Manual sync only.

### Phase 1.5 — second real connector

Add the second connector to prove abstraction and schema.

### Phase 2 — Hermes-native workflows

- opt-in LocalHermesAdapter
- richer drafts/summaries/triage
- task/follow-up extraction
- `/hermes-dm-inbox` skill hardening

### Phase 3 — scale/polish

- better search
- virtualized lists
- local auth/PIN
- responsive/Tailscale view
- background sync proposal

### Phase 4 — send path

Separate spec only:

- send queue/outbox
- dry-run mode
- exact-recipient/body confirmation
- per-message single-use approval
- connector write capability negotiation
- full audit trail

## Mandatory decisions now

Default decisions to lock unless overridden:

1. Product is **DM-first**, not universal email/comms in v0.
2. Gmail is deferred until after two DM-like connectors prove the model.
3. SQLite is canonical local state.
4. Python primitives own business logic.
5. REST, CLI, skill, future MCP are wrappers.
6. `hdi` CLI skeleton ships in Phase 0.
7. `/hermes-dm-inbox` skill ships as resolver/wrapper, not global auto-load for all tasks.
8. Mock connector and MockHermesAdapter are defaults.
9. No real connector data in Phase 0.
10. No local Hermes invocation in Phase 0 unless explicitly enabled for a separate smoke.
11. No send path until separate spec.
12. Public repo examples/fixtures/screenshots stay synthetic.

## Implementation readiness checklist

Do not begin Phase 0 implementation until these docs exist and agree:

- `SPEC.md`
- `context/final-system-architecture-and-plan.md`
- `context/security-privacy-invariants.md`
- `context/product-ux-contract.md`
- `decisions/0001-tech-stack.md`
- Phase 0 implementation plan

Then implementation can begin in a new `wt` worktree with TDD and review gates.
