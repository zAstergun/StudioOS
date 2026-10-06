import { useEffect, useMemo, useState } from "react";
import { AI_PROVIDERS, type AISettings } from "./ai";

/* ---------------------------------------------------------------- types */

export type TrashRetentionDay = 1 | 7 | 30 | 90;

export type HistoryEntry = {
  id: string;
  tool: string;
  toolName: string;
  title: string;
  summary: string;
  tag?: string;
  content: string;
  createdAt: number;
  favorite: boolean;
};

export type TrashEntry = HistoryEntry & { deletedAt: number };

/* -------------------------------------------------------------- config */

export type StudioConfig = AISettings & {
  trashDays: TrashRetentionDay;
};

export const POLL_MS = 400;
export const HIST_KEY = "studioos.history.v1";
export const TRASH_KEY = "studioos.trash.v1";
export const CONFIG_KEY = "studioos.config.v1";
export const QUOTA = 100;
export const TRASH_QUOTA = 60;

export const RETENTION_OPTIONS: { days: TrashRetentionDay; label: string }[] = [
  { days: 1, label: "1 dia" },
  { days: 7, label: "7 dias" },
  { days: 30, label: "30 dias" },
  { days: 90, label: "90 dias" },
];

function loadConfig(): StudioConfig {
  const saved = read<Partial<StudioConfig>>(CONFIG_KEY, {});
  const oldProvider = read<string>("ai_provider", "google");
  const provider = saved.provider ?? (
    oldProvider === "grok" ? "xai" :
    oldProvider === "gemini" ? "google" :
    oldProvider === "groq" ? "openai" : oldProvider
  );
  const known = AI_PROVIDERS.find((item) => item.id === provider);
  const oldTemperature = Number(read<string>("ai_temp", "0.7"));

  return {
    apiKey: saved.apiKey ?? (read<string>("ai_api_key", "") || read<string>("studioos.apikey.v1", "")),
    provider,
    model: saved.model ?? ((oldProvider === "groq" || oldProvider === "grok" ? "" : read<string>("ai_model", "")) || known?.models[0] || ""),
    baseUrl: saved.baseUrl ?? read<string>("ai_base_url", ""),
    temperature: saved.temperature ?? (Number.isFinite(oldTemperature) ? oldTemperature : 0.7),
    trashDays: saved.trashDays ?? 30,
  };
}

/* --------------------------------------------------------------- utils */

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota */
  }
}

/** item garbage-collected or never deleted? */
export function daysLeft(entry: TrashEntry, retention: TrashRetentionDay) {
  const remaining = retention * 86400000 - (Date.now() - entry.deletedAt);
  return Math.max(0, Math.ceil(remaining / 86400000));
}

export function purgeTrash() {
  const cfg = read<Partial<StudioConfig>>(CONFIG_KEY, {});
  const retention = cfg.trashDays ?? 30;
  const trash = read<TrashEntry[]>(TRASH_KEY, []);
  const kept = trash.filter((t) => daysLeft(t, retention) > 0);
  if (kept.length !== trash.length) write(TRASH_KEY, kept);
}

export function makeEntry(
  data: Omit<HistoryEntry, "id" | "createdAt" | "favorite">
): HistoryEntry {
  return {
    ...data,
    id: `h.${Date.now()}.${Math.random().toString(16).slice(2, 8)}`,
    createdAt: Date.now(),
    favorite: false,
  };
}

/** push entry into history (called by tools) */
export function saveToHistory(data: Omit<HistoryEntry, "id" | "createdAt" | "favorite">) {
  const entry = makeEntry(data);
  const history = read<HistoryEntry[]>(HIST_KEY, []);
  // avoid exact duplicate runs
  if (history[0] && history[0].tool === entry.tool && history[0].content === entry.content) {
    return entry;
  }
  write(HIST_KEY, [entry, ...history].slice(0, QUOTA));
  window.dispatchEvent(new Event("studioos:history"));
  return entry;
}

/* ---------------------------------------------------------------- hook */

export function useStudioOS() {
  const [history, setHistory] = useState<HistoryEntry[]>(() => read(HIST_KEY, []));
  const [trash, setTrash] = useState<TrashEntry[]>(() => {
    purgeTrash();
    return read(TRASH_KEY, []);
  });
  const [config, setConfigState] = useState<StudioConfig>(loadConfig);

  const reload = () => {
    setHistory(read(HIST_KEY, []));
    setTrash(read(TRASH_KEY, []));
    setConfigState(loadConfig());
  };

  useEffect(() => {
    purgeTrash();
    const id = window.setInterval(reload, POLL_MS);
    const onEvt = () => reload();
    window.addEventListener("storage", reload);
    window.addEventListener("studioos:history", onEvt);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("storage", reload);
      window.removeEventListener("studioos:history", onEvt);
    };
  }, []);

  const api = useMemo(
    () => ({
      clearHistory: () => {
        write(HIST_KEY, []);
        setHistory([]);
      },
      restore: (id: string) => {
        const item = read<TrashEntry[]>(TRASH_KEY, []).find((t) => t.id === id);
        if (!item) return;
        const { deletedAt, ...rest } = item;
        void deletedAt;
        const trashNow = read<TrashEntry[]>(TRASH_KEY, []).filter((t) => t.id !== id);
        write(TRASH_KEY, trashNow);
        write(HIST_KEY, [rest, ...read<HistoryEntry[]>(HIST_KEY, [])].slice(0, QUOTA));
        reload();
      },
      deleteForever: (id: string) => {
        write(TRASH_KEY, read<TrashEntry[]>(TRASH_KEY, []).filter((t) => t.id !== id));
        reload();
      },
      emptyTrash: () => {
        write(TRASH_KEY, []);
        setTrash([]);
      },
      setApiKey: (key: string) => {
        const next = { ...config, apiKey: key };
        setConfigState(next);
        write(CONFIG_KEY, next);
        try {
          localStorage.setItem("ai_api_key", key);
          if (key) localStorage.setItem("studioos.apikey.v1", key);
          else localStorage.removeItem("studioos.apikey.v1");
        } catch {
          /* ignore */
        }
      },
      setTrashDays: (days: TrashRetentionDay) => {
        const next = { ...config, trashDays: days };
        setConfigState(next);
        write(CONFIG_KEY, next);
        purgeTrash();
      },
      setAISettings: (settings: Partial<AISettings>) => {
        const next = { ...config, ...settings };
        setConfigState(next);
        write(CONFIG_KEY, next);
        try {
          localStorage.setItem("ai_provider", next.provider);
          localStorage.setItem("ai_model", next.model);
          localStorage.setItem("ai_base_url", next.baseUrl);
          localStorage.setItem("ai_temp", String(next.temperature));
        } catch {
          /* ignore */
        }
      },
    }),
    [config]
  );

  return { history, trash, config, reload, ...api };
}

/* ----------------------------------------------------- drop / trash ops */

/** move a history entry to the trash bin */
export function dropToTrash(entry: HistoryEntry) {
  const history = read<HistoryEntry[]>(HIST_KEY, []).filter((h) => h.id !== entry.id);
  write(HIST_KEY, history);
  const trash = read<TrashEntry[]>(TRASH_KEY, []);
  write(TRASH_KEY, [{ ...entry, deletedAt: Date.now() }, ...trash].slice(0, TRASH_QUOTA));
  window.dispatchEvent(new Event("studioos:history"));
}

/** toggle favorite flag */
export function toggleFavorite(id: string) {
  const history = read<HistoryEntry[]>(HIST_KEY, []);
  const next = history.map((h) => (h.id === id ? { ...h, favorite: !h.favorite } : h));
  write(HIST_KEY, next);
  window.dispatchEvent(new Event("studioos:history"));
}
