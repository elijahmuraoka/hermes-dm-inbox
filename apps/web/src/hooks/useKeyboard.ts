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
        else if (st.draftSheetOpen) st.setDraftSheet(false);
        return;
      }
      if (st.paletteOpen) return; // palette owns keys while open
      if (isTyping(e.target)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // g-prefix combos
      if (gPending.current) {
        clearG();
        if (e.key === "i") return void st.setBucket("needs");
        if (e.key === "d") return void st.setBucket("drafted");
        if (e.key === "a") return void st.setShortcuts(true); // audit stand-in for slice
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
          if (st.selected()?.draft.status === "generated") return void st.addToChat();
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
          return void st.regenerateDraft("Regenerate");
        default:
          return;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
