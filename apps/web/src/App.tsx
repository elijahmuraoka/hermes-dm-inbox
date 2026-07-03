import { useEffect } from "react";
import { useInboxStore } from "@/hooks/useInboxStore";
import { useKeyboard } from "@/hooks/useKeyboard";
import { BucketNav } from "@/components/BucketNav";
import { Topbar } from "@/components/Topbar";
import { ConversationList } from "@/components/ConversationList";
import { Thread } from "@/components/Thread";
import { HermesDraftPanel } from "@/components/HermesDraftPanel";
import { CommandPalette } from "@/components/CommandPalette";
import { ShortcutSheet } from "@/components/ShortcutSheet";
import { NoSelection } from "@/components/StatusStates";
import { cn } from "@/lib/utils";

export default function App() {
  useKeyboard();
  const loadState = useInboxStore((s) => s.loadState);
  const selected = useInboxStore((s) => s.selected());
  const mobilePane = useInboxStore((s) => s.mobilePane);
  const draftSheetOpen = useInboxStore((s) => s.draftSheetOpen);
  const setDraftSheet = useInboxStore((s) => s.setDraftSheet);
  const drawerOpen = useInboxStore((s) => s.drawerOpen);
  const setDrawer = useInboxStore((s) => s.setDrawer);
  const setBucket = useInboxStore((s) => s.setBucket);

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
      setBucket("needs");
    }, 650);
    return () => window.clearTimeout(t);
  }, [setBucket]);

  const showThread = loadState === "ready" && selected;

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background text-foreground">
      {/* Left rail: buckets + sources live in the side rail from md up (Elijah's
          call — no top chip bar at tablet widths). Below md it's the drawer. */}
      <div className="hidden md:flex">
        <BucketNav />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex min-h-0 flex-1">
          <h1 className="sr-only">Hermes DM Inbox</h1>
          {/* List — full width in single-pane mode, fixed rail from lg. */}
          <div
            className={cn(
              "min-w-0 flex-1 lg:max-w-[340px] xl:max-w-[380px] lg:flex-none",
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
              needs the room); below xl it's the bottom sheet. */}
          {selected && (
            <div className="hidden xl:flex">
              <HermesDraftPanel conversation={selected} />
            </div>
          )}
        </main>
      </div>

      {/* Mobile drawer (<md): hamburger → the same bucket/source rail. */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 flex bg-black/45 backdrop-blur-sm md:hidden"
          onClick={() => setDrawer(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Buckets and sources"
            className="animate-drawer-in h-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <BucketNav />
          </div>
        </div>
      )}

      {/* Below xl the hero loop lives in a bottom sheet — opened by `d`, the
          thread's Draft button, or any draft request. Never a silent mutation. */}
      {selected && draftSheetOpen && (
        <div
          className="fixed inset-0 z-40 flex flex-col justify-end bg-black/45 backdrop-blur-sm xl:hidden"
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
