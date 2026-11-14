# Retired unified inbox prototype

The June 13, 2026 Unified Messaging Inbox prototype explored a local backend
for conversations from several messaging services. Its useful design context is
retained here as the standalone prototype is retired. Hermes DM Inbox remains
the continuing project; this note does not add a backend or change its current
mock-data status.

This is a source review from November 14, 2026. Historical plans and reported
tests describe the old prototype, not a deployment or acceptance result for
Hermes DM Inbox. The original implementation is not retained by this note.

## What existed

- A React/Vite inbox with source filters, a thread pane, a draft panel and a
  command palette. Shortcuts covered navigation, opening a thread, returning to
  the list, drafting and approval. The UI's sync action selected mock data.
- A FastAPI service intended to bind to loopback, with a SQLite store for
  conversations, participants, messages, bodies, sync runs, drafts, approvals
  and audit logs.
- A connector interface with conversation reads, message reads and health
  diagnostics. Mock data exercised the flow. A LinkedIn connector called an
  older external CLI and normalized its responses; it was not evidence of a
  working current integration. iMessage, X and Gmail were planned, not shipped
  connectors.
- A mock Hermes adapter by default and an optional local adapter that invoked
  `hermes chat` on an explicit ask/draft action. Listing conversations did not
  invoke the agent. The longer-term idea was a local Hermes API connection.
- Backend routes for conversation/message reads, private body retrieval,
  manual sync and sync history, connector health, draft creation and
  approval/rejection, and asking Hermes. There was no sending route.

## Ideas worth reusing

Keep platform-specific responses behind connectors. Normalize conversations,
participants and messages into a local store, using the source and its object
ID as the identity. Record sync attempts separately so failures and progress
are visible without depending on UI state.

Keep draft creation, review and sending separate. The prototype stored drafts
and approval timestamps, but approval only recorded intent. A future sender
needs its own explicit confirmation and verified result. Use one agent adapter
for assistance rather than embedding separate model behavior in each connector.

Keep private message content out of list responses and audit logs. The
prototype separated message metadata from body retrieval and redacted sensitive
log fields. That separation is useful; its implementation was not a complete
security boundary.

Build and test the local mock flow before connecting accounts. The original
sequence was storage, read-only ingestion, keyboard UI, agent assistance,
then approval records. Sending, background scheduling, credential management,
public exposure and multi-user support were outside that prototype's scope.
Its original channel wishlist included email; Hermes DM Inbox's current scope
continues to defer email until the DM model is proven.

## Gaps to avoid carrying forward

- The plan said bodies were never stored in plaintext. The code stored bodies
  and drafts as ordinary SQLite text. A separate table and a
  `confirm_private=1` query parameter provide neither encryption nor
  authentication.
- Readiness was based on database access. Connector and agent diagnostics were
  returned, but did not determine the ready status. A missing or failing
  LinkedIn CLI could become an empty, apparently successful sync.
- The draft editor changed local UI state, but approval sent only the draft ID.
  Edited text was not saved before approval. Persist the reviewed text and
  bind approval to that revision before implementing a sender.
- The local agent adapter used a subprocess, a timeout and read-only prompt/tool
  settings. These did not establish a secure tool sandbox or a production
  integration contract.
- The June status note reported 30 backend tests, five frontend tests and a
  successful build after fixing duplicate generated JavaScript and async test
  warnings. Those results were not rerun for this documentation change and do
  not prove live account access, delivery, or security.

## Earlier research pointers

The kickoff drew on [Cloudflare's agentic inbox](https://github.com/cloudflare/agentic-inbox)
for mailbox/storage boundaries, [LangChain's agent inbox](https://github.com/langchain-ai/agent-inbox)
for explicit approval records, and [Inbox Zero](https://github.com/elie222/inbox-zero)
for triage and follow-up workflows. It also listed AgenticMail and familiar
keyboard-driven mail clients as references. These were research leads in the prototype; any future selection needs a fresh
evaluation.
