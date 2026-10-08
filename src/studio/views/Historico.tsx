import { useMemo, useState, useEffect } from "react";
import { cn } from "../utils/cn";
import { supabase } from "../auth";
import { TOOL_BY_ID, accentSoft, type Accent } from "../data";
import {
  daysLeft,
  dropToTrash,
  toggleFavorite,
  useStudioOS,
  QUOTA,
  TRASH_QUOTA,
  type HistoryEntry,
  type TrashEntry,
  type TrashRetentionDay,
} from "../history";
import { Button, Icon, Input, Meter } from "../components/ui";
import { Card, CopyButton } from "../components/ToolShell";

const TOOL_ACCENTS: Record<string, Accent> = {
  rank: "signal",
  titulos: "oxide",
  hooks: "mint",
  roteiro: "sky",
  thumbnail: "plum",
  receita: "signal",
  humanizador: "oxide",
  score: "mint",
  mentor: "sky",
  membros: "plum",
  ideia: "signal",
  projetos: "signal",
};

function accentOf(entry: { tool: string }): Accent {
  return TOOL_ACCENTS[entry.tool] ?? "bone";
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d`;
  return new Date(ts).toLocaleDateString("pt-BR");
}

const FILTERS = ["recentes", "salvos", "ideias", "títulos", "posts", "estratégia"] as const;
const TITLES_TOOLS = new Set(["titulos", "hooks"]);
const POSTS_TOOLS = new Set(["humanizador", "score", "receita"]);
const STRATEGY_TOOLS = new Set(["mentor", "membros"]);

function matchesFilter(e: HistoryEntry, f: (typeof FILTERS)[number], fav: boolean) {
  // Global filter: if toggle is on, hide non-favorites everywhere
  if (fav && !e.favorite) return false;
  
  if (f === "salvos") return e.favorite;
  if (f === "recentes") return true;
  if (f === "ideias") return e.tool === "rank" || e.tool === "ideia";
  if (f === "títulos") return TITLES_TOOLS.has(e.tool);
  if (f === "posts") return POSTS_TOOLS.has(e.tool);
  if (f === "estratégia") return STRATEGY_TOOLS.has(e.tool);
  return true;
}

import { useAuth } from "../auth";

export function HistoricoX({
  onBack,
  onGo,
  initialTab = "historico",
}: {
  onBack: () => void;
  onGo: (id: string) => void;
  initialTab?: "historico" | "lixeira";
}) {
  const os = useStudioOS();
  const auth = useAuth();
  const [tab, setTab] = useState<"historico" | "lixeira">(initialTab);
  const [fmt, setFmt] = useState<string>("todos");
  const [pill, setPill] = useState<(typeof FILTERS)[number]>("recentes");
  const [showFav, setShowFav] = useState(true);
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sort, setSort] = useState<"recentes" | "antigos" | "score">("recentes");
  const [trashedProjects, setTrashedProjects] = useState<TrashEntry[]>([]);

  useEffect(() => {
    async function fetchTrashedProjects() {
      if (!auth.user) return;
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("status", "trashed")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setTrashedProjects(
          data.map((p) => ({
            id: p.id,
            tool: "projetos",
            toolName: "Projeto",
            title: p.name,
            summary: "Projeto excluído da área de trabalho",
            content: "Projeto removido e enviado para a lixeira.",
            createdAt: new Date(p.created_at).getTime(),
            deletedAt: Date.now(), // Fallback
            favorite: false,
          }))
        );
      }
    }
    fetchTrashedProjects();
  }, [auth.user]);

  const toolsInHistory = useMemo(
    () => Array.from(new Set(os.history.map((h) => h.tool))),
    [os.history]
  );

  const favCount = os.history.filter((h) => h.favorite).length;

  const list = useMemo(() => {
    let l = os.history.filter((h) =>
      (fmt === "todos" ? true : h.tool === fmt)
        && matchesFilter(h, pill, showFav)
        && (!q.trim() || (h.title + h.summary + h.content + h.toolName).toLowerCase().includes(q.toLowerCase()))
    ) as (HistoryEntry & { num?: number })[];
    if (sort === "recentes") l = [...l].sort((a, b) => b.createdAt - a.createdAt);
    if (sort === "antigos") l = [...l].sort((a, b) => a.createdAt - b.createdAt);
    if (sort === "score") {
      l = [...l].sort((a, b) => {
        const sa = parseInt(a.tag?.split("/")[0] ?? "0") || 0;
        const sb = parseInt(b.tag?.split("/")[0] ?? "0") || 0;
        return sb - sa;
      });
    }
    return l;
  }, [os.history, fmt, pill, showFav, q, sort]);

  const listTrash = useMemo(() => {
    let l: TrashEntry[] = [...os.trash, ...trashedProjects];
    if (fmt !== "todos") l = l.filter((t) => t.tool === fmt);
    if (q.trim()) l = l.filter((t) => (t.title + t.summary + t.content).toLowerCase().includes(q.toLowerCase()));
    return [...l].sort((a, b) =>
      sort === "antigos" ? a.deletedAt - b.deletedAt : b.deletedAt - a.deletedAt
    );
  }, [os.trash, trashedProjects, fmt, q, sort]);

  const retention = os.config.trashDays;

  const histLog = useMemo(
    () =>
      list.slice(0, 6).map((h) => {
        const t = new Date(h.createdAt);
        const hh = t.toLocaleTimeString("pt-BR", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
        return `[${hh}] execução registrada · ferramenta=${h.tool} · ttl=local · favorito=${h.favorite ? "sim" : "não"}\n         título: ${h.title}`;
      }),
    [list]
  );

  return (
    <div className="anim-rise">
      <button
        onClick={onBack}
        className="group mb-6 inline-flex items-center gap-2 font-mono text-[10.5px] tracking-[0.18em] text-ink-400 uppercase transition-colors hover:text-signal-400"
      >
        <Icon name="arrow" className="h-3.5 w-3.5 rotate-180 transition-transform duration-300 group-hover:-translate-x-1" strokeWidth={2} />
        Visão geral
      </button>

      <div className="mb-6 flex flex-col gap-5 border-b border-ink-800 pb-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <div className="mb-3 flex items-center gap-3">
            <span className="font-mono text-[11px] tracking-[0.22em] text-signal-400 uppercase">
              Sistema · dados locais
            </span>
          </div>
          <h1 className="font-display text-[clamp(2.1rem,5vw,3.4rem)] leading-[0.92] font-extrabold tracking-[-0.035em] text-bone-50">
            Histórico & Lixeira
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-bone-400">
            Toda execução é registrada localmente no seu dispositivo. O que você apaga vai para a lixeira e resiste até{` `}
            <span className="text-bone-100">{retention === 1 ? "o fim do dia" : `${retention} dias`}</span>. 
            Apenas os itens que você <b>salvar</b> serão sincronizados na nuvem para acesso em outros lugares.
          </p>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-px overflow-hidden rounded-lg border border-ink-700/80 bg-ink-700/60">
          {[
            { k: "Itens", v: `${os.history.length}${auth.user ? "" : `/${QUOTA}`}`, a: "text-signal-300" },
            { k: "Salvos na Nuvem", v: String(favCount), a: "text-bone-100" },
            { k: "Lixeira", v: `${os.trash.length + trashedProjects.length}${auth.user ? "" : `/${TRASH_QUOTA}`}`, a: (os.trash.length + trashedProjects.length) ? "text-oxide-400" : "text-mint-300" },
            { k: "Expira em", v: retention === 1 ? "1d" : `${retention}d`, a: "text-sky-400" },
          ].map((m) => (
            <div key={m.k} className="bg-ink-900 px-4 py-3">
              <div className="font-mono text-[9px] tracking-[0.16em] text-ink-400 uppercase">{m.k}</div>
              <div className={cn("font-display text-lg font-bold tabular-nums", m.a)}>{m.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* segmented + tools + pills */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex gap-1 rounded-md border border-ink-700 bg-ink-950/70 p-1">
          {(
            [
              ["historico", "Histórico", "historico"],
              ["lixeira", "Lixeira", "trash"],
            ] as const
          ).map(([id, label, ic]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "inline-flex items-center gap-2 rounded px-3.5 py-2 font-mono text-[11px] tracking-[0.1em] uppercase transition-all duration-200",
                tab === id ? "bg-signal-400 text-ink-950" : "text-bone-400 hover:bg-ink-800 hover:text-bone-100"
              )}
            >
              <Icon name={ic} className="h-3.5 w-3.5" strokeWidth={1.9} />
              {label}
              <span
                className={cn(
                  "rounded-sm px-1 font-mono text-[9.5px] tabular-nums",
                  tab === id ? "bg-ink-950/20" : "bg-ink-800 text-ink-400"
                )}
              >
                {id === "historico" ? os.history.length : (os.trash.length + trashedProjects.length)}
              </span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setFmt("todos")}
            className={cn(
              "rounded border px-2.5 py-1.5 font-mono text-[10px] tracking-[0.12em] uppercase transition-colors",
              fmt === "todos"
                ? "border-signal-400/60 bg-signal-400/15 text-signal-300"
                : "border-ink-700 bg-ink-900/60 text-bone-400 hover:border-ink-500 hover:text-bone-100"
            )}
          >
            todos
          </button>
          {toolsInHistory.map((t) => {
            const ttl = TOOL_BY_ID[t]?.name ?? (t === "ideia" ? "Ideias" : t);
            return (
              <button
                key={t}
                onClick={() => setFmt(t)}
                className={cn(
                  "rounded border px-2.5 py-1.5 font-mono text-[10px] tracking-[0.12em] uppercase transition-colors",
                  fmt === t
                    ? "border-signal-400/60 bg-signal-400/15 text-signal-300"
                    : "border-ink-700 bg-ink-900/60 text-bone-400 hover:border-ink-500 hover:text-bone-100"
                )}
              >
                {ttl}
              </button>
            );
          })}
        </div>

        <div className="relative ml-auto w-full sm:w-60">
          <Icon name="eye" className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar no registro…" className="py-2 pl-8 text-[12.5px]" />
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setPill(f)}
            className={cn(
              "rounded-full border px-3 py-1 text-[11px] transition-all duration-200",
              pill === f
                ? "border-mint-400/50 bg-mint-400/12 text-mint-300"
                : "border-ink-700 bg-ink-900/60 text-bone-400 hover:border-ink-500 hover:text-bone-100"
            )}
          >
            <span className="font-mono text-[10px] tracking-[0.1em] uppercase">{f}</span>
            {f === "salvos" && (
              <span className="ml-1.5 text-[10px] text-ink-500 tabular-nums">{favCount}</span>
            )}
          </button>
        ))}
        <span className="mx-1 hidden h-4 w-px bg-ink-700 sm:block" />
        <label className="flex cursor-pointer items-center gap-2 text-[11.5px] font-medium transition-colors">
          <button
            onClick={() => setShowFav((s) => !s)}
            className={cn(
              "relative h-5 w-9 rounded-full border transition-all duration-300",
              showFav ? "border-signal-400/60 bg-signal-400/20" : "border-ink-700 bg-ink-900"
            )}
            aria-label="Filtrar apenas salvos"
          >
            <span
              className={cn(
                "absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full transition-all duration-300",
                showFav ? "left-[18px] bg-signal-400 shadow-[0_0_10px_rgba(242,179,61,0.5)]" : "left-1 bg-ink-500"
              )}
            />
          </button>
          <span className={cn("transition-colors", showFav ? "text-signal-300" : "text-ink-400 hover:text-bone-200")}>
            filtrar apenas salvos
          </span>
        </label>
        <div className="ml-auto flex gap-1">
          {(["recentes", "antigos", "score"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={cn(
                "rounded border px-2 py-1 font-mono text-[9.5px] tracking-[0.1em] uppercase transition-colors",
                sort === s
                  ? "border-ink-500 bg-ink-800 text-bone-100"
                  : "border-ink-800 text-ink-400 hover:text-bone-200"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          {tab === "historico" ? (
            <>
              {!list.length ? (
                <div className="flex min-h-[380px] flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-ink-700 bg-ink-900/40 px-6 py-12 text-center">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-signal-400/15 blur-2xl" />
                    <Icon name="historico" className="relative h-10 w-10 text-ink-400" />
                  </div>
                  <p className="font-display text-xl font-extrabold text-bone-200">Nenhum histórico encontrado</p>
                  <p className="max-w-sm text-[13px] leading-relaxed text-ink-400">
                    As execuções do painel aparecem aqui com título, resumo e conteúdo completo —
                    visíveis de novo nas telas onde nasceram
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button size="sm" variant="outline" icon="gauge" onClick={() => onGo("rank")}>
                      Rank de Ideia
                    </Button>
                    <Button size="sm" variant="outline" icon="check" onClick={() => onGo("score")}>
                      Score de Post
                    </Button>
                    <Button size="sm" variant="ghost" icon="brain" onClick={() => onGo("mentor")}>
                      Mentor AI
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {list.map((h, i) => (
                    <HistoryRow
                      key={h.id}
                      entry={h}
                      num={i + 1}
                      expanded={expanded === h.id}
                      onToggle={() => setExpanded(expanded === h.id ? null : h.id)}
                      onGo={onGo}
                    />
                  ))}
                  <div className="flex flex-wrap items-center gap-3 rounded-lg border border-ink-800 bg-ink-900/40 px-4 py-3">
                    <Icon name="lock" className="h-3.5 w-3.5 text-mint-400" />
                    <span className="font-mono text-[10px] tracking-[0.14em] text-ink-400 uppercase">
                      log local · nada sai do navegador
                    </span>
                    <CopyButton className="ml-auto" text={list.map((h) => `[${new Date(h.createdAt).toISOString()}] ${h.toolName} — ${h.title}\n${h.summary}\n${h.content}\n`).join("\n---\n\n")} />
                    <button
                      onClick={() => {
                        if (window.confirm("Apagar todo o histórico (não vai para a lixeira)?")) {
                          os.clearHistory();
                        }
                      }}
                      className="font-mono text-[10px] tracking-[0.14em] text-ink-400 uppercase transition-colors hover:text-oxide-400"
                    >
                      esvaziar histórico
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              {!listTrash.length ? (
                <div className="flex min-h-[380px] animate-pulse-once flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-ink-700 bg-ink-900/40 px-6 py-12 text-center" style={{ animationIterationCount: 1 }}>
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-mint-400/10 blur-2xl" />
                    <Icon name="trash" className="relative h-10 w-10 text-ink-400" />
                  </div>
                  <p className="font-display text-xl font-extrabold text-bone-200">A lixeira está vazia</p>
                  <p className="max-w-sm text-[13px] leading-relaxed text-ink-400">
                    Itens apagados do histórico param aqui e aguardam a retenção configurável antes
                    de serem excluídos permanentemente.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {listTrash.map((t, i) => (
                    <TrashRow
                      key={t.id}
                      entry={t}
                      num={i + 1}
                      retention={retention}
                      expanded={expanded === t.id}
                      onToggle={() => setExpanded(expanded === t.id ? null : t.id)}
                      onRestore={() => {
                        if (t.tool === 'projetos') {
                          supabase.from('projects').update({ status: 'planning' }).eq('id', t.id).then(() => {
                            setTrashedProjects(prev => prev.filter(p => p.id !== t.id));
                          });
                        } else {
                          os.restore(t.id);
                        }
                      }}
                      onDestroy={() => {
                        if (window.confirm("Excluir permanentemente? Não dá para desfazer.")) {
                          if (t.tool === 'projetos') {
                            supabase.from('projects').delete().eq('id', t.id).then(() => {
                              setTrashedProjects(prev => prev.filter(p => p.id !== t.id));
                            });
                          } else {
                            os.deleteForever(t.id);
                          }
                        }
                      }}
                      onGo={onGo}
                    />
                  ))}
                  <div className="flex flex-wrap items-center gap-3 rounded-lg border border-oxide-400/30 bg-oxide-400/[0.05] px-4 py-3">
                    <Icon name="clock" className="h-3.5 w-3.5 text-oxide-400" />
                    <span className="text-[11.5px] text-bone-300">
                      purge automática a cada abertura · retenção atual de{" "}
                      <strong className="text-bone-50">{retention === 1 ? "1 dia" : `${retention} dias`}</strong>
                    </span>
                    <button
                      onClick={() => {
                        if (window.confirm("Esvaziar a lixeira inteira? Não dá para recuperar.")) {
                          os.emptyTrash();
                        }
                      }}
                      className="ml-auto rounded border border-oxide-400/40 px-2.5 py-1 font-mono text-[9.5px] tracking-[0.14em] text-oxide-400 uppercase transition-colors hover:bg-oxide-400/15"
                    >
                      esvaziar lixeira
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* console / log + retention config */}
        <div className="space-y-4 xl:sticky xl:top-6">
          <div className="overflow-hidden rounded-lg border border-ink-700 bg-ink-950 shadow-[0_30px_80px_-40px_rgba(0,0,0,1)]">
            <div className="scanlines pointer-events-none absolute inset-0 hidden" />
            <div className="flex items-center justify-between border-b border-ink-800 bg-ink-900/70 px-4 py-2.5">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-oxide-400/80" />
                <span className="h-2 w-2 rounded-full bg-signal-400/80" />
                <span className="h-2 w-2 rounded-full bg-mint-400/80" />
              </div>
              <span className="font-mono text-[9.5px] tracking-[0.22em] text-ink-400 uppercase">
                studio — log local
              </span>
              <Icon name="lock" className="h-3.5 w-3.5 text-mint-400" strokeWidth={1.8} />
            </div>
            <div className="relative max-h-72 space-y-1.5 overflow-y-auto p-3 font-mono text-[10.5px] leading-[1.7]">
              {histLog.length ? (
                histLog.map((l, i) => (
                  <p key={i} className="whitespace-pre-wrap text-mint-400/90">
                    <span className="text-ink-500">{"> "}</span>
                    {l}
                  </p>
                ))
              ) : (
                <p className="py-6 text-center text-ink-400">
                  {"> nenhuma execução em memória"}<br />
                  {"> aguardando atividade…"}
                </p>
              )}
            </div>
          </div>

          <Card title="Retenção da lixeira" note="purge automática" accent="oxide">
            <div className="mb-2 font-mono text-[9.5px] tracking-[0.16em] text-ink-400 uppercase">
              Manter itens na lixeira por:
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {([1, 7, 30, 90] as TrashRetentionDay[]).map((d) => (
                <button
                  key={d}
                  onClick={() => os.setTrashDays(d)}
                  className={cn(
                    "rounded-md border px-2 py-2 transition-all duration-200",
                    retention === d
                      ? "border-oxide-400/60 bg-oxide-400/15 text-oxide-400"
                      : "border-ink-700 bg-ink-950/60 text-bone-400 hover:border-ink-500 hover:text-bone-100"
                  )}
                >
                  <span className="block font-display text-lg font-extrabold tabular-nums">{d}</span>
                  <span className="block font-mono text-[8.5px] tracking-[0.14em] uppercase">
                    {d === 1 ? "dia" : "dias"}
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-3 border-t border-ink-800 pt-3 text-[11.5px] leading-relaxed text-ink-400">
              Passado o prazo, os itens são excluídos permanentemente — sem servidor, sem backup,
              sem resgate. O histórico fica intacto: só quem apaga manualmente acaba na lixeira.
            </p>
          </Card>

          {!auth.user && (
            <Card title="Ocupação" accent="signal">
              <div className="space-y-3">
                <Meter value={os.history.length} max={QUOTA} accent="signal" label="Histórico" />
                <Meter value={os.trash.length + trashedProjects.length} max={TRASH_QUOTA} accent="oxide" label="Lixeira" />
              </div>
            </Card>
          )}

          <Button
            variant="outline"
            className="w-full"
            icon="download"
            onClick={() => {
              const data = {
                history: os.history,
                trash: os.trash,
                exportedAt: new Date().toISOString(),
              };
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "studioos-historico.json";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Exportar histórico (.json)
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- row */

function TagChip({ tag }: { tag?: string }) {
  if (!tag) return null;
  return (
    <span className="hidden rounded border border-ink-700 px-1.5 py-0.5 font-mono text-[9px] tracking-[0.1em] text-bone-400 uppercase xl:inline">
      {tag}
    </span>
  );
}

function HistoryRow({
  entry,
  num,
  expanded,
  onToggle,
  onGo,
}: {
  entry: HistoryEntry;
  num: number;
  expanded: boolean;
  onToggle: () => void;
  onGo: (id: string) => void;
}) {
  const ac = accentOf(entry);
  const meta = TOOL_BY_ID[entry.tool];
  const rating = entry.content.match(/RATING:([\d.]+)\/10/);
  return (
    <article
      className={cn(
        "overflow-hidden rounded-lg border transition-all duration-300",
        expanded ? "border-ink-600 bg-ink-850" : "border-ink-800 bg-ink-900/60 hover:border-ink-700"
      )}
    >
      <div className="flex items-center gap-3 px-3.5 py-3">
        <button
          onClick={onToggle}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
        >
          <span className="w-6 shrink-0 font-mono text-[10px] text-ink-500 tabular-nums">
            {String(num).padStart(2, "0")}
          </span>
          <span className={cn("hidden rounded border px-2 py-0.5 font-mono text-[8.5px] tracking-[0.14em] uppercase sm:inline", accentSoft[ac])}>
            {entry.toolName}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-medium text-bone-100">
              {entry.title}
              {entry.favorite && (
                <Icon name="bookmark" className="ml-2 inline h-3 w-3 -translate-y-0.5 fill-signal-400 text-signal-400" strokeWidth={1} />
              )}
            </span>
            <span className="mt-0.5 block truncate text-[11px] text-ink-400">{entry.summary}</span>
          </span>
          <TagChip tag={entry.tag} />
          <span className="hidden shrink-0 font-mono text-[10px] text-ink-500 tabular-nums lg:inline" suppressHydrationWarning>
            {timeAgo(entry.createdAt)}
          </span>
          <span className="hidden shrink-0 sm:block">
            {rating && (
              <span
                className={cn(
                  "font-display text-[17px] font-extrabold tabular-nums",
                  parseFloat(rating[1]) >= 8 ? "text-mint-300" : parseFloat(rating[1]) >= 6 ? "text-signal-300" : "text-bone-300"
                )}
              >
                {parseFloat(rating[1]).toFixed(1)}
              </span>
            )}
          </span>
          <Icon
            name="chevron"
            className={cn("h-4 w-4 shrink-0 text-ink-500 transition-transform duration-300", expanded && "rotate-180 text-signal-400")}
            strokeWidth={2}
          />
        </button>
      </div>

      <div className="flex items-center gap-1 border-t border-ink-800/70 px-3.5 py-1.5">
        <span className="mr-2 font-mono text-[9px] tracking-[0.14em] text-ink-500 uppercase">
          {new Date(entry.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
        </span>
        <Actions entry={entry} onGo={onGo} />
      </div>

      <div className={cn("grid transition-[grid-template-rows] duration-300 ease-out", expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="overflow-hidden">
          <div className="border-t border-ink-800 px-4 py-3.5">
            <div className="mb-2 flex items-center gap-2">
              <span className="font-mono text-[9px] tracking-[0.16em] text-ink-400 uppercase">
                bloco completo · {entry.content.split(/\s+/).filter(Boolean).length} palavras
              </span>
              <CopyButton text={`${entry.title}\n${entry.summary}\n\n${entry.content.replace(/^RATING:[\d/ .]+\n?/, "")}`} className="ml-auto" />
            </div>
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-ink-800 bg-ink-950/70 p-3.5 font-mono text-[11.5px] leading-[1.7] text-bone-200">
              {entry.content.replace(/^RATING:[\d/ .]+\n?/, "")}
            </pre>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                icon="restore"
                onClick={() => onGo(`${entry.tool}`)}
              >
                Reabrir em {meta?.name ?? entry.toolName}
              </Button>
              <span className="font-mono text-[9.5px] tracking-[0.14em] text-ink-500 uppercase">
                restaura os dados na tela onde nasceram
              </span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function Actions({ entry, onGo }: { entry: HistoryEntry; onGo: (id: string) => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="ml-auto flex shrink-0 items-center gap-0" title="Ações">
      <button
        onClick={() => onGo(`${entry.tool}`)}
        className="rounded px-2 py-1 font-mono text-[9.5px] tracking-[0.12em] text-ink-500 uppercase transition-colors hover:bg-ink-800 hover:text-signal-300"
        title="Reabrir ferramenta"
      >
        reabrir
      </button>
      <button
        onClick={() => toggleFavorite(entry)}
        className={cn(
          "rounded px-2 py-1 transition-colors",
          entry.favorite ? "text-signal-400" : "text-ink-500 hover:bg-ink-800 hover:text-signal-300"
        )}
        title={entry.favorite ? "Remover dos salvos" : "Salvar na nuvem"}
      >
        <Icon name="bookmark" className={cn("h-3.5 w-3.5", entry.favorite && "fill-signal-400")} strokeWidth={1.8} />
      </button>
      <button
        onClick={() => {
          navigator.clipboard?.writeText(entry.content).catch(() => {});
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1200);
        }}
        className={cn(
          "rounded p-1.5 transition-colors",
          copied ? "text-mint-400" : "text-ink-500 hover:bg-ink-800 hover:text-bone-100"
        )}
        title="Copiar conteúdo"
      >
        <Icon name={copied ? "check" : "copy"} className="h-3.5 w-3.5" strokeWidth={1.9} />
      </button>
      <button
        onClick={() => dropToTrash(entry)}
        className="rounded p-1.5 text-ink-500 transition-colors hover:bg-oxide-400/15 hover:text-oxide-400"
        title="Mover para a lixeira"
      >
        <Icon name="trash" className="h-3.5 w-3.5" strokeWidth={1.8} />
      </button>
    </span>
  );
}

function TrashRow({
  entry,
  num,
  retention,
  expanded,
  onToggle,
  onRestore,
  onDestroy,
  onGo,
}: {
  entry: TrashEntry;
  num: number;
  retention: TrashRetentionDay;
  expanded: boolean;
  onToggle: () => void;
  onRestore: () => void;
  onDestroy: () => void;
  onGo: (id: string) => void;
}) {
  const ac = accentOf(entry);
  const left = daysLeft(entry, retention);
  return (
    <article
      className={cn(
        "overflow-hidden rounded-lg border transition-all duration-300",
        expanded ? "border-ink-600 bg-ink-850" : "border-ink-800 bg-ink-900/50 hover:border-ink-700"
      )}
    >
      <div className="flex items-center gap-3 px-3.5 py-3">
        <button onClick={onToggle} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left">
          <span className="w-6 shrink-0 font-mono text-[10px] text-ink-500 tabular-nums">
            {String(num).padStart(2, "0")}
          </span>
          <span className={cn("hidden rounded border px-2 py-0.5 font-mono text-[8.5px] tracking-[0.14em] uppercase opacity-70 sm:inline", accentSoft[ac])}>
            {entry.toolName}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-medium text-bone-300 line-through decoration-ink-600">
              {entry.title}
            </span>
            <span className="mt-0.5 block truncate text-[11px] text-ink-500">
              {entry.summary}
            </span>
          </span>
          <span
            className={cn(
              "hidden shrink-0 rounded border px-2 py-0.5 font-mono text-[9px] tracking-[0.1em] uppercase lg:inline",
              left <= 1
                ? "border-oxide-400/50 bg-oxide-400/10 text-oxide-400"
                : left <= 3
                  ? "border-signal-400/40 bg-signal-400/10 text-signal-300"
                  : "border-ink-700 text-ink-400"
            )}
            suppressHydrationWarning
          >
            expira em {left}d
          </span>
          <Icon
            name="chevron"
            className={cn("h-4 w-4 shrink-0 text-ink-500 transition-transform duration-300", expanded && "rotate-180 text-oxide-400")}
            strokeWidth={2}
          />
        </button>
      </div>

      <div className="flex items-center gap-1 border-t border-ink-800/70 px-3.5 py-1.5">
        <span className="font-mono text-[9px] tracking-[0.14em] text-ink-500 uppercase" suppressHydrationWarning>
          apagado {timeAgo(entry.deletedAt)} atrás
        </span>
        <span className="ml-auto flex items-center gap-0">
          <button
            onClick={onRestore}
            className="flex items-center gap-1.5 rounded px-2 py-1 font-mono text-[9.5px] tracking-[0.12em] text-ink-500 uppercase transition-colors hover:bg-mint-400/15 hover:text-mint-300"
            title="Restaurar para o histórico"
          >
            <Icon name="restore" className="h-3.5 w-3.5" strokeWidth={1.9} />
            restaurar
          </button>
          <button
            onClick={() => onGo(entry.tool)}
            className="rounded px-2 py-1 font-mono text-[9.5px] tracking-[0.12em] text-ink-500 uppercase transition-colors hover:bg-ink-800 hover:text-signal-300"
          >
            refazer
          </button>
          <button
            onClick={onDestroy}
            className="flex items-center gap-1.5 rounded px-2 py-1 font-mono text-[9.5px] tracking-[0.12em] text-ink-500 uppercase transition-colors hover:bg-oxide-400/15 hover:text-oxide-400"
            title="Excluir permanentemente"
          >
            <Icon name="trash" className="h-3.5 w-3.5" strokeWidth={1.9} />
            destruir
          </button>
        </span>
      </div>

      <div className={cn("grid transition-[grid-template-rows] duration-300 ease-out", expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
        <div className="overflow-hidden">
          <div className="border-t border-ink-800 px-4 py-3.5">
            <pre className="max-h-60 overflow-auto whitespace-pre-wrap rounded-md border border-ink-800 bg-ink-950/70 p-3.5 font-mono text-[11.5px] leading-[1.7] text-bone-400">
              {entry.content.replace(/^RATING:[\d/ .]+\n?/, "")}
            </pre>
          </div>
        </div>
      </div>
    </article>
  );
}
