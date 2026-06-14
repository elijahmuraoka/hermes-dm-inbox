---
name: 2026-06-13-hermes-dm-inbox-v0
title: Hermes DM Inbox v0
slug: hermes-dm-inbox-v0
status: active
owner: bob
started: 2026-06-13
created: 2026-06-13
branch: docs/hermes-dm-inbox-spec-bun-docs
pr:
---

# Hermes DM Inbox v0 Spec

## Goal

Build a local-first, keyboard-first unified DM inbox for Hermes Agent.

The inbox consolidates private-message surfaces such as iMessage, LinkedIn, X/Twitter, and future CLI-backed DM channels into one fast interface. The configured Hermes agent is the drafting, triage, and organization layer. Gmail/email is deferred until the DM model is proven because email is not cleanly DM-shaped.

## Current decision reset

This spec intentionally supersedes the earlier prototype direction:

- New repo: `<repo-root>`
- Public GitHub repo: `https://github.com/elijahmuraoka/hermes-dm-inbox`
- Main checkout stays on `main`
- All work happens in `wt` worktrees
- Package manager/runtime is **Bun**, not pnpm
- Docs use the `doc-maintenance` lifecycle (`docs/VISION.md`, `docs/ARCHITECTURE.md`, `docs/BACKLOG.md`, `docs/specs/...`)
- This is open-source from day one, so docs, names, env vars, examples, and comments must be generic and safe for public readers
- Implementation does not resume until this spec is reviewed

## Product definition

Hermes DM Inbox is a local web app opened in the browser. It feels like Superhuman/Supermail for DMs:

- left column: source-filtered conversation list
- right column: thread + Hermes draft panel
- command palette for everything
- first-class keyboard shortcuts
- fast sync and search
- redacted-by-default message lists
- explicit reveal and draft approval flows

## Non-goals for v0

- No cloud hosting
- No OAuth server flows
- No write/send path
- No background sync daemon
- No multi-user/team features
- No native desktop wrapper yet
- No public network exposure

## Stack

| Layer | Choice |
|---|---|
| Repo/package runtime | Bun workspace root (`bun@1.3.11`) |
| Frontend | React 19 + Vite + TypeScript strict |
| Frontend tests | Vitest + Testing Library |
| Backend | Python 3.11+ + FastAPI + SQLite |
| Backend env/deps | uv |
| Backend tests | pytest + FastAPI TestClient |
| Docs | Tomoji doc-maintenance layout |
| Agent adapter | Mock by default, local Hermes opt-in |

Rationale lives in `decisions/0001-tech-stack.md`.

## Architecture

Canonical architecture decisions live in:

- `context/final-system-architecture-and-plan.md`
- `context/security-privacy-invariants.md`
- `context/product-ux-contract.md`
- `context/system-design-v0.md`

The core architecture is:

```text
Messaging sources
  ↓
Connector adapters + sync engine
  ↓
SQLite local inbox store
  ↓
Application services / primitives
  ↓
Surfaces: local REST UI, hdi CLI, /hermes-dm-inbox skill, future MCP
```

Primitives are the canonical API. REST routes, CLI commands, and the Hermes skill are wrappers over the same primitives.

## Data model

Minimum SQLite tables:

| Table | Purpose |
|---|---|
| sources | registered connector/source metadata |
| source_accounts | local accounts/personas per source |
| conversations | source/source_id, latest time, unread, muted, local status |
| participants | source participant id, display name/alias, redacted handle |
| conversation_participants | conversation-to-participant join table |
| messages | message metadata + redacted preview only |
| message_bodies | raw message body vault, separated from list/search/audit surfaces |
| drafts | Hermes-produced drafts and edited draft text |
| draft_versions | draft revision history |
| approvals | approval/rejection/send-intent records |
| labels | local labels/categories |
| conversation_labels | labeling join table |
| tasks | follow-up/reminder work items derived from messages |
| audit_logs | redacted operational event log |
| sync_runs | connector sync history |
| connector_state | connector cursors, health, and last successful sync |

## Connector contract

Each connector implements a read-only contract:

```python
class ConnectorBase(ABC):
    source: str
    name: str

    async def fetch_conversations(
        self,
        cursor: str | None = None,
        limit: int = 50,
    ) -> Page[ConversationData]: ...

    async def fetch_messages(
        self,
        conversation_id: str,
        cursor: str | None = None,
        since: str | None = None,
        limit: int = 100,
    ) -> Page[MessageData]: ...

    def capabilities(self) -> ConnectorCapabilities: ...
```

Phase 0/1 capabilities are read-only. No connector has `send`, `delete`, `archive`, `mark_read`, or `oauth` responsibilities.

## Hermes adapter contract

```python
class HermesAdapter(ABC):
    async def ask(self, prompt: str, context: dict) -> HermesResponse: ...
    async def draft_reply(self, conversation: dict, messages: list[dict]) -> HermesResponse: ...
```

Rules:

- Mock adapter is default.
- Local Hermes adapter is opt-in via env.
- Draft prompts receive metadata and redacted snippets by default.
- Full-body drafting requires explicit user confirmation.

## Keyboard contract

| Key | Action |
|---|---|
| j/k | move selection |
| Enter | open conversation |
| u | back |
| d | ask Hermes to draft |
| a | approve current draft intent |
| r | regenerate/reject |
| Cmd+K | command palette |
| ? | shortcuts/help |

## Phase plan

### Phase 0 — Spec + scaffold

Acceptance:

- Bun workspace root
- FastAPI app skeleton
- React/Vite app skeleton
- SQLite store with body-vault schema
- MockConnector with deterministic data
- MockHermesAdapter
- `hdi` CLI skeleton over the same primitives
- Keyboard shell renders and passes smoke tests
- Explicit body reveal is modeled as an audited `POST` action
- No real connector data
- No local Hermes invocation
- No send path
- `bun test`, `bun run build`, and server pytest pass

### Phase 1 — First real read-only data

Acceptance:

- Exactly one real connector lands first, chosen from:
  - iMessage read-only connector via `imsg`, or
  - LinkedIn read-only connector via `linkedin-os`
- Manual sync button
- List views redacted
- Body reveal is explicit
- Audit log tests prove no raw body leakage

### Phase 1.5 — Second real connector

Acceptance:

- The second connector lands only after the first connector proves idempotent sync and privacy boundaries
- Connector abstraction supports two real sources without source-specific UI logic

### Phase 2 — Agent + more connectors

Acceptance:

- X/Twitter connector via `xurl`
- LocalHermesAdapter opt-in harness
- `/hermes-dm-inbox` skill packaged as resolver/wrapper over `hdi`/API primitives
- Command palette can ask Hermes
- Draft panel supports prompt/edit/regenerate/approve-intent
- Follow-up task primitive exists

Gmail via `gog` remains deferred until a separate email-shaped model is designed.

### Phase 3 — Production polish

Acceptance:

- Search
- Pagination / virtualized list for large inboxes
- Optional local PIN auth
- Responsive mobile/Tailscale view
- Background sync strategy proposed and approved

### Phase 4 — Send path, gated

Not started without explicit approval.

Acceptance:

- Send queue
- Per-connector write capability negotiation
- Per-message explicit confirmation
- Dry-run mode
- Full audit trail

## Engineering practices

- Work in `wt` worktrees only.
- Main checkout stays clean on `main`.
- Use Bun for all JS package management and scripts.
- Use uv for Python backend dependencies.
- Test-first for store, connector, and API behavior.
- Browser visual QA for UI work.
- No raw message body in logs, list endpoints, or audit payloads.

## Open questions for review

1. Public name: **Hermes DM Inbox** remains the default. Should it ever become **Hermes Inbox**?
2. First real connector: should Phase 1 prioritize iMessage for local/macOS proof or LinkedIn for product value?
3. Initial public push: docs/spec only first, or wait until Phase 0 mock implementation is ready?
4. Body vault encryption: model boundary in Phase 0 only, or implement OS-keychain-backed encryption immediately?
5. Public positioning: “local AI DM inbox powered by Hermes” vs “companion app for Hermes Agent”?
