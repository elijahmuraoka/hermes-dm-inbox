# System Design v0: Hermes DM Inbox

## Core idea

Hermes DM Inbox is a local communication operating layer for Hermes Agent.

All supported messaging sources sync into a local SQLite database. The local UI, CLI, and Hermes skill all operate on that same local state through stable primitives. The UI is for human speed; the CLI is for automation; the Hermes skill is the agent-facing resolver/control surface.

```text
Messaging sources
  ├─ iMessage / imsg
  ├─ LinkedIn / linkedin-os
  ├─ X / xurl
  ├─ Gmail / gog (deferred until email model is designed)
  └─ future connectors
        ↓
Connector adapters + sync engine
        ↓
SQLite local inbox store
        ↓
Application services / primitives
  ├─ search
  ├─ triage
  ├─ draft
  ├─ summarize
  ├─ reveal body
  ├─ label / status
  ├─ sync
  └─ future send queue
        ↓
Surfaces
  ├─ Local web UI
  ├─ `hdi` CLI
  └─ Hermes skill `/hermes-dm-inbox`
```

## Architectural principle

SQLite is the local source of truth. Connectors are ingestion adapters, not product surfaces. Hermes is the reasoning/action layer, not the database. The UI is a fast view/controller, not the owner of message state.

## Layers

### 1. Source connectors

Connectors wrap local tools and normalize external messages into the domain model.

Initial connector candidates:

| Source | Tool | Phase | Notes |
|---|---|---|---|
| mock | built-in fixture connector | Phase 0 | Public-safe demo data |
| iMessage | `imsg` | Phase 1 | macOS-first, local messages database permissions |
| LinkedIn | `linkedin-os` | Phase 1/1.5 | Cookie/session-based, likely high product value |
| X/Twitter | `xurl` | Phase 2 | DM/read limits depend on API/session capabilities |
| Gmail | `gog` | Deferred | Email is not DM-shaped; needs separate schema decision |

Connector rules:

- read-only until the send path has its own spec
- idempotent sync
- cursor/pagination support from day one
- no raw connector payloads in logs
- no direct writes to UI state
- connector output goes through normalization before persistence

### 2. Sync engine

The sync engine pulls from connectors, normalizes records, and upserts into SQLite.

Responsibilities:

- run manual syncs in v0
- track sync runs and connector health
- maintain per-connector cursors
- deduplicate messages using stable source IDs
- store raw bodies only in the body vault table
- emit audit-safe events

Non-goals for early phases:

- background daemon
- cloud sync
- write/send operations
- connector OAuth setup flows

### 3. SQLite inbox store

SQLite is the shared local substrate for every surface.

Core tables:

| Table | Purpose |
|---|---|
| `sources` | registered connector/source metadata |
| `source_accounts` | local accounts/personas per source |
| `conversations` | normalized conversation/thread records |
| `participants` | people/accounts in conversations |
| `conversation_participants` | join table |
| `messages` | message metadata, direction, timestamps, redacted preview |
| `message_bodies` | raw message body vault |
| `drafts` | generated/edited drafts |
| `approvals` | approval/rejection/send-intent records |
| `labels` | local labels/categories |
| `conversation_labels` | labeling join table |
| `tasks` | follow-up/reminder/work items derived from messages |
| `sync_runs` | sync history |
| `connector_state` | cursors, health, last successful sync |
| `audit_logs` | redacted operational audit events |

Important boundary: list/search/audit endpoints should not return raw bodies unless the operation explicitly requests body access and that access is audited.

### 4. Application services / primitives

Application services are the true product API. The UI, CLI, and Hermes skill should all call the same primitives instead of duplicating logic.

Initial primitives:

| Primitive | Purpose |
|---|---|
| `sync(source?)` | pull new data from one/all sources |
| `list_conversations(filter)` | fast redacted inbox list |
| `get_thread(conversation_id)` | load redacted thread metadata/snippets |
| `reveal_message_body(message_id, reason)` | explicit audited body reveal |
| `search(query, filters)` | local search over allowed fields |
| `summarize_thread(conversation_id, body_policy)` | Hermes-assisted summary |
| `draft_reply(conversation_id, instructions, body_policy)` | Hermes-assisted draft |
| `triage(scope, policy)` | classify, prioritize, identify follow-ups |
| `label(target, labels)` | local organization metadata |
| `create_task_from_message(message_id, task)` | follow-up capture |
| `approve_draft(draft_id)` | approval record only in early phases |
| `enqueue_send(draft_id)` | future gated send path |

The primitives are the stable interface. REST endpoints and CLI commands can change presentation, but primitives should remain coherent.

### 5. REST API for local UI

The web UI calls local FastAPI endpoints that wrap the primitives.

Phase 0 route shape:

```text
GET  /healthz
GET  /api/sources
POST /api/sync
GET  /api/conversations
GET  /api/conversations/{conversation_id}
GET  /api/conversations/{conversation_id}/messages
GET  /api/messages/{message_id}/body
POST /api/drafts
GET  /api/drafts?conversation_id=...
POST /api/drafts/{draft_id}/approve
GET  /api/audit
```

The API is local-only and binds to `127.0.0.1` by default.

### 6. Local web UI

The UI is the high-performance human console.

Primary jobs:

- keyboard-first triage
- source/filter-aware conversation list
- thread reading
- draft/rewrite workflow
- command palette for all primitives
- visual confidence around privacy state: redacted vs revealed vs shared with Hermes

The UI should not contain connector-specific business logic. Source-specific quirks should appear as metadata/capability flags supplied by the API.

### 7. CLI: `hdi`

The CLI is the automation/operator surface on top of the same primitives and SQLite state.

Examples:

```bash
hdi sync --source imsg
hdi inbox --source linkedin --unread
hdi search "follow up" --source imsg
hdi thread <conversation-id>
hdi draft <conversation-id> --instructions "warm but concise"
hdi triage --scope unread
hdi labels add <conversation-id> investor
hdi tasks list
hdi audit tail
```

CLI design goals:

- scriptable
- public-safe output defaults
- `--json` for agent/tool use
- no raw message bodies unless explicit `--reveal` or body policy flag
- exact same behavior as UI because both call the same services

### 8. Hermes skill: `/hermes-dm-inbox`

The Hermes skill is the agent-facing resolver and action interface. It should teach Hermes how to use the CLI/API safely.

It should not duplicate implementation. It should provide:

- when to use the inbox
- privacy rules
- common workflows
- CLI command recipes
- body reveal approval rules
- draft/triage/search patterns
- connector caveats

The skill can act as a resolver by mapping user intent to primitives:

| User intent | Skill-resolved primitive |
|---|---|
| “Find that LinkedIn DM from Sam” | `search(query, source=linkedin)` |
| “Draft a reply to the latest iMessage from Alex” | `list_conversations` → `get_thread` → `draft_reply` |
| “What messages need attention?” | `triage(scope=unread)` |
| “Remind me to follow up” | `create_task_from_message` |
| “Clean up my inbox” | `triage` + labels/status updates |
| “Reply saying yes” | draft only until send path is approved |

The skill should be open-source-safe and generic. A user can install Hermes DM Inbox, load the skill, and Hermes knows how to operate the local inbox without private local assumptions.

## How Hermes should integrate

Hermes integration has two levels:

### Level 1: Hermes as caller

Hermes uses the `/hermes-dm-inbox` skill and `hdi` CLI to inspect/search/triage/draft.

This is the safest first integration because Hermes does not need to be embedded into the app. The app exposes a local CLI/API; Hermes chooses actions through the skill.

### Level 2: Hermes as service adapter

The web app can call a local Hermes adapter for drafting/summarization from inside the UI.

Rules:

- mock adapter by default
- local Hermes adapter is opt-in
- redacted context by default
- full body requires explicit reveal/share event
- Hermes outputs drafts/recommendations, not sends, until send path is separately approved

### Level 3: Hermes as orchestrator

Future versions can let Hermes run inbox workflows in the background:

- daily triage report
- follow-up reminders
- stale thread detection
- suggested replies
- CRM-style relationship memory

This should wait until the privacy model, audit trail, and task model are proven.

## Privacy model

Every message has several possible representations:

| Representation | Contains | Safe for |
|---|---|---|
| metadata | source, participants, timestamps, unread, labels | list views, audit logs |
| redacted preview | clipped/sanitized snippet or `[redacted; len=N]` | list/thread previews, Hermes default context |
| raw body | full message text | explicit reveal only |
| Hermes context | selected metadata/snippets/body depending on policy | drafting/summary calls |

Body policies:

| Policy | Behavior |
|---|---|
| `metadata_only` | no body content |
| `redacted_preview` | snippets only |
| `explicit_full_body` | body included after explicit user action |

Default: `redacted_preview` or stricter.

## Product flow

### Human UI flow

1. Open local web UI.
2. Inbox syncs from selected sources manually.
3. User navigates with keyboard.
4. User opens a thread.
5. User asks Hermes to draft.
6. Draft appears in side panel.
7. User edits/approves.
8. Early phases stop at approval; send path comes later.

### Agent flow

1. User asks Hermes: “What messages need attention?”
2. Hermes loads `/hermes-dm-inbox` skill.
3. Skill maps intent to safe CLI calls.
4. CLI returns JSON/redacted summaries.
5. Hermes asks for body reveal only if required.
6. Hermes drafts or triages based on available context.

### Automation flow

1. User or cron runs `hdi triage --scope unread --json`.
2. Output becomes a local report or Hermes context.
3. Follow-up tasks are created locally.
4. No external send occurs without future approval design.

## Phase strategy

### Design Gate 0 — Holistic design before implementation

Before building, decide:

- DM-first vs unified communications scope
- core schema and privacy model
- connector contract with pagination/cursors
- CLI primitive names
- REST route table
- Hermes skill responsibilities
- UI interaction model

### Phase 0 — Mock vertical slice

Build the complete architecture with fake data:

- SQLite schema
- sync engine with mock connector
- REST API
- local UI
- CLI
- mock Hermes adapter
- draft/triage/search primitives
- public README
- privacy tests

### Phase 1 — First real connector

Add exactly one real connector first. Prefer iMessage for local/macOS proof, LinkedIn for public product value.

### Phase 1.5 — Second real connector

Add the second connector to prove the abstraction works across two real sources.

### Phase 2 — Hermes-native workflows

Deepen Hermes integration:

- robust `/hermes-dm-inbox` skill
- richer triage primitives
- summary/draft workflows
- local task/follow-up creation

### Phase 3 — Scale and polish

- search quality
- virtualized lists
- responsive/Tailscale view
- better local auth
- background sync proposal

### Phase 4 — Send path

Separate spec. No opportunistic send implementation.

## What not to build yet

- send/reply mutations
- Gmail as first-class source
- background daemon
- OAuth setup flows
- cloud hosting
- multi-user/team mode
- plugin marketplace
- universal connector SDK
- native desktop shell

## Open design decisions

1. Should v0 include a CLI from Phase 0, or should CLI land immediately after the UI/API vertical slice?
2. Should the first real connector be iMessage or LinkedIn?
3. Should the public product promise say “DM inbox” only, or “communications inbox” eventually?
4. Should Hermes UI calls go through CLI, REST, or direct Python service invocation?
5. Should the Hermes skill be shipped inside this repo, or as a separate skill pack installable by Hermes?
6. What is the exact body reveal/share UX language?

## Recommended default decisions

- DM-first product.
- SQLite as local source of truth.
- CLI and UI both call the same backend primitives.
- `/hermes-dm-inbox` skill is a resolver/wrapper around the CLI/API, not a separate implementation.
- Phase 0 includes CLI skeleton because it defines the agent contract early.
- Mock-only Phase 0.
- One real connector at a time.
- Redacted-by-default everywhere.
- Full message body sharing with Hermes requires explicit user action.
- Send path requires a separate spec and approval gate.
