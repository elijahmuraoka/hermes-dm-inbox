import { useCallback, useEffect, useMemo, useState } from "react";
import { Command } from "cmdk";
import { useInboxStore } from "@/hooks/useInboxStore";
import { FocusTrap } from "@/components/ui/focus-trap";
import { PEOPLE } from "@/lib/mock-data";
import { Kbd } from "@/components/ui/kbd";
import { Search, User } from "lucide-react";
import { buildCommands, SCOPE_LABEL, type Cmd } from "@/components/command-registry";

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
  const draftingIds = useInboxStore((s) => s.draftingIds);

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
        // R19: CLAIM the shortcut before consulting the stack — R16's guard
        // returned pre-preventDefault, so with the sheet open ⌘K fell
        // through to the BROWSER (address bar). The modal suppresses the
        // toggle, never the app's ownership of the key.
        e.preventDefault();
        // R16: this listener lives outside the useKeyboard dispatch, so it
        // must consult the modal stack itself. The shortcut sheet is the one
        // hotkeys-OFF modal (`/` is swallowed there too) — opening the
        // palette UNDER it stole focus behind an aria-modal and fed the next
        // Esc to the hidden layer. Sheet/drawer deliberately stack below the
        // palette (R7 matrix) and stay reachable.
        if (useInboxStore.getState().shortcutsOpen) return;
        setPalette(!useInboxStore.getState().paletteOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setPalette]);

  // R21 (react-doctor exhaustive-deps): close/withClose are stabilized so the
  // command memo below does not recompute every render — they were recreated
  // inline before, which the memo silently depended on.
  const close = useCallback(() => setPalette(false), [setPalette]);
  const withClose = useCallback(
    (fn: () => void) => () => {
      fn();
      close();
    },
    [close],
  );

  // People present in the inbox, for the person-filter page. flatMap changes
  // and drops in one pass (react-doctor js-flatmap-filter).
  const people = useMemo(() => {
    const ids = [...new Set(conversations.map((c) => c.personId))];
    return ids
      .flatMap((id) => {
        const p = PEOPLE[id];
        return p ? [p] : [];
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [conversations]);

  const commands: Cmd[] = useMemo(
    () =>
      buildCommands({
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
      }),
    [
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
      close,
      withClose,
    ],
  );

  const groups = useMemo(() => {
    const order = ["Navigate", "Filter", "Triage", "Draft", "Dev"];
    const byGroup = new Map<string, Cmd[]>();
    for (const c of commands) {
      if (!byGroup.has(c.group)) byGroup.set(c.group, []);
      byGroup.get(c.group)!.push(c);
    }
    // One pass over the ordered groups (react-doctor js-combine-iterations).
    return order.flatMap((g) => (byGroup.has(g) ? [[g, byGroup.get(g)!] as const] : []));
  }, [commands]);

  if (!open) return null;

  return (
    // Backdrop: click OR Escape dismisses. role/tabIndex/onKeyDown make the
    // dismiss affordance keyboard-legible (react-doctor a11y); the real
    // keyboard path is the global Esc handler, and focus stays trapped in the
    // dialog, so this element never actually takes focus.
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/45 p-4 pt-[12vh] backdrop-blur-sm"
      onClick={close}
      onKeyDown={(e) => {
        if (e.key === "Escape") close();
      }}
      role="button"
      tabIndex={-1}
      aria-label="Close command palette"
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
