import { useInboxStore } from "@/hooks/useInboxStore";
import { Kbd } from "@/components/ui/kbd";

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
      ["e", "Mark done — acknowledges an FYI (Add to chat when a draft is picked)"],
      ["s", "Snooze (hidden until it returns)"],
      ["p", "Toggle priority"],
    ],
  },
  {
    title: "Hermes & composer",
    rows: [
      ["d", "Draft reply — a follow-up on Sent threads"],
      ["1 2 3", "Pick a draft angle"],
      ["e", "Add picked draft to chat"],
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
      onClick={() => setShortcuts(false)}
      role="dialog"
      aria-label="Keyboard shortcuts"
      aria-modal="true"
    >
      <div
        className="animate-scale-in w-full max-w-[35rem] overflow-hidden rounded-xl border border-border bg-popover shadow-2xl"
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
                    {k.split(" ").map((part, i) => (
                      <Kbd key={i}>{part}</Kbd>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
