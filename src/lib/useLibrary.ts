import { useSyncExternalStore } from "react";
import { library, LibrarySnapshot } from "./library";

export function useLibrary(): LibrarySnapshot {
  return useSyncExternalStore(
    library.subscribe,
    library.getSnapshot,
    library.getSnapshot
  );
}
