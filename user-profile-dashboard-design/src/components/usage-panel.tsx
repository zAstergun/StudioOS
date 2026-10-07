"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Activity, Gauge } from "lucide-react";

export type Metric = {
  label: string;
  value: string;
  delta: string;
  tone: string;
  hint: string;
};

export type Day = { day: string; weekday: number; minutes: number };
export type Tool = { tool: string; runs: number; share: number };

const TONE: Record<string, string> = {
  green: "#2FD4A0",
  coral: "#F2604C",
  amber: "#F2B33D",
  blue: "#6E93F5",
  white: "#F4F4F2",
};

function barColor(t: number) {
  if (t > 0.82) return "#F2604C";
  if (t > 0.58) return "#F2B33D";
  return "#2FD4A0";
}

function useCountUp(target: number, run: boolean) {
  const reduce = useReducedMotion();
  const [n, setN] = useState(reduce ? target : 0);
  useEffect(() => {
    if (!run || reduce) {
      setN(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const dur = 760;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, run, reduce]);
  return n;
}

function Figure({ value, color }: { value: string; color: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [run, setRun] = useState(false);
  const match = value.match(/^(\d+)(.*)$/);
  const numeric = match ? Number(match[1]) : 0;
  const suffix = match ? match[1].length === value.length ? "" : value.slice(match[1].length) : "";
  const counted = useCountUp(numeric, run && Boolean(match));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRun(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="tnum text-[30px] font-medium leading-none" style={{ color }}>
      {match ? (
        <>
          {counted}
          <span className="text-[17px] opacity-90">{suffix}</span>
        </>
      ) : (
        value
      )}
    </div>
  );
}

function PanelHead({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-[#232327] px-4 py-3">
      <span className="flex gap-1.5">
        <span className="led bg-[#F2604C]" />
        <span className="led bg-[#F2B33D]" />
        <span className="led bg-[#2FD4A0]" />
      </span>
      <span className="micro flex-1 text-center text-[#9a9aa2]">{title}</span>
      {right ?? <span className="w-[52px]" />}
    </div>
  );
}

export function UsagePanel({
  metrics,
  days,
  tools,
  headline,
}: {
  metrics: Metric[];
  days: Day[];
  tools: Tool[];
  headline: string;
}) {
  const reduce = useReducedMotion();
  const max = Math.max(...days.map((d) => d.minutes), 1);
  const bars = days.slice(-56);
  const weekdayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const weekdayTotals = weekdayLabels.map((_, i) => {
    const set = days.filter((d) => d.weekday === i);
    return set.length ? Math.round(set.reduce((a, b) => a + b.minutes, 0) / set.length) : 0;
  });
  const maxWeek = Math.max(...weekdayTotals, 1);

  return (
    <section className="panel scan overflow-hidden">
      <PanelHead
        title="Monitor de uso · 12 semanas"
        right={
          <span className="micro flex items-center gap-1.5 text-[#2FD4A0]">
            <Activity size={12} strokeWidth={2.4} /> Ao vivo
          </span>
        }
      />

      <div className="px-4 pb-5 pt-4">
        <div className="flex h-[104px] items-end gap-[3px]">
          {bars.map((d, i) => {
            const t = d.minutes / max;
            return (
              <motion.div
                key={d.day}
                initial={reduce ? false : { scaleY: 0.08, opacity: 0 }}
                whileInView={{ scaleY: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{
                  duration: 0.42,
                  delay: reduce ? 0 : i * 0.008,
                  ease: [0.2, 0.8, 0.2, 1],
                }}
                style={{
                  height: `${Math.max(9, t * 100)}%`,
                  background: barColor(t),
                  transformOrigin: "bottom",
                }}
                className="flex-1 rounded-full opacity-[0.88]"
                title={`${d.day} — ${d.minutes} min`}
              />
            );
          })}
        </div>
        <div className="mt-2.5 flex items-center justify-between">
          <span className="micro">{bars[0]?.day.split("-").reverse().join("/")}</span>
          <span className="micro text-[#8c8c94]">
            pico {max} min · média{" "}
            {Math.round(days.reduce((a, b) => a + b.minutes, 0) / Math.max(days.length, 1))} min/dia
          </span>
          <span className="micro">{bars[bars.length - 1]?.day.split("-").reverse().join("/")}</span>
        </div>
      </div>

      <div className="mx-4 rounded-xl border border-[#232327] bg-[#0d0d0f] p-3.5">
        <div className="micro mb-3">Carga por dia da semana</div>
        <div className="space-y-[7px]">
          {weekdayLabels.map((label, i) => {
            const filled = Math.round((weekdayTotals[i] / maxWeek) * 18);
            return (
              <div key={label} className="flex items-center gap-3">
                <span className="micro w-7 text-[#8c8c94]">{label}</span>
                <div className="flex flex-1 gap-[3px]">
                  {Array.from({ length: 18 }).map((_, c) => {
                    const on = c < filled;
                    const t = c / 18;
                    return (
                      <span
                        key={c}
                        className="h-[9px] flex-1 rounded-[2px]"
                        style={{
                          background: on ? barColor(Math.max(t, 0.32)) : "#1c1c20",
                          opacity: on ? 0.92 : 1,
                        }}
                      />
                    );
                  })}
                </div>
                <span className="tnum w-14 text-right text-[11px] text-[#b6b6be]">
                  {Math.floor(weekdayTotals[i] / 60)}h
                  {String(weekdayTotals[i] % 60).padStart(2, "0")}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px bg-[#232327]">
        {metrics.map((m) => (
          <div key={m.label} className="bg-[#101012] px-4 py-4">
            <div className="micro">{m.label}</div>
            <div className="mt-2.5 flex items-end justify-between gap-2">
              <Figure value={m.value} color={TONE[m.tone] ?? TONE.white} />
              <span
                className="tnum rounded-md px-1.5 py-0.5 text-[11px]"
                style={{
                  color: TONE[m.tone] ?? TONE.white,
                  background: `${TONE[m.tone] ?? TONE.white}1a`,
                }}
              >
                {m.delta}
              </span>
            </div>
            <div className="micro mt-2 truncate">{m.hint}</div>
          </div>
        ))}
      </div>

      <div className="border-t border-[#232327] px-4 py-4">
        <div className="mb-3 flex items-center gap-2">
          <Gauge size={13} strokeWidth={2} className="text-[#F2B33D]" />
          <span className="micro text-[#9a9aa2]">Ferramentas mais usadas</span>
          <span className="hairline flex-1" />
          <span className="micro tnum">{tools.reduce((a, b) => a + b.runs, 0)} execuções</span>
        </div>
        <div className="space-y-2.5">
          {tools.map((t, i) => (
            <div key={t.tool} className="flex items-center gap-3">
              <span className="tnum w-5 text-[11px] text-[#7f7f88]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="w-[150px] shrink-0 truncate text-[12.5px] text-[#d3d3d8]">
                {t.tool}
              </span>
              <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-[#1c1c20]">
                <motion.div
                  initial={reduce ? false : { width: 0 }}
                  whileInView={{ width: `${t.share * 2.6}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: i * 0.07, ease: [0.2, 0.8, 0.2, 1] }}
                  className="h-full rounded-full"
                  style={{ background: barColor(1 - i * 0.16) }}
                />
              </div>
              <span className="tnum w-12 text-right text-[11px] text-[#b6b6be]">{t.runs}×</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-[#232327] bg-[#0c0c0e] px-4 py-3">
        <p className="text-[12px] leading-relaxed text-[#8c8c94]">
          {headline}
        </p>
      </div>
    </section>
  );
}
