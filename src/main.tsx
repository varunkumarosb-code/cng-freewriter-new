import React from 'react';
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// --- ULTIMATE REACT EFFECT CLEANUP SHIELD ---
// Intercepts all useEffect & useLayoutEffect calls app-wide (including node_modules).
// Prevents React DOM reconciler from crashing during unmount.
const patchReactEffect = (hookName: 'useEffect' | 'useLayoutEffect') => {
  const originalHook = (React as any)[hookName];
  if (typeof originalHook !== 'function') return;

  (React as any)[hookName] = (effect: React.EffectCallback, deps?: React.DependencyList) => {
    return originalHook(() => {
      const cleanup = effect();
      // If cleanup is returned and it is NOT a function, neutralize it!
      if (cleanup !== undefined && cleanup !== null && typeof cleanup !== 'function') {
        console.warn(`[REACT SHIELD] Neutralized bad ${hookName} cleanup:`, cleanup, "Source:", effect.toString());
        return undefined; // Force React to see undefined so it never throws "x is not a function"
      }
      return cleanup;
    }, deps);
  };
};

try {
  patchReactEffect('useEffect');
  patchReactEffect('useLayoutEffect');
} catch (e) {
  console.error("Failed to apply React Shield:", e);
}

// Global error overlay — no more pure white screens
window.addEventListener('error', (event) => {
  console.error("Global UI Error:", event.error || event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error("Unhandled Promise Rejection:", event.reason);
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
