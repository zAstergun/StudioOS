"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  MapPin,
  Link2,
  CalendarDays,
  Pencil,
  Eye,
  BadgeCheck,
  Sparkles,
  Flame,
  Crown,
  MoreHorizontal,
} from "lucide-react";
import { UsagePanel, type Metric, type Day, type Tool } from "@/components/usage-panel";
import { SectionOrganizer, type Section } from "@/components/organizer";
import { ProfileForm, type EditableProfile } from "@/components/profile-form";

function CompletionRing({ value }: { value: number }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-[88px] w-[88px]">
      <svg viewBox="0 0 88 88" className="h-full w-full -rotate-90">
        <circle cx="44" cy="44" r={r} fill="none" stroke="#232327" strokeWidth="7" />
        <motion.circle
          cx="44"
          cy="44"
          r={r}
          fill="none"
          stroke="#F2B33D"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (c * value) / 100 }}
          transition={{ duration: 1.1, ease: [0.2, 0.8, 0.2, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tnum text-[19px] leading-none text-[#F2B33D]">{value}</span>
        <span className="micro mt-1 text-[8px]">completo</span>
      </div>
    </div>
  );
}

const CHECKLIST: Array<{ label: string; done: boolean }> = [
  { label: "Foto de perfil", done: true },
  { label: "Nome e nome de usuário", done: true },
  { label: "Bio com até 400 caracteres", done: true },
  { label: "Pelo menos 3 links de canais", done: false },
  { label: "Estatísticas visíveis", done: true },
];

const ACHIEVEMENTS = [
  { icon: Flame, label: "Sequência de 21 dias", tone: "#F2B33D" },
  { icon: Sparkles, label: "200 ideias ranqueadas", tone: "#2FD4A0" },
  { icon: Crown, label: "Top 4% do canal", tone: "#6E93F5" },
  { icon: BadgeCheck, label: "Conta verificada", tone: "#F2604C" },
];

export function Workspace({
  profile,
  sections,
  metrics,
  days,
  tools,
}: {
  profile: EditableProfile;
  sections: Section[];
  metrics: Metric[];
  days: Day[];
  tools: Tool[];
}) {
  const [p, setP] = useState<EditableProfile>(profile);
  const reduce = useReducedMotion();

  return (
    <div id="perfil">
      {/* ── Faixa de capa ─────────────────────────────── */}
      <header className="relative">
        <div className="grain scan relative h-[236px] overflow-hidden sm:h-[286px]">
          <img
            src={p.cover || "images/cover.jpg"}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-[60%_45%] opacity-70"
          />
          <div className="absolute inset-0 bg-[linear-gradient(105deg,#08080aF2_0%,#08080aCC_38%,#08080a33_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#08080a] to-transparent" />

          <div className="relative z-10 mx-auto flex h-full max-w-[1240px] flex-col justify-between px-5 pb-8 pt-6 sm:px-8">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-2 rounded-full border border-[#F2B33D]/35 bg-[#F2B33D]/10 px-2.5 py-1">
                <span className="led bg-[#F2B33D] shadow-[0_0_8px_rgba(242,179,61,0.8)]" />
                <span className="micro text-[#F2B33D]">Perfil logado</span>
              </span>
              <span className="micro">StudioOS / Identidade pública</span>
              <span className="hidden h-3 w-px bg-[#2a2a30] sm:block" />
              <span className="micro hidden sm:block">ID 0x4F21·ASTER</span>
            </div>

            <div>
              <div className="relative inline-block">
                <span
                  aria-hidden
                  className="absolute bottom-[10px] left-0 h-[14px] w-[62%] rounded-[3px] bg-[#F2604C]/75"
                />
                <h1 className="display relative text-[clamp(38px,7vw,76px)] text-white">
                  {p.name.split(" ")[0]}
                  <br />
                  <span className="text-[#F2B33D]">
                    {p.name.split(" ").slice(1).join(" ")}
                  </span>
                </h1>
              </div>
            </div>
          </div>
        </div>

        {/* ── Linha de identidade ──────────────────────── */}
        <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
          <div className="-mt-6 flex flex-wrap items-start gap-5">
            <motion.div
              initial={reduce ? false : { scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
              className="relative h-[112px] w-[112px] shrink-0 overflow-hidden rounded-[26px] border-2 border-[#F2B33D] bg-[#1c1c20] shadow-[0_22px_50px_rgba(0,0,0,0.55)] sm:h-[132px] sm:w-[132px]"
            >
              <img
                src={p.avatar || "images/avatar.jpg"}
                alt={`Foto de perfil de ${p.name}`}
                className="h-full w-full object-cover"
              />
            </motion.div>

            <div className="min-w-0 flex-1 pt-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span className="mono text-[13px] text-[#F2B33D]">@{p.username}</span>
                <span className="flex items-center gap-1 rounded-full border border-[#2FD4A0]/35 bg-[#2FD4A0]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.11em] text-[#2FD4A0]">
                  <BadgeCheck size={11} strokeWidth={2.4} /> Verificado
                </span>
                <span className="rounded-full border border-[#2a2a30] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.11em] text-[#b6b6be]">
                  {p.plan}
                </span>
                <span className="micro flex items-center gap-1.5">
                  <MapPin size={11} /> {p.location}
                </span>
                <span className="micro flex items-center gap-1.5">
                  <Link2 size={11} /> {p.website}
                </span>
                <span className="micro hidden items-center gap-1.5 sm:flex">
                  <CalendarDays size={11} /> Membro desde {p.memberSince}
                </span>
              </div>

              <p className="mt-3 max-w-[62ch] text-[13.5px] leading-relaxed text-[#a8a8b0]">
                {p.bio}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-x-7 gap-y-2">
                {[
                  ["24,8 mil", "seguidores"],
                  ["312", "produções"],
                  ["1,2 mil", "ideias ranqueadas"],
                  ["43/50", "nota média"],
                ].map(([v, l]) => (
                  <div key={l} className="flex items-baseline gap-2">
                    <span className="tnum text-[16px] text-[#f4f4f2]">{v}</span>
                    <span className="micro">{l}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <a
                href="#editar"
                className="flex items-center gap-2 rounded-lg bg-[#F2B33D] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#161103] transition-colors duration-200 hover:bg-[#ffc45c]"
              >
                <Pencil size={13} strokeWidth={2.2} /> Editar perfil
              </a>
              <a
                href="#preview"
                className="flex items-center gap-2 rounded-lg border border-[#2a2a30] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#c9c9cf] transition-colors duration-200 hover:border-[#F2B33D]/60 hover:text-white"
              >
                <Eye size={13} strokeWidth={2.2} /> Ver público
              </a>
              <button
                type="button"
                aria-label="Mais opções"
                className="rounded-lg border border-[#2a2a30] p-2.5 text-[#8c8c94] transition-colors hover:text-white"
              >
                <MoreHorizontal size={15} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Estatísticas ──────────────────────────────── */}
      <section className="mx-auto mt-10 max-w-[1240px] px-5 sm:px-8">
        <div className="mb-4 flex items-center gap-3">
          <h2 className="micro text-[#F2B33D]">01 — Estatísticas de uso</h2>
          <span className="hairline flex-1" />
          <span className="micro">Últimos 12 meses · atualizado agora</span>
        </div>

        <div className="grid gap-5 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <UsagePanel
              metrics={metrics}
              days={days}
              tools={tools}
              headline="Sua carga de estúdio está 8% acima da média de criadores do Studio Pro. O melhor dia para gravar continua sendo terça-feira, entre 9h e 12h."
            />
          </div>

          <aside className="space-y-5 lg:col-span-4">
            <div className="panel p-5">
              <div className="flex items-center gap-4">
                <CompletionRing value={82} />
                <div className="min-w-0">
                  <h3 className="font-display text-[15px] font-bold leading-tight">
                    Caderno do perfil
                  </h3>
                  <p className="micro mt-1.5 leading-relaxed">
                    Faltam 2 itens para o perfil ficar completo
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                {CHECKLIST.map((item) => (
                  <div key={item.label} className="flex items-center gap-2.5">
                    <span
                      className={`flex h-[18px] w-[18px] items-center justify-center rounded-full border text-[10px] ${
                        item.done
                          ? "border-[#2FD4A0]/50 bg-[#2FD4A0]/15 text-[#2FD4A0]"
                          : "border-[#2a2a30] text-[#7f7f88]"
                      }`}
                    >
                      {item.done ? "✓" : "·"}
                    </span>
                    <span
                      className={`text-[12px] ${item.done ? "text-[#b6b6be]" : "text-[#7a7a82]"}`}
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel p-5">
              <div className="micro mb-3.5">Conquistas do estúdio</div>
              <div className="grid grid-cols-2 gap-2">
                {ACHIEVEMENTS.map((a) => {
                  const Icon = a.icon;
                  return (
                    <div
                      key={a.label}
                      className="rounded-xl border border-[#232327] bg-[#0d0d0f] px-3 py-3 transition-colors hover:border-[#33333a]"
                    >
                      <Icon size={15} strokeWidth={1.9} style={{ color: a.tone }} />
                      <p className="mt-2 text-[11px] leading-snug text-[#b6b6be]">{a.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="panel overflow-hidden">
              <div className="flex items-center gap-2 border-b border-[#232327] px-4 py-2.5">
                <span className="led bg-[#F2B33D]" />
                <span className="micro flex-1">Plano atual</span>
                <span className="micro text-[#F2B33D]">Ativo</span>
              </div>
              <div className="p-4">
                <div className="font-display text-[19px] font-extrabold tracking-[-0.02em]">
                  Studio Pro
                </div>
                <p className="mt-1.5 text-[12px] leading-relaxed text-[#8c8c94]">
                  12 ferramentas · calibração semanal · 50 GB de mídia. Próxima cobrança em 14 de
                  maio de 2026 — R$ 89,90/mês.
                </p>
                <div className="mt-3.5 flex gap-2">
                  <a
                    href="#editar"
                    className="flex-1 rounded-lg border border-[#2a2a30] px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-[#c9c9cf] transition-colors hover:border-[#F2B33D]/60"
                  >
                    Gerenciar
                  </a>
                  <a
                    href="#editar"
                    className="flex-1 rounded-lg bg-[#1c1c20] px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8c8c94] transition-colors hover:text-white"
                  >
                    Faturas
                  </a>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* ── Configuração + organização ────────────────── */}
      <section className="mx-auto mt-12 max-w-[1240px] px-5 pb-16 sm:px-8">
        <div className="mb-4 flex items-center gap-3">
          <h2 className="micro text-[#F2B33D]">02 — Configurar e organizar</h2>
          <span className="hairline flex-1" />
          <span className="micro">Tudo salvo automaticamente no seu banco</span>
        </div>

        <div className="space-y-5">
          <ProfileForm profile={p} onSaved={setP} />

          <div id="preview">
            <SectionOrganizer
              initialSections={sections}
              profile={{
                name: p.name,
                username: p.username,
                bio: p.bio,
                location: p.location,
                website: p.website,
                avatar: p.avatar,
                role: p.role,
              }}
            />
          </div>
        </div>
      </section>

      <footer className="border-t border-[#1c1c20] px-5 py-6 sm:px-8">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-6 gap-y-2">
          <span className="micro">StudioOS / Build 2.4.1</span>
          <span className="micro">Sessão local · dados armazenados em Postgres</span>
          <span className="flex-1" />
          <span className="micro text-[#F2B33D]">Asterdev · Studio</span>
        </div>
      </footer>
    </div>
  );
}
