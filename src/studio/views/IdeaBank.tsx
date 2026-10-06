import { useEffect, useMemo, useState } from "react";
import { cn } from "../utils/cn";
import { Icon, Reveal } from "../components/ui";
import { evaluate, verdict } from "../tools/RankIdeia";
import { saveToHistory } from "../history";

type Idea = { id: string; text: string; ts: number };

const LS = "studioos.ideas.v1";

const SEED: Idea[] = [
  { id: "s1", text: "Eu parei de investir R$100 por mês em FIIs e mostrei o extrato na tela", ts: Date.now() - 86400000 * 3 },
  { id: "s2", text: "Testei a carteira recomendada por 3 gerentes de banco durante 90 dias", ts: Date.now() - 86400000 * 8 },
  { id: "s3", text: "Explicando o que é duration para iniciantes", ts: Date.now() - 86400000 * 12 },
];

function load(): Idea[] {
  try {
    const raw = localStorage.getItem(LS);
    if (!raw) return SEED;
    const parsed = JSON.parse(raw) as Idea[];
    return Array.isArray(parsed) && parsed.length ? parsed : SEED;
  } catch {
    return SEED;
  }
}

export function IdeaBank({ niche, onGo }: { niche: string; onGo: (id: string) => void }) {
  const [ideas, setIdeas] = useState<Idea[]>(load);
  const [draft, setDraft] = useState("");
  const [sort, setSort] = useState<"nota" | "recentes">("nota");
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(LS, JSON.stringify(ideas));
    } catch {
      /* ignore */
    }
  }, [ideas]);

  const scored = useMemo(
    () =>
      ideas
        .map((i) => ({ ...i, score: evaluate(i.text, niche).total }))
        .sort((a, b) => (sort === "nota" ? b.score - a.score : b.ts - a.ts)),
    [ideas, niche, sort]
  );

  const stats = useMemo(() => {
    const approved = scored.filter((s) => s.score >= 8).length;
    const adjust = scored.filter((s) => s.score >= 6 && s.score < 8).length;
    const dead = scored.filter((s) => s.score < 4).length;
    const avg = scored.length ? scored.reduce((a, b) => a + b.score, 0) / scored.length : 0;
    return { approved, adjust, dead, avg };
  }, [scored]);

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    const score = evaluate(text, niche).total;
    setIdeas((p) => [{ id: `i${Date.now()}`, text, ts: Date.now() }, ...p]);
    saveToHistory({
      tool: "ideia",
      toolName: "Banco de Ideias",
      title: text.slice(0, 90),
      summary: `nota ${score.toFixed(1)}/10 · guardada na fila de produção`,
      tag: `${score.toFixed(1)}/10`,
      content: `IDEIA: ${text}\nNOTA: ${score.toFixed(1)}/10\nNICHO: ${niche || "(não calibrado)"}`,
    });
    setDraft("");
  };

  const preview = draft.trim() ? evaluate(draft, niche).total : null;

  return (
    <section className="mx-auto max-w-[1400px] px-4 pb-14 sm:px-6 lg:px-8 lg:pb-20">
      <Reveal>
        <div className="relative overflow-hidden rounded-xl border border-ink-700/80 bg-ink-900/60">
          <div className="pointer-events-none absolute inset-0 grid-lines opacity-40" />
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-mint-400/[0.07] blur-[80px]" />

          <div className="relative grid gap-8 p-5 sm:p-7 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-12">
            {/* left: bank */}
            <div>
              <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <div className="mb-2 flex items-center gap-3">
                    <span className="h-px w-8 bg-mint-400/60" />
                    <span className="font-mono text-[11px] tracking-[0.22em] text-mint-400 uppercase">
                      02 · Banco de ideias
                    </span>
                  </div>
                  <h2 className="font-display text-3xl leading-none font-extrabold tracking-[-0.03em] text-bone-50 sm:text-[2.6rem]">
                    Nada de ideia
                    <br />
                    <span className="text-mint-300">solta no notes.</span>
                  </h2>
                </div>
                <div className="flex gap-1">
                  {(["nota", "recentes"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSort(s)}
                      className={cn(
                        "rounded border px-2.5 py-1 font-mono text-[9.5px] tracking-[0.14em] uppercase transition-all duration-200",
                        sort === s
                          ? "border-mint-400/50 bg-mint-400/12 text-mint-300"
                          : "border-ink-700 text-bone-400 hover:border-ink-500 hover:text-bone-100"
                      )}
                    >
                      {s === "nota" ? "por nota" : "recentes"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-5 flex gap-2">
                <div className="relative flex-1">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && add()}
                    placeholder="Jogue a ideia crua aqui — ela entra já com nota"
                    className="w-full rounded-md border border-ink-600/80 bg-ink-950/70 py-3 pl-3 pr-24 text-[14px] text-bone-100 outline-none transition-all placeholder:text-ink-400 focus:border-mint-400/70 focus:ring-2 focus:ring-mint-400/15"
                  />
                  {preview !== null && (
                    <span
                      className={cn(
                        "absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[12px] font-bold tabular-nums",
                        preview >= 8 ? "text-mint-300" : preview >= 6 ? "text-signal-300" : "text-oxide-400"
                      )}
                    >
                      {preview.toFixed(1)}
                    </span>
                  )}
                </div>
                <button
                  onClick={add}
                  disabled={!draft.trim()}
                  className="group inline-flex shrink-0 items-center gap-2 rounded-md bg-mint-400 px-4 py-3 text-[13.5px] font-bold text-ink-950 transition-all duration-200 hover:bg-mint-300 active:scale-[0.97] disabled:cursor-not-allowed disabled:bg-ink-700 disabled:text-ink-400"
                >
                  <Icon name="plus" className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" strokeWidth={2.4} />
                  Guardar
                </button>
              </div>

              <ul className="space-y-1.5">
                {scored.map((s, i) => {
                  const v = verdict(s.score);
                  return (
                    <li
                      key={s.id}
                      onMouseEnter={() => setHover(s.id)}
                      onMouseLeave={() => setHover(null)}
                      className={cn(
                        "group relative flex items-center gap-3 overflow-hidden rounded-md border px-3 py-2.5 transition-all duration-300",
                        hover === s.id
                          ? "border-ink-500 bg-ink-850"
                          : "border-ink-800 bg-ink-950/50"
                      )}
                    >
                      <span className="w-5 shrink-0 font-mono text-[10px] text-ink-500 tabular-nums">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={cn(
                          "h-8 w-[3px] shrink-0 rounded-full transition-all duration-500",
                          s.score >= 8 ? "bg-mint-400" : s.score >= 6 ? "bg-signal-400" : s.score >= 4 ? "bg-bone-400" : "bg-oxide-400"
                        )}
                        style={{ opacity: hover === s.id ? 1 : 0.55 }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium text-bone-100">
                          {s.text}
                        </span>
                        <span className="mt-0.5 block font-mono text-[9.5px] tracking-[0.12em] text-ink-400 uppercase">
                          {v.tag} · {new Date(s.ts).toLocaleDateString("pt-BR")}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "shrink-0 font-display text-[19px] font-extrabold tabular-nums transition-colors",
                          s.score >= 8 ? "text-mint-300" : s.score >= 6 ? "text-signal-300" : s.score >= 4 ? "text-bone-300" : "text-oxide-400"
                        )}
                      >
                        {s.score.toFixed(1)}
                      </span>
                      <span className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => onGo("rank")}
                          className="rounded p-1.5 text-ink-500 opacity-0 transition-all duration-200 hover:bg-ink-800 hover:text-signal-400 group-hover:opacity-100"
                          aria-label="Ranquear ideia"
                        >
                          <Icon name="arrow" className="h-3.5 w-3.5" strokeWidth={2.2} />
                        </button>
                        <button
                          onClick={() => setIdeas((p) => p.filter((x) => x.id !== s.id))}
                          className="rounded p-1.5 text-ink-500 opacity-0 transition-all duration-200 hover:bg-oxide-400/15 hover:text-oxide-400 group-hover:opacity-100"
                          aria-label="Descartar ideia"
                        >
                          <Icon name="close" className="h-3.5 w-3.5" strokeWidth={2.2} />
                        </button>
                      </span>
                    </li>
                  );
                })}
                {!scored.length && (
                  <li className="rounded-md border border-dashed border-ink-700 p-8 text-center">
                    <p className="font-display text-[15px] font-semibold text-bone-300">
                      Banco vazio
                    </p>
                    <p className="mt-1 text-[12.5px] text-ink-400">
                      Anote dez ideias cruas antes de julgar qualquer uma.
                    </p>
                  </li>
                )}
              </ul>
            </div>

            {/* right: stats */}
            <div className="lg:border-l lg:border-ink-800 lg:pl-10">
              <div className="mb-5">
                <div className="font-mono text-[9.5px] tracking-[0.18em] text-ink-400 uppercase">
                  Fila de produção
                </div>
                <div className="mt-2 flex items-end gap-2">
                  <span className="font-display text-[4rem] leading-[0.8] font-extrabold tracking-[-0.04em] text-bone-50 tabular-nums">
                    {scored.length}
                  </span>
                  <span className="pb-2 font-mono text-[11px] text-ink-400">
                    ideias · média {stats.avg.toFixed(1)}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {[
                  { k: "Aprovadas (≥ 8)", v: stats.approved, c: "bg-mint-400", t: "text-mint-300" },
                  { k: "Ajustar ângulo (6–8)", v: stats.adjust, c: "bg-signal-400", t: "text-signal-300" },
                  { k: "Descartar (< 4)", v: stats.dead, c: "bg-oxide-400", t: "text-oxide-400" },
                ].map((r) => (
                  <div key={r.k}>
                    <div className="mb-1.5 flex items-baseline justify-between">
                      <span className="font-mono text-[10px] tracking-[0.12em] text-bone-400 uppercase">
                        {r.k}
                      </span>
                      <span className={cn("font-display text-lg font-bold tabular-nums", r.t)}>{r.v}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-ink-800">
                      <div
                        className={cn("h-full rounded-full transition-[width] duration-700", r.c)}
                        style={{ width: `${scored.length ? (r.v / scored.length) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-md border border-ink-800 bg-ink-950/60 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Icon name="target" className="h-3.5 w-3.5 text-signal-400" />
                  <span className="font-mono text-[9.5px] tracking-[0.16em] text-signal-400 uppercase">
                    Régua da fila
                  </span>
                </div>
                <p className="text-[12.5px] leading-relaxed text-bone-400">
                  Grave sempre a de maior nota primeiro. Ideia morna entra na fila só se trouxer uma
                  variável nova — prova, prazo ou confissão.
                </p>
                <button
                  onClick={() => onGo("rank")}
                  className="group mt-3 inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.16em] text-signal-400 uppercase transition-colors hover:text-signal-300"
                >
                  abrir o rank de ideia
                  <Icon name="arrow" className="h-3 w-3 transition-transform group-hover:translate-x-1" strokeWidth={2.4} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
