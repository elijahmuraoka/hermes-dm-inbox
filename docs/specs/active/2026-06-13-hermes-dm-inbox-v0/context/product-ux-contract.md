# Product UX Contract

## Product stance

Hermes DM Inbox should feel like:

> **A local, keyboard-first DM cockpit where Hermes pre-sorts conversations, drafts replies, and makes every share-to-agent or external action explicit and reversible.**

It is not just a chronological feed. It is a triage and drafting cockpit.

## UX principles

1. **Triage first.** Default home answers “what needs my attention?” not “what arrived newest?”
2. **Keyboard is product, not polish.** Hotkeys and command palette ship in Phase 0.
3. **Hermes is visible but not intrusive.** The agent suggests, drafts, classifies, and explains; the human remains in control.
4. **Sharing state is always visible.** Bodies are always readable by you; *not-shared* (default, quiet) vs *shared-with-Hermes* must feel different.
5. **Drafts are review objects.** Drafts need versions, status, evidence, and approval state.
6. **Source differences are metadata, not separate apps.** iMessage/LinkedIn/X should feel unified while preserving source capabilities.
7. **Speed over configurability in v0.** Avoid complex rules/settings until the loop is excellent.

## Primary information architecture

### Surfaces

| Surface | Purpose |
|---|---|
| Inbox/Triage | process conversations by priority/action bucket |
| Thread | read selected conversation with privacy state |
| Draft panel | ask Hermes, edit/regenerate/approve draft intent |
| Command palette | execute all actions without leaving keyboard |
| Draft queue | review pending generated drafts |
| Search | find people/messages/tasks across sources |
| Audit/share log | inspect share-to-agent and other privacy-sensitive events |
| Settings/connectors | source health, sync, connector setup guidance |

### Core buckets

Default buckets:

- Needs Reply
- Drafted
- Waiting
- FYI
- Done

These are local states derived from message metadata, user corrections, and Hermes suggestions. They are not the same as source-native folders.

## Main layout

```text
┌────────────────────────────────────────────────────────────────┐
│ top bar: source filter, search, sync status, command palette    │
├───────────────┬──────────────────────────────┬─────────────────┤
│ buckets       │ conversation list             │ thread + draft  │
│ sources       │ triage state / preview        │ messages        │
│ saved filters │ urgency / draft status        │ Hermes panel    │
└───────────────┴──────────────────────────────┴─────────────────┘
```

Phase 0 can simplify to two columns plus modal command palette:

- left: conversation list
- right: thread + draft panel

## Keyboard contract

Global:

| Key | Action |
|---|---|
| `Cmd+K` | command palette |
| `?` | shortcut help |
| `/` | search |
| `g i` | inbox |
| `g d` | drafts |
| `g a` | audit/share log |
| `r` | sync/refresh |

Conversation navigation:

| Key | Action |
|---|---|
| `j/k` | move selection |
| `Enter` | open thread |
| `u` | back to list |
| `e` | mark done/archive locally |
| `s` | snooze/later |
| `l` | label |
| `p` | priority toggle |

Hermes/draft:

| Key | Action |
|---|---|
| `d` | draft reply |
| `Shift+D` | draft with custom instructions |
| `t` | triage selected/thread |
| `m` | summarize thread |
| `a` | approve draft intent |
| `r` | regenerate draft when draft focused |
| `x` | reject draft |

Sharing (see the Privacy/sharing UX section — bodies are always visible to the human):

| Key | Action |
|---|---|
| `Shift+V` | share selected body with Hermes for the current task |
| `Esc` | close modal |

## Command palette taxonomy

Command categories:

- Navigate: inbox, drafts, audit, settings
- Sync: sync all, sync source, connector health
- Search: global search, source search, person search
- Triage: classify unread, mark done, waiting, FYI, noise
- Draft: draft reply, regenerate, change tone, shorten, approve intent
- Privacy: share with Hermes, unshare, view audit log
- Tasks: create follow-up, show tasks, mark complete
- Labels: add/remove label, saved filters

Rules:

- Every command has a keyboard path.
- Every command has a primitive/CLI equivalent where practical.
- Privacy-sensitive commands require visible confirmation.
- Commands should show scope: selected conversation, thread, source, or global.

## Triage workflow

Human loop:

1. Open Needs Reply.
2. Move with `j/k`.
3. Use Hermes suggested label/priority.
4. Press `d` to generate draft or `e` to mark done.
5. Press `s` to snooze if no action now.
6. Correct Hermes classification when wrong.

Hermes should compute:

- likely needs reply
- urgency
- relationship/source context
- likely follow-up task
- suggested bucket
- suggested draft availability

Hermes should not:

- auto-send
- auto-share raw bodies
- auto-delete/archive source messages in v0

## Draft workflow

Draft lifecycle:

```text
not_started
→ requested
→ generated
→ edited
→ approved_intent
→ future send_queued / sent
```

Draft panel requirements:

- shows instructions used
- shows body policy used: metadata/full-body
- shows model/locality: mock/local/cloud if applicable
- supports regenerate with reason
- supports tone/length controls
- stores versions
- approval records intent only until send path exists

Draft controls:

- make warmer
- make shorter
- make more direct
- add context
- remove apology
- preserve my voice
- regenerate from selected messages

## Privacy/sharing UX

> **DECISION — Elijah, 2026-07-03 (supersedes the earlier redacted/revealed/shared tri-state).**
> Hermes DM Inbox is a **single-user, local** app. Redacting a message body *from the human who owns it* is
> friction with no benefit, so it is removed entirely: **message bodies are always fully visible to the
> user** — no blur, no "reveal to me" step, no `v` shortcut, no human-view audit event.
>
> The only privacy boundary that carries weight is **what enters the agent's context**. The model therefore
> collapses to a **binary** per message:

| State | Meaning | Visual treatment |
|---|---|---|
| Not shared (default) | body is visible to you but **not** in Hermes' context | **no chrome at all** |
| Shared with Hermes | body is in Hermes' context for the current task | one subtle amber "share" badge (+ audit) |

Rules:

- Hermes drafts from **metadata only by default**; it sees full bodies only after an explicit share.
- Sharing is an explicit, **reversible** act (`Shift+V` / "Share with Hermes"; "Unshare from Hermes" undoes it).
- A shared body raises the draft panel's body-policy line from `metadata_only` to `explicit_full_body`.
- The agent still cannot grant itself body access; sharing is always a human action, and it is audited.

Sharing copy should be explicit:

- “Share with Hermes”
- “Hermes will receive this message body for this drafting task.”
- “Unshare from Hermes”

## Search UX

Default search should be safe/redacted:

- searches metadata, participants/aliases, labels, redacted previews, task text
- body search requires explicit body-search design later
- results show source, participant, date, bucket, redacted preview

Possible later modes:

- body search after local-only encrypted/FTS design
- semantic search over locally approved text
- relationship memory search

## Connector UX

Connector settings should show:

- source name
- connected/available/missing tool state
- last sync
- last error
- capabilities: read, write disabled, attachments, pagination
- setup hint

Do not make connector setup block Phase 0. Mock source should work out of the box.

## What to design before implementation

Must define now:

- main layout
- hotkeys
- command palette categories
- bucket model
- share-to-Hermes language
- draft lifecycle
- loading/empty/error states
- performance expectations

Can defer:

- visual theme depth
- animations
- mobile layout
- saved filter customization
- advanced rules
- team collaboration

## Phase 0 UI promise

A public user can run the app with mock data and:

1. see a fast inbox list
2. navigate with keyboard
3. open a thread and read every message body
4. see the default (not-shared) state carry no privacy chrome
5. explicitly share a mock body with Hermes (and unshare it)
6. ask mock Hermes to draft
7. approve draft intent
8. inspect audit events
9. run matching `hdi` commands

## What not to over-design

Do not over-design:

- Gmail-specific email workflows
- sending UI
- multi-account/team collaboration
- complex automation/rules engine
- native desktop app chrome
- CRM graph
- plugin marketplace
- background daemon UI

## Product risks

1. If the UI is chronological-feed-first, it will feel like a worse Messages app.
2. If Hermes is hidden, the product loses its unique value.
3. If Hermes is too autonomous, privacy trust breaks.
4. If the shared-with-Hermes state is subtle, users will not understand what the agent saw.
5. If draft approvals are not durable records, future send path will be unsafe.
6. If connector quirks dominate the UI, it stops feeling unified.

## Recommended design direction

Aesthetic: crisp, dense, power-user, low-latency, calm. More Superhuman command center than chatbot. Hermes should feel like a drafting/triage co-pilot embedded in the workflow, not a generic chat sidebar.

Implementation should optimize:

- 60fps list navigation for mock/large data
- command palette under 100ms perceived open time
- no layout shift while drafting/loading
- clear privacy badges
- fast keyboard recovery from every modal
