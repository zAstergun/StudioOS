import { useEffect, useRef } from "react";
import { saveToHistory } from "../history";


export type HistoryInput = {
  tool: string;
  toolName: string;
  title: string;
  summary: string;
  tag?: string;
  content: string;
};

/**
 * Debounced autosave of a tool's output into the local history.
 * Dedupes consecutive identical runs and skips meaningless input.
 */
export function useAutosave(
  entry: () => HistoryInput,
  deps: unknown[],
  minLen = 10,
  delay = 2800
) {
  const last = useRef<string>("");
  const fn = useRef(entry);
  fn.current = entry;

  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        const e = fn.current();
        if (!e) return;
        const signal = e.title.trim();
        if (signal.length < minLen) return;
        const fingerprint = `${e.tool}|${e.content}`;
        if (fingerprint === last.current) return;
        last.current = fingerprint;
        saveToHistory(e);
      } catch {
        /* noop */
      }
    }, delay);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps]);
}
