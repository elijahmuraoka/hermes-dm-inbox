import { useEffect, useRef, useState } from "react";
import { useInboxStore } from "@/hooks/useInboxStore";
import { useKeyboard } from "@/hooks/useKeyboard";
import { ViewNav } from "@/components/ViewNav";
import { Topbar } from "@/components/Topbar";
import { ConversationList } from "@/components/ConversationList";
import { Thread } from "@/components/Thread";
import { HermesDraftPanel } from "@/components/HermesDraftPanel";
import { CommandPalette } from "@/components/CommandPalette";
import { ShortcutSheet } from "@/components/ShortcutSheet";
import { NoSelection } from "@/components/StatusStates";
import { cn } from "@/lib/utils";

/** ONE mechanism decides which draft surface exists (pressure-test nit):
    CSS-hiding kept the losing surface mounted — duplicate DOM for probes and
    a dead Esc at desktop. JS unmounts it instead. */
function useIsXl() {
  const [xl, setXl] = useState(() => window.matchMedia("(min-width: 1280px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    const onChange = (e: MediaQueryListEvent) => setXl(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return xl;
}

export default function App() {
  useKeyboard();
  const loadState = useInboxStore((s) => s.loadState);
  const selected = useInboxStore((s) => s.selected());
  const mobilePane = useInboxStore((s) => s.mobilePane);
  const draftSheetOpen = useInboxStore((s) => s.draftSheetOpen);
  const setDraftSheet = useInboxStore((s) => s.setDraftSheet);
  const drawerOpen = useInboxStore((s) => s.drawerOpen);
  const setDrawer = useInboxStore((s) => s.setDrawer);
  const setView = useInboxStore((s) => s.setView);
  const isXl = useIsXl();

  // Mock initial sync → ready, then select the first row (shows skeletons briefly).
  // Dev/demo: ?state=empty and ?state=error land on those states instead, so the
  // empty/error UI can be render-verified without editing fixtures.
  useEffect(() => {
    const demo = new URLSearchParams(window.location.search).get("state");
    const t = window.setTimeout(() => {
      if (demo === "empty" || demo === "error") {
        useInboxStore.getState().demoState(demo);
        return;
      }
      useInboxStore.setState({ loadState: "ready" });
      setView("needs_reply");
    }, 650);
    return () => window.clearTimeout(t);
  }, [setView]);

  const showThread = loadState === "ready" && selected;

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
      {/* Left rail: views + sources live in the side rail from md up (Elijah's
          call — no top chip bar at tablet widths). Below md it's the drawer. */}
      <div className="hidden md:flex">
        <ViewNav />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex min-h-0 flex-1">
          <h1 className="sr-only">Hermes DM Inbox</h1>
          {/* List — full width in single-pane mode, fixed rail from lg. */}
          <div
            className={cn(
              "min-w-0 flex-1 lg:max-w-[21.25rem] xl:max-w-[23.75rem] lg:flex-none",
              mobilePane === "thread" ? "hidden lg:block" : "block",
            )}
          >
            <ConversationList />
          </div>

          {/* Thread — single-pane below lg; side-by-side from lg. */}
          <div
            className={cn(
              "min-w-0 flex-1 border-r border-border",
              mobilePane === "list" ? "hidden lg:flex lg:flex-col" : "flex flex-col",
            )}
          >
            {showThread ? <Thread conversation={selected} /> : <NoSelection />}
          </div>

          {/* Draft panel — persistent side rail at xl+ (rail+list+thread+panel
              needs the room); below xl it's the bottom sheet. Exactly ONE of
              the two surfaces is mounted at a time (useIsXl). */}
          {selected && isXl && (
            <div className="flex">
              <HermesDraftPanel conversation={selected} />
            </div>
          )}
        </main>
      </div>

      {/* Mobile drawer (<md): hamburger → the same view/source rail. */}
      {drawerOpen && <MobileDrawer onClose={() => setDrawer(false)} />}

      {/* Below xl the hero loop lives in a bottom sheet — opened by `d`, the
          thread's Draft button, or any draft request. Never a silent mutation. */}
      {selected && draftSheetOpen && !isXl && (
        <div
          className="fixed inset-0 z-40 flex flex-col justify-end bg-black/45 backdrop-blur-sm"
          onClick={() => setDraftSheet(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Hermes draft"
            className="animate-sheet-up flex max-h-[78dvh] min-h-[320px] flex-col overflow-hidden rounded-t-2xl border-t border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center pt-2" aria-hidden>
              <span className="h-1 w-9 rounded-full bg-muted-foreground/30" />
            </div>
            <HermesDraftPanel conversation={selected} mode="sheet" />
          </div>
        </div>
      )}

      <CommandPalette />
      <ShortcutSheet />
    </div>
  );
}

/** aria-modal must mean it: focus moves in on open, Tab is trapped, focus
    restores to the opener on close. */
function MobileDrawer({ onClose }: { onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusables = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(
          'button, [href], input, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
    focusables()[0]?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const els = focusables();
      if (!els.length) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    panel?.addEventListener("keydown", onKey);
    return () => {
      panel?.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-40 flex bg-black/45 backdrop-blur-sm md:hidden"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Views and sources"
        className="animate-drawer-in h-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <ViewNav />
      </div>
    </div>
  );
}
