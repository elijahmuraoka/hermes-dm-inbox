import { useEffect, useMemo } from "react";
import { Command } from "cmdk";
import { useInboxStore } from "@/hooks/useInboxStore";
import { BUCKET_META, SOURCE_META, type Bucket, type SourceId } from "@/lib/types";
import { Kbd } from "@/components/ui/kbd";
import {
  ArrowRight,
  Check,
  FileText,
  Inbox,
  RefreshCw,
  Search,
  Share2,
  Wand2,
} from "lucide-react";

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
  const setBucket = useInboxStore((s) => s.setBucket);
  const setSourceFilter = useInboxStore((s) => s.setSourceFilter);
  const setShortcuts = useInboxStore((s) => s.setShortcuts);
  const markDone = useInboxStore((s) => s.markDone);
  const snooze = useInboxStore((s) => s.snooze);
  const requestDraft = useInboxStore((s) => s.requestDraft);
  const approveDraft = useInboxStore((s) => s.approveDraft);
  const selected = useInboxStore((s) => s.selected());

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

  const commands: Cmd[] = useMemo(() => {
    const list: Cmd[] = [
      // Navigate
      ...(Object.keys(BUCKET_META) as Bucket[]).map((b) => ({
        id: `nav-${b}`,
        label: `Go to ${BUCKET_META[b].label}`,
        group: "Navigate",
        scope: "global" as Scope,
        keys: BUCKET_META[b].key || undefined,
        icon: Inbox,
        run: withClose(() => setBucket(b)),
      })),
      // NOTE: no "Sync" commands yet — sync doesn't exist in the mock slice, and a
      // no-op command would be a fake affordance (honesty guardrail). Phase 1 adds
      // real mock sync + the `r` rebinding per the keyboard contract.
      // Source filter
      { id: "src-all", label: "Filter: all sources", group: "Search", scope: "source", icon: Search, run: withClose(() => setSourceFilter("all")) },
      ...(Object.keys(SOURCE_META) as SourceId[]).map((s) => ({
        id: `src-${s}`,
        label: `Filter: ${SOURCE_META[s].label}`,
        group: "Search",
        scope: "source" as Scope,
        icon: Search,
        run: withClose(() => setSourceFilter(s)),
      })),
      // Triage
      {
        id: "triage-done",
        label: "Mark selected done",
        group: "Triage",
        scope: "selected",
        keys: "e",
        icon: Check,
        run: withClose(() => markDone()),
        disabled: !selected,
      },
      {
        id: "triage-snooze",
        label: "Snooze selected → Waiting",
        group: "Triage",
        scope: "selected",
        keys: "s",
        icon: ArrowRight,
        run: withClose(() => snooze()),
        disabled: !selected,
      },
      // Draft
      {
        id: "draft-reply",
        label: "Draft reply with Hermes",
        group: "Draft",
        scope: "thread",
        keys: "d",
        icon: Wand2,
        run: withClose(() => requestDraft()),
        disabled: !selected,
      },
      {
        id: "draft-approve",
        label: "Approve draft intent",
        group: "Draft",
        scope: "thread",
        keys: "a",
        icon: FileText,
        run: withClose(() => approveDraft()),
        disabled: !selected || selected.draft.versions.length === 0,
      },
      // Privacy — the one gate
      {
        id: "priv-share",
        label: "Share next body with Hermes",
        group: "Privacy",
        scope: "thread",
        keys: "⇧V",
        icon: Share2,
        run: withClose(() => useInboxStore.getState().shareNext()),
        disabled: !selected,
      },
      {
        id: "priv-unshare",
        label: "Undo last share",
        group: "Privacy",
        scope: "thread",
        keys: "z",
        icon: Share2,
        run: withClose(() => useInboxStore.getState().unshareLast()),
        disabled: !selected,
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
          label: "Demo: empty bucket state",
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, setBucket, setSourceFilter, markDone, snooze, requestDraft, approveDraft, setShortcuts]);

  const groups = useMemo(() => {
    const order = ["Navigate", "Sync", "Search", "Triage", "Draft", "Privacy", "Dev"];
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
      <div
        className="animate-scale-in w-full max-w-[560px] overflow-hidden rounded-xl border border-border bg-popover shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Command
          loop
          className="flex flex-col"
          label="Command palette"
        >
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search className="size-4 text-muted-foreground" />
            <Command.Input
              autoFocus
              placeholder="Type a command or search…"
              className="h-11 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground"
            />
            <Kbd>esc</Kbd>
          </div>
          <Command.List className="max-h-[52vh] overflow-y-auto p-1.5">
            <Command.Empty className="px-3 py-6 text-center text-[12.5px] text-muted-foreground">
              No matching commands.
            </Command.Empty>
            {groups.map(([group, cmds]) => (
              <Command.Group
                key={group}
                heading={
                  <span className="px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
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
                    <span className="flex-1 text-[12.5px]">{c.label}</span>
                    <span className="rounded-[4px] bg-muted/60 px-1.5 py-px font-mono text-[9.5px] text-muted-foreground">
                      {SCOPE_LABEL[c.scope]}
                    </span>
                    {c.keys && <Kbd>{c.keys}</Kbd>}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

const cmdItemClass =
  "flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-foreground " +
  "data-[selected=true]:bg-accent data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-40 " +
  "aria-selected:bg-accent";
