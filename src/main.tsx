import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

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
