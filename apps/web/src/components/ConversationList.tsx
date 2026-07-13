import { useMemo } from "react";
import { useInboxStore } from "@/hooks/useInboxStore";
import { VIEW_META, SOURCE_META, type Conversation, type SourceId } from "@/lib/types";
import { PEOPLE } from "@/lib/mock-data";
import {
  anyFilterActive,
  deriveVisible,
  importantGroup,
  population as derivePopulation,
  sentDoneCount,
  sentGroup,
  type SectionKey,
} from "@/lib/derive";
import { cn } from "@/lib/utils";
import { ConversationRow } from "@/components/ConversationRow";
import { EmptyView, ErrorState, ListSkeleton } from "@/components/StatusStates";
import { SourceIcon } from "@/components/SourceIcon";
import { TickNum } from "@/components/ui/tick-num";
import { ChevronDown, ChevronRight, X } from "lucide-react";

export function ConversationList() {
  const loadState = useInboxStore((s) => s.loadState);
  const conversations = useInboxStore((s) => s.conversations);
  const activeView = useInboxStore((s) => s.activeView);
  const filters = useInboxStore((s) => s.filters);
  const sortModes = useInboxStore((s) => s.sortModes);
  const showDoneInSent = useInboxStore((s) => s.showDoneInSent);
  const toggleShowDone = useInboxStore((s) => s.toggleShowDone);
  const collapsed = useInboxStore((s) => s.collapsed);
  const toggleSection = useInboxStore((s) => s.toggleSection);
  const exitingIds = useInboxStore((s) => s.exitingIds);
  const selectedId = useInboxStore((s) => s.selectedId);
  const retryLoad = useInboxStore((s) => s.retryLoad);
  const now = useInboxStore((s) => s.now);

  const sortMode = sortModes[activeView];

  // Derive with useMemo so the render never depends on a fresh-array snapshot.
  const list = useMemo(
    () =>
      deriveVisible(conversations, activeView, filters, sortMode, showDoneInSent, collapsed, now),
    [conversations, activeView, filters, sortMode, showDoneInSent, collapsed, now],
  );
  // THE population lens (review H2): same helper as the rail — title count,
  // fold-header counts, and the rail can never disagree because they are one
  // derivation (F1 rule; folds and the done-toggle never change population).
  const population = useMemo(
    () => derivePopulation(conversations, activeView, filters, now),
    [conversations, activeView, filters, now],
  );
  const filtered = anyFilterActive(filters);

  // Sent's hidden-done tally — same filter lens as everything else (H2:
  // "Show done (5)" must never reveal 1 row because a source chip is active).
  const doneCount = useMemo(
    () => (activeView === "sent" ? sentDoneCount(conversations, filters, now) : 0),
    [conversations, activeView, filters, now],
  );

  // Group headers only in the default order — an override flattens (v5/v6).
  const grouped =
    (activeView === "sent" || activeView === "important") && sortMode === "default";

  const row = (c: Conversation) => (
    <ConversationRow
      key={c.id}
      conversation={c}
      view={activeView}
      selected={c.id === selectedId}
      exiting={exitingIds.includes(c.id)}
      now={now}
    />
  );

  return (
    // v7 motion-causality: a view switch cross-fades the whole pane (and a
    // fresh view starts at the top — the remount resets scroll on purpose).
    <div
      key={activeView}
      className="animate-view-fade flex h-full min-w-0 flex-col border-r border-border"
    >
      <div className="flex shrink-0 flex-col justify-center gap-0.5 border-b border-border px-4 py-1.5">
        <h2 className="flex items-center gap-2 text-[0.78125rem] font-semibold tracking-[-0.01em]">
          {VIEW_META[activeView].label}
          {/* An errored sync can't vouch for a count — show unknown, not stale.
              The count is derive.population — the SAME call the rail makes
              (H2), so the two surfaces cannot drift; folds and the done
              toggle are display-only and never enter the number. */}
          <span className="tnum rounded-full bg-muted/70 px-1.5 py-px font-mono text-[0.65625rem] tabular-nums text-muted-foreground">
            {loadState === "error" ? "—" : <TickNum value={population.length} />}
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
          // The fixture error blames one hardcoded source (review L16) —
          // Phase 1 wires the actually-failing connector's name (DESIGN §5.8).
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
            {grouped && activeView === "important" ? (
              <ImportantSections
                list={list}
                population={population}
                collapsed={collapsed}
                toggleSection={toggleSection}
                filtered={filtered}
                row={row}
              />
            ) : grouped && activeView === "sent" ? (
              <SentSections
                list={list}
                population={population}
                collapsed={collapsed}
                toggleSection={toggleSection}
                filtered={filtered}
                showDone={showDoneInSent}
                now={now}
                row={row}
              />
            ) : list.length === 0 ? (
              <EmptyView view={activeView} filtered={filtered} />
            ) : (
              list.map(row)
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Grouped section header (v7): every header is a fold control — chevron +
    honest population count stay visible while its rows hide (F1 rule). The
    chevron sits muted at rest and strengthens on hover; a collapsed section
    keeps it at full strength — hidden rows must be legible at rest. */
function SectionHeader({
  label,
  count,
  collapsed,
  onToggle,
}: {
  label: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={!collapsed}
      className={cn(
        "group flex w-full items-center gap-1 border-b border-border/60 bg-muted/20 px-4 py-1 text-left",
        "text-[0.625rem] font-medium uppercase tracking-wider text-muted-foreground",
        "transition-colors hover:bg-accent/25 hover:text-foreground",
      )}
    >
      {collapsed ? (
        <ChevronRight className="size-3" aria-hidden />
      ) : (
        <ChevronDown className="size-3 opacity-50 transition-opacity group-hover:opacity-100" aria-hidden />
      )}
      {label}
      <span className="tnum font-mono tabular-nums">
        (<TickNum value={count} />)
      </span>
    </button>
  );
}

const plainHeaderClass =
  "border-b border-border/60 bg-muted/20 px-4 py-1 text-[0.625rem] font-medium uppercase tracking-wider text-muted-foreground";

function SectionEmpty({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-b border-border/60 px-4 py-2.5 text-[0.71875rem] text-muted-foreground">
      {children}
    </p>
  );
}

/** Important's two sections (v6), grouped like Sent's needs-follow-up/awaiting
    pattern: NEEDS REPLY on top, FYI below. Both headers are fold controls (v7);
    each carries a calm empty state — an absent header would hide the model. */
function ImportantSections({
  list,
  population,
  collapsed,
  toggleSection,
  filtered,
  row,
}: {
  list: Conversation[];
  population: Conversation[];
  collapsed: Partial<Record<SectionKey, boolean>>;
  toggleSection: (key: SectionKey) => void;
  filtered: boolean;
  row: (c: Conversation) => React.ReactNode;
}) {
  const nrRows = list.filter((c) => importantGroup(c) === "needs_reply"); // empty while folded
  const fyiRows = list.filter((c) => importantGroup(c) === "fyi");
  const nrCount = population.filter((c) => importantGroup(c) === "needs_reply").length;
  const fyiCount = population.filter((c) => importantGroup(c) === "fyi").length;

  // Both sections empty → one calm view-level state, not two hollow shells.
  if (nrCount === 0 && fyiCount === 0) return <EmptyView view="important" filtered={filtered} />;

  return (
    <>
      {nrCount > 0 ? (
        <>
          <SectionHeader
            label="Needs reply"
            count={nrCount}
            collapsed={!!collapsed["important.needs_reply"]}
            onToggle={() => toggleSection("important.needs_reply")}
          />
          {!collapsed["important.needs_reply"] && nrRows.map(row)}
        </>
      ) : (
        <>
          <p className={plainHeaderClass}>Needs reply</p>
          <SectionEmpty>
            {filtered ? "No matches waiting on you." : "Nothing needs your reply."}
          </SectionEmpty>
        </>
      )}

      {fyiCount > 0 ? (
        <>
          <SectionHeader
            label="FYI"
            count={fyiCount}
            collapsed={!!collapsed["important.fyi"]}
            onToggle={() => toggleSection("important.fyi")}
          />
          {!collapsed["important.fyi"] && fyiRows.map(row)}
        </>
      ) : (
        <>
          <p className={plainHeaderClass}>FYI</p>
          <SectionEmpty>
            {filtered ? "No matches to know about." : "Nothing new to know."}
          </SectionEmpty>
        </>
      )}
    </>
  );
}

/** Sent's grouped sections: Needs follow-up (stalest first) above Awaiting
    (fresh). Their headers fold (v7); they render only when populated — Sent
    never promised empty-section shells (that's Important's contract). Done
    rides along when the toggle shows it, under a plain header: the toggle IS
    its control, and a second fold on top would be two switches for one lamp. */
function SentSections({
  list,
  population,
  collapsed,
  toggleSection,
  filtered,
  showDone,
  now,
  row,
}: {
  list: Conversation[];
  population: Conversation[];
  collapsed: Partial<Record<SectionKey, boolean>>;
  toggleSection: (key: SectionKey) => void;
  filtered: boolean;
  showDone: boolean;
  now: number;
  row: (c: Conversation) => React.ReactNode;
}) {
  const rowsOf = (g: "followup" | "awaiting" | "done") =>
    list.filter((c) => sentGroup(c, now) === g);
  const countOf = (g: "followup" | "awaiting" | "done") =>
    population.filter((c) => sentGroup(c, now) === g).length;

  const followupCount = countOf("followup");
  const awaitingCount = countOf("awaiting");
  const doneRows = rowsOf("done");

  // Population excludes done-behind-toggle (H2) — so only go view-empty when
  // the toggle isn't currently showing done rows either.
  if (population.length === 0 && doneRows.length === 0)
    return <EmptyView view="sent" filtered={filtered} />;

  return (
    <>
      {followupCount > 0 && (
        <>
          <SectionHeader
            label="Needs follow-up"
            count={followupCount}
            collapsed={!!collapsed["sent.followup"]}
            onToggle={() => toggleSection("sent.followup")}
          />
          {!collapsed["sent.followup"] && rowsOf("followup").map(row)}
        </>
      )}
      {awaitingCount > 0 && (
        <>
          <SectionHeader
            label="Awaiting"
            count={awaitingCount}
            collapsed={!!collapsed["sent.awaiting"]}
            onToggle={() => toggleSection("sent.awaiting")}
          />
          {!collapsed["sent.awaiting"] && rowsOf("awaiting").map(row)}
        </>
      )}
      {showDone && doneRows.length > 0 && (
        <>
          <p className={plainHeaderClass}>Done</p>
          {doneRows.map(row)}
        </>
      )}
    </>
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
