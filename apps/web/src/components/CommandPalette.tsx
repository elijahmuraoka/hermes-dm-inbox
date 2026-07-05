import { useEffect, useMemo, useState } from "react";
import { Command } from "cmdk";
import { useInboxStore } from "@/hooks/useInboxStore";
import { FocusTrap } from "@/components/ui/focus-trap";
import { VIEW_META, SOURCE_META, type SourceId, type ViewId } from "@/lib/types";
import { anyFilterActive, type SectionKey } from "@/lib/derive";
import { PEOPLE } from "@/lib/mock-data";
import { Kbd } from "@/components/ui/kbd";
import { HermesMark } from "@/components/HermesMark";
import {
  ArrowRight,
  Check,
  FileText,
  Filter,
  Flag,
  Inbox,
  RefreshCw,
  Search,
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

type Scope = "global" | "selected" | "thread" | "source";

interface Cmd {
  id: string;
  label: string;
  group: string;
  scope: Scope;
  keys?: string;
  icon: React.ComponentType<{ className?: string }>;
  run: () => void;
  disabled?: boolean;
}

const SCOPE_LABEL: Record<Scope, string> = {
  global: "Global",
  selected: "Selected",
  thread: "Thread",
  source: "Source",
};

export function CommandPalette() {
  const open = useInboxStore((s) => s.paletteOpen);
  const setPalette = useInboxStore((s) => s.setPalette);
  const setView = useInboxStore((s) => s.setView);
  const setSource = useInboxStore((s) => s.setSource);
  const setPersonFilter = useInboxStore((s) => s.setPersonFilter);
  const toggleUnreadFilter = useInboxStore((s) => s.toggleUnreadFilter);
  const toggleHasDraftFilter = useInboxStore((s) => s.toggleHasDraftFilter);
  const clearFilters = useInboxStore((s) => s.clearFilters);
  const filters = useInboxStore((s) => s.filters);
  const activeView = useInboxStore((s) => s.activeView);
  const sortModes = useInboxStore((s) => s.sortModes);
  const setSortMode = useInboxStore((s) => s.setSortMode);
  const showDoneInSent = useInboxStore((s) => s.showDoneInSent);
  const toggleShowDone = useInboxStore((s) => s.toggleShowDone);
  const collapsed = useInboxStore((s) => s.collapsed);
  const toggleSection = useInboxStore((s) => s.toggleSection);
  const conversations = useInboxStore((s) => s.conversations);
  const setShortcuts = useInboxStore((s) => s.setShortcuts);
  const markDone = useInboxStore((s) => s.markDone);
  const snooze = useInboxStore((s) => s.snooze);
  const togglePriority = useInboxStore((s) => s.togglePriority);
  const requestDraft = useInboxStore((s) => s.requestDraft);
  const addToChat = useInboxStore((s) => s.addToChat);
  const focusComposer = useInboxStore((s) => s.focusComposer);
  const sendMock = useInboxStore((s) => s.sendMock);
  const composerText = useInboxStore((s) => s.composerText);
  const selected = useInboxStore((s) => s.selected());

  // Two pages, Raycast-style: "main" and the person picker. Filtering by
  // person is ⌘K-reachable without flooding the main list with 45 names.
  // The query is controlled so a page switch starts clean; Backspace on an
  // empty query returns to the main page.
  const [page, setPage] = useState<"main" | "person">("main");
  const [search, setSearch] = useState("");
  useEffect(() => {
    if (open) {
      setPage("main");
      setSearch("");
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette(!useInboxStore.getState().paletteOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setPalette]);

  const close = () => setPalette(false);
  const withClose = (fn: () => void) => () => {
    fn();
    close();
  };

  // People present in the inbox, for the person-filter page.
  const people = useMemo(() => {
    const ids = [...new Set(conversations.map((c) => c.personId))];
    return ids
      .map((id) => PEOPLE[id])
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [conversations]);

  const commands: Cmd[] = useMemo(() => {
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
      { id: "flt-all", label: "Filter: all sources", group: "Filter", scope: "source", icon: Filter, run: withClose(() => setSource("all")) },
      ...(Object.keys(SOURCE_META) as SourceId[]).map((s) => ({
        id: `flt-${s}`,
        label: `Filter: ${SOURCE_META[s].label}`,
        group: "Filter",
        scope: "source" as Scope,
        icon: Filter,
        run: withClose(() => setSource(s)),
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
      ...(SECTION_COMMANDS[activeView] ?? []).map(({ key, label }) => ({
        id: `fold-${key}`,
        label: `${VIEW_META[activeView].label} view: ${collapsed[key] ? "expand" : "collapse"} ${label}`,
        group: "Filter",
        scope: "global" as Scope,
        icon: Filter,
        run: withClose(() => toggleSection(key)),
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
        disabled: !selected,
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
        label: selected
          ? `Cycle priority (now ${selected.urgency})`
          : "Cycle priority",
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
        disabled: !selected,
      },
      {
        id: "draft-add-to-chat",
        label: "Add draft to chat",
        group: "Draft",
        scope: "thread",
        keys: "e",
        icon: FileText,
        run: withClose(() => addToChat()),
        // sent_mock: the draft is a receipt now (L2). edited: the composer
        // has diverged work a re-add would overwrite (R3). Same guards as
        // the studio button.
        disabled:
          !selected ||
          selected.draft.versions.length === 0 ||
          selected.draft.status === "sent_mock" ||
          selected.draft.status === "edited",
      },
      {
        id: "composer-reply",
        label: "Reply (focus composer)",
        group: "Draft",
        scope: "thread",
        keys: "c",
        icon: ArrowRight,
        run: withClose(() => focusComposer()),
        disabled: !selected,
      },
      {
        id: "composer-send",
        label: "Send message",
        group: "Draft",
        scope: "thread",
        keys: "⌘⏎",
        icon: SendHorizontal,
        run: withClose(() => sendMock()),
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
    // Hand-maintained deps (no ESLint in this repo — review L14 dropped the
    // inert disable-comment; add react-hooks lint before trusting edits here).
  }, [selected, composerText, filters, activeView, sortModes, showDoneInSent, collapsed, setView, setSource, toggleUnreadFilter, toggleHasDraftFilter, clearFilters, setSortMode, toggleShowDone, toggleSection, markDone, snooze, togglePriority, requestDraft, addToChat, focusComposer, sendMock, setShortcuts]);

  const groups = useMemo(() => {
    const order = ["Navigate", "Filter", "Triage", "Draft", "Dev"];
    const byGroup = new Map<string, Cmd[]>();
    for (const c of commands) {
      if (!byGroup.has(c.group)) byGroup.set(c.group, []);
      byGroup.get(c.group)!.push(c);
    }
    return order.filter((g) => byGroup.has(g)).map((g) => [g, byGroup.get(g)!] as const);
  }, [commands]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/45 p-4 pt-[12vh] backdrop-blur-sm"
      onClick={close}
    >
      {/* M5: real dialog semantics + focus trap (cmdk autofocuses the input;
          the trap keeps Tab inside and restores focus on close). */}
      <FocusTrap
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="animate-scale-in w-full max-w-[35rem] overflow-hidden rounded-xl border border-border bg-popover shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Command
          loop
          className="flex flex-col"
          label="Command palette"
          onKeyDown={(e) => {
            if (page === "person" && e.key === "Backspace" && !search) {
              e.preventDefault();
              setPage("main");
            }
          }}
        >
          {/* NO focus ring here — the open modal IS the focus scope
              (Raycast/Linear pattern). Borderless input, caret + placeholder,
              hairline divider below, esc chip. */}
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search className="size-4 text-muted-foreground" />
            <Command.Input
              autoFocus
              value={search}
              onValueChange={setSearch}
              placeholder={page === "person" ? "Filter by person…" : "Type a command or search…"}
              className="h-11 flex-1 border-0 bg-transparent text-[0.8125rem] text-foreground shadow-none outline-none ring-0 placeholder:text-muted-foreground focus:shadow-none focus:outline-none focus:ring-0 focus-visible:!shadow-none focus-visible:!outline-none focus-visible:!ring-0"
            />
            <Kbd>esc</Kbd>
          </div>
          <Command.List className="max-h-[52vh] overflow-y-auto p-1.5">
            <Command.Empty className="px-3 py-6 text-center text-[0.78125rem] text-muted-foreground">
              {page === "person" ? "No matching people." : "No matching commands."}
            </Command.Empty>
            {page === "person" ? (
              <Command.Group
                heading={
                  <span className="px-2 text-[0.625rem] font-medium uppercase tracking-wider text-muted-foreground">
                    People
                  </span>
                }
                className="mb-1 [&_[cmdk-group-heading]]:py-1"
              >
                {people.map((p) => (
                  <Command.Item
                    key={p.id}
                    value={`${p.name} ${p.handle}`}
                    onSelect={withClose(() => setPersonFilter(p.id))}
                    className={cmdItemClass}
                  >
                    <User className="size-3.5 text-muted-foreground" />
                    <span className="flex-1 text-[0.78125rem]">{p.name}</span>
                    <span className="font-mono text-[0.625rem] text-muted-foreground">
                      {p.handle}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            ) : (
              groups.map(([group, cmds]) => (
                <Command.Group
                  key={group}
                  heading={
                    <span className="px-2 text-[0.625rem] font-medium uppercase tracking-wider text-muted-foreground">
                      {group}
                    </span>
                  }
                  className="mb-1 [&_[cmdk-group-heading]]:py-1"
                >
                  {cmds.map((c) => (
                    <Command.Item
                      key={c.id}
                      value={`${c.label} ${c.group}`}
                      disabled={c.disabled}
                      onSelect={c.run}
                      className={cmdItemClass}
                    >
                      <c.icon className="size-3.5 text-muted-foreground" />
                      <span className="flex-1 text-[0.78125rem]">{c.label}</span>
                      <span className="rounded-[4px] bg-muted/60 px-1.5 py-px font-mono text-[0.59375rem] text-muted-foreground">
                        {SCOPE_LABEL[c.scope]}
                      </span>
                      {c.keys && <Kbd>{c.keys}</Kbd>}
                    </Command.Item>
                  ))}
                </Command.Group>
              ))
            )}
          </Command.List>
        </Command>
      </FocusTrap>
    </div>
  );
}

const cmdItemClass =
  "flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-foreground " +
  "data-[selected=true]:bg-accent data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-40 " +
  "aria-selected:bg-accent";
