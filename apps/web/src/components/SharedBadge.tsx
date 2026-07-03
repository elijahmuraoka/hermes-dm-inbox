import { Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

// The ONE privacy signal. Default (not shared) renders NOTHING — no visual noise.
// A body shared into Hermes' context gets one subtle amber badge. (Elijah, 2026-07-03:
// redacted-from-the-human is gone; this single-user app always shows bodies to you.)
export function SharedBadge({
  shared,
  showLabel = false,
  className,
}: {
  shared: boolean;
  showLabel?: boolean;
  className?: string;
}) {
  if (!shared) return null;
  return (
    <span
      role="img"
      aria-label="Shared with Hermes"
      title="This message body is in Hermes' context"
      className={cn(
        "inline-flex items-center gap-1 rounded-[5px] border px-1.5 py-px text-[10.5px] font-medium",
        className,
      )}
      style={{
        color: "var(--priv-shared)",
        borderColor: "color-mix(in oklch, var(--priv-shared) 45%, transparent)",
        backgroundColor: "color-mix(in oklch, var(--priv-shared) 12%, transparent)",
      }}
    >
      <Share2 className="size-2.5" strokeWidth={2.5} />
      {showLabel && "Shared with Hermes"}
    </span>
  );
}
