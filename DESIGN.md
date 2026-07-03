# DESIGN.md — Hermes DM Inbox

The living design contract for the inbox web app (`apps/web/`). Generated code obeys this; update it in the
same change as any design change. This is the project tier of the `/design` context cascade — the universal
anti-slop canon is the floor beneath it, this file wins on conflict.

> **Stance:** a dark-operator DM *cockpit* — dense, calm, instant, keyboard-first. Closer to Superhuman /
> Linear than a CRUD admin panel. Dark is the primary theme; a crisp light theme ships alongside it via a
> toggle that matches the Tomoji main app. The one thing that must feel unmistakable is **when a body has
> been shared into Hermes' context** — the single privacy signal (see §3).

---

## 1. Theme architecture (match the Tomoji main app)

Use the **same token system as Tomoji** so the toggle and tokens are consistent across products:

- **shadcn/ui + Tailwind v4**, CSS variables in **oklch**.
- Dark/light via a **`.dark` class on `<html>`**, driven by **`next-themes`** (`attribute="class"`,
  `defaultTheme="dark"`, `enableSystem`), with a **`mode-toggle`** control (mirror
  `packages/ui/src/components/custom/mode-toggle.tsx` in Tomoji).
- Token names match shadcn exactly: `--background --foreground --card --popover --primary --secondary
  --muted --accent --destructive --border --input --ring --sidebar*`. Add the inbox-specific tokens in §3.
- `--radius: 0.625rem`. `--transition-duration: 180ms`.

**Dark is primary.** Build and tune dark first; light must reach full parity (every surface, badge, and state
legible) before a slice is "done" — not an afterthought.

### Palette — dark (primary, "operator")

```css
.dark {
  --background:        oklch(0.16 0.012 260);   /* near-black, faint cool cast */
  --foreground:        oklch(0.95 0.006 250);
  --card:              oklch(0.20 0.014 260);
  --popover:           oklch(0.19 0.014 262);
  --muted:             oklch(0.26 0.012 260);
  --muted-foreground:  oklch(0.68 0.014 255);
  --border:            oklch(1 0 0 / 8%);        /* hairline via alpha, not a grey block */
  --input:             oklch(1 0 0 / 10%);
  --primary:           oklch(0.78 0.13 230);     /* signature cyan glow — the ONE accent */
  --primary-foreground:oklch(0.16 0.02 250);
  --accent:            oklch(0.30 0.02 250);
  --ring:              oklch(0.78 0.13 230 / 55%);
  --sidebar:           oklch(0.17 0.012 260);
}
```

### Palette — light (crisp, Superhuman-adjacent)

```css
:root {
  --background:        oklch(0.99 0.002 250);
  --foreground:        oklch(0.20 0.01 260);
  --card:              oklch(1 0 0);
  --muted:             oklch(0.97 0.003 260);
  --muted-foreground:  oklch(0.52 0.012 260);
  --border:            oklch(0.20 0.02 260 / 10%);
  --primary:           oklch(0.55 0.15 235);     /* deeper blue-cyan — same family as dark */
  --ring:              oklch(0.55 0.15 235 / 45%);
}
```

Accent lives in the **blue-cyan family in both themes** (near Tomoji's blue `--primary`) so the two modes read
as siblings. Use `--primary` **sparingly** — selection, focus, the active bucket, one live indicator. It is a
scalpel, not a coat of paint.

**Depth without slop:** separation comes from **layered surface tokens + hairline borders (alpha) + soft
shadows**, never from heavy grey blocks or the AI-purple gradient. At most one faint ambient glow behind the
primary focal area; never a decorative gradient wash (canon §3).

---

## 2. Type & numerals

- **Sans:** Geist Sans (fallback `ui-sans-serif, system-ui`). **Mono:** Geist Mono / IBM Plex Mono for
  timestamps, counts, IDs, keycaps, source handles. **Never Inter, never Georgia, never Roboto** (canon §5).
- Dense power-user scale: base **13px** body, 12px metadata, 11px keycaps; row text 13px. Headings tight
  (`letter-spacing:-0.01em`). Line-height 1.35–1.45 in dense lists.
- **Numerals rule (fixes the flagship `$1,180` defect):** one `Num`/`Metric` treatment everywhere —
  `font-variant-numeric: tabular-nums`, the currency/unit affix rendered in a **fixed unit slot at ~0.62em on
  the *same baseline*** (not a floating superscript), consistent prefix-vs-suffix per metric type. No bespoke
  per-card numeral sizing.

---

## 3. Inbox-specific tokens (semantic, theme-aware)

Define once, both themes. Components reference these, never raw colors.

| Token | Meaning | Dark | Light |
|---|---|---|---|
| `--bucket-needs`  | Needs Reply accent | cyan `--primary` | blue `--primary` |
| `--bucket-drafted`| Drafted | soft violet-blue | soft violet-blue |
| `--bucket-waiting`| Waiting | amber | amber |
| `--bucket-fyi`    | FYI | slate/muted | slate/muted |
| `--bucket-done`   | Done | green | green |
| `--urgency-high`  | urgent | `--destructive` | `--destructive` |
| `--status-unread` | unread dot/weight | `--primary` | `--primary` |
| **Sharing gate (the one privacy signal) ↓** | | | |
| `--priv-shared`   | body is in Hermes' context | subtle amber "share" badge | subtle amber badge |

> **DECISION — Elijah, 2026-07-03 (supersedes the earlier tri-state).** Redacting message bodies *from the
> human* is dead. This is a single-user local app; hiding your own messages from yourself is friction with no
> benefit. Bodies are **always fully visible to you** — no blur, no "reveal to me", no `v` step, no human-view
> audit event. The privacy model collapses to a **binary**: *not-shared* (default, **zero visual noise**) vs
> *shared-with-Hermes* (**one subtle amber badge** on the message + the body-policy line in the draft panel).

**The sharing gate is the one place to spend privacy design capital.** Hermes drafts from **metadata by
default**; pulling full bodies into its context is an explicit, reversible act (`⇧V` / "Share with Hermes",
undoable). *Shared* must be legible at a glance — amber `Share2` badge, consistent on the message and the row
— while a *not-shared* message stays completely quiet (no badge at all). Making "shared" unmistakable without
adding any chrome to the default is the Phase-0 acceptance gate (was contract risk #4).

---

## 4. Layout & density

Full target (3-pane) — Phase 0 may ship 2-col + modal palette (contract-approved):

```
┌ topbar: source filter · search(/) · sync status · ⌘K ─────────────────┐
├ buckets/sources ─┬ conversation list ────────────┬ thread + Hermes draft ┤
│ Needs Reply  ·N  │ [row: dot · src · name ·       │ messages (all bodies  │
│ Drafted      ·N  │  urgency/draft dots · preview  │  readable) …          │
│ Waiting          │  · time — 1 line, 40px]        │ ── Hermes draft panel │
│ FYI / Done       │  select=cyan wash · share=amber│  (lifecycle, controls)│
└──────────────────┴────────────────────────────────┴───────────────────────┘
```

- **Density = Superhuman:** conversation row is **single-line, 40px** (locked "ledger" treatment, §5), 4px
  spacing base, hairline row separators (alpha border), no heavy card chrome per row.
- Selected row: **full-row `--primary` wash (10%) + 1px inset primary ring** — quiet but unambiguous.
- **Edge language (the identity move):** the row's left edge carries meaning — **cyan = where you are**
  (selection), **amber = what Hermes sees** (a shared body in the thread, glowing 3px tick).
- Left rail is quiet (Tomoji `--sidebar*`); the **list is the workhorse**, the thread/draft the focus.
- **No layout shift** while drafting/loading (contract perf rule) — reserve space; skeletons match final metrics.

---

## 5. Component contract (what generated code must produce)

Each ships with **all states** — default · hover · focus-visible · selected · loading/skeleton · empty · error
· disabled. States are first-class (canon: missing states = defect).

1. **ConversationRow** — **LOCKED: the "ledger" treatment** (bake-off winner, Elijah 2026-07-03; "edge" and
   "card" variants deleted). Single-line 40px: unread dot slot · mono source glyph · fixed-width name (148px)
   · urgency/draft dots · flex preview · tabular time. Selection = full-row primary wash + inset ring;
   **shared-with-Hermes = glowing amber tick on the left edge** (no avatar, no per-row chips). `j/k` moves
   selection, `Enter` opens.
2. **BucketNav** — the 5 buckets with live counts (tabular); active bucket uses `--primary` edge. `g i/g d/g a`.
3. **Thread** — message list; **every body is fully readable** (no blur, no reveal). Incoming bodies carry a
   quiet "Share with Hermes" affordance; shared bodies flip to the amber shared badge (undoable).
4. **HermesDraftPanel** — draft lifecycle badge (`requested→generated→edited→approved_intent`), instructions
   used, **body-policy indicator** (metadata-only by default / full-body once shared), tone/length controls
   (warmer/shorter/direct…), regenerate-with-reason, version list, approve-intent. Hermes = embedded co-pilot,
   not a chat bubble sidebar.
5. **CommandPalette (⌘K)** — categorized (Navigate/Sync/Search/Triage/Draft/Privacy/Tasks/Labels), shows scope
   (selected/thread/source/global) + the keycap for each; **<100ms perceived open**, no layout shift.
6. **SharedBadge** — the binary signal from §3; renders **nothing** when not shared, one subtle amber badge
   when shared. Reused in row and thread.
7. **Keycap / focus system** — every interactive element has a **visible `:focus-visible` ring** (`--ring`);
   keyboard path is primary, mouse secondary. `?` opens the shortcut sheet.
8. **StatusStates** — shared skeleton (shimmer via house curve), empty ("Needs Reply is clear" — calm, not a
   sad illustration), error (recoverable, names the source + retry).

---

## 6. Motion

- **House curve** `cubic-bezier(0.22, 1, 0.36, 1)`, **180ms** default (match `--transition-duration`); ≤120ms
  for keyboard-driven selection so nav feels instant. 60fps list nav on large mock data.
- Tasteful, functional only: selection glide, panel/thread cross-fade, palette scale-in from 0.98, draft
  streaming in. **No** decorative motion, parallax, or bouncing. Honor `prefers-reduced-motion` (kill all).
- **No layout shift** ever during draft/load (contract).

---

## 7. Guardrails (non-negotiable)

- Anti-slop canon applies: **no AI-purple/indigo gradients, no glass-morphism everywhere, no eyebrow-chip
  hero clichés, no banned fonts, ≤ tasteful em-dash use.** One signature accent, earned depth.
- **Honesty:** mock/illustrative data is labeled; no fake precision, no lorem that implies real content.
- **Accessibility:** WCAG AA contrast in **both** themes (verify the dark cyan on near-black + light blue on
  white), full keyboard operability, visible focus, reduced-motion, ARIA on the palette/modals.
- **Privacy legibility beats aesthetics** wherever they conflict.

---

## 8. Definition of done — first vertical slice (Phase 0 UI promise)

A slice is done only when, on a **real running app with mock data**, rendered and **looked at** across
`375 · 768 · 1024 · 1440 · 1920` in **both themes**:

1. Fast inbox list, keyboard nav (`j/k`, `Enter`, `u`), selected-row treatment correct.
2. Open a thread; **every body is fully readable** (no blur, no reveal step). Default messages carry **no
   privacy chrome**.
3. Sharing a body into Hermes (`⇧V` / "Share with Hermes") flips that message to a **subtle amber shared
   badge**, undoable; the *shared* vs *not-shared* distinction is instantly legible without reading labels.
4. `⌘K` palette opens <100ms, categorized, keyboard-only usable; `?` shows shortcuts.
5. Ask mock Hermes to draft (`d`); draft lifecycle + body-policy line (**metadata-only by default**, full-body
   only after a share) visible; approve intent (`a`).
6. Light/dark toggle flips **every** surface with full parity; no unstyled/again-grey patches.
7. Skeleton/empty/error states exist for the list and thread. No layout shift while drafting.
8. axe: 0 serious/critical; visible focus on every control; no horizontal overflow at any width.

~~Ship 2–3 distinct variants of the **conversation-row + shared-badge** language within this one identity
before locking (canon §8).~~ **DONE — locked 2026-07-03.** Three variants shipped (edge / ledger / card);
Elijah picked **ledger**. The losing treatments are deleted; the cyan/amber edge language from §4 is now the
row's identity contract.
