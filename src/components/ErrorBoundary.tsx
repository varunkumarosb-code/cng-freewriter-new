import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  info: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary] Caught:", error, info);
    this.setState({ info });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, info: null });
    // Soft reset: clear view to shelf if needed
    try {
      window.location.hash = "";
    } catch {}
    // If error persists, offer reload
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-night-950 p-6">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-white/[0.08] dark:bg-night-900">
            <h2 className="font-serif text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              Something went wrong
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-zinc-600 dark:text-zinc-400">
              The app hit an unexpected error. Your stories are still saved locally. Try going back or reloading.
            </p>
            {this.state.error && (
              <pre className="mt-4 max-h-40 overflow-auto rounded-lg bg-zinc-100 p-3 text-[11px] leading-relaxed text-rose-600 dark:bg-white/[0.05] dark:text-rose-300">
                {this.state.error.message}
                {this.state.error.stack ? `\n\n${this.state.error.stack.slice(0, 1200)}` : ""}
                {this.state.info?.componentStack
                  ? `\n\nComponent stack:${this.state.info.componentStack.slice(0, 1200)}`
                  : ""}
              </pre>
            )}
            <div className="mt-5 flex gap-2">
              <button
                onClick={this.handleReset}
                className="inline-flex h-9 items-center rounded-lg bg-ember-400 px-4 text-[13px] font-bold text-night-950 hover:bg-ember-300"
              >
                Try again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex h-9 items-center rounded-lg border border-zinc-200 px-4 text-[13px] font-medium text-zinc-700 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-300 dark:hover:bg-white/[0.05]"
              >
                Reload page
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
