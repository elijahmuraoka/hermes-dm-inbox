// The Hermes mark — a wing in three feather strokes (Elijah's pick, 2026-07-03,
// option 2 of the bake-off). Replaces the ✨ sparkle and the magic-wand icons:
// wherever Hermes acts, the wing is the signal. Inline SVG, stroke follows text color.
export function HermesMark({
  className,
  strokeWidth = 2,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M3.5 17.5 C9 17.5 11 15.5 12 12.5" />
      <path d="M5.5 13.5 C11 13 13.5 10.5 14.5 7" />
      <path d="M9 9.5 C14 9 17.5 7 20.5 4.5 C20 8 18.5 11 15.5 13.5 C12.5 16 8.5 17.5 3.5 17.5" />
    </svg>
  );
}
