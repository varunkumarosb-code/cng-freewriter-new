import React from "react";

interface Props { children: React.ReactNode; fallbackTitle?: string; }
interface State { hasError: boolean; error: unknown; }

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, error };
  }
  componentDidCatch(error: unknown, info: unknown) {
    try { console.error("[ErrorBoundary]", error, info); } catch {}
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto grid max-w-xl place-items-center gap-3 rounded-2xl border border-red-200 bg-white p-6 text-center dark:border-red-900/40 dark:bg-zinc-900">
          <h2 className="font-serif text-lg font-semibold text-zinc-900 dark:text-zinc-100">{this.props.fallbackTitle || "Something went wrong"}</h2>
          <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            {(this.state.error as Error)?.message ? String((this.state.error as Error).message) : "An unexpected error occurred. Your drafts are still saved locally."}
          </p>
          <button
            onClick={() => { try { this.setState({ hasError: false, error: null }); } catch {} }}
            className="inline-flex h-9 items-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
