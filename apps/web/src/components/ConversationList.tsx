import { useMemo } from "react";
import { useInboxStore } from "@/hooks/useInboxStore";
import { BUCKET_META } from "@/lib/types";
import { ConversationRow } from "@/components/ConversationRow";
import { EmptyBucket, ErrorState, ListSkeleton } from "@/components/StatusStates";

export function ConversationList() {
  const loadState = useInboxStore((s) => s.loadState);
  const conversations = useInboxStore((s) => s.conversations);
  const activeBucket = useInboxStore((s) => s.activeBucket);
  const sourceFilter = useInboxStore((s) => s.sourceFilter);
  const selectedId = useInboxStore((s) => s.selectedId);
  const selectId = useInboxStore((s) => s.selectId);
  const retryLoad = useInboxStore((s) => s.retryLoad);
  const now = useInboxStore((s) => s.now);

  // Derive with useMemo so the render never depends on a fresh-array snapshot.
  const list = useMemo(
    () =>
      conversations
        .filter((c) => c.bucket === activeBucket)
        .filter((c) => sourceFilter === "all" || c.source === sourceFilter)
        .sort((a, b) => +new Date(b.lastActivity) - +new Date(a.lastActivity)),
    [conversations, activeBucket, sourceFilter],
  );

  return (
    <div className="flex h-full min-w-0 flex-col border-r border-border">
      <div className="flex shrink-0 flex-col justify-center gap-0.5 border-b border-border px-4 py-1.5">
        <h2 className="flex items-center gap-2 text-[0.78125rem] font-semibold tracking-[-0.01em]">
          {BUCKET_META[activeBucket].label}
          {/* An errored sync can't vouch for a count — show unknown, not stale. */}
          <span className="tnum rounded-full bg-muted/70 px-1.5 py-px font-mono text-[0.65625rem] tabular-nums text-muted-foreground">
            {loadState === "error" ? "—" : list.length}
          </span>
        </h2>
        {/* One-line semantics so the bucket model is self-evident (Elijah addendum). */}
        <p className="truncate text-[0.65625rem] text-muted-foreground">
          {BUCKET_META[activeBucket].desc}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        {loadState === "loading" ? (
          <ListSkeleton />
        ) : loadState === "error" ? (
          <ErrorState source="iMessage" onRetry={retryLoad} />
        ) : list.length === 0 ? (
          <EmptyBucket label={BUCKET_META[activeBucket].label} />
        ) : (
          list.map((c) => (
            <ConversationRow
              key={c.id}
              conversation={c}
              selected={c.id === selectedId}
              now={now}
              onClick={() => selectId(c.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
