import { useEffect, useRef } from "react";
import { useInboxStore } from "@/hooks/useInboxStore";

// Keyboard is the product, not polish. Global handler with a small `g`-prefix
// state machine. Ignores typing targets and defers ⌘K to the palette itself.
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
        if (st.paletteOpen) st.setPalette(false);
        else if (st.shortcutsOpen) st.setShortcuts(false);
        else if (st.drawerOpen) st.setDrawer(false);
        // The sheet only exists below xl — at desktop the studio is the side
        // panel and the sheet state is dormant; Esc must never burn a press
        // on an invisible layer (pressure-test nit).
        else if (st.draftSheetOpen && !window.matchMedia("(min-width: 1280px)").matches)
          st.setDraftSheet(false);
        return;
      }
      if (st.paletteOpen) return; // palette owns keys while open
      if (isTyping(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // g-prefix combos — the three views (v6): g i / g s / g a
      if (gPending.current) {
        clearG();
        if (e.key === "i") return void st.setView("important");
        if (e.key === "s") return void st.setView("sent");
        if (e.key === "a") return void st.setView("all");
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
        case "Enter":
          // From the list: open the thread. Already in the thread: focus the
          // composer (the natural next act is replying).
          e.preventDefault();
          if (st.mobilePane === "thread") return void st.focusComposer();
          return void st.openThread();
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
        case "e":
          // Contextual: with a picked draft on the card, e = Add to chat
          // (the primary draft action); otherwise e = mark done.
          // preventDefault ALWAYS: this hotkey can move focus into the
          // composer, and the keystroke must never type a literal "e" there.
          e.preventDefault();
          if (st.selected()?.draft.status === "generated" || st.selected()?.draft.status === "iterated")
            return void st.addToChat();
          return void st.markDone();
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
