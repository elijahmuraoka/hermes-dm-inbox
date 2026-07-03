import { useInboxStore } from "@/hooks/useInboxStore";
import { Kbd } from "@/components/ui/kbd";

const SECTIONS: { title: string; rows: [string, string][] }[] = [
  {
    title: "Global",
    rows: [
      ["⌘K", "Command palette"],
      ["/", "Search"],
      ["?", "This help"],
      ["g i", "Go to inbox (Needs Reply)"],
      ["g d", "Go to Drafted"],
    ],
  },
  {
    title: "Navigation",
    rows: [
      ["j / k", "Move selection"],
      ["Enter", "Open thread"],
      ["u", "Back to list"],
    ],
  },
  {
    title: "Triage",
    rows: [
      ["e", "Mark done"],
      ["s", "Snooze → Waiting"],
      ["p", "Toggle priority"],
    ],
  },
  {
    title: "Hermes & sharing",
    rows: [
      ["d", "Draft reply (opens panel)"],
      ["a", "Approve draft intent"],
      ["r", "Regenerate (draft focused)"],
      ["⇧V", "Share next body with Hermes"],
      ["z", "Undo last share"],
      ["Esc", "Close modal / sheet"],
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
        className="animate-scale-in w-full max-w-[560px] overflow-hidden rounded-xl border border-border bg-popover shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-[13px] font-semibold tracking-[-0.01em]">Keyboard shortcuts</h2>
          <Kbd>esc</Kbd>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 p-4">
          {SECTIONS.map((s) => (
            <div key={s.title} className="space-y-1.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {s.title}
              </p>
              {s.rows.map(([k, label]) => (
                <div key={k} className="flex items-center justify-between gap-3 py-0.5">
                  <span className="text-[12px] text-muted-foreground">{label}</span>
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
