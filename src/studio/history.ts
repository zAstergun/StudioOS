import { useEffect, useMemo, useState, useCallback } from "react";
import { AI_PROVIDERS, type AISettings } from "./ai";
import { useAuth, supabase } from "./auth";

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

function mapFromSupabase(row: any): HistoryEntry | TrashEntry {
  const base = {
    id: row.id,
    tool: row.tool,
    toolName: row.tool_name,
    title: row.title,
    summary: row.summary,
    tag: row.tag ?? undefined,
    content: row.content,
    createdAt: Number(row.created_at),
    favorite: row.favorite,
  };
  if (row.deleted_at) {
    return { ...base, deletedAt: Number(row.deleted_at) } as TrashEntry;
  }
  return base as HistoryEntry;
}

export async function purgeTrash() {
  const cfg = read<Partial<StudioConfig>>(CONFIG_KEY, {});
  const retention = cfg.trashDays ?? 30;

  const session = supabase ? await supabase.auth.getSession() : null;
  const user = session?.data?.session?.user;

  if (user && supabase) {
    const cutoff = Date.now() - (retention * 86400000);
    await supabase.from("studioos_history").delete().not("deleted_at", "is", null).lt("deleted_at", cutoff);

    // Purge automático de projetos expirados na lixeira
    const cutoffISO = new Date(cutoff).toISOString();
    const { data: expiredProjects } = await supabase
      .from("studioos_projects")
      .select("id")
      .eq("status", "trashed")
      .lt("created_at", cutoffISO);

    if (expiredProjects && expiredProjects.length > 0) {
      const ids = expiredProjects.map(p => String(p.id));
      await supabase.from("studioos_projects").delete().in("id", ids);
      for (const id of ids) {
        await supabase.from("studioos_saved_items").delete().filter("metadata->>id", "eq", id);
      }
    }
  } else {
    const trash = read<TrashEntry[]>(TRASH_KEY, []);
    const kept = trash.filter((t) => daysLeft(t, retention) > 0);
    if (kept.length !== trash.length) write(TRASH_KEY, kept);
  }
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
export async function saveToHistory(data: Omit<HistoryEntry, "id" | "createdAt" | "favorite">) {
  const entry = makeEntry(data);
  const history = read<HistoryEntry[]>(HIST_KEY, []);
  
  if (history[0] && history[0].tool === entry.tool && history[0].content === entry.content) {
    return entry;
  }
  
  write(HIST_KEY, [entry, ...history].slice(0, QUOTA));
  window.dispatchEvent(new Event("studioos:history"));

  // Track runs in cloud profile stats and save into studioos_history (if logged in)
  if (supabase) {
    supabase.auth.getSession().then(({ data: sess }: { data: any }) => {
      const user = sess?.session?.user;
      if (user?.id) {
        supabase
          .from("studioos_history")
          .insert({
            id: entry.id,
            user_id: user.id,
            tool: entry.tool,
            tool_name: entry.toolName,
            title: entry.title,
            summary: entry.summary,
            tag: entry.tag,
            content: entry.content,
            created_at: entry.createdAt,
            favorite: false,
          })
          .then();
      }
    });

    const isIdeia = entry.tool === 'rank' || entry.toolName === 'Rank de Ideia';
    const isProducao = entry.tool === 'roteiro' || entry.toolName?.includes('Roteiro');
    
    supabase.rpc('increment_stat', { stat_name: 'total_runs' }).then();
    if (isIdeia) supabase.rpc('increment_stat', { stat_name: 'ideias_ranqueadas' }).then();
    if (isProducao) supabase.rpc('increment_stat', { stat_name: 'producoes' }).then();

    const dow = new Date().getDay();
    supabase.rpc('increment_stat', { stat_name: `dow_${dow}` }).then();

    if (entry.tool) {
      supabase.rpc('increment_stat', { stat_name: `tool_${entry.tool}` }).then();
    }
  }

  return entry;
}

/* ----------------------------------------------------- drop / trash ops */

/** move a history entry to the trash bin */
export async function dropToTrash(entry: HistoryEntry) {
  const session = supabase ? await supabase.auth.getSession() : null;
  const user = session?.data?.session?.user;

  // Update local
  const history = read<HistoryEntry[]>(HIST_KEY, []).filter((h) => h.id !== entry.id);
  write(HIST_KEY, history);
  const trash = read<TrashEntry[]>(TRASH_KEY, []);
  write(TRASH_KEY, [{ ...entry, deletedAt: Date.now() }, ...trash].slice(0, TRASH_QUOTA));

  // If in Supabase, mark deleted
  if (user && supabase) {
    await supabase.from("studioos_history").update({ deleted_at: Date.now() }).eq("id", entry.id);
  }

  window.dispatchEvent(new Event("studioos:history"));
}

/** toggle favorite flag */
export async function toggleFavorite(entry: HistoryEntry) {
  const session = supabase ? await supabase.auth.getSession() : null;
  const user = session?.data?.session?.user;
  const nextFav = !entry.favorite;

  // Update local
  const history = read<HistoryEntry[]>(HIST_KEY, []);
  const next = history.map((h) => (h.id === entry.id ? { ...h, favorite: nextFav } : h));
  write(HIST_KEY, next);

  // Sync to Supabase if logged in
  if (user && supabase) {
    if (nextFav) {
      await supabase.from("studioos_history").upsert({
        id: entry.id,
        user_id: user.id,
        tool: entry.tool,
        tool_name: entry.toolName,
        title: entry.title,
        summary: entry.summary,
        tag: entry.tag,
        content: entry.content,
        created_at: entry.createdAt,
        favorite: true,
      });
    } else {
      await supabase.from("studioos_history").delete().eq("id", entry.id);
    }
  }

  window.dispatchEvent(new Event("studioos:history"));
}

/* ---------------------------------------------------------------- hook */

export function useStudioOS() {
  const { user } = useAuth();
  const [history, setHistory] = useState<HistoryEntry[]>(() => read(HIST_KEY, []));
  const [trash, setTrash] = useState<TrashEntry[]>(() => read(TRASH_KEY, []));
  const [config, setConfigState] = useState<StudioConfig>(loadConfig);

  const reload = useCallback(async () => {
    let cloudHist: HistoryEntry[] = [];
    let cloudTrash: TrashEntry[] = [];

    if (user && supabase) {
      const [{ data: hist }, { data: trsh }, { data: trashedProjs }] = await Promise.all([
        supabase.from("studioos_history").select("*").eq("user_id", user.id).is("deleted_at", null).order("created_at", { ascending: false }),
        supabase.from("studioos_history").select("*").eq("user_id", user.id).not("deleted_at", "is", null).order("deleted_at", { ascending: false }),
        supabase.from("studioos_projects").select("*").eq("status", "trashed").order("created_at", { ascending: false }),
      ]);
      if (hist) cloudHist = hist.map(mapFromSupabase) as HistoryEntry[];
      if (trsh) cloudTrash = trsh.map(mapFromSupabase) as TrashEntry[];
      if (trashedProjs && trashedProjs.length > 0) {
        trashedProjs.forEach((p) => {
          cloudTrash.push({
            id: p.id,
            tool: "projetos",
            toolName: "Projeto",
            title: p.name,
            summary: "Projeto excluído da área de trabalho",
            content: "Projeto removido e enviado para a lixeira.",
            createdAt: new Date(p.created_at).getTime(),
            deletedAt: p.updated_at ? new Date(p.updated_at).getTime() : new Date(p.created_at).getTime(),
            favorite: false,
          });
        });
      }
    }
    
    const localHist = read<HistoryEntry[]>(HIST_KEY, []);
    const localTrash = read<TrashEntry[]>(TRASH_KEY, []);

    // Sincronizar itens locais novos para Supabase se logado
    if (user && supabase && localHist.length > 0) {
      const cloudIds = new Set(cloudHist.map(h => h.id));
      const cloudTrashIds = new Set(cloudTrash.map(t => t.id));
      const toSync = localHist.filter(h => !cloudIds.has(h.id) && !cloudTrashIds.has(h.id));
      if (toSync.length > 0) {
        supabase
          .from("studioos_history")
          .insert(toSync.map(entry => ({
            id: entry.id,
            user_id: user.id,
            tool: entry.tool,
            tool_name: entry.toolName,
            title: entry.title,
            summary: entry.summary,
            tag: entry.tag,
            content: entry.content,
            created_at: entry.createdAt,
            favorite: Boolean(entry.favorite),
          })))
          .then();
      }
    }

    const histMap = new Map<string, HistoryEntry>();
    localHist.forEach(h => histMap.set(h.id, h));
    cloudHist.forEach(h => histMap.set(h.id, h)); // Cloud overrides local

    const trashMap = new Map<string, TrashEntry>();
    localTrash.forEach(h => trashMap.set(h.id, h));
    cloudTrash.forEach(h => trashMap.set(h.id, h));

    // Se um item está na lixeira, removê-lo do histórico ativo
    trashMap.forEach((_, id) => {
      histMap.delete(id);
    });

    setHistory(Array.from(histMap.values()).sort((a, b) => b.createdAt - a.createdAt));
    setTrash(Array.from(trashMap.values()).sort((a, b) => b.deletedAt - a.deletedAt));

    setConfigState(loadConfig());
  }, [user]);

  useEffect(() => {
    purgeTrash();
    reload();

    let id: number | undefined;
    if (!user) {
      id = window.setInterval(reload, POLL_MS);
    } else {
      id = window.setInterval(reload, 3000);
    }
    
    const onEvt = () => reload();
    window.addEventListener("storage", reload);
    window.addEventListener("studioos:history", onEvt);

    // Ouvir realtime no Supabase caso projetos sejam movidos para lixeira ou logs criados
    let channel: any = null;
    if (user && supabase) {
      const channelId = `history_realtime_${Math.random().toString(36).slice(2, 9)}`;
      channel = supabase.channel(channelId)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'studioos_history' }, () => reload())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'studioos_projects' }, () => reload())
        .subscribe();
    }

    return () => {
      if (id) window.clearInterval(id);
      window.removeEventListener("storage", reload);
      window.removeEventListener("studioos:history", onEvt);
      if (channel && supabase) supabase.removeChannel(channel);
    };
  }, [reload, user]);

  const api = useMemo(
    () => ({
      clearHistory: async () => {
        if (user && supabase) {
          await supabase.from("studioos_history").delete().is("deleted_at", null);
          window.dispatchEvent(new Event("studioos:history"));
          reload();
          return;
        }
        write(HIST_KEY, []);
        window.dispatchEvent(new Event("studioos:history"));
        reload();
      },
      restore: async (id: string) => {
        if (user && supabase) {
          // Checar se é um projeto na lixeira
          const { data: projData } = await supabase.from("studioos_projects").select("id").eq("id", id).eq("status", "trashed").maybeSingle();
          if (projData) {
            await supabase.from("studioos_projects").update({ status: "planning" }).eq("id", id);
            window.dispatchEvent(new Event("studioos:history"));
            reload();
            return;
          }

          await supabase.from("studioos_history").update({ deleted_at: null }).eq("id", id);
          window.dispatchEvent(new Event("studioos:history"));
          reload();
          return;
        }
        const item = read<TrashEntry[]>(TRASH_KEY, []).find((t) => t.id === id);
        if (!item) return;
        const { deletedAt, ...rest } = item;
        void deletedAt;
        const trashNow = read<TrashEntry[]>(TRASH_KEY, []).filter((t) => t.id !== id);
        write(TRASH_KEY, trashNow);
        write(HIST_KEY, [rest, ...read<HistoryEntry[]>(HIST_KEY, [])].slice(0, QUOTA));
        window.dispatchEvent(new Event("studioos:history"));
        reload();
      },
      deleteForever: async (id: string) => {
        if (user && supabase) {
          await supabase.from("studioos_history").delete().eq("id", id);
          await supabase.from("studioos_projects").delete().eq("id", id);
          await supabase.from("studioos_saved_items").delete().filter("metadata->>id", "eq", String(id));
          window.dispatchEvent(new Event("studioos:history"));
          reload();
          return;
        }
        write(TRASH_KEY, read<TrashEntry[]>(TRASH_KEY, []).filter((t) => t.id !== id));
        window.dispatchEvent(new Event("studioos:history"));
        reload();
      },
      emptyTrash: async () => {
        if (user && supabase) {
          await supabase.from("studioos_history").delete().not("deleted_at", "is", null);
          const { data: trashedList } = await supabase.from('studioos_projects').select('id').eq('status', 'trashed');
          if (trashedList && trashedList.length > 0) {
            const ids = trashedList.map(p => String(p.id));
            await supabase.from('studioos_projects').delete().eq('status', 'trashed');
            for (const id of ids) {
              await supabase.from('studioos_saved_items').delete().filter('metadata->>id', 'eq', id);
            }
          }
          window.dispatchEvent(new Event("studioos:history"));
          reload();
          return;
        }
        write(TRASH_KEY, []);
        window.dispatchEvent(new Event("studioos:history"));
        reload();
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
    [config, reload, user]
  );

  return { history, trash, config, reload, ...api };
}
