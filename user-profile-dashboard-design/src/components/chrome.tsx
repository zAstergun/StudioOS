"use client";

import { useEffect, useState } from "react";
import {
  LayoutGrid,
  Sparkles,
  Type as TypeIcon,
  Zap,
  Mic,
  Image as ImageIcon,
  Send,
  CalendarDays,
  BarChart3,
  UserRound,
  SlidersHorizontal,
  ShieldCheck,
  Lock,
  Check,
} from "lucide-react";

export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      role="presentation"
    >
      <rect width="40" height="40" rx="11" fill="#F2B33D" />
      <path
        d="M20 8.4 31 14.2v11.6L20 31.6 9 25.8V14.2L20 8.4Z"
        stroke="#141008"
        strokeWidth="2.2"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M9.6 14.5 20 20.2l10.4-5.7M20 20.2v11"
        stroke="#141008"
        strokeWidth="2.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

type NavEntry = {
  label: string;
  hint: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
};

const GROUPS: Array<{ title: string; count: string; items: NavEntry[] }> = [
  {
    title: "Criação",
    count: "05",
    items: [
      { label: "Rank de Ideia", hint: "Score 0–10", icon: Sparkles },
      { label: "Gerador de Títulos", hint: "Padrões", icon: TypeIcon },
      { label: "Gerador de Hooks", hint: "6 variações", icon: Zap },
      { label: "Roteiro & Gravação", hint: "Teleprompter", icon: Mic },
      { label: "Briefing Thumbnail", hint: "Composição", icon: ImageIcon },
    ],
  },
  {
    title: "Publicação",
    count: "03",
    items: [
      { label: "Receita Viral", hint: "Algoritmo", icon: Send },
      { label: "Agenda de Posts", hint: "Calendário", icon: CalendarDays },
      { label: "Métricas de Canal", hint: "Retenção", icon: BarChart3 },
    ],
  },
];

const ACCOUNT: NavEntry[] = [
  { label: "Perfil", hint: "Identidade pública", icon: UserRound },
  { label: "Preferências", hint: "Privacidade", icon: SlidersHorizontal },
  { label: "Sessões & Acesso", hint: "Segurança", icon: ShieldCheck },
];

function NavRow({ entry, active }: { entry: NavEntry; active?: boolean }) {
  const Icon = entry.icon;
  return (
    <a
      href="#perfil"
      aria-current={active ? "page" : undefined}
      className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors duration-200 ${
        active
          ? "bg-[#1e1c18] text-white"
          : "text-[#c9c9cf] hover:bg-white/[0.045] hover:text-white"
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-[#F2B33D]" />
      )}
      <Icon
        size={17}
        strokeWidth={1.75}
        className={active ? "text-[#F2B33D]" : "text-[#77777f] group-hover:text-[#b6b6be]"}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-medium leading-tight">
          {entry.label}
        </span>
        <span className="micro block truncate leading-tight">{entry.hint}</span>
      </span>
      {active ? (
        <span className="led bg-[#F2B33D] shadow-[0_0_8px_rgba(242,179,61,0.8)]" />
      ) : (
        <span className="text-[11px] text-[#4a4a52] opacity-0 transition-opacity group-hover:opacity-100">
          →
        </span>
      )}
    </a>
  );
}

function GroupLabel({ title, count }: { title: string; count: string }) {
  return (
    <div className="mb-2 mt-6 flex items-center gap-3 px-3">
      <span className="micro whitespace-nowrap">{title}</span>
      <span className="hairline flex-1" />
      <span className="micro tnum text-[#82828b]">{count}</span>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-[286px] shrink-0 flex-col border-r border-[#1c1c20] bg-[#0b0b0d]/90 px-4 pb-4 pt-5 lg:flex">
      <div className="flex items-center gap-3 px-2">
        <LogoMark />
        <div>
          <div className="font-display text-[17px] font-extrabold leading-none tracking-[-0.02em]">
            StudioOS
          </div>
          <div className="micro mt-1">Asterdev · Studio</div>
        </div>
      </div>

      <nav className="mt-5 flex-1 overflow-y-auto pr-1">
        <a
          href="#perfil"
          className="group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-[#c9c9cf] transition-colors duration-200 hover:bg-white/[0.045] hover:text-white"
        >
          <LayoutGrid size={17} strokeWidth={1.75} className="text-[#77777f]" />
          <span className="flex-1 text-[13.5px] font-medium">Visão geral</span>
          <span className="led bg-[#4a4a52]" />
        </a>

        {GROUPS.map((group) => (
          <div key={group.title}>
            <GroupLabel title={group.title} count={group.count} />
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavRow key={item.label} entry={item} />
              ))}
            </div>
          </div>
        ))}

        <GroupLabel title="Conta" count="03" />
        <div className="space-y-0.5">
          {ACCOUNT.map((item) => (
            <NavRow key={item.label} entry={item} active={item.label === "Perfil"} />
          ))}
        </div>
      </nav>

      <div className="mt-4 rounded-xl border border-[#262014] bg-gradient-to-b from-[#191510] to-[#111014] p-3.5">
        <div className="flex items-center justify-between">
          <span className="micro">Calibração do perfil</span>
          <span className="tnum text-[11px] text-[#F2B33D]">82%</span>
        </div>
        <div className="mt-2.5 h-[5px] w-full overflow-hidden rounded-full bg-[#262218]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#b57e18] to-[#F2B33D]"
            style={{ width: "82%" }}
          />
        </div>
        <a
          href="#editar"
          className="mt-3 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em] text-[#F2B33D] transition-opacity hover:opacity-75"
        >
          Completar agora <span aria-hidden>→</span>
        </a>
      </div>

      <div className="mt-3 flex items-center justify-between px-1">
        <span className="micro flex items-center gap-2">
          <span className="led bg-[#2FD4A0] shadow-[0_0_8px_rgba(47,212,160,0.7)]" />
          Sincronizado
        </span>
        <span className="micro transition-colors hover:text-[#F2B33D]">Configurar</span>
      </div>
    </aside>
  );
}

const MOBILE_LINKS = [
  "Visão geral",
  "Rank de Ideia",
  "Gerador de Hooks",
  "Roteiro & Gravação",
  "Receita Viral",
  "Perfil",
  "Preferências",
];

export function MobileNav() {
  return (
    <div className="flex gap-2 overflow-x-auto border-b border-[#1c1c20] bg-[#0b0b0d]/80 px-4 py-2.5 lg:hidden">
      <span className="flex shrink-0 items-center pr-1">
        <LogoMark size={24} />
      </span>
      {MOBILE_LINKS.map((label) => (
        <a
          key={label}
          href="#perfil"
          className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors ${
            label === "Perfil"
              ? "border-[#F2B33D]/50 bg-[#F2B33D]/12 text-[#F2B33D]"
              : "border-[#232327] text-[#a8a8b0]"
          }`}
        >
          {label}
        </a>
      ))}
    </div>
  );
}

export function StatusBar({ owner }: { owner: string }) {
  const [clock, setClock] = useState("--:--:--");

  useEffect(() => {
    const tick = () =>
      setClock(
        new Intl.DateTimeFormat("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
          timeZone: "America/Sao_Paulo",
        }).format(new Date()),
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="sticky top-0 z-40 flex h-11 items-center gap-4 border-b border-[#1c1c20] bg-[#0a0a0c]/92 px-4 backdrop-blur-md sm:px-6">
      <span className="micro flex items-center gap-2 text-[#F2604C]">
        <span className="led bg-[#F2604C] shadow-[0_0_8px_rgba(242,96,76,0.8)]" />
        On air
      </span>
      <span className="h-4 w-px bg-[#232327]" />
      <span className="micro hidden truncate sm:block">StudioOS / Perfil / {owner}</span>
      <span className="micro hidden items-center gap-2 text-[#F2B33D] md:flex">
        <Check size={12} strokeWidth={3} /> Build 2.4.1
      </span>
      <span className="flex-1" />
      <span className="micro tnum hidden text-[#b6b6be] sm:block">{clock} BRT</span>
      <span className="h-4 w-px bg-[#232327]" />
      <span className="micro flex items-center gap-1.5">
        <Lock size={11} strokeWidth={2.2} /> Local-only
      </span>
    </div>
  );
}
