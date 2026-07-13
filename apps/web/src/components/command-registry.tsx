// The command palette's REGISTRY — the (data-shaped) list of every command,
// split out of CommandPalette so the component stays presentation-only
// (react-doctor no-giant-component). buildCommands is a pure function of the
// palette context; the component memoizes it. Keeping the definitions here
// also makes the command set easy to read, test, and extend in one place.
import type { Conversation, SourceId, ViewId } from "@/lib/types";
import { VIEW_META, SOURCE_META } from "@/lib/types";
import {
  anyFilterActive,
  type CollapsedSections,
  type InboxFilters,
  type SectionKey,
  type SortMode,
} from "@/lib/derive";
import { useInboxStore } from "@/hooks/useInboxStore";
import { HermesMark } from "@/components/HermesMark";
import {
  ArrowRight,
  Check,
  FileText,
  Filter,
  Flag,
  Inbox,
  RefreshCw,
  SendHorizontal,
  User,
  X,
} from "lucide-react";

// v7: every grouped section folds; the palette carries the ACTIVE view's
// sections so folding stays keyboard-reachable (mouse path: the headers).
const SECTION_COMMANDS: Partial<Record<ViewId, { key: SectionKey; label: string }[]>> = {
  important: [
    { key: "important.needs_reply", label: "Needs reply" },
    { key: "important.fyi", label: "FYI" },
  ],
  sent: [
    { key: "sent.followup", label: "Needs follow-up" },
    { key: "sent.awaiting", label: "Awaiting" },
  ],
};

export type Scope = "global" | "selected" | "thread" | "source";

export interface Cmd {
  id: string;
  label: string;
  group: string;
  scope: Scope;
  keys?: string;
  icon: React.ComponentType<{ className?: string }>;
  run: () => void;
  disabled?: boolean;
}

export const SCOPE_LABEL: Record<Scope, string> = {
  global: "Global",
  selected: "Selected",
  thread: "Thread",
  source: "Source",
};

/** Everything buildCommands needs from the palette component. Store actions
    are stable (zustand); close/withClose are useCallback-stabilized so the
    memo that calls buildCommands does not recompute every render. */
export interface CommandContext {
  selected: Conversation | null;
  composerText: string;
  draftingIds: string[];
  filters: InboxFilters;
  activeView: ViewId;
  sortModes: Record<ViewId, SortMode>;
  showDoneInSent: boolean;
  collapsed: CollapsedSections;
  setView: (v: ViewId) => void;
  setSource: (s: SourceId | "all") => void;
  toggleUnreadFilter: () => void;
  toggleHasDraftFilter: () => void;
  clearFilters: () => void;
  setSortMode: (m: SortMode) => void;
  toggleShowDone: () => void;
  toggleSection: (k: SectionKey) => void;
  markDone: (id?: string) => void;
  snooze: (id?: string) => void;
  togglePriority: (id?: string) => void;
  requestDraft: () => void;
  addToChat: () => void;
  focusComposer: () => void;
  sendMock: () => void;
  setShortcuts: (open: boolean) => void;
  setPage: (p: "main" | "person") => void;
  setSearch: (s: string) => void;
  close: () => void;
  withClose: (fn: () => void) => () => void;
}

export function buildCommands(ctx: CommandContext): Cmd[] {
  const {
    selected,
    composerText,
    draftingIds,
    filters,
    activeView,
    sortModes,
    showDoneInSent,
    collapsed,
    setView,
    setSource,
    toggleUnreadFilter,
    toggleHasDraftFilter,
    clearFilters,
    setSortMode,
    toggleShowDone,
    toggleSection,
    markDone,
    snooze,
    togglePriority,
    requestDraft,
    addToChat,
    focusComposer,
    sendMock,
    setShortcuts,
    setPage,
    setSearch,
    close,
    withClose,
  } = ctx;

  const list: Cmd[] = [
    // Navigate — the three views (v5)
    ...(Object.keys(VIEW_META) as ViewId[]).map((v) => ({
      id: `nav-${v}`,
      label: `Go to ${VIEW_META[v].label}`,
      group: "Navigate",
      scope: "global" as Scope,
      keys: VIEW_META[v].key,
      icon: Inbox,
      run: withClose(() => setView(v)),
    })),
    // NOTE: no "Sync" commands yet — sync doesn't exist in the mock slice, and a
    // no-op command would be a fake affordance (honesty guardrail).
    // Filter — filters bite on every view (v5)
    // R13 sweep: the ACTIVE source is a dead affordance — the store's
    // no-op guard (R5) makes it costless, but a command that does nothing
    // shows disabled (same family as the sort commands).
    { id: "flt-all", label: "Filter: all sources", group: "Filter", scope: "source", icon: Filter, run: withClose(() => setSource("all")), disabled: filters.source === "all" },
    ...(Object.keys(SOURCE_META) as SourceId[]).map((s) => ({
      id: `flt-${s}`,
      label: `Filter: ${SOURCE_META[s].label}`,
      group: "Filter",
      scope: "source" as Scope,
      icon: Filter,
      run: withClose(() => setSource(s)),
      disabled: filters.source === s,
    })),
    {
      id: "flt-unread",
      label: filters.unreadOnly ? "Filter: show read too" : "Filter: unread only",
      group: "Filter",
      scope: "global",
      icon: Filter,
      run: withClose(() => toggleUnreadFilter()),
    },
    {
      id: "flt-draft",
      label: filters.hasDraftOnly ? "Filter: any draft state" : "Filter: has draft",
      group: "Filter",
      scope: "global",
      icon: Filter,
      run: withClose(() => toggleHasDraftFilter()),
    },
    {
      id: "flt-person",
      label: "Filter by person…",
      group: "Filter",
      scope: "global",
      icon: User,
      run: () => {
        setPage("person"); // stays open — the pick happens on the next page
        setSearch("");
      },
    },
    {
      id: "flt-clear",
      label: "Clear all filters",
      group: "Filter",
      scope: "global",
      icon: X,
      run: withClose(() => clearFilters()),
      disabled: !anyFilterActive(filters),
    },
    // Sort — per-view override; "default" restores the specced order
    // (priority queue in Needs Reply, grouped staleness in Sent, newest in All).
    {
      id: "sort-default",
      label: `Sort ${VIEW_META[activeView].label}: default order`,
      group: "Filter",
      scope: "global",
      icon: Filter,
      run: withClose(() => setSortMode("default")),
      disabled: sortModes[activeView] === "default",
    },
    {
      id: "sort-newest",
      label: `Sort ${VIEW_META[activeView].label}: newest first`,
      group: "Filter",
      scope: "global",
      icon: Filter,
      run: withClose(() => setSortMode("newest")),
      disabled: sortModes[activeView] === "newest",
    },
    {
      id: "sort-oldest",
      label: `Sort ${VIEW_META[activeView].label}: oldest first`,
      group: "Filter",
      scope: "global",
      icon: Filter,
      run: withClose(() => setSortMode("oldest")),
      disabled: sortModes[activeView] === "oldest",
    },
    {
      id: "sent-show-done",
      label: showDoneInSent ? "Sent view: hide done" : "Sent view: show done",
      group: "Filter",
      scope: "global",
      icon: Check,
      run: withClose(() => toggleShowDone()),
    },
    // Section folds for the ACTIVE view (v7) — the headers are the mouse path.
    // R13: folds only bite in the default (grouped) order — under a flat
    // override the command did nothing visible, then surprise-hid rows
    // when default sort returned. Honest label + disabled (same pattern
    // as the sort commands above).
    ...(SECTION_COMMANDS[activeView] ?? []).map(({ key, label }) => ({
      id: `fold-${key}`,
      label:
        `${VIEW_META[activeView].label} view: ${collapsed[key] ? "expand" : "collapse"} ${label}` +
        (sortModes[activeView] !== "default" ? " (default sort only)" : ""),
      group: "Filter",
      scope: "global" as Scope,
      icon: Filter,
      run: withClose(() => toggleSection(key)),
      disabled: sortModes[activeView] !== "default",
    })),
    // Triage
    {
      id: "triage-done",
      // On an FYI thread `e` is an acknowledge — same transition, honest verb.
      label:
        selected?.status === "fyi"
          ? "Acknowledge FYI (leaves Important, stays in All)"
          : "Mark selected done",
      group: "Triage",
      scope: "selected",
      keys: "e",
      icon: Check,
      run: withClose(() => markDone()),
      // R13 sweep: re-marking a done thread only churns state + writes a
      // second audit event claiming a transition that didn't happen.
      // PINNED (R21): deliberately ENABLED during draft-active states —
      // the M3 guard exists for single-keystroke SLIPS; the palette (and
      // the hover/header Done buttons) are intentional two-step archive
      // paths, and R15 defines the verdict's composer/handoff reconcile.
      // Do not mirror the e-key no-op here.
      disabled: !selected || selected.status === "done",
    },
    {
      id: "triage-snooze",
      label: "Snooze selected",
      group: "Triage",
      scope: "selected",
      keys: "s",
      icon: ArrowRight,
      run: withClose(() => snooze()),
      disabled: !selected,
    },
    {
      id: "triage-priority",
      // Hermes computes priority; p (and this command) is the human override.
      label: selected ? `Cycle priority (now ${selected.urgency})` : "Cycle priority",
      group: "Triage",
      scope: "selected",
      keys: "p",
      icon: Flag,
      run: withClose(() => togglePriority()),
      disabled: !selected,
    },
    // Draft
    {
      id: "draft-reply",
      label:
        selected?.status === "sent"
          ? "Draft follow-up with Hermes"
          : "Draft reply with Hermes",
      group: "Draft",
      scope: "thread",
      keys: "d",
      icon: HermesMark,
      run: withClose(() => requestDraft()),
      // R7 (mirrors the store's M7 guard, like add-to-chat below): no
      // re-request over an in-flight request or a composer handoff — the
      // item was enabled while requestDraft would silently no-op.
      disabled:
        !selected ||
        ["requested", "angles_ready", "added_to_chat", "edited"].includes(
          selected.draft.status,
        ),
    },
    {
      id: "draft-add-to-chat",
      label: "Add draft to chat",
      group: "Draft",
      scope: "thread",
      keys: "a", // R20: dedicated key — e is mark-done everywhere now
      icon: FileText,
      // R9 sweep (same ordering rule as Send/Reply): close FIRST, then the
      // focus-bumping action — its rAF focus must land after the trap's
      // restore, or the restore steals focus back from the composer.
      run: () => {
        close();
        addToChat();
      },
      // R4-3 (mirrors the store guard): only a STANDING draft can be
      // added — not a receipt (L2), not diverged composer work (R3), and
      // not a pending request whose versions are stale (R4). R8: nor
      // mid-iterate — the active version is about to be superseded.
      disabled:
        !selected ||
        selected.draft.versions.length === 0 ||
        !["generated", "iterated", "added_to_chat"].includes(selected.draft.status) ||
        draftingIds.includes(selected.id),
    },
    {
      id: "composer-reply",
      label: "Reply (focus composer)",
      group: "Draft",
      scope: "thread",
      keys: "c",
      icon: ArrowRight,
      // R9 sweep: the direct `c` ends focused in the composer; the palette
      // route raced — the tick's rAF focus could fire BEFORE the palette
      // unmounted, and the trap's restore then stole focus back to the
      // opener. Closing first puts the restore before the focus work.
      run: () => {
        close();
        focusComposer();
      },
      disabled: !selected,
    },
    {
      id: "composer-send",
      label: "Send message",
      group: "Draft",
      scope: "thread",
      keys: "⌘⏎",
      icon: SendHorizontal,
      // R9: the direct ⌘Enter path BLURS after a send (blocker #1 — list
      // scope, hotkeys live). The trap restores focus to the opener on
      // unmount — often the very textarea the send just emptied — so land
      // in list scope AFTER that restore: the trap's restore runs
      // synchronously in the unmount commit; a rAF is guaranteed later.
      run: () => {
        sendMock();
        close();
        requestAnimationFrame(() => (document.activeElement as HTMLElement | null)?.blur?.());
      },
      disabled: !selected || !composerText.trim(),
    },
    // Help
    {
      id: "help-shortcuts",
      label: "Show keyboard shortcuts",
      group: "Navigate",
      scope: "global",
      keys: "?",
      icon: ArrowRight,
      run: withClose(() => setShortcuts(true)),
    },
  ];
  // Dev-only demo triggers (also reachable via ?state=empty / ?state=error)
  if (import.meta.env.DEV) {
    list.push(
      {
        id: "dev-demo-empty",
        label: "Demo: empty view state",
        group: "Dev",
        scope: "global",
        icon: Inbox,
        run: withClose(() => useInboxStore.getState().demoState("empty")),
      },
      {
        id: "dev-demo-error",
        label: "Demo: source error state",
        group: "Dev",
        scope: "global",
        icon: RefreshCw,
        run: withClose(() => useInboxStore.getState().demoState("error")),
      },
    );
  }
  return list;
}
