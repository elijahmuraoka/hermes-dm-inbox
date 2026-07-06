# Hermes DM Inbox

A local-first, keyboard-first unified DM inbox for Hermes Agent. One place to triage direct messages from iMessage, LinkedIn, and X, with an agent in the loop: Hermes proposes reply angles and drafts, a human reviews, edits, and sends.

## Why

Direct messages are scattered across apps, and each of those apps is built for casual chat, not for working through a queue. Hermes DM Inbox treats DMs the way a good email client treats mail:

- **Keyboard-first triage.** Every action has a hotkey. You move through the queue with `j`/`k`, not click-and-scroll. Keyboard is the product, not polish.
- **Agent-in-the-loop drafting.** Press `d` and Hermes reads the thread and proposes three angled reply candidates. You pick one, refine it through a small chat with the agent, then edit and send it yourself. The human always holds the send button.
- **Local-first.** Built to run on your own machine against your own data. The core loop does not depend on a hosted service.

## Status

Read this before assuming anything works.

- `main` is minimal: this README, the license and community files, and a package manifest. There is no application code on `main` yet.
- **Phase 0** is a pure frontend web slice, currently under review in [PR #1](https://github.com/elijahmuraoka/hermes-dm-inbox/pull/1) on the `feat/hermes-dm-inbox-phase-0-web-slice` branch. It is a React + Vite + TypeScript + Tailwind app driven entirely by mock fixture data: the full inbox UI, the keyboard system, and the Hermes drafting studio. There is no backend and there are **no real platform integrations**. Sends are local-only; nothing is delivered anywhere.
- Later phases add the real backend and the platform connectors (iMessage, LinkedIn, X, and likely email). None of that exists yet.

If you are evaluating whether this can read your actual DMs today: it cannot.

## Quickstart

Until PR #1 lands, the app lives on the Phase 0 branch. You need [Bun](https://bun.sh) 1.3 or newer.

```bash
git clone https://github.com/elijahmuraoka/hermes-dm-inbox.git
cd hermes-dm-inbox
git switch feat/hermes-dm-inbox-phase-0-web-slice

bun install
bun run --cwd apps/web dev        # dev server
```

Checks:

```bash
bun run --cwd apps/web typecheck  # TypeScript
bun run --cwd apps/web build      # production build
```

Once Phase 0 merges, the same commands work from `main`.

## Keyboard

The core map (press `?` inside the app for the full sheet):

| Key | Action |
| --- | --- |
| `j` / `k` | Move down / up the list |
| `g i` / `g s` / `g a` | Go to the Important / Sent / All view |
| `d` | Draft with Hermes (returns three angled candidates) |
| `1` / `2` / `3` | Pick an angle |
| `r` | Refine: focus the studio chat |
| `e` | Add the picked draft to the composer; otherwise mark done |
| `s` | Snooze |
| `/` | Open the command palette |
| `?` | Shortcut sheet |

## A note on the data

All conversation data in fixtures and screenshots is fictional. Names, messages, and companies are synthetic; any resemblance to real people or conversations is coincidental.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the toolchain, workflow, and expectations, and [SECURITY.md](SECURITY.md) for how to report vulnerabilities (privately, not via public issues).

## License

[Apache-2.0](LICENSE).
