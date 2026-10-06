import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "../utils/cn";
import { accentSoft, type Accent } from "../data";

/* ------------------------------------------------------------------ icons */

const P: Record<string, ReactNode> = {
  gauge: <><path d="M3 17a9 9 0 1 1 18 0" /><path d="m12 13 4.5-3.5" /><circle cx="12" cy="17" r="1.4" /></>,
  type: <><path d="M4 7V5h16v2" /><path d="M12 5v14" /><path d="M9 19h6" /></>,
  bolt: <><path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12z" /></>,
  mic: <><rect x="9" y="2.5" width="6" height="11" rx="3" /><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" /><path d="M12 18v3.5" /></>,
  frame: <><rect x="2.5" y="4.5" width="19" height="15" rx="2" /><path d="M9.5 4.5v15" /><path d="M2.5 12h19" /></>,
  flask: <><path d="M9 2.5h6" /><path d="M10 2.5v6L4.8 18a2 2 0 0 0 1.7 3h11a2 2 0 0 0 1.7-3L14 8.5v-6" /><path d="M7.5 14h9" /></>,
  wave: <><path d="M2 12c2 0 2-5 4-5s2 10 4 10 2-8 4-8 2 6 4 6 2-3 4-3" /></>,
  check: <><path d="m4 12.5 5 5L20 6" /><path d="M4 19h16" /></>,
  brain: <><path d="M9.5 3.5A3 3 0 0 0 6.6 7 3 3 0 0 0 5 12.4a3 3 0 0 0 1.7 4.3 3 3 0 0 0 5.8-1V4.9a1.6 1.6 0 0 0-3-1.4Z" /><path d="M14.5 3.5A3 3 0 0 1 17.4 7 3 3 0 0 1 19 12.4a3 3 0 0 1-1.7 4.3 3 3 0 0 1-5.8-1" /></>,
  layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /><path d="m3 17.5 9 5 9-5" /></>,
  dial: <><circle cx="12" cy="12" r="9" /><path d="m12 12 4-4" /><circle cx="12" cy="12" r="1.2" /></>,
  book: <><path d="M4 4.5A2 2 0 0 1 6 2.5h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 18.5A2 2 0 0 1 6 16.5h13" /></>,
  arrow: <><path d="M4 12h15" /><path d="m13 6 6 6-6 6" /></>,
  spark: <><path d="M12 2.5 14 9l6.5 2-6.5 2-2 6.5L10 13 3.5 11 10 9z" /></>,
  play: <><path d="M7 4.5 19 12 7 19.5z" /></>,
  pause: <><rect x="6" y="4.5" width="4" height="15" rx="1" /><rect x="14" y="4.5" width="4" height="15" rx="1" /></>,
  plus: <><path d="M12 4.5v15M4.5 12h15" /></>,
  close: <><path d="m5 5 14 14M19 5 5 19" /></>,
  chevron: <><path d="m6 9 6 6 6-6" /></>,
  copy: <><rect x="8.5" y="8.5" width="12" height="12" rx="2" /><path d="M15.5 5.5v-1a1 1 0 0 0-1-1h-10a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h1" /></>,
  lock: <><rect x="4.5" y="10" width="15" height="10.5" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5.5l3.5 2" /></>,
  target: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" /></>,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /></>,
  refresh: <><path d="M20 12a8 8 0 1 1-2.6-5.9" /><path d="M20 4v5h-5" /></>,
  stack: <><rect x="3" y="3.5" width="8" height="8" rx="1.5" /><rect x="13" y="3.5" width="8" height="8" rx="1.5" /><rect x="3" y="13.5" width="8" height="7" rx="1.5" /><rect x="13" y="13.5" width="8" height="7" rx="1.5" /></>,
  sound: <><path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z" /><path d="M15.5 9a4.5 4.5 0 0 1 0 6" /><path d="M18 6.5a8 8 0 0 1 0 11" /></>,
  logo: <><path d="M12 2.5 21 7v10l-9 4.5L3 17V7z" /><path d="M12 12 21 7" /><path d="M12 12v9.5" /><path d="M12 12 3 7" /></>,
  trash: <><path d="M4 6.5h16" /><path d="M9.5 6V4.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V6" /><path d="M6.5 6.5 7.3 20a1 1 0 0 0 1 1h7.4a1 1 0 0 0 1-1l.8-13.5" /><path d="M10 10.5v6M14 10.5v6" /></>,
  historico: <><path d="M3.5 12a8.5 8.5 0 1 1 2.5 6" /><path d="M3.5 12H8" /><path d="M3.5 12V7.5" /><path d="M12 8.5V12l3 1.75" /></>,
  login: <><path d="M14 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5" /><path d="m10 17 5-5-5-5" /><path d="M15 12H3" /></>,
  restore: <><path d="M3.5 7v5h5" /><path d="M3.5 12a9 9 0 1 0 2.6-6.35L3.5 8" /></>,
  star: <><path d="m12 3 2.6 5.5 5.9.7-4.4 4 1.2 5.8L12 16.1 6.7 19l1.2-5.8-4.4-4 5.9-.7z" /></>,
  download: <><path d="M12 3.5v11" /><path d="m7.5 10 4.5 4.5L16.5 10" /><path d="M4 17.5V19a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19v-1.5" /></>,
  undo: <><path d="M8.5 5.5 4 10l4.5 4.5" /><path d="M4 10h9.5a6.5 6.5 0 0 1 0 13h-2" /></>,
};

export function Icon({
  name,
  className,
  strokeWidth = 1.6,
}: {
  name: keyof typeof P | string;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("h-5 w-5", className)}
      aria-hidden="true"
    >
      {P[name] ?? P.spark}
    </svg>
  );
}

/* ----------------------------------------------------------------- reveal */

export function Reveal({
  children,
  delay = 0,
  className,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li";
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setSeen(true);
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const Tag = as as "div";
  return (
    <Tag
      ref={ref as never}
      className={cn("reveal", seen && "is-in", className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}

/* ------------------------------------------------------------------ panel */

export function Panel({
  children,
  className,
  tone = "dark",
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  tone?: "dark" | "raised" | "paper";
  hover?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative rounded-lg border",
        tone === "dark" && "border-ink-700/80 bg-ink-900/70",
        tone === "raised" && "border-ink-600/70 bg-ink-850",
        tone === "paper" && "border-bone-200/15 bg-bone-100 text-ink-900",
        hover &&
          "transition-all duration-300 hover:-translate-y-1 hover:border-ink-500 hover:shadow-[0_24px_60px_-24px_rgba(0,0,0,0.9)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function Kicker({
  children,
  accent = "signal",
  className,
}: {
  children: ReactNode;
  accent?: Accent;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded border px-2 py-0.5 font-mono text-[10px] tracking-[0.16em] uppercase",
        accentSoft[accent],
        className
      )}
    >
      {children}
    </span>
  );
}

export function SectionHead({
  index,
  kicker,
  title,
  lede,
  right,
}: {
  index?: string;
  kicker: string;
  title: ReactNode;
  lede?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-5 border-b border-ink-700/70 pb-6 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        <div className="mb-3 flex items-center gap-3">
          {index && (
            <span className="font-mono text-[11px] text-ink-400 tabular-nums">{index}</span>
          )}
          <span className="h-px w-8 bg-signal-400/60" />
          <span className="font-mono text-[11px] tracking-[0.22em] text-signal-400 uppercase">
            {kicker}
          </span>
        </div>
        <h2 className="font-display text-3xl leading-[0.95] font-extrabold tracking-[-0.02em] text-balance text-bone-50 sm:text-4xl md:text-[2.9rem]">
          {title}
        </h2>
        {lede && <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-bone-400">{lede}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ forms */

export function Label({
  children,
  hint,
  n,
}: {
  children: ReactNode;
  hint?: string;
  n?: string | number;
}) {
  return (
    <div className="mb-1.5 flex items-baseline gap-2">
      {n !== undefined && (
        <span className="font-mono text-[11px] text-signal-400/80 tabular-nums">{n}.</span>
      )}
      <label className="font-mono text-[11px] tracking-[0.14em] text-bone-300 uppercase">
        {children}
      </label>
      {hint && <span className="ml-auto text-[11px] text-ink-400">{hint}</span>}
    </div>
  );
}

const fieldBase =
  "w-full rounded-md border border-ink-600/80 bg-ink-950/70 px-3 py-2.5 text-[14px] text-bone-100 placeholder:text-ink-400 outline-none transition-all duration-200 focus:border-signal-400/70 focus:bg-ink-950 focus:ring-2 focus:ring-signal-400/15";

export function Input({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={cn(fieldBase, className)} />;
}

export function Textarea({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...p} className={cn(fieldBase, "resize-y leading-relaxed", className)} />;
}

export function Select({
  className,
  children,
  ...p }: React.SelectHTMLAttributes<HTMLSelectElement>
) {
  return (
    <select {...p} className={cn(fieldBase, "appearance-none pr-9", className)}>
      {children}
    </select>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "solid" | "outline" | "ghost" | "paper";
  size?: "sm" | "md";
  icon?: string;
};

export function Button({
  variant = "solid",
  size = "md",
  icon,
  className,
  children,
  ...p
}: BtnProps) {
  return (
    <button
      {...p}
      className={cn(
        "group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-md font-semibold tracking-tight transition-all duration-200 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40",
        size === "md" ? "px-5 py-2.5 text-[14px]" : "px-3 py-1.5 text-[12.5px]",
        variant === "solid" &&
          "bg-signal-400 text-ink-950 shadow-[0_10px_30px_-12px_rgba(247,183,51,0.8)] hover:bg-signal-300 hover:shadow-[0_16px_40px_-12px_rgba(247,183,51,0.9)]",
        variant === "outline" &&
          "border border-ink-600 bg-ink-850/60 text-bone-100 hover:border-signal-400/60 hover:bg-ink-800 hover:text-signal-300",
        variant === "ghost" && "text-bone-400 hover:bg-ink-800 hover:text-bone-100",
        variant === "paper" && "bg-bone-100 text-ink-950 hover:bg-bone-50",
        className
      )}
    >
      {variant === "solid" && (
        <span className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 skew-x-[-18deg] bg-white/25 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-hover:[animation:sweep_0.7s_ease-out]" />
      )}
      {icon && <Icon name={icon} className="h-4 w-4" />}
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ meter */

export function Meter({
  value,
  max = 10,
  accent = "signal",
  label,
  showValue = true,
  suffix,
  className,
}: {
  value: number;
  max?: number;
  accent?: Accent;
  label?: string;
  showValue?: boolean;
  suffix?: string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={className}>
      {label && (
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          <span className="font-mono text-[10.5px] tracking-[0.14em] text-bone-400 uppercase">
            {label}
          </span>
          {showValue && (
            <span className="font-mono text-[11px] text-bone-200 tabular-nums">
              {value.toFixed(value % 1 === 0 ? 0 : 1)}
              {suffix ?? ""}
              <span className="text-ink-400">/{max}</span>
            </span>
          )}
        </div>
      )}
      <div className="h-1.5 overflow-hidden rounded-full bg-ink-800">
        <div
          className={cn("h-full rounded-full transition-[width] duration-700 ease-out", {
            "bg-signal-400": accent === "signal",
            "bg-oxide-400": accent === "oxide",
            "bg-mint-400": accent === "mint",
            "bg-sky-400": accent === "sky",
            "bg-plum-400": accent === "plum",
            "bg-bone-200": accent === "bone",
          })}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex flex-wrap gap-1 rounded-md border border-ink-700 bg-ink-950/60 p-1",
        className
      )}
    >
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "rounded px-3 py-1.5 font-mono text-[11px] tracking-[0.08em] uppercase transition-all duration-200",
            value === o.id
              ? "bg-signal-400 text-ink-950 shadow-[0_6px_18px_-8px_rgba(247,183,51,0.9)]"
              : "text-bone-400 hover:bg-ink-800 hover:text-bone-100"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ misc */

export function EmptyState({ icon = "spark", title, text }: { icon?: string; title: string; text: string }) {
  return (
    <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-3 rounded-md border border-dashed border-ink-600/70 bg-ink-950/40 px-6 py-10 text-center">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-signal-400/10 blur-xl" />
        <Icon name={icon} className="relative h-7 w-7 text-ink-400" />
      </div>
      <p className="font-display text-[15px] font-semibold text-bone-300">{title}</p>
      <p className="max-w-xs text-[12.5px] leading-relaxed text-ink-400">{text}</p>
    </div>
  );
}

export function useCountUp(target: number, duration = 1400, start = true) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!start) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, start]);
  return v;
}
