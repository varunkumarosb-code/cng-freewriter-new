import React from "react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { LibraryProvider } from "./state/LibraryContext";

// React effect shield — neutralizes non-function cleanup
const patchReactEffect = (hookName: "useEffect" | "useLayoutEffect") => {
  const originalHook = (React as unknown as Record<string, unknown>)[hookName] as unknown as React.EffectCallback | undefined;
  if (typeof originalHook !== "function") return;
  (React as unknown as Record<string, unknown>)[hookName] = (effect: React.EffectCallback, deps?: React.DependencyList) => {
    return (originalHook as unknown as (cb: () => unknown, deps?: React.DependencyList) => unknown)(() => {
      const cleanup = effect();
      if (cleanup !== undefined && cleanup !== null && typeof cleanup !== "function") {
        try { console.warn(`[REACT SHIELD] Neutralized bad ${hookName} cleanup:`, cleanup); } catch {}
        return undefined;
      }
      return cleanup as unknown;
    }, deps);
  };
};

try {
  patchReactEffect("useEffect");
  patchReactEffect("useLayoutEffect");
} catch (e) {
  try { console.error("Failed to apply React Shield:", e); } catch {}
}

window.addEventListener("error", (event) => {
  try { console.error("Global UI Error:", event.error || event.message); } catch {}
});
window.addEventListener("unhandledrejection", (event) => {
  try { console.error("Unhandled Promise Rejection:", event.reason); } catch {}
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LibraryProvider>
      <App />
    </LibraryProvider>
  </StrictMode>
);
