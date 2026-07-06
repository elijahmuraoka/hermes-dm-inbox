# DESIGN.md — Hermes DM Inbox

The living design contract for the inbox web app (`apps/web/`). Generated code obeys this; update it in the
same change as any design change. This is the project tier of the `/design` context cascade — the universal
anti-slop canon is the floor beneath it, this file wins on conflict.

> **Stance:** a dark-operator DM *cockpit* — dense, calm, instant, keyboard-first. Closer to Superhuman /
> Linear than a CRUD admin panel. Dark is the primary theme; a crisp light theme ships alongside it via a
> toggle that matches the Tomoji main app. The one thing that must feel unmistakable is **Hermes's
> presence** — amber marks where the agent is working (see §3).

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
  --muted-foreground:  oklch(0.74 0.016 255);    /* AA on near-black, incl. 10–11px */
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
  --muted-foreground:  oklch(0.44 0.014 262);    /* AA on near-white, incl. 10–11px */
  --border:            oklch(0.20 0.02 260 / 10%);
  --primary:           oklch(0.48 0.16 245);     /* deep blue-cyan (AA retune) — same family as dark */
  --ring:              oklch(0.48 0.16 245 / 50%);
}
```

Accent lives in the **blue-cyan family in both themes** (near Tomoji's blue `--primary`) so the two modes read
as siblings. Use `--primary` **sparingly** — selection, focus, the active bucket, one live indicator. It is a
scalpel, not a coat of paint. **Sibling accent tokens DERIVE from the base pair** (review H3, 2026-07-04):
`--view-important`, `--status-unread`, `--sidebar-primary`, `--sidebar-ring`, and `--glow-primary` are
`var(--primary)`-based, and `--urgency-high` is `var(--destructive)`, in BOTH themes — an AA retune of the
base token must move the whole family, never fork it.

**Depth without slop:** separation comes from **layered surface tokens + hairline borders (alpha) + soft
shadows**, never from heavy grey blocks or the AI-purple gradient. At most one faint ambient glow behind the
primary focal area; never a decorative gradient wash (canon §3).

---

## 2. Type & numerals

- **Sans:** Geist Sans (fallback `ui-sans-serif, system-ui`). **Mono:** Geist Mono / IBM Plex Mono for
  timestamps, counts, IDs, keycaps, source handles. **Never Inter, never Georgia, never Roboto** (canon §5).
- **Root-scaled** (Elijah, 2026-07-03: "+~8%, easier to read, same discipline"): every font size and
  structural width is **rem-based**, and `html { font-size: 108% }` is the ONE scale knob — proportions hold,
  density rhythm intact. Dense power-user scale at the 108% root: base **0.8125rem body (~14px rendered)**,
  0.75rem metadata (~13px), 0.6875rem keycaps (~11.9px); rows 2.5rem (~43px). Headings tight
  (`letter-spacing:-0.01em`). Line-height 1.35–1.45 in dense lists. Hairlines (edge ticks, borders) stay px.
- **Numerals rule (fixes the flagship `$1,180` defect):** one `Num`/`Metric` treatment everywhere —
  `font-variant-numeric: tabular-nums`, the currency/unit affix rendered in a **fixed unit slot at ~0.62em on
  the *same baseline*** (not a floating superscript), consistent prefix-vs-suffix per metric type. No bespoke
  per-card numeral sizing.

---

## 3. Inbox-specific tokens (semantic, theme-aware)

Define once, both themes. Components reference these, never raw colors.

| Token | Meaning | Dark | Light |
|---|---|---|---|
| `--view-important` | Important accent — home, what matters now | cyan `--primary` | blue `--primary` |
| `--view-sent`      | Sent — open threads, your side of the net | green | green |
| `--view-all`       | All — the neutral ledger | slate/muted | slate/muted |
| `--draft-ready`    | a Hermes draft awaits (row chip/dot) | soft violet-blue | soft violet-blue |
| `--status-ok`      | sync healthy | green | green |
| `--urgency-high`  | priority HIGH dot (Hermes triage) | `--destructive` | `--destructive` |
| `--status-unread` | unread dot/weight | `--primary` | `--primary` |
| **Hermes presence ↓** | | | |
| `--hermes` | amber — marks Hermes surfaces (mark chip, studio, HERMES label) AND the medium-priority dot: priority is Hermes's triage voice | oklch(0.8 0.14 70) | oklch(0.48 0.15 60) |

> Where this table names a base token (`--primary`, `--destructive`), the CSS **must** define the
> semantic token as `var()` of it — never a copied literal (review H3: copied literals forked the
> accent when the base was retuned for AA).

> **DECISION v4 — Elijah, 2026-07-03 (supersedes v2's sharing apparatus).** The consent theater is
> collapsed: **no "Hermes sees this thread" chip, no Block/Allow switch, no share ticks, no body-policy
> pill, no provenance rows.** Your agent reading your thread when you ask it to draft needs no badge or
> off-switch — that's what asking means. **Amber is REFRAMED as Hermes's presence color**: it marks where
> the agent is (the wing chip, the studio chat, the HERMES strip label) — never "what Hermes sees".
> (Still standing from v1/v2: bodies always visible to the human; drafting reads the thread, full stop.)

> **DECISION v5 — Elijah, 2026-07-03 (supersedes the five-bucket taxonomy AND the parked four-bucket
> proposal).** The five buckets collapse to **three VIEWS: Needs Reply · Sent · All**. Reasoning: the
> buckets' internal logic ("whose court is the ball in?") was right, but five resting places meant five
> inboxes to check; a view is a way of looking, not a place things live. **Naming:** a turn-based pair
> ("Your turn / Their turn") was considered for its symmetry, but **familiar names won** — Needs Reply
> and Sent are words every inbox user already owns; **the one novel move is Sent-as-open-threads**, not
> the vocabulary. Specifics:
> **Needs Reply** is home — everything waiting on you, reply or act (absorbs the old Needs Reply +
> Drafted; ready drafts chip and boost within their priority tier). Every row carries a **priority
> slot** — red dot high · amber dot medium · empty normal — Hermes-computed urgency with the words in
> the tooltip; visible in All too.
> **Sent** shows **open threads only** by default, grouped: **"Needs follow-up"** (sent, no response,
> ≥3 days quiet) on top — `d` there drafts an angle-aware nudge (gentle nudge / direct ask / brief
> bump) — then **"Awaiting"** (fresh). Sent-and-done threads hide behind a subtle **"Show done"**
> toggle at the top of the list (honest count, nothing silently disappears); `e` on a sent thread marks
> it done and it leaves the default view.
> **All** is the trust anchor — everything, newest first.
> **FYI and Done die as views**: "no action" is not a place you visit — done items live in All (and
> behind Sent's toggle when the last word was yours). **Snoozed is not a view either**: hidden from the
> working views until it returns, honest count in the rail, still present in All. **Post-send routing
> simplifies:** a send always lands the thread in Sent (open); Hermes only *suggests* done-vs-open in a
> one-quiet-line strip (Mark done / Reopen). Sent's accent moved OFF amber — amber stays
> Hermes-presence-only (v4), which the medium-priority dot honors: priority is Hermes's triage voice.

> **DECISION v6 — Elijah, 2026-07-04 (revises v5's home view).** Home is renamed **IMPORTANT** and
> gains two SECTIONS, grouped like Sent's needs-follow-up/awaiting pattern (headers, not toggles):
> **NEEDS REPLY** on top — ball-in-your-court items, priority-sorted exactly as v5's home (red tier →
> draft-boost → oldest) — and **FYI** below, collapsible with an honest count — important info to
> know, no reply expected. `e` on an FYI row **acknowledges** it: it leaves Important and lives on in
> All (audited `triage.ack`). Priority dots order the FYI section too: urgency desc, then **newest**
> first — info is not debt; fresh intel matters most, and acknowledging isn't answering, so the
> oldest-unanswered rule stays a needs-reply rule. **The admission gate is importance** (Hermes
> triage, human-correctable): unimportant items of BOTH kinds live only in All. **Triage policy:**
> direct questions default INTO Important regardless of sender — err inclusive on needs-reply, a
> missed real question costs more than skimming past noise; **FYI errs exclusive** — a section you
> must sweep is only worth sweeping if everything in it matters. Rationale: v5's Needs Reply answered
> "whose court is the ball in?" but never "does it matter?", so cold outreach ranked beside investor
> questions and important context (an intro landing tomorrow, a teammate's ship note) had no home at
> all. v5's harder call — FYI is not a VIEW — stands: this is not a resting place you visit, it's the
> important slice of "know this" surfaced where you already look, and it drains via `e`. The rail
> reads **Important / Sent / All**; `g i` goes home; the view subtitle is "What matters now".

---

## 4. Layout & density

Full target (3-pane) — Phase 0 may ship 2-col + modal palette (contract-approved):

```
┌ topbar: search(/) · sync status · ⌘K ──────────────────────────────────┐
├ views/sources ───┬ conversation list ────────────┬ thread + Hermes draft ┤
│ Important    ·N  │ [header: view · desc · filter  │ messages (all bodies  │
│ Sent         ·N  │  chips] [row: dot · src · name │  readable) …          │
│ All          ·N  │  · priority · chips · preview  │ ── Hermes draft panel │
│ ☾ Snoozed     N  │  · time — 1 line, 40px]        │  (lifecycle, studio)  │
└──────────────────┴────────────────────────────────┴───────────────────────┘
```

- **Density = Superhuman:** conversation row is **single-line, 40px** (locked "ledger" treatment, §5), 4px
  spacing base, hairline row separators (alpha border), no heavy card chrome per row.
- Selected row: **full-row `--primary` wash (10%) + 1px inset primary ring** — quiet but unambiguous.
- **Edge language:** the row's left edge carries selection — **cyan = where you are** (full-row wash +
  inset ring). (v4: the amber share tick is gone; amber now lives on Hermes surfaces, not rows.)
- Left rail is quiet (Tomoji `--sidebar*`); the **list is the workhorse**, the thread/draft the focus.
- **Default sort orders are SPEC (v5/v6 — Elijah):** each view's order is the argument for its existence.
  **Important groups by what's owed (v6)** — the NEEDS REPLY section first, sorted by leverage:
  priority desc (Hermes triage), then draft-ready boost within the tier (the fastest wins), then
  **oldest-unanswered** — it's a triage queue, and old debt must surface; newest-first would bury
  exactly what's slipping. The FYI section below: priority desc, then **newest** — info is not debt,
  fresh intel first. **Sent groups by obligation** — "Needs follow-up" (≥3d quiet, stalest first: the
  longest silence is the one to chase) above "Awaiting" (fresh, newest first), done hidden behind the
  toggle. **All sorts newest-first** — the familiar skim; its trust comes from omitting nothing, not
  from cleverness. Sort **overrides** exist on every view (⌘K-reachable: default / newest / oldest);
  an override flattens the grouping in Sent AND Important (the FYI fold only exists while grouped —
  hidden rows with no visible header would be a silent omission), and a non-default sort is always
  visibly chipped in the filter bar — the list never silently reorders.
- **No layout shift** while drafting/loading (contract perf rule) — reserve space; skeletons match final metrics.

---

## 5. Component contract (what generated code must produce)

Each ships with **all states** — default · hover · focus-visible · selected · loading/skeleton · empty · error
· disabled. States are first-class (canon: missing states = defect).

1. **ConversationRow** — **LOCKED: the "ledger" treatment** (bake-off winner, Elijah 2026-07-03; "edge" and
   "card" variants deleted). Single-line 2.5rem: unread dot slot · **brand source icon** (inline SVG, no
   mono text tags) · fixed-width name (9.25rem) · **priority slot** (fixed width: red high · amber
   medium · empty normal; Hermes-computed, words in the tooltip; `p` cycles the tiers) · flex preview ·
   tabular time. Selection = full-row primary wash + inset ring (no avatar, no share ticks — v4).
   **The row speaks the active view's language (v5/v6):** Important shows a `Draft` chip when a Hermes
   draft is ready (that's the leverage) and an `ack · e` affordance on FYI rows (know it, clear it);
   Sent shows days-quiet (`4d`) and a `nudge · d` affordance once stale (that's the time pressure);
   All shows a `snoozed` chip where honest (the skim omits nothing). `j/k` moves selection, `Enter`
   opens. **v7 hover parity:** hovering fades the time + affordance chips into a quiet action cluster
   in the same slot — done/ack · draft/nudge · snooze — tooltips carrying the keys; the row is a div
   wrapping the select button plus the sibling cluster (buttons never nest), and the cluster is
   `tabIndex=-1` (keyboard's path is `e`/`d`/`s`).
2. **ViewNav** — the three views (one-line semantics `desc` under the list header) + sources with brand
   icons, live counts (tabular); active view uses `--primary` edge. A non-interactive **Snoozed count**
   sits under the views when > 0 (not a view — an honest tally of what's hidden). Lives in the **side
   rail from `md` up**; below `md` it's a **hamburger → left drawer** (no top chip bar at tablet widths
   — Elijah's call). `g i` / `g s` / `g a` navigate the views. The list header also carries the
   **filter chip bar** (sources · unread · has-draft · active person · non-default sort) — filters and
   sort bite on every view, so they must be visible on every view. In Sent, a subtle **"Show done"
   toggle** with an honest count sits at the top of the list. In Important (v6), the two section
   headers render even when a section is empty (each with a calm one-line empty state). **v7: every
   grouped section header is a fold control** — chevron + honest population count stay visible while
   its rows hide (the F1 title==rail rule generalizes: folds never change a count). Only the FYI fold
   persists (F5); the others are session-only. Sent's Done section keeps the toggle as its one control.
   When BOTH Important sections are empty, the view renders one view-level empty state, not two hollow
   section shells (pressure-test F6: accepted as better than the literal per-section spec).
3. **Thread** — message list; **every body is fully readable** (no blur, no reveal, no per-message or
   thread-level privacy chrome — v4). The Hermes strip carries only the triage rationale, with the HERMES
   label in presence amber.
4. **HermesDraftPanel = the DRAFTING STUDIO** (v4) — lifecycle
   (`requested→angles_ready→generated→iterated(n)→added_to_chat→edited→sent`). On `d` Hermes returns
   **three angled candidates** picked by number key — replies (1 warm · 2 direct · 3 brief) on a
   needs-reply thread, **follow-ups (1 gentle nudge · 2 direct ask · 3 brief bump)** on a sent thread:
   chasing, not answering (v5). The picked card is
   **read-only** at the top; under it, a **lightweight chat with Hermes**: freeform input ("tell Hermes
   what to change"), each Hermes reply = a **new version on the navigable stepper** (v1/v2/v3; hermes
   turns link to their version). Tone chips are **quick-inserts into the chat input**, not separate
   controls. No Instructions/Model/provenance meta rows — **the chat IS the instruction record**.
   **Every control carries intent: there is no bare Regenerate** — re-generation happens only through the
   chat with words attached (`r` focuses the chat input). "Add to chat" (`a`) stays the primary action
   (R20: dedicated key — `e` is mark-done everywhere; one key for two distant actions was slip-bait);
   the composer remains the only send surface. Side rail at `xl+`; below that the surface is an overlay
   whose ANCHOR is responsive (R20): bottom sheet under `md` (phone pattern), right-anchored drawer
   `md`–`xl` (horizontal room) — same state, same trap, same key matrix, only the presentation changes.
4b. **Composer** — standard messenger composer at the thread's bottom: auto-grow textarea, attachment
   button, Send. `c` or `Enter`-in-thread focuses it; `⌘Enter` sends; `Esc` returns to list scope.
   Sending appends the outgoing message — **presented exactly as a real send** (diegetic rule, §7). That
   v0 delivery is a local mock is code/commit/PR knowledge only. **v7 fast path:** clicking here is just
   replying — zero Hermes steps; a ghost **"Draft with Hermes"** button (amber wing) sits at the right
   edge while the composer is empty and no draft exists, so drafting is discoverable from where people
   already are.
5. **CommandPalette (⌘K)** — categorized (Navigate/Filter/Triage/Draft), shows scope
   (selected/thread/source/global) + the keycap for each; **<100ms perceived open**, no layout shift.
   The **person filter is a second page** (Raycast pattern) — 45 names never flood the main list;
   Backspace on an empty query returns.
6. **RoutingStrip** (v5, replaces the deleted ThreadShareState) — a send always lands the thread in
   Sent (open); Hermes only **suggests** done-vs-open in one quiet line above the composer, HERMES label
   in presence amber, with the action **one tap away** ("Mark done" / "Reopen"). Suggestion, not fait
   accompli. Renders nothing on threads without a fresh outgoing send.
7. **Keycap / focus system** — every interactive element has a **visible `:focus-visible` ring** (`--ring`);
   keyboard path is primary, mouse secondary. `?` opens the shortcut sheet.
8. **StatusStates** — shared skeleton (shimmer via house curve), empty ("You're all caught up" — calm, not a
   sad illustration; names the filters when THEY are why it's blank), error (recoverable, names the
   source + retry).

---

## 6. Motion

- **House curve** `cubic-bezier(0.22, 1, 0.36, 1)`, **180ms** default (match `--transition-duration`); ≤120ms
  for keyboard-driven selection so nav feels instant. 60fps list nav on large mock data.
- Tasteful, functional only: selection glide, panel/thread cross-fade, palette scale-in from 0.98, draft
  streaming in. **No** decorative motion, parallax, or bouncing. Honor `prefers-reduced-motion` (kill all).
- **No layout shift** ever during draft/load (contract).

> **DECISION v7 — Elijah, 2026-07-04 (the feel pass: motion-causality).** State changes must *explain
> themselves* — nothing teleports, and nothing moves for decoration:
> - **Rows animate out** on done / ack / snooze / send (slide + fade, then the height collapses so the
>   list closes its own gap; 150ms house curve). Mechanism: **exit-then-commit** — the store predicts
>   whether the mutation removes the row from the *current* view; if so, the row plays its exit and the
>   data flips at 150ms, when it's already gone. A row that stays visible (done in All, send in Sent)
>   commits instantly: motion only where the view actually changes. On send, the composer clears
>   immediately (the send being felt); only the row's data flip rides the animation.
> - **Counts tick** (rail, view title, section headers) — the new number drops in (140ms) so a shrinking
>   queue visibly reacts to triage. First paint never ticks.
> - **View switches cross-fade the list** (100ms, opacity only) and deliberately reset scroll — a fresh
>   view starts at the top.
> - Panel/sheet/drawer/palette entrances were already in place (sheet-up, drawer-in, scale-in) — verified.
> - **`prefers-reduced-motion` kills all of it**, including the exit delay: the store commits immediately,
>   so reduced-motion triage is *faster*, never just uglier.

---

## 7. Guardrails (non-negotiable)

- Anti-slop canon applies: **no AI-purple/indigo gradients, no glass-morphism everywhere, no eyebrow-chip
  hero clichés, no banned fonts, ≤ tasteful em-dash use.** One signature accent, earned depth.
- **Diegetic prototype (Elijah, 2026-07-03 — supersedes the "label mock data" rule):** the interface always
  presents the product working LEGITIMATELY — a send looks and behaves like a real send, period.
  **Meta-commentary rendered in the UI (v0/mock/demo/"not delivered" language) is a DEFECT.** Implementation
  honesty (e.g. v0 sends are local-only, nothing is delivered) lives in code comments, commit messages, and
  PR descriptions — never on the surface. Dev tooling is exempt (DEV-gated palette commands, `?state=`
  params). Fixture data stays synthetic (fictional people) but reads plausible, not watermarked.
- **Accessibility:** WCAG AA contrast in **both** themes (verify the dark cyan on near-black + light blue on
  white), full keyboard operability, visible focus, reduced-motion, ARIA on the palette/modals.
- **Privacy legibility beats aesthetics** wherever they conflict.

> **DECISION v7 — Elijah, 2026-07-04 (the feel pass: mouse parity + fast path).** "Still a little hard
> to use" was the unlabeled cockpit and the ceremony, not the model. Standing guardrails:
> - **Mouse/hover parity:** every hotkey action has a **visible mouse path**. Row hover fades the
>   time/affordance chips into a quiet action cluster in the same slot (done/ack · draft/nudge · snooze,
>   Superhuman-style; tooltips carry the keys; cluster is `tabIndex=-1` — the keyboard path is the
>   hotkeys, not forty tab stops). Thread header carries done/snooze. Section headers are fold controls
>   (chevron + honest count; FYI's fold persists, the rest are session-only; Sent's Done section stays
>   toggle-only — one control per lamp). Priority cycles via `p` and a ⌘K command. Keys render as
>   subtle keycaps ON their controls (angle cards, Add to chat, Draft, studio chat's `r`).
> - **Fast path first:** clicking the composer (or `c`) is **just replying** — zero Hermes steps, ever.
>   Drafting is assistive, not modal: a ghost "Draft with Hermes" button sits at the composer's right
>   edge (amber wing = presence) and yields the moment you type or a draft exists. The top three jobs —
>   reply, follow-up nudge, triage-to-zero — each take ≤2 decisions with zero prior knowledge.
> - **First-run affordance:** one dismissible hint line under the topbar ("Press ? for shortcuts ·
>   j/k to move"), localStorage-dismissed, **not a tour**.

---

## 8. Definition of done — first vertical slice (Phase 0 UI promise)

A slice is done only when, on a **real running app with mock data**, rendered and **looked at** across
`375 · 768 · 1024 · 1440 · 1920` in **both themes**:

1. Fast inbox list, keyboard nav (`j/k`, `Enter`, `u`), selected-row treatment correct.
2. Open a thread; **every body is fully readable**; threads carry **zero privacy chrome** (v4).
3. Amber appears ONLY as Hermes presence (mark chip, studio, HERMES label) — never as a share signal.
4. `⌘K` palette opens <100ms, categorized, keyboard-only usable; `?` shows shortcuts.
5. `d` returns **three angles**; `1/2/3` picks one; the studio chat refines it (each instruction → a new
   stepper version, visibly changed); `e` adds the active version to the composer; edit there; `⌘Enter`
   sends (appears in-thread as a real send — no meta labels).
6. Light/dark toggle flips **every** surface with full parity; no unstyled/again-grey patches.
7. Skeleton/empty/error states exist for the list and thread. No layout shift while drafting.
8. axe: 0 serious/critical; visible focus on every control; no horizontal overflow at any width.
9. **v7 feel:** the three jobs (reply · follow-up nudge · triage-to-zero) each complete **mouse-only**
   at 1440 with zero prior knowledge; triaged/sent rows animate out and counts tick (and none of it
   happens under `prefers-reduced-motion` — commits land instantly there); the first-run hint line
   shows until dismissed and stays dismissed.

~~Ship 2–3 distinct variants of the **conversation-row + shared-badge** language within this one identity
before locking (canon §8).~~ **DONE — locked 2026-07-03.** Three variants shipped (edge / ledger / card);
Elijah picked **ledger**. The losing treatments are deleted; the cyan/amber edge language from §4 is now the
row's identity contract.
