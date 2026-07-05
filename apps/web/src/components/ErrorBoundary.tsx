import { Component, type ReactNode } from "react";

/** Last-resort guard (review L7): real connector data will eventually hand
    the UI something it can't render — fail to a calm reload card, never a
    white screen. Fixtures are total today; this is future-facing armor. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-background px-6 text-center text-foreground">
        <p className="text-[0.8125rem] font-medium">Something went wrong.</p>
        <p className="max-w-[18rem] text-[0.75rem] text-muted-foreground">
          Your messages are safe — reload to pick up where you left off.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-md border border-border bg-secondary px-3 py-1.5 text-[0.75rem] text-secondary-foreground transition-colors hover:bg-accent"
        >
          Reload
        </button>
      </div>
    );
  }
}
