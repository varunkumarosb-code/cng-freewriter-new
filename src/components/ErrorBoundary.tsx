import React from "react";

interface Props { children: React.ReactNode }
interface State { hasError: boolean; error: unknown; stack?: string; }

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error: unknown): State { return { hasError: true, error }; }
  componentDidCatch(error: unknown, info: unknown) {
    try { console.error("[ErrorBoundary]", error, info); } catch {}
    try {
      const stack = (error as Error)?.stack || String(error);
      this.setState({ stack });
    } catch {}
  }
  render() {
    if (this.state.hasError) {
      const msg = (this.state.error && typeof (this.state.error as Error).message === "string") ? (this.state.error as Error).message : String(this.state.error || "Unknown error");
      return (
        <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 dark:border-red-800 bg-white dark:bg-zinc-900 p-6 shadow-sm transition-all duration-300">
          <h2 className="font-serif text-lg font-semibold text-zinc-900 dark:text-zinc-100 transition-all duration-300">Something went wrong</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400 transition-all duration-300">{msg}</p>
          <pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-[#0d0d0d] p-3 font-mono text-xs text-zinc-100">{this.state.stack || "No stack"}</pre>
          <button onClick={() => { try { this.setState({ hasError: false, error: null }); } catch {} }} className="mt-4 inline-flex h-9 items-center rounded-lg bg-zinc-900 dark:bg-zinc-100 px-4 text-sm font-medium text-white dark:text-zinc-900 transition-all duration-300">Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}
