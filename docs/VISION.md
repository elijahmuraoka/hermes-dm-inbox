# Vision

Hermes DM Inbox is the local-first, keyboard-first command center for private messaging.

The product consolidates iMessage, LinkedIn, X/Twitter, Gmail, and future DM surfaces into one fast inbox with the configured Hermes agent as the drafting, triage, and organization layer.

## Principles

1. **Local-first.** The app runs on the user's machine. SQLite is the source of truth. No cloud service is required.
2. **Keyboard-first.** Every common action should be faster from the keyboard than from the mouse.
3. **Hermes-native.** The configured Hermes agent is not a bolt-on chat widget. Hermes is the agent brain, with memory, skills, session search, and tool access.
4. **Connector-wrapper strategy.** Reuse existing local tools (`imsg`, `linkedin-os`, `xurl`, `gog`) instead of re-implementing OAuth or platform APIs.
5. **Approval by default.** Drafting is safe. Sending is gated. Phase 0/1 is read-only.
6. **Open-source-ready.** A new user with Hermes installed should eventually run `bun install && bun run dev` and see the mock inbox immediately.

## Product bar

The experience should feel closer to Superhuman than a dashboard: dense, calm, instant, hotkeyable, and opinionated. It should look and feel like a real product, not a CRUD admin panel.
