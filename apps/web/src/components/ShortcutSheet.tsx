import { useInboxStore } from "@/hooks/useInboxStore";
import { Kbd } from "@/components/ui/kbd";
import { FocusTrap } from "@/components/ui/focus-trap";

const SECTIONS: { title: string; rows: [string, string][] }[] = [
  {
    title: "Global",
    rows: [
      ["⌘K", "Command palette"],
      ["/", "Search"],
      ["?", "This help"],
      ["g i", "Go to Important"],
      ["g s", "Go to Sent"],
      ["g a", "Go to All"],
    ],
  },
  {
    title: "Navigation",
    rows: [
      ["j / k", "Move selection"],
      ["Enter", "Open thread / focus composer"],
      ["u", "Back to list"],
    ],
  },
  {
    title: "Triage",
    rows: [
      ["e", "Mark done — acknowledges an FYI (no-op while a draft is in flight or in the composer)"],
      ["s", "Snooze (hidden until it returns)"],
      ["p", "Toggle priority"],
    ],
  },
  {
    title: "Hermes & composer",
    rows: [
      ["d", "Draft reply — a follow-up on Sent threads"],
      ["1 2 3", "Pick a draft angle"],
      ["a", "Add picked draft to chat"],
      ["c", "Focus composer"],
      ["⌘⏎", "Send message"],
      ["r", "Refine draft (focus studio chat)"],
      ["Esc", "Leave composer / close modal"],
    ],
  },
];

export function ShortcutSheet() {
  const open = useInboxStore((s) => s.shortcutsOpen);
  const setShortcuts = useInboxStore((s) => s.setShortcuts);
  if (!open) return null;

  return (
    // Backdrop: click OR Escape dismisses. The dialog semantics live on the
    // panel (FocusTrap) below — the backdrop is just the dismiss affordance,
    // made keyboard-legible for react-doctor a11y; real Esc is global.
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
      onClick={() => setShortcuts(false)}
      onKeyDown={(e) => {
        if (e.key === "Escape") setShortcuts(false);
      }}
      role="button"
      tabIndex={-1}
      aria-label="Close keyboard shortcuts"
    >
      {/* M5: aria-modal means it — trap focus; tabIndex -1 lets the panel
          itself take focus (this sheet has no focusable children). */}
      <FocusTrap
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        className="animate-scale-in w-full max-w-[35rem] overflow-hidden rounded-xl border border-border bg-popover shadow-2xl outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-[0.8125rem] font-semibold tracking-[-0.01em]">Keyboard shortcuts</h2>
          <Kbd>esc</Kbd>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 p-4">
          {SECTIONS.map((s) => (
            <div key={s.title} className="space-y-1.5">
              <p className="text-[0.625rem] font-medium uppercase tracking-wider text-muted-foreground">
                {s.title}
              </p>
              {s.rows.map(([k, label]) => (
                <div key={k} className="flex items-center justify-between gap-3 py-0.5">
                  <span className="text-[0.75rem] text-muted-foreground">{label}</span>
                  <span className="flex shrink-0 gap-1">
                    {k.split(" ").map((part) => (
                      <Kbd key={`${k}:${part}`}>{part}</Kbd>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </FocusTrap>
    </div>
  );
}
