import {
  Children,
  forwardRef,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
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
  "arrow-left": <><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></>,
  arrowLeft: <><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></>,
  "arrow-right": <><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></>,
  arrowRight: <><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></>,
  "chevron-left": <><path d="m15 18-6-6 6-6" /></>,
  "chevron-right": <><path d="m9 18 6-6-6-6" /></>,
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
  eyeOff: <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></>,
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
  user: <><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  email: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  google: <path fill="currentColor" stroke="none" d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />,
  discord: <path fill="currentColor" stroke="none" d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />,
  youtube: <path fill="currentColor" stroke="none" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />,
  instagram: <><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></>,
  tiktok: <path fill="currentColor" stroke="none" d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.5 6.34 6.34 0 0 0 1.96-4.54V9.06a8.28 8.28 0 0 0 4.81 1.55v-3.44a4.85 4.85 0 0 1-1-.48z" />,
  link: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></>,
  globe: <><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></>,
  bookmark: <><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></>,
  cloud: <><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" /></>,
  edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></>,
  maximize: <><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></>,
  heart: <><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></>,
  trophy: <><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.45 1-1 1H7" /><path d="M14 14.66V17c0 .55.45 1 1 1h2" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /><path d="M12 17v5" /></>,
  award: <><circle cx="12" cy="8" r="6" /><path d="m15.477 12.89 2.523 8.11-6-3-6 3 2.523-8.11" /></>,
  crown: <><path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7z" /><path d="M5 20h14" /></>,
  medal: <><circle cx="12" cy="14" r="5" /><path d="M7 4.5h10" /><path d="m8.21 10.3 3.79-5.8 3.79 5.8" /><path d="M10 4.5v3" /><path d="M14 4.5v3" /></>,
  flame: <><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></>,
  message: <><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></>,
  send: <><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></>,
  alert: <><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></>,
  image: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></>,
  screenshot: <><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></>,
  chart: <><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></>,
  receipt: <><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" /><line x1="8" y1="8" x2="16" y2="8" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="8" y1="16" x2="12" y2="16" /></>,
  box: <><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></>,
  monitor: <><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></>,
  shieldCheck: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></>,
  search: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>,
  bell: <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>,
  cast: <><path d="M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6" /><path d="M2 12a9 9 0 0 1 8 8" /><path d="M2 16a5 5 0 0 1 4 4" /><line x1="2" y1="20" x2="2.01" y2="20" /></>,
  palette: <><circle cx="13.5" cy="6.5" r=".8" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".8" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".8" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".8" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.563-2.512 5.563-5.563C22 6.5 17.5 2 12 2Z"/></>,
};

export function Icon({
  name,
  className,
  strokeWidth = 1.6,
  fill,
}: {
  name: keyof typeof P | string;
  className?: string;
  strokeWidth?: number;
  fill?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={fill ?? "none"}
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
  id,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  tone?: "dark" | "raised" | "paper";
  hover?: boolean;
  id?: string;
  onClick?: () => void;
}) {
  return (
    <div
      id={id}
      onClick={onClick}
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

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...p }, ref) => {
    return <input ref={ref} {...p} className={cn(fieldBase, className)} />;
  }
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...p }, ref) => {
    return <textarea ref={ref} {...p} className={cn(fieldBase, "resize-y leading-relaxed", className)} />;
  }
);
Textarea.displayName = "Textarea";

export interface SelectOptionItem {
  value: string;
  label: ReactNode;
  disabled?: boolean;
}

function extractSelectOptions(children: ReactNode): SelectOptionItem[] {
  const options: SelectOptionItem[] = [];

  const traverse = (child: ReactNode) => {
    if (child === null || child === undefined || typeof child === "boolean") return;
    if (Array.isArray(child)) {
      child.forEach(traverse);
      return;
    }
    if (isValidElement(child)) {
      if (child.type === "option") {
        const p = child.props as {
          value?: string | number;
          children?: ReactNode;
          disabled?: boolean;
        };
        const val = p.value !== undefined ? String(p.value) : String(p.children ?? "");
        options.push({
          value: val,
          label: p.children ?? val,
          disabled: Boolean(p.disabled),
        });
      } else if (child.props && (child.props as any).children) {
        traverse((child.props as any).children);
      }
    }
  };

  Children.forEach(children, traverse);
  return options;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  headerTitle?: string;
  placeholder?: string;
}

export function Select({
  className,
  children,
  headerTitle,
  placeholder,
  value,
  defaultValue,
  onChange,
  disabled,
  name,
  id,
  ...p
}: SelectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [opensUp, setOpensUp] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; bottom: number }>({
    top: 0,
    left: 0,
    width: 0,
    bottom: 0,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const options = extractSelectOptions(children);

  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState<string>(() => {
    if (defaultValue !== undefined) return String(defaultValue);
    if (options.length > 0) return options[0].value;
    return "";
  });

  useEffect(() => {
    if (!isControlled && defaultValue !== undefined) {
      setInternalValue(String(defaultValue));
    }
  }, [defaultValue, isControlled]);

  const currentValue = isControlled ? String(value) : internalValue;

  useEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        setOpen(false);
        return;
      }
      const desiredHeight = Math.min(240, options.length * 36 + 42);
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const spaceAbove = rect.top - 8;
      const shouldOpenUp = spaceBelow < desiredHeight && spaceAbove > spaceBelow;

      setOpensUp(shouldOpenUp);
      setCoords({
        top: rect.bottom + 6,
        bottom: window.innerHeight - rect.top + 6,
        left: rect.left,
        width: rect.width,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (
        containerRef.current?.contains(target) ||
        listboxRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
      setActiveIndex(-1);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [open]);

  useEffect(() => {
    if (open && activeIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[activeIndex] as HTMLElement | undefined;
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [activeIndex, open]);

  const selectOption = (optVal: string) => {
    if (!isControlled) {
      setInternalValue(optVal);
    }
    if (onChange) {
      const syntheticEvent = {
        target: { value: optVal, name: name || "", id: id || "" },
        currentTarget: { value: optVal, name: name || "", id: id || "" },
        persist: () => {},
        preventDefault: () => {},
        stopPropagation: () => {},
      } as unknown as React.ChangeEvent<HTMLSelectElement>;
      onChange(syntheticEvent);
    }
    setOpen(false);
    setActiveIndex(-1);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        const currIdx = options.findIndex((o) => o.value === currentValue);
        setActiveIndex(currIdx >= 0 ? currIdx : 0);
      } else {
        setActiveIndex((prev) => {
          let next = (prev + 1) % options.length;
          while (options[next]?.disabled && next !== prev) {
            next = (next + 1) % options.length;
          }
          return next;
        });
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        const currIdx = options.findIndex((o) => o.value === currentValue);
        setActiveIndex(currIdx >= 0 ? currIdx : 0);
      } else {
        setActiveIndex((prev) => {
          let next = prev <= 0 ? options.length - 1 : prev - 1;
          while (options[next]?.disabled && next !== prev) {
            next = next <= 0 ? options.length - 1 : next - 1;
          }
          return next;
        });
      }
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        const currIdx = options.findIndex((o) => o.value === currentValue);
        setActiveIndex(currIdx >= 0 ? currIdx : 0);
      } else if (activeIndex >= 0 && options[activeIndex] && !options[activeIndex].disabled) {
        selectOption(options[activeIndex].value);
      }
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
        setActiveIndex(-1);
      }
    } else if (e.key === "Tab") {
      if (open) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }
  };

  const selectedOption = options.find((o) => o.value === currentValue);
  const computedHeaderTitle =
    headerTitle ||
    (p["aria-label"] ? String(p["aria-label"]) : "") ||
    (p.title ? String(p.title) : "") ||
    "Opções disponíveis";

  const widthClass = className
    ? className
        .split(" ")
        .filter((c) => c.startsWith("w-") || c.startsWith("min-w") || c.startsWith("max-w"))
        .join(" ")
    : "";

  return (
    <div
      ref={containerRef}
      className={cn("relative", widthClass || "w-full")}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-disabled={disabled}
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        className={cn(
          fieldBase,
          "flex w-full items-center justify-between gap-2 text-left font-mono text-[12.5px] select-none cursor-pointer transition-all duration-150",
          open && "border-signal-400/80 bg-ink-950 ring-2 ring-signal-400/15",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : (placeholder || "Selecione...")}
        </span>
        <svg
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-ink-400 transition-transform duration-200",
            open && "rotate-180 text-signal-400"
          )}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* Hidden native select for form accessibility */}
      <select
        name={name}
        id={id}
        value={currentValue}
        onChange={onChange}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        {...p}
      >
        {children}
      </select>

      {open && mounted && typeof document !== "undefined" && createPortal(
        <div
          ref={listboxRef}
          role="listbox"
          style={{
            position: "fixed",
            left: `${coords.left}px`,
            width: `${coords.width}px`,
            ...(opensUp
              ? { bottom: `${coords.bottom}px` }
              : { top: `${coords.top}px` }),
            maxHeight: opensUp
              ? `${Math.min(240, Math.max(100, window.innerHeight - coords.bottom - 12))}px`
              : `${Math.min(240, Math.max(100, window.innerHeight - coords.top - 12))}px`,
            zIndex: 9999,
          }}
          className="overflow-hidden rounded-md border border-ink-600 bg-ink-900 shadow-[0_18px_44px_-18px_rgba(0,0,0,0.95)] animate-in fade-in-0 zoom-in-95 duration-100"
        >
          <div className="border-b border-ink-700/80 px-3 py-2 font-mono text-[9px] tracking-[0.16em] text-ink-400 uppercase select-none flex items-center justify-between">
            <span>
              {computedHeaderTitle} · {options.length}
            </span>
          </div>
          <div ref={listRef} className="max-h-56 overflow-y-auto p-1 font-mono text-[12px]">
            {options.map((opt, index) => {
              const isSelected = opt.value === currentValue;
              const isActive = activeIndex === index;
              return (
                <button
                  key={opt.value + "-" + index}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={opt.disabled}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => !opt.disabled && setActiveIndex(index)}
                  onClick={() => {
                    if (!opt.disabled) selectOption(opt.value);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded px-3 py-2 text-left font-mono text-[12px] transition-colors select-none",
                    opt.disabled && "opacity-40 cursor-not-allowed hover:bg-transparent",
                    !opt.disabled && isSelected && "bg-ink-700 text-signal-300 font-semibold",
                    !opt.disabled && !isSelected && isActive && "bg-ink-800 text-bone-100",
                    !opt.disabled && !isSelected && !isActive && "text-bone-200 hover:bg-ink-800 hover:text-bone-100"
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-signal-400 font-mono shrink-0 ml-2">
                      SELECIONADO
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
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

export { VipBadge } from "./VipBadge";
