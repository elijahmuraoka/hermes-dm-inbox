import { useMemo } from "react";
import { useInboxStore } from "@/hooks/useInboxStore";
import { VIEW_META, SOURCE_META, type SourceId } from "@/lib/types";
import { PEOPLE } from "@/lib/mock-data";
import {
  anyFilterActive,
  deriveVisible,
  isSentDone,
  sentGroup,
} from "@/lib/derive";
import { cn } from "@/lib/utils";
import { ConversationRow } from "@/components/ConversationRow";
import { EmptyView, ErrorState, ListSkeleton } from "@/components/StatusStates";
import { SourceIcon } from "@/components/SourceIcon";
import { X } from "lucide-react";

const SENT_GROUP_LABEL = {
  followup: "Needs follow-up",
  awaiting: "Awaiting",
  done: "Done",
} as const;

export function ConversationList() {
  const loadState = useInboxStore((s) => s.loadState);
  const conversations = useInboxStore((s) => s.conversations);
  const activeView = useInboxStore((s) => s.activeView);
  const filters = useInboxStore((s) => s.filters);
  const sortModes = useInboxStore((s) => s.sortModes);
  const showDoneInSent = useInboxStore((s) => s.showDoneInSent);
  const toggleShowDone = useInboxStore((s) => s.toggleShowDone);
  const selectedId = useInboxStore((s) => s.selectedId);
  const selectId = useInboxStore((s) => s.selectId);
  const retryLoad = useInboxStore((s) => s.retryLoad);
  const now = useInboxStore((s) => s.now);

  const sortMode = sortModes[activeView];

  // Derive with useMemo so the render never depends on a fresh-array snapshot.
  const list = useMemo(
    () => deriveVisible(conversations, activeView, filters, sortMode, showDoneInSent, now),
    [conversations, activeView, filters, sortMode, showDoneInSent, now],
  );
  const filtered = anyFilterActive(filters);

  // Sent's hidden-done population (for the honest toggle count).
  const doneCount = useMemo(
    () => (activeView === "sent" ? conversations.filter(isSentDone).length : 0),
    [conversations, activeView],
  );

  // Group headers only in Sent's default order — an override flattens.
  const grouped = activeView === "sent" && sortMode === "default";

  return (
    <div className="flex h-full min-w-0 flex-col border-r border-border">
      <div className="flex shrink-0 flex-col justify-center gap-0.5 border-b border-border px-4 py-1.5">
        <h2 className="flex items-center gap-2 text-[0.78125rem] font-semibold tracking-[-0.01em]">
          {VIEW_META[activeView].label}
          {/* An errored sync can't vouch for a count — show unknown, not stale. */}
          <span className="tnum rounded-full bg-muted/70 px-1.5 py-px font-mono text-[0.65625rem] tabular-nums text-muted-foreground">
            {loadState === "error" ? "—" : list.length}
          </span>
        </h2>
        {/* One-line semantics so the view model is self-evident (v5). */}
        <p className="truncate text-[0.65625rem] text-muted-foreground">
          {VIEW_META[activeView].desc}
        </p>
        <FilterBar />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        {loadState === "loading" ? (
          <ListSkeleton />
        ) : loadState === "error" ? (
          <ErrorState source="iMessage" onRetry={retryLoad} />
        ) : (
          <>
            {/* Sent only: done threads hide by default; the toggle is subtle
                but the COUNT is honest — nothing silently disappears. */}
            {activeView === "sent" && doneCount > 0 && (
              <button
                type="button"
                onClick={toggleShowDone}
                aria-pressed={showDoneInSent}
                className="flex h-7 w-full items-center gap-1.5 border-b border-border/60 px-4 text-left text-[0.6875rem] text-muted-foreground transition-colors hover:bg-accent/25 hover:text-foreground"
              >
                {showDoneInSent ? "Hide done" : "Show done"}
                <span className="tnum font-mono tabular-nums">({doneCount})</span>
              </button>
            )}
            {list.length === 0 ? (
              <EmptyView view={activeView} filtered={filtered} />
            ) : (
              list.map((c, i) => {
                const group = grouped ? sentGroup(c, now) : null;
                const prev = grouped && i > 0 ? sentGroup(list[i - 1], now) : null;
                const showHeader = group !== null && group !== prev;
                return (
                  <div key={c.id}>
                    {showHeader && (
                      <p className="border-b border-border/60 bg-muted/20 px-4 py-1 text-[0.625rem] font-medium uppercase tracking-wider text-muted-foreground">
                        {SENT_GROUP_LABEL[group]}
                      </p>
                    )}
                    <ConversationRow
                      conversation={c}
                      view={activeView}
                      selected={c.id === selectedId}
                      now={now}
                      onClick={() => selectId(c.id)}
                    />
                  </div>
                );
              })
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Filters bite on EVERY view (v5), so they must be visible on every view —
    an invisible active filter (or sort override) would make the list lie. */
function FilterBar() {
  const filters = useInboxStore((s) => s.filters);
  const activeView = useInboxStore((s) => s.activeView);
  const sortModes = useInboxStore((s) => s.sortModes);
  const setSortMode = useInboxStore((s) => s.setSortMode);
  const setSource = useInboxStore((s) => s.setSource);
  const setPersonFilter = useInboxStore((s) => s.setPersonFilter);
  const toggleUnreadFilter = useInboxStore((s) => s.toggleUnreadFilter);
  const toggleHasDraftFilter = useInboxStore((s) => s.toggleHasDraftFilter);

  const person = filters.personId ? PEOPLE[filters.personId] : null;
  const sortMode = sortModes[activeView];

  return (
    <div className="scrollbar-none -mx-1 flex items-center gap-1 overflow-x-auto px-1 pt-1">
      {(Object.keys(SOURCE_META) as SourceId[]).map((s) => (
        <FilterChip
          key={s}
          active={filters.source === s}
          label={SOURCE_META[s].label}
          onClick={() => setSource(filters.source === s ? "all" : s)}
        >
          <SourceIcon source={s} className="size-3" muted={filters.source !== s} />
          <span className="sr-only">{SOURCE_META[s].label}</span>
        </FilterChip>
      ))}
      <FilterChip active={filters.unreadOnly} label="Unread only" onClick={toggleUnreadFilter}>
        Unread
      </FilterChip>
      <FilterChip
        active={filters.hasDraftOnly}
        label="Has draft"
        onClick={toggleHasDraftFilter}
      >
        Draft
      </FilterChip>
      {person && (
        <FilterChip active label={`Clear person filter: ${person.name}`} onClick={() => setPersonFilter(null)}>
          {person.name}
          <X className="size-2.5" aria-hidden />
        </FilterChip>
      )}
      {sortMode !== "default" && (
        <FilterChip
          active
          label="Reset to the default sort"
          onClick={() => setSortMode("default")}
        >
          {sortMode === "newest" ? "Newest first" : "Oldest first"}
          <X className="size-2.5" aria-hidden />
        </FilterChip>
      )}
    </div>
  );
}

function FilterChip({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-5 shrink-0 items-center gap-1 rounded-full border px-1.5 text-[0.625rem] transition-colors",
        active
          ? "border-primary/40 bg-primary/10 text-foreground"
          : "border-border text-muted-foreground hover:bg-accent/40 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
