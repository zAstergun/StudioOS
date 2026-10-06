import { useState } from "react";
import { cn } from "../utils/cn";
import { FRAMEWORKS, TOOLS, accentSoft, accentText, type Tool } from "../data";
import { Icon, Reveal, SectionHead } from "../components/ui";
import { IdeaBank } from "./IdeaBank";

/* ------------------------------------------------------- mini visuals */

function Mini({ id }: { id: string }) {
  const bar = "rounded-full bg-current";
  switch (id) {
    case "rank":
      return (
        <div className="flex items-end gap-1.5">
          {[4, 7, 9, 6, 8].map((h, i) => (
            <span key={i} className={cn(bar, "w-1.5 opacity-70")} style={{ height: `${h * 3}px`, transitionDelay: `${i * 40}ms` }} />
          ))}
        </div>
      );
    case "titulos":
      return (
        <div className="w-full space-y-1.5">
          {[88, 64, 74].map((w, i) => (
            <span key={i} className={cn(bar, "block h-[5px] opacity-60")} style={{ width: `${w}%` }} />
          ))}
        </div>
      );
    case "hooks":
      return (
        <div className="flex items-center gap-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className={cn("h-6 w-[3px] rounded-full bg-current opacity-60")} style={{ transform: `scaleY(${0.4 + ((i * 37) % 10) / 12})` }} />
          ))}
        </div>
      );
    case "roteiro":
      return (
        <div className="flex h-8 w-full items-center gap-[3px]">
          {Array.from({ length: 26 }).map((_, i) => (
            <span key={i} className="w-full rounded-sm bg-current opacity-50" style={{ height: `${18 + Math.abs(Math.sin(i * 0.9)) * 80}%` }} />
          ))}
        </div>
      );
    case "thumbnail":
      return (
        <div className="flex h-9 w-16 overflow-hidden rounded border border-current opacity-70">
          <span className="w-[45%] bg-current opacity-40" />
          <span className="w-[10%]" />
          <span className="flex-1 bg-current opacity-15" />
        </div>
      );
    case "receita":
      return (
        <div className="flex items-center gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="flex items-center gap-1.5">
              <span className={cn("h-2 w-2 rounded-full bg-current", i === 3 ? "opacity-90" : "opacity-35")} />
              {i < 3 && <span className="h-px w-3 bg-current opacity-30" />}
            </span>
          ))}
        </div>
      );
    case "humanizador":
      return (
        <div className="space-y-1.5">
          <span className="block h-[5px] w-[70%] rounded-full bg-current opacity-30 line-through" />
          <span className="block h-[5px] w-[52%] rounded-full bg-current opacity-70" />
        </div>
      );
    case "score":
      return (
        <div className="flex gap-[3px]">
          {Array.from({ length: 14 }).map((_, i) => (
            <span key={i} className={cn("h-5 w-[5px] rounded-[1px] bg-current", i < 11 ? "opacity-80" : "opacity-20")} />
          ))}
        </div>
      );
    case "mentor":
      return (
        <div className="grid grid-cols-8 gap-[3px]">
          {Array.from({ length: 24 }).map((_, i) => (
            <span key={i} className={cn("h-[5px] w-[5px] rounded-[1px] bg-current", i === 3 ? "opacity-100" : "opacity-25")} />
          ))}
        </div>
      );
    case "membros":
      return (
        <div className="flex items-end gap-1">
          {[12, 20, 16, 26].map((h, i) => (
            <span key={i} className="w-2 rounded-t bg-current" style={{ height: `${h}px`, opacity: 0.25 + i * 0.2 }} />
          ))}
        </div>
      );
    case "calibracao":
      return (
        <div className="relative h-9 w-9">
          <span className="absolute inset-0 rounded-full border-2 border-current opacity-20" />
          <span className="absolute inset-0 rounded-full border-2 border-current opacity-90" style={{ clipPath: "polygon(50% 50%, 50% 0, 100% 0, 100% 78%, 30% 100%)" }} />
          <span className="absolute inset-[38%] rounded-full bg-current" />
        </div>
      );
    case "wiki":
      return (
        <div className="space-y-1">
          {[100, 76, 88, 54].map((w, i) => (
            <span key={i} className="block h-[4px] rounded-full bg-current opacity-50" style={{ width: `${w}%` }} />
          ))}
        </div>
      );
    default:
      return null;
  }
}

/* ---------------------------------------------------------- tool card */

function ToolCard({ tool, i, onGo }: { tool: Tool; i: number; onGo: (id: string) => void }) {
  return (
    <Reveal delay={(i % 4) * 70} className={cn("h-full", tool.span)}>
      <button
        onClick={() => onGo(tool.id)}
        className="group relative flex h-full w-full flex-col overflow-hidden rounded-lg border border-ink-700/80 bg-ink-900/60 p-5 text-left transition-all duration-400 hover:-translate-y-1.5 hover:border-ink-500 hover:bg-ink-850"
      >
        <span
          className={cn(
            "pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100",
            tool.accent === "signal" && "bg-signal-400/20",
            tool.accent === "oxide" && "bg-oxide-400/20",
            tool.accent === "mint" && "bg-mint-400/20",
            tool.accent === "sky" && "bg-sky-400/20",
            tool.accent === "plum" && "bg-plum-400/20",
            tool.accent === "bone" && "bg-bone-100/15"
          )}
        />
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] origin-left scale-x-0 bg-current transition-transform duration-500 group-hover:scale-x-100" />

        <div className="relative mb-4 flex items-start justify-between gap-3">
          <span
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-md border transition-transform duration-400 group-hover:rotate-[-6deg] group-hover:scale-105",
              accentSoft[tool.accent]
            )}
          >
            <Icon name={tool.icon} className="h-[18px] w-[18px]" strokeWidth={1.6} />
          </span>
          <span className={cn("rounded border px-2 py-0.5 font-mono text-[9px] tracking-[0.16em] uppercase", accentSoft[tool.accent])}>
            {tool.kicker}
          </span>
        </div>

        <h3 className="relative font-display text-[19px] leading-tight font-extrabold tracking-[-0.02em] text-bone-50">
          {tool.name}
        </h3>
        <p className="relative mt-1.5 flex-1 text-[13px] leading-relaxed text-bone-400">{tool.desc}</p>

        <div className={cn("relative mt-5 flex items-end justify-between gap-4 opacity-90", accentText[tool.accent])}>
          <Mini id={tool.id} />
          <span className="flex items-center gap-1.5 font-mono text-[9.5px] tracking-[0.16em] text-ink-400 uppercase transition-colors group-hover:text-bone-100">
            abrir
            <Icon name="arrow" className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2} />
          </span>
        </div>
      </button>
    </Reveal>
  );
}

/* --------------------------------------------------------------- home */

const FILTERS = ["Todas", "Criação", "Publicação", "Estratégia", "Painel"] as const;

export function Home({
  onGo,
  progress,
  niche,
}: {
  onGo: (id: string) => void;
  progress: number;
  niche: string;
}) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Todas");
  const list = TOOLS.filter((t) => (filter === "Todas" ? true : t.group === filter));
  const [hoverFw, setHoverFw] = useState<string | null>(null);
  const activeFw = FRAMEWORKS.find((f) => f.n === hoverFw);

  return (
    <div>
      {/* ------------------------------------------------ tools */}
      <section className="mx-auto max-w-[1400px] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <SectionHead
          index="01"
          kicker="Ferramentas rápidas"
          title={
            <>
              Doze bancadas.
              <br />
              <span className="text-signal-400">Uma régua só.</span>
            </>
          }
          lede="Toda ferramenta lê a mesma calibração do canal. É por isso que o título gerado aqui tem a sua cara — e não a cara de um template importado."
          right={
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "rounded border px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] uppercase transition-all duration-200",
                    filter === f
                      ? "border-signal-400/60 bg-signal-400/15 text-signal-300"
                      : "border-ink-700 bg-ink-900/60 text-bone-400 hover:border-ink-500 hover:text-bone-100"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          }
        />

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-12">
          {list.map((t, i) => (
            <ToolCard key={t.id} tool={t} i={i} onGo={onGo} />
          ))}
        </div>
      </section>

      <IdeaBank niche={niche} onGo={onGo} />

      {/* ------------------------------------------------ manifesto */}
      <section className="relative overflow-hidden border-y border-ink-800 bg-ink-900/40">
        <div className="pointer-events-none absolute inset-0 grid-lines opacity-40" />
        <div className="pointer-events-none absolute -left-20 top-1/2 h-72 w-72 -translate-y-1/2 rounded-full bg-oxide-400/[0.08] blur-[90px]" />
        <div className="relative mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <Reveal>
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-16">
              <div>
                <div className="mb-5 flex items-center gap-3">
                  <span className="h-px w-8 bg-oxide-400/70" />
                  <span className="font-mono text-[11px] tracking-[0.22em] text-oxide-400 uppercase">
                    03 · Como o painel pensa
                  </span>
                </div>
                <p className="font-display text-[clamp(1.7rem,4.2vw,3rem)] leading-[1.05] font-extrabold tracking-[-0.03em] text-bone-50 text-balance">
                  Criador não tem problema de ideia.
                  <br />
                  <span className="text-ink-400">Tem problema de</span>{" "}
                  <span className="relative inline-block text-oxide-400">
                    critério
                    <span className="absolute inset-x-0 -bottom-1 h-[3px] bg-oxide-400/40" />
                  </span>
                  .
                </p>
                <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-bone-400">
                  O StudioOS existe para transformar gosto em número. Cada ferramenta devolve uma
                  nota, uma evidência e uma correção — nunca um texto bonito que você não sabe se
                  funciona.
                </p>

                <div className="mt-9 grid gap-px overflow-hidden rounded-lg border border-ink-700/80 bg-ink-700/60 sm:grid-cols-3">
                  {[
                    { n: "01", t: "Medir", d: "Toda saída vem com nota e régua visível." },
                    { n: "02", t: "Comparar", d: "Sempre contra o seu histórico, nunca contra a média." },
                    { n: "03", t: "Corrigir", d: "O painel diz qual critério derrubou o resultado." },
                  ].map((s) => (
                    <div key={s.n} className="group bg-ink-900 p-5 transition-colors duration-300 hover:bg-ink-850">
                      <div className="font-mono text-[11px] text-signal-400 tabular-nums">{s.n}</div>
                      <div className="mt-2 font-display text-xl font-extrabold text-bone-50">{s.t}</div>
                      <div className="mt-1.5 text-[12.5px] leading-relaxed text-ink-400">{s.d}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="sticky top-6 space-y-3">
                  <div className="rounded-lg border border-ink-700 bg-ink-950/70 p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="font-mono text-[9.5px] tracking-[0.18em] text-ink-400 uppercase">
                        Calibração do canal
                      </span>
                      <span className={cn("font-mono text-[11px] tabular-nums", progress >= 100 ? "text-mint-400" : "text-signal-400")}>
                        {Math.round(progress)}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-ink-800">
                      <div
                        className={cn("h-full rounded-full transition-[width] duration-1000", progress >= 100 ? "bg-mint-400" : "bg-signal-400")}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="mt-3 text-[12.5px] leading-relaxed text-bone-400">
                      {progress >= 100
                        ? "Canal calibrado. As réguas de título, ideia e fit já usam o seu vocabulário."
                        : "Sem calibração, o painel devolve régua genérica. São 4 perguntas e 10 títulos."}
                    </p>
                    <button
                      onClick={() => onGo("calibracao")}
                      className="group mt-4 inline-flex items-center gap-2 font-mono text-[10.5px] tracking-[0.16em] text-signal-400 uppercase transition-colors hover:text-signal-300"
                    >
                      {progress >= 100 ? "revisar dados" : "completar calibração"}
                      <Icon name="arrow" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" strokeWidth={2} />
                    </button>
                  </div>

                  <div className="rounded-lg border border-ink-700 bg-ink-900/60 p-5">
                    <div className="font-mono text-[9.5px] tracking-[0.18em] text-ink-400 uppercase">
                      Ordem de uso
                    </div>
                    <ol className="mt-3 space-y-2.5">
                      {[
                        ["Calibração", "calibracao"],
                        ["Rank de Ideia", "rank"],
                        ["Título + Hook", "titulos"],
                        ["Roteiro + Teleprompter", "roteiro"],
                        ["Score de Post", "score"],
                      ].map(([label, id], i) => (
                        <li key={id}>
                          <button
                            onClick={() => onGo(id)}
                            className="group flex w-full items-center gap-3 text-left"
                          >
                            <span className="font-mono text-[10px] text-ink-500 tabular-nums">{i + 1}</span>
                            <span className="flex-1 border-b border-dashed border-ink-700 pb-2 text-[13px] text-bone-300 transition-colors group-hover:border-signal-400/50 group-hover:text-signal-300">
                              {label}
                            </span>
                            <Icon name="arrow" className="h-3 w-3 text-ink-600 transition-all group-hover:translate-x-0.5 group-hover:text-signal-400" strokeWidth={2.4} />
                          </button>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------ frameworks */}
      <section className="mx-auto max-w-[1400px] px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <SectionHead
          index="04"
          kicker="Mentor AI"
          title={
            <>
              24 modelos mentais,
              <br />
              <span className="text-sky-400">numerados como ferramenta.</span>
            </>
          }
          lede="Passe o cursor para ler a lente de cada framework. Clique para abrir o consultório completo e gerar um parecer sobre o seu caso."
          right={
            <button
              onClick={() => onGo("mentor")}
              className="group inline-flex items-center gap-2.5 rounded-md border border-ink-600 bg-ink-900/70 px-5 py-3 text-[14px] font-semibold text-bone-100 transition-all duration-200 hover:border-sky-400/60 hover:text-sky-400"
            >
              Abrir Mentor AI
              <Icon name="arrow" className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2} />
            </button>
          }
        />

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-ink-700/80 bg-ink-800 sm:grid-cols-3 lg:grid-cols-4">
            {FRAMEWORKS.map((f) => (
              <button
                key={f.n}
                onMouseEnter={() => setHoverFw(f.n)}
                onFocus={() => setHoverFw(f.n)}
                onMouseLeave={() => setHoverFw(null)}
                onClick={() => onGo("mentor")}
                className={cn(
                  "group relative overflow-hidden bg-ink-900 p-3.5 text-left transition-colors duration-300 hover:bg-ink-850",
                  hoverFw === f.n && "bg-ink-850"
                )}
              >
                <div className={cn("font-mono text-[10px] tabular-nums transition-colors", hoverFw === f.n ? "text-sky-400" : "text-ink-500")}>
                  {f.n}
                </div>
                <div className="mt-1 font-display text-[13px] leading-tight font-bold text-bone-200 transition-colors group-hover:text-bone-50">
                  {f.title}
                </div>
                <div className="mt-1 font-mono text-[8.5px] tracking-[0.14em] text-ink-500 uppercase">
                  {f.group}
                </div>
                <span className={cn("absolute inset-x-0 bottom-0 h-[2px] origin-left bg-sky-400 transition-transform duration-400", hoverFw === f.n ? "scale-x-100" : "scale-x-0")} />
              </button>
            ))}
          </div>

          <div className="rounded-lg border border-ink-700/80 bg-ink-950/60 p-6 lg:sticky lg:top-6 lg:self-start">
            <div className="mb-4 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
              <span className="font-mono text-[9.5px] tracking-[0.2em] text-sky-400 uppercase">
                {activeFw ? `framework ${activeFw.n}` : "lente selecionada"}
              </span>
            </div>
            {activeFw ? (
              <div key={activeFw.n} className="anim-rise">
                <h3 className="font-display text-[26px] leading-tight font-extrabold tracking-[-0.02em] text-bone-50">
                  {activeFw.title}
                </h3>
                <p className="mt-3 border-l-2 border-sky-400/50 pl-3 text-[13.5px] leading-relaxed text-bone-300">
                  {activeFw.lens}
                </p>
                <p className="mt-4 text-[12.5px] leading-relaxed text-ink-400">{activeFw.question}</p>
              </div>
            ) : (
              <p className="text-[13px] leading-relaxed text-ink-400">
                Cada framework é uma pergunta que você faz antes de decidir — não uma frase de
                efeito para colar no roteiro.
              </p>
            )}
            <div className="mt-6 border-t border-ink-800 pt-4">
              <div className="font-mono text-[9.5px] tracking-[0.16em] text-ink-400 uppercase">
                Distribuição por grupo
              </div>
              <div className="mt-3 space-y-2">
                {["Criação", "Diagnóstico", "Posicionamento", "Estratégia"].map((g) => {
                  const n = FRAMEWORKS.filter((f) => f.group === g).length;
                  return (
                    <div key={g} className="flex items-center gap-3">
                      <span className="w-28 font-mono text-[10px] text-bone-400 uppercase">{g}</span>
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-ink-800">
                        <div className="h-full rounded-full bg-sky-400/70" style={{ width: `${(n / 24) * 100 * 3}%` }} />
                      </div>
                      <span className="font-mono text-[10px] text-ink-400 tabular-nums">{n}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
