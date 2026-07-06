import { useEffect, useRef } from "react";
import { useInboxStore } from "@/hooks/useInboxStore";
import { MD_QUERY, XL_QUERY } from "@/lib/constants";

// Keyboard is the product, not polish. Global handler with a small `g`-prefix
// state machine. Ignores typing targets and defers ⌘K to the palette itself.
//
// DISPATCH PRIORITY (review M3/L3 — order is load-bearing):
//   1. Escape — palette first, then typing scope owns it (inputs blur
//      themselves; one press = one layer), then the overlay cascade.
//   2. Palette open → it owns every key. Shortcut sheet open → hotkeys
//      OFF (R3: a true modal must not let e/s/d/j/k mutate state invisibly
//      behind it; Esc is handled above).
//   3. Typing targets → no hotkeys.
//   4. Draft sheet visibly open (<xl) → only its own draft-flow keys pass
//      (R7: it is aria-modal like the other three, and j/k retargeted the
//      selection BEHIND it — the sheet follows selectedId). Drawer open →
//      only view chords and overlay keys pass (pure nav surface).
//   5. Pending `g` chord → consume the key WHATEVER it is (a failed chord
//      must not fall through: `g e` archiving a thread was a live defect).
//   6. Contextual keys (`e` respects the draft lifecycle) → plain hotkeys.
export function useKeyboard() {
  const gPending = useRef(false);
  const gTimer = useRef<number | null>(null);

  useEffect(() => {
    const s = () => useInboxStore.getState();

    const isTyping = (el: EventTarget | null) => {
      const t = el as HTMLElement | null;
      if (!t) return false;
      const tag = t.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || t.isContentEditable;
    };

    const clearG = () => {
      gPending.current = false;
      if (gTimer.current) window.clearTimeout(gTimer.current);
    };

    const onKey = (e: KeyboardEvent) => {
      const st = s();

      // Esc closes the TOPMOST overlay only — one press, one layer.
      if (e.key === "Escape") {
        if (st.paletteOpen) return void st.setPalette(false);
        // M4: a focused input owns its own Esc (the textareas blur
        // themselves) — never blur AND close the sheet underneath.
        if (isTyping(e.target)) return;
        if (st.shortcutsOpen) st.setShortcuts(false);
        // R9: the drawer only exists below md — Esc must never burn a press
        // on an invisible layer (same rule as the sheet arm below; the
        // DrawerAutoClose in App makes this state near-impossible, belt only).
        else if (st.drawerOpen && !window.matchMedia(MD_QUERY).matches) st.setDrawer(false);
        // The sheet only exists below xl — at desktop the studio is the side
        // panel and the sheet state is dormant; Esc must never burn a press
        // on an invisible layer (pressure-test nit).
        else if (st.draftSheetOpen && !window.matchMedia(XL_QUERY).matches)
          st.setDraftSheet(false);
        return;
      }
      if (st.paletteOpen) return; // palette owns keys while open
      if (st.shortcutsOpen) return; // R3: no invisible mutations behind the ? modal
      if (isTyping(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // R7: aria-modal must mean it for KEYS, not just focus. While the
      // draft sheet is visibly open (same <xl condition as its Esc arm),
      // only keys serving the sheet's own draft flow stay live — everything
      // list-level is swallowed (j/k retargeted selectedId behind the modal
      // and the sheet follows the selection; s/p/e mutated hidden rows).
      // Native activation (Enter/Space on the focused control) still works:
      // swallowing skips the app handler without preventDefault.
      if (st.draftSheetOpen && !window.matchMedia(XL_QUERY).matches) {
        const ds = st.selected()?.draft.status;
        const live =
          e.key === "1" || e.key === "2" || e.key === "3" || // angle pick
          e.key === "r" || // refine — focus the studio chat
          e.key === "d" || // legitimate re-draft (the store guards the rest)
          e.key === "u" || // backToList also closes the sheet — a visible exit
          e.key === "/" || e.key === "?" || // palette/help stack ABOVE the sheet
          (e.key === "e" && (ds === "generated" || ds === "iterated")); // add to chat only
        if (!live) return; // j/k s p c Enter g-chords e-as-markDone: swallowed
      }
      // The drawer (the fourth aria-modal) is pure navigation: view chords
      // pass (setView closes it — a visible outcome), overlays stack above;
      // list mutations behind it are swallowed like the sheet's. R9: gate on
      // VISIBILITY (md:hidden), not bare state — a stale flag above md was
      // silently swallowing desktop keys (DrawerAutoClose is primary; belt).
      if (st.drawerOpen && !window.matchMedia(MD_QUERY).matches) {
        const live = e.key === "g" || gPending.current || e.key === "/" || e.key === "?";
        if (!live) return;
      }

      // g-prefix combos — the three views (v6): g i / g s / g a
      if (gPending.current) {
        clearG();
        if (e.key === "i") return void st.setView("important");
        if (e.key === "s") return void st.setView("sent");
        if (e.key === "a") return void st.setView("all");
        return; // L3: a failed chord swallows its key — `g e` must not archive
      }

      switch (e.key) {
        case "g":
          gPending.current = true;
          if (gTimer.current) window.clearTimeout(gTimer.current);
          gTimer.current = window.setTimeout(() => (gPending.current = false), 700);
          return;
        case "j":
          e.preventDefault();
          return void st.selectNext();
        case "k":
          e.preventDefault();
          return void st.selectPrev();
        case "Enter": {
          // R10 (a11y): a keyboard user may have TABbed onto a real control —
          // native activation must win over the list mapping (Retry sync,
          // filter chips, theme toggle, links). ONLY Enter defers: single-
          // letter hotkeys firing over a focused button is standard
          // reference-inbox behavior and stays.
          const t = e.target as HTMLElement | null;
          if (t?.closest?.('button, a[href], select, summary, [role="button"]')) return;
          // From the list: open the thread. Already in the thread: focus the
          // composer (the natural next act is replying).
          e.preventDefault();
          if (st.mobilePane === "thread") return void st.focusComposer();
          return void st.openThread();
        }
        case "c":
          // Reply: jump straight to the composer.
          e.preventDefault();
          return void st.focusComposer();
        case "u":
          e.preventDefault();
          return void st.backToList();
        case "/":
          e.preventDefault();
          return void st.setPalette(true);
        case "?":
          e.preventDefault();
          return void st.setShortcuts(true);
        case "e": {
          // Contextual: with a picked draft on the card, e = Add to chat
          // (the primary draft action); otherwise e = mark done.
          // preventDefault ALWAYS: this hotkey can move focus into the
          // composer, and the keystroke must never type a literal "e" there.
          e.preventDefault();
          const ds = st.selected()?.draft.status;
          if (ds === "generated" || ds === "iterated") return void st.addToChat();
          // M3 (completed in R2): EVERY draft-active state makes `e` a no-op —
          // one key-slip must never archive the thread and destroy in-flight
          // work. added_to_chat/edited included: blur-then-e was wiping
          // diverged composer edits unrecoverably. Archive stays reachable
          // via the hover Done button and the palette; a dedicated key
          // (shift+E?) is an open BACKLOG question.
          if (ds === "requested" || ds === "angles_ready" || ds === "added_to_chat" || ds === "edited")
            return;
          return void st.markDone();
        }
        case "s":
          return void st.snooze();
        case "p":
          return void st.togglePriority();
        case "d":
          return void st.requestDraft();
        case "1":
        case "2":
        case "3":
          // Pick a draft angle when three candidates are pending.
          if (st.selected()?.draft.status === "angles_ready") {
            e.preventDefault();
            st.chooseAngle(Number(e.key) as 1 | 2 | 3);
          }
          return;
        case "r":
          // Refine: focus the studio chat input (no bare regenerate — every
          // re-generation carries typed intent). preventDefault: focus moves
          // into an input; the keystroke must not leak.
          e.preventDefault();
          return void st.focusStudio();
        default:
          return;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
