import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../utils/cn";
import { Icon, Meter, useCountUp } from "./ui";

/* ------------------------------------------------------------ waveform */

const BARS = 44;

export function Waveform() {
  const [levels, setLevels] = useState<number[]>(() =>
    Array.from({ length: BARS }, (_, i) => 0.25 + 0.5 * Math.abs(Math.sin(i / 3.1)))
  );
  const seeds = useRef(Array.from({ length: BARS }, (_, i) => i * 0.37));

  useEffect(() => {
    const id = window.setInterval(() => {
      const t = performance.now() / 1000;
      setLevels((prev) =>
        prev.map((v, i) => {
          const wave =
            0.42 +
            0.3 * Math.sin(t * 2.1 + seeds.current[i]) +
            0.2 * Math.sin(t * 5.3 + seeds.current[i] * 1.7);
          const jitter = Math.random() * 0.24;
          return Math.max(0.08, Math.min(1, v * 0.55 + (wave + jitter) * 0.45));
        })
      );
    }, 85);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex h-16 items-end gap-[3px]" aria-hidden="true">
      {levels.map((l, i) => (
        <span
          key={i}
          className={cn(
            "w-full rounded-sm transition-[height,background-color] duration-100 ease-out",
            l > 0.82 ? "bg-oxide-400" : l > 0.58 ? "bg-signal-400" : "bg-mint-400/70"
          )}
          style={{ height: `${l * 100}%` }}
        />
      ))}
    </div>
  );
}

function VuMeter({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-6 font-mono text-[9.5px] tracking-[0.14em] text-ink-400 uppercase">
        {label}
      </span>
      <div className="flex h-3.5 flex-1 gap-[2px]">
        {Array.from({ length: 16 }).map((_, i) => {
          const on = i < Math.round(value * 16);
          const hot = i > 12;
          return (
            <span
              key={i}
              className={cn(
                "h-full flex-1 rounded-[1px] transition-all duration-150",
                on ? (hot ? "bg-oxide-400" : i > 9 ? "bg-signal-400" : "bg-mint-400") : "bg-ink-700"
              )}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ counter */

function Counter({
  value,
  label,
  sub,
  accent,
  meter,
}: {
  value: number;
  label: string;
  sub: string;
  accent: "signal" | "oxide" | "mint" | "sky";
  meter: number;
}) {
  const v = useCountUp(value, 1500);
  return (
    <div className="group relative flex-1 border-t border-ink-700/80 px-5 py-5 transition-colors duration-300 first:border-t-0 hover:bg-ink-850/60 sm:border-t-0 sm:border-l sm:px-6 sm:first:border-l-0">
      <div className="mb-1 flex items-center gap-2">
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full transition-transform duration-300 group-hover:scale-150",
            accent === "signal" && "bg-signal-400",
            accent === "oxide" && "bg-oxide-400",
            accent === "mint" && "bg-mint-400",
            accent === "sky" && "bg-sky-400"
          )}
        />
        <span className="font-mono text-[10px] tracking-[0.16em] text-bone-400 uppercase">
          {label}
        </span>
      </div>
      <div
        className={cn(
          "font-display text-[2.6rem] leading-none font-extrabold tracking-[-0.04em] tabular-nums",
          accent === "signal" && "text-signal-300",
          accent === "oxide" && "text-oxide-400",
          accent === "mint" && "text-mint-300",
          accent === "sky" && "text-sky-400"
        )}
      >
        {v.toLocaleString("pt-BR")}
      </div>
      <div className="mt-2.5">
        <Meter value={meter} max={100} accent={accent} showValue={false} />
      </div>
      <p className="mt-2 font-mono text-[10.5px] text-ink-400">{sub}</p>
    </div>
  );
}

/* ------------------------------------------------------------ pipeline */

const STAGES = [
  { k: "01", label: "Ideia", tool: "rank" },
  { k: "02", label: "Título", tool: "titulos" },
  { k: "03", label: "Hook", tool: "hooks" },
  { k: "04", label: "Roteiro", tool: "roteiro" },
  { k: "05", label: "Thumb", tool: "thumbnail" },
  { k: "06", label: "Post", tool: "score" },
];

function Pipeline({ onGo }: { onGo: (id: string) => void }) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setActive((a) => (a + 1) % STAGES.length), 1800);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex flex-wrap items-stretch gap-px overflow-hidden rounded-md border border-ink-700/80 bg-ink-700/40">
      {STAGES.map((s, i) => (
        <button
          key={s.k}
          onClick={() => onGo(s.tool)}
          onMouseEnter={() => setActive(i)}
          className={cn(
            "group relative flex min-w-[92px] flex-1 items-center gap-2 px-3 py-2.5 text-left transition-colors duration-300",
            active === i ? "bg-ink-800" : "bg-ink-900 hover:bg-ink-850"
          )}
        >
          <span
            className={cn(
              "font-mono text-[10px] tabular-nums transition-colors",
              active === i ? "text-signal-400" : "text-ink-400"
            )}
          >
            {s.k}
          </span>
          <span
            className={cn(
              "text-[12.5px] font-semibold transition-colors",
              active === i ? "text-bone-50" : "text-bone-400 group-hover:text-bone-200"
            )}
          >
            {s.label}
          </span>
          <span
            className={cn(
              "absolute inset-x-0 bottom-0 h-[2px] origin-left bg-signal-400 transition-transform duration-500",
              active === i ? "scale-x-100" : "scale-x-0"
            )}
          />
        </button>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- hero */

export function Console({
  onGo,
  stats,
  demo = false,
}: {
  onGo: (id: string) => void;
  stats: { ideias: number; roteiros: number; posts: number; humanizados: number };
  demo?: boolean;
}) {
  const [l, setL] = useState({ l: 0.55, r: 0.68 });
  useEffect(() => {
    const id = window.setInterval(
      () => setL({ l: 0.25 + Math.random() * 0.7, r: 0.25 + Math.random() * 0.7 }),
      140
    );
    return () => window.clearInterval(id);
  }, []);

    const ticker = useMemo(
    () => [
      "24 FRAMEWORKS ATIVOS",
      "MOTOR DE VOZ: CALIBRADO",
      "RÉGUA DE IDEIA 0–10",
      "SCORE DE POST 0–50",
      "ANTI-IA: DICIONÁRIO v3",
      "TELEPROMPTER ONLINE",
      "HISTÓRICO ATIVO · v2.5",
      "LIXEIRA: RETENÇÃO LOCAL",
      "CHAVE LOCAL: NUNCA ENVIADA",
    ],
    []
  );

  return (
    <header className="relative overflow-hidden border-b border-ink-700/70 bg-ink-900/60">
      <div className="pointer-events-none absolute inset-0 grid-lines opacity-70" />
      <div className="pointer-events-none absolute -top-40 -right-24 h-[26rem] w-[26rem] rounded-full bg-signal-400/[0.07] blur-[90px]" />
      <div className="pointer-events-none absolute -bottom-52 left-1/4 h-[22rem] w-[22rem] rounded-full bg-sky-500/[0.07] blur-[100px]" />
      <div className="noise pointer-events-none absolute inset-0" />

      <div className="relative mx-auto grid max-w-[1400px] gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-14 lg:px-8 lg:py-14">
        {/* left */}
        <div>
          <div className="anim-rise mb-6 flex items-center gap-3">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-md border border-signal-400/40 bg-signal-400/10 text-signal-400">
              <Icon name="logo" className="h-5 w-5" strokeWidth={1.5} />
            </span>
            <span className="font-mono text-[11px] tracking-[0.28em] text-bone-300 uppercase">
              Sistema operacional do criador
            </span>
          </div>

          <h1 className="anim-rise font-display text-[clamp(3rem,10.5vw,7.5rem)] leading-[0.82] font-extrabold tracking-[-0.045em] text-bone-50" style={{ animationDelay: "60ms" }}>
            Estúdio
            <br />
            <span className="relative inline-block">
              <span className="relative z-10 text-signal-400">em operação</span>
              <span className="absolute inset-x-0 bottom-[0.14em] z-0 h-[0.14em] bg-oxide-400/70" />
            </span>
          </h1>

          <p
            className="anim-rise mt-6 max-w-xl text-[16.5px] leading-relaxed text-bone-300"
            style={{ animationDelay: "140ms" }}
          >
            Doze ferramentas ligadas ao mesmo cérebro: o seu canal calibrado. Da ideia crua ao post
            publicado — com régua, número e critério em cada etapa. Nada de achismo.
          </p>

          <div className="anim-rise mt-8 flex flex-wrap items-center gap-3" style={{ animationDelay: "200ms" }}>
            <button
              onClick={() => onGo("rank")}
              className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-md bg-signal-400 px-6 py-3 text-[14.5px] font-bold text-ink-950 shadow-[0_18px_40px_-18px_rgba(247,183,51,0.95)] transition-all duration-200 hover:bg-signal-300 active:scale-[0.98]"
            >
              <span className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-18deg] bg-white/40 opacity-0 transition-opacity group-hover:opacity-100 group-hover:[animation:sweep_0.75s_ease-out]" />
              Avaliar uma ideia agora
              <Icon name="arrow" className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" strokeWidth={2} />
            </button>
            <button
              onClick={() => onGo("calibracao")}
              className="inline-flex items-center gap-2 rounded-md border border-ink-600 bg-ink-900/70 px-5 py-3 text-[14.5px] font-semibold text-bone-200 transition-all duration-200 hover:border-bone-300/40 hover:bg-ink-800"
            >
              <Icon name="dial" className="h-4 w-4 text-signal-400" />
              Calibrar meu canal
            </button>
          </div>

          <div className="anim-rise mt-8" style={{ animationDelay: "260ms" }}>
            <Pipeline onGo={onGo} />
          </div>
        </div>

        {/* right — monitor deck */}
        <div className="anim-rise lg:pt-4" style={{ animationDelay: "180ms" }}>
          <div className="relative overflow-hidden rounded-xl border border-ink-700 bg-ink-950/80 shadow-[0_40px_90px_-40px_rgba(0,0,0,1)]">
            <div className="scanlines pointer-events-none absolute inset-0 opacity-40" />
            <div className="relative flex items-center justify-between border-b border-ink-700/80 px-4 py-2.5">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-oxide-400/80" />
                <span className="h-2 w-2 rounded-full bg-signal-400/80" />
                <span className="h-2 w-2 rounded-full bg-mint-400/80" />
              </div>
              <span className="font-mono text-[9.5px] tracking-[0.22em] text-ink-400 uppercase">
                Monitor de saída
              </span>
              <Icon name="sound" className="h-3.5 w-3.5 text-ink-400" />
            </div>

            <div className="relative space-y-4 p-4">
              <Waveform />
              <div className="space-y-2 rounded-md border border-ink-700/70 bg-ink-900/60 p-3">
                <VuMeter label="L" value={l.l} />
                <VuMeter label="R" value={l.r} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { k: "CTR alvo", v: "6.4%", a: "text-mint-300" },
                  { k: "Retenção", v: "48%", a: "text-signal-300" },
                  { k: "Ideias/ciclo", v: "12", a: "text-sky-400" },
                  { k: "Nota média", v: "43/50", a: "text-bone-100" },
                ].map((m) => (
                  <div
                    key={m.k}
                    className="rounded-md border border-ink-700/70 bg-ink-900/50 px-3 py-2 transition-colors duration-200 hover:border-ink-600"
                  >
                    <div className="font-mono text-[9px] tracking-[0.16em] text-ink-400 uppercase">
                      {m.k}
                    </div>
                    <div className={cn("font-display text-lg font-bold tabular-nums", m.a)}>{m.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* rotating dial */}
          <div className="mt-4 flex items-center gap-4 rounded-xl border border-ink-700/70 bg-ink-900/50 p-4">
            <div className="relative h-16 w-16 shrink-0">
              <div className="anim-spin-slow absolute inset-0 rounded-full border border-dashed border-ink-600" />
              <div className="absolute inset-2 rounded-full border border-signal-400/40 bg-ink-950" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-display text-lg font-extrabold text-signal-400 tabular-nums">
                  8.6
                </span>
              </div>
              <div className="absolute -top-1 left-1/2 h-2 w-px -translate-x-1/2 bg-signal-400" />
            </div>
            <div>
              <div className="font-mono text-[9.5px] tracking-[0.18em] text-ink-400 uppercase">
                Última ideia ranqueada
              </div>
              <div className="font-display text-[15px] font-semibold text-bone-100">
                “Parei de aportar R$100 em FIIs”
              </div>
              <div className="mt-1 font-mono text-[10.5px] text-mint-400">
                POTENCIAL ALTO · PRODUZIR
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* counters */}
      <div className="relative border-t border-ink-700/70 bg-ink-950/60">
        <div className="mx-auto flex max-w-[1400px] flex-col sm:flex-row">
          <Counter value={stats.ideias} label="Ideias no banco" sub={demo ? "número fictício · entre para salvar seus dados" : "rank + novas ideias regeneradas"} accent="signal" meter={Math.min(100, stats.ideias * 9)} />
          <Counter value={stats.roteiros} label="Roteiros criados" sub={demo ? "número fictício · entre para salvar seus dados" : "montados na aba blocos"} accent="sky" meter={Math.min(100, stats.roteiros * 12)} />
          <Counter value={stats.posts} label="Posts avaliados" sub={demo ? "número fictício · entre para salvar seus dados" : "laudos de 0 a 50 emitidos"} accent="mint" meter={Math.min(100, stats.posts * 8)} />
          <Counter value={stats.humanizados} label="Textos humanizados" sub={demo ? "número fictício · entre para salvar seus dados" : "filtro anti-ia aplicado"} accent="oxide" meter={Math.min(100, stats.humanizados * 11)} />
        </div>
      </div>

      {/* ticker */}
      <div className="relative overflow-hidden border-t border-ink-700/70 bg-ink-900/80 py-2">
        <div className="anim-marquee flex w-max gap-8 whitespace-nowrap">
          {[...ticker, ...ticker, ...ticker, ...ticker].map((t, i) => (
            <span key={i} className="flex items-center gap-8 font-mono text-[10px] tracking-[0.22em] text-ink-400 uppercase">
              <span className={cn(i % 3 === 0 && "text-signal-400/80")}>{t}</span>
              <span className="text-ink-600">◆</span>
            </span>
          ))}
        </div>
      </div>
    </header>
  );
}
