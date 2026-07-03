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

      // Esc closes any modal regardless of focus.
      if (e.key === "Escape") {
        if (st.paletteOpen) st.setPalette(false);
        if (st.shortcutsOpen) st.setShortcuts(false);
        if (st.draftSheetOpen) st.setDraftSheet(false);
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
          e.preventDefault();
          return void st.openThread();
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
          return void st.markDone();
        case "s":
          return void st.snooze();
        case "p":
          return void st.togglePriority();
        case "d":
          return void st.requestDraft();
        case "a":
          return void st.approveDraft();
        case "V":
          // Shift+V: share the next not-yet-shared incoming body with Hermes.
          return void st.shareNext();
        case "z":
          // z: undo the sharing gate — unshare the most recent shared body.
          return void st.unshareLast();
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
