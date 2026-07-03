import type { SourceId } from "@/lib/types";
import { cn } from "@/lib/utils";

// Inline SVG brand glyphs — no network deps, no mono-text tags ("iMsg" read as
// "1Msg"). Muted brand tints keep source recognition instant without shouting.
export function SourceIcon({
  source,
  className,
  muted = false,
}: {
  source: SourceId;
  className?: string;
  muted?: boolean;
}) {
  const cls = cn("shrink-0", className);
  if (source === "imessage") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill={muted ? "currentColor" : "#34C759"}
        className={cls}
        aria-hidden
      >
        <path d="M12 2C6.477 2 2 5.943 2 10.8c0 2.807 1.53 5.305 3.914 6.917-.113.965-.505 2.263-1.514 3.283-.16.162-.04.44.19.42 1.85-.16 3.32-.94 4.3-1.68.98.24 2.02.36 3.11.36 5.523 0 10-3.943 10-8.8S17.523 2 12 2z" />
      </svg>
    );
  }
  if (source === "linkedin") {
    return (
      <svg
        viewBox="0 0 24 24"
        fill={muted ? "currentColor" : "#0A66C2"}
        className={cls}
        aria-hidden
      >
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
      </svg>
    );
  }
  // X
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={cls} aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zM17.083 19.77h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
