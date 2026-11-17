import React from "react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { LibraryProvider } from "./state/LibraryContext";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Shield: neutralize bad cleanup returning non-function
const patchReactEffect = (hookName: "useEffect" | "useLayoutEffect") => {
  const originalHook = (React as unknown as Record<string, unknown>)[hookName] as unknown as (cb: () => unknown, deps?: React.DependencyList) => void;
  if (typeof originalHook !== "function") return;
  (React as unknown as Record<string, unknown>)[hookName] = (effect: React.EffectCallback, deps?: React.DependencyList) => {
    return (originalHook as unknown as (cb: () => unknown, deps?: React.DependencyList) => unknown)(() => {
      const cleanup = effect();
      if (cleanup !== undefined && cleanup !== null && typeof cleanup !== "function") {
        try { console.warn(`[SHIELD] Neutralized bad ${hookName} cleanup:`, cleanup); } catch {}
        return undefined;
      }
      return cleanup as unknown;
    }, deps);
  };
};
try { patchReactEffect("useEffect"); patchReactEffect("useLayoutEffect"); } catch {}

window.addEventListener("error", (e) => { try { console.error("Global error:", e.error || e.message); } catch {} });
window.addEventListener("unhandledrejection", (e) => { try { console.error("Unhandled rejection:", e.reason); } catch {} });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <LibraryProvider>
        <App />
      </LibraryProvider>
    </ErrorBoundary>
  </StrictMode>
);
