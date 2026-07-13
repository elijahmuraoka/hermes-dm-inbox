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
import { Kbd } from "@/components/ui/kbd";
import { FocusTrap } from "@/components/ui/focus-trap";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { MD_QUERY, XL_QUERY } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

/** ONE mechanism decides which draft surface exists (pressure-test nit):
    CSS-hiding kept the losing surface mounted — duplicate DOM for probes and
    a dead Esc at desktop. JS unmounts it instead. */
function useIsXl() {
  const [xl, setXl] = useState(() => window.matchMedia(XL_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia(XL_QUERY);
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
  const hintDismissed = useInboxStore((s) => s.hintDismissed);
  const isXl = useIsXl();

  // Mock initial sync → ready, then select the first row (shows skeletons briefly).
  // Dev/demo: ?state=empty and ?state=error land on those states instead, so the
  // empty/error UI can be render-verified without editing fixtures. DEV-gated
  // (review L6) — a deployed URL must not be state-spoofable.
  useEffect(() => {
    const demo = import.meta.env.DEV
      ? new URLSearchParams(window.location.search).get("state")
      : null;
    const t = window.setTimeout(() => {
      if (demo === "empty" || demo === "error") {
        useInboxStore.getState().demoState(demo);
        return;
      }
      useInboxStore.setState({ loadState: "ready" });
      setView("important");
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
        {/* First-run affordance (v7): one dismissible line, not a tour. */}
        {!hintDismissed && <HintBar />}
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
              needs the room); below xl it's the overlay (sheet <md, right
              drawer md–xl — R20). Exactly ONE of the two surfaces is mounted
              at a time (useIsXl). */}
          {selected && isXl && (
            <div className="flex">
              <HermesDraftPanel conversation={selected} />
            </div>
          )}
        </main>
      </div>

      {/* Mobile drawer (<md): hamburger → the same view/source rail. */}
      {drawerOpen && <MobileDrawer onClose={() => setDrawer(false)} />}
      {/* R9: the drawer only exists below md (md:hidden) — crossing the
          breakpoint auto-closes it, or the stale open-state swallows keys
          behind an invisible overlay and re-pops uninvited on re-narrow. */}
      {drawerOpen && <DrawerAutoClose onClose={() => setDrawer(false)} />}

      {/* Below xl the hero loop lives in an overlay surface — opened by `d`,
          the thread's Draft button, or any draft request. Never a silent
          mutation. R20 (Elijah): the ANCHOR is responsive — bottom sheet
          below md (phone pattern), RIGHT drawer md–xl (horizontal room);
          same state, same trap, same key matrix, only the presentation
          changes. A persistent panel at lg would starve the thread pane
          (~rail+list+21.25rem leaves <300px at 1024) — overlay keeps the
          reading balance.
          PINNED (R9 audit, R10): draftSheetOpen deliberately OUTLIVES an
          xl-crossing — above xl the side panel shows the same surface, so a
          re-narrow RESUMING the surface is continuity, not stale state; the
          key/Esc arms are visibility-gated (XL_QUERY). Do not "fix". */}
      {selected && draftSheetOpen && !isXl && (
        <div
          className="fixed inset-0 z-40 flex flex-col justify-end bg-black/45 backdrop-blur-sm md:flex-row"
          onClick={() => setDraftSheet(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setDraftSheet(false);
          }}
          role="button"
          tabIndex={-1}
          aria-label="Close draft"
        >
          {/* R2: the fourth aria-modal gets the same trap as the other three.
              The backdrop above is just the dismiss affordance (react-doctor
              a11y); the dialog semantics live on the FocusTrap; real Esc is
              global. */}
          <FocusTrap
            role="dialog"
            aria-modal="true"
            aria-label="Hermes draft"
            className={cn(
              "animate-sheet-up flex max-h-[78dvh] min-h-[320px] flex-col overflow-hidden rounded-t-2xl border-t border-border bg-card shadow-2xl",
              "md:ml-auto md:h-full md:max-h-none md:w-[21.25rem] md:animate-drawer-in-right md:rounded-none md:border-l md:border-t-0",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* grab handle — a phone affordance; the md+ drawer has the
                panel's own close button */}
            <div className="flex justify-center pt-2 md:hidden" aria-hidden>
              <span className="h-1 w-9 rounded-full bg-muted-foreground/30" />
            </div>
            <HermesDraftPanel conversation={selected} mode="sheet" />
          </FocusTrap>
        </div>
      )}

      <CommandPalette />
      <ShortcutSheet />
    </div>
  );
}

/** One quiet line under the topbar until dismissed once (localStorage) —
    the unlabeled cockpit gets a signpost, not a tour. */
function HintBar() {
  const dismissHint = useInboxStore((s) => s.dismissHint);
  return (
    // role="status": advisory line, announced politely, and inside the
    // landmark structure for axe's region rule.
    <div
      role="status"
      className="flex h-7 shrink-0 items-center gap-1.5 border-b border-border bg-muted/20 px-3 text-[0.6875rem] text-muted-foreground"
    >
      <span className="flex items-center gap-1 truncate">
        Press <Kbd>?</Kbd> for shortcuts · <Kbd>j</Kbd>
        <Kbd>k</Kbd> to move
      </span>
      <button
        type="button"
        onClick={dismissHint}
        aria-label="Dismiss hint"
        className="ml-auto flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}

/** R9: mounts only while the drawer is open; closes it the moment the md
    breakpoint is crossed (or if it somehow opened at ≥md). The overlay is
    md:hidden — open-state must not outlive the surface it opens, or it
    swallows keys behind an invisible layer and re-pops on re-narrow. */
function DrawerAutoClose({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const mq = window.matchMedia(MD_QUERY);
    const sync = () => {
      if (mq.matches) onClose();
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [onClose]);
  return null;
}

/** aria-modal must mean it: focus moves in on open, Tab is trapped, focus
    restores to the opener on close — via the shared useFocusTrap (M5). */
function MobileDrawer({ onClose }: { onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef);

  return (
    // Backdrop: click OR Escape dismisses (react-doctor a11y); the dialog
    // semantics live on the inner panel; real Esc is handled globally.
    <div
      className="fixed inset-0 z-40 flex bg-black/45 backdrop-blur-sm md:hidden"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      role="button"
      tabIndex={-1}
      aria-label="Close views and sources"
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
