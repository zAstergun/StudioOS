"use client";

import { useState } from "react";
import { Reorder, useDragControls, useReducedMotion } from "framer-motion";
import { GripVertical, Eye, EyeOff, ChevronUp, ChevronDown, Check, Loader2 } from "lucide-react";

export type Section = {
  id: number;
  key: string;
  label: string;
  hint: string;
  position: number;
  visible: boolean;
};

function PreviewBlock({ s, profile }: { s: Section; profile: PreviewProfile }) {
  const label = <div className="micro mb-2 text-[#82828b]">{s.label}</div>;
  switch (s.key) {
    case "sobre":
      return (
        <div>
          {label}
          <p className="line-clamp-3 text-[11px] leading-relaxed text-[#9a9aa2]">{profile.bio}</p>
          <div className="mt-2 flex gap-1.5">
            <span className="rounded-full border border-[#2a2a30] px-2 py-[3px] text-[9px] text-[#8c8c94]">
              {profile.location}
            </span>
            <span className="rounded-full border border-[#2a2a30] px-2 py-[3px] text-[9px] text-[#F2B33D]">
              {profile.website}
            </span>
          </div>
        </div>
      );
    case "estatisticas":
      return (
        <div>
          {label}
          <div className="grid grid-cols-4 gap-px overflow-hidden rounded-md bg-[#232327]">
            {["128", "46h", "214", "12d"].map((v, i) => (
              <div key={v} className="bg-[#141416] px-1.5 py-2 text-center">
                <div
                  className="tnum text-[12px]"
                  style={{ color: ["#2FD4A0", "#F2B33D", "#F2604C", "#6E93F5"][i] }}
                >
                  {v}
                </div>
                <div className="micro mt-1 text-[7px] tracking-[0.1em]">
                  {["sess", "hora", "idea", "seq"][i]}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    case "destaques":
      return (
        <div>
          {label}
          <div className="grid grid-cols-3 gap-1.5">
            {["from-[#2b2114] to-[#141416]", "from-[#14212a] to-[#141416]", "from-[#25171a] to-[#141416]"].map(
              (g, i) => (
                <div
                  key={i}
                  className={`aspect-[4/3] rounded-md bg-gradient-to-br ${g} border border-[#232327]`}
                />
              ),
            )}
          </div>
        </div>
      );
    case "links":
      return (
        <div>
          {label}
          <div className="flex flex-wrap gap-1.5">
            {["YouTube", "Instagram", "Newsletter"].map((c) => (
              <span
                key={c}
                className="rounded-md bg-[#1c1c20] px-2 py-1 text-[9px] text-[#b6b6be]"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      );
    case "atividade":
      return (
        <div>
          {label}
          <div className="space-y-1.5">
            {["Publicou “Parei de aportar R$100 em Fiis”", "Ranqueou 6 ideias novas"].map((t) => (
              <div key={t} className="flex items-center gap-2">
                <span className="led bg-[#2FD4A0]" />
                <span className="truncate text-[10px] text-[#8c8c94]">{t}</span>
              </div>
            ))}
          </div>
        </div>
      );
    default:
      return (
        <div>
          {label}
          <div className="flex flex-wrap gap-1.5">
            {["Sony ZV-E10", "Shure SM7B", "Aputure 120D"].map((c) => (
              <span key={c} className="rounded-md border border-[#2a2a30] px-2 py-1 text-[9px] text-[#8c8c94]">
                {c}
              </span>
            ))}
          </div>
        </div>
      );
  }
}

type PreviewProfile = {
  name: string;
  username: string;
  bio: string;
  location: string;
  website: string;
  avatar: string;
  role: string;
};

function Row({
  section,
  onToggle,
  onMove,
  isFirst,
  isLast,
}: {
  section: Section;
  onToggle: () => void;
  onMove: (dir: -1 | 1) => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const controls = useDragControls();
  const reduce = useReducedMotion();

  return (
    <Reorder.Item
      value={section}
      dragListener={false}
      dragControls={controls}
      whileDrag={{
        scale: 1.015,
        boxShadow: "0 18px 40px rgba(0,0,0,0.55)",
        borderColor: "#F2B33D",
      }}
      transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 42 }}
      className="flex items-center gap-3 rounded-xl border border-[#232327] bg-[#101012] px-3 py-2.5"
    >
      <button
        type="button"
        onPointerDown={(e) => controls.start(e)}
        aria-label={`Reordenar ${section.label}`}
        className="cursor-grab touch-none text-[#7f7f88] transition-colors hover:text-[#F2B33D] active:cursor-grabbing"
      >
        <GripVertical size={16} strokeWidth={2} />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`truncate text-[13px] font-medium ${
              section.visible ? "text-[#f4f4f2]" : "text-[#82828b]"
            }`}
          >
            {section.label}
          </span>
          {!section.visible && (
            <span className="micro rounded border border-[#2a2a30] px-1.5 py-px">oculto</span>
          )}
        </div>
        <div className="micro mt-1 truncate">{section.hint}</div>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onMove(-1)}
          disabled={isFirst}
          aria-label={`Mover ${section.label} para cima`}
          className="rounded-md p-1.5 text-[#82828b] transition-colors hover:bg-white/5 hover:text-white disabled:opacity-25 disabled:hover:bg-transparent"
        >
          <ChevronUp size={15} />
        </button>
        <button
          type="button"
          onClick={() => onMove(1)}
          disabled={isLast}
          aria-label={`Mover ${section.label} para baixo`}
          className="rounded-md p-1.5 text-[#82828b] transition-colors hover:bg-white/5 hover:text-white disabled:opacity-25 disabled:hover:bg-transparent"
        >
          <ChevronDown size={15} />
        </button>
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={section.visible}
          aria-label={`Alternar visibilidade de ${section.label}`}
          className={`ml-1 rounded-md p-1.5 transition-colors ${
            section.visible
              ? "bg-[#F2B33D]/12 text-[#F2B33D] hover:bg-[#F2B33D]/22"
              : "text-[#7f7f88] hover:bg-white/5 hover:text-white"
          }`}
        >
          {section.visible ? <Eye size={15} /> : <EyeOff size={15} />}
        </button>
      </div>
    </Reorder.Item>
  );
}

export function SectionOrganizer({
  initialSections,
  profile,
}: {
  initialSections: Section[];
  profile: PreviewProfile;
}) {
  const [sections, setSections] = useState(initialSections);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  const persist = (next: Section[]) => {
    setStatus("saving");
    fetch("/api/profile/sections", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order: next.map((s) => ({ key: s.key, visible: s.visible })),
      }),
    })
      .then((r) => {
        if (!r.ok) throw new Error("Falha ao salvar");
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 2200);
      })
      .catch(() => setStatus("idle"));
  };

  const reorder = (next: Section[]) => {
    setSections(next);
    persist(next);
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    reorder(next);
  };

  const visible = sections.filter((s) => s.visible);

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <section className="panel p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-3">
          <div>
            <h2 className="font-display text-[15px] font-bold tracking-[-0.01em]">
              Organizar o perfil
            </h2>
            <p className="micro mt-1">Arraste para reordenar · a prévia responde em tempo real</p>
          </div>
          <span className="flex-1" />
          <span
            className={`micro flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-colors ${
              status === "saved"
                ? "border-[#2FD4A0]/40 text-[#2FD4A0]"
                : status === "saving"
                  ? "border-[#F2B33D]/40 text-[#F2B33D]"
                  : "border-[#2a2a30] text-[#82828b]"
            }`}
          >
            {status === "saving" ? (
              <Loader2 size={11} className="animate-spin" />
            ) : status === "saved" ? (
              <Check size={11} strokeWidth={3} />
            ) : null}
            {status === "saving" ? "Salvando" : status === "saved" ? "Ordem salva" : "Sincronizado"}
          </span>
        </div>

        <Reorder.Group axis="y" values={sections} onReorder={reorder} className="space-y-2">
          {sections.map((section, i) => (
            <Row
              key={section.key}
              section={section}
              isFirst={i === 0}
              isLast={i === sections.length - 1}
              onToggle={() =>
                reorder(
                  sections.map((s) =>
                    s.key === section.key ? { ...s, visible: !s.visible } : s,
                  ),
                )
              }
              onMove={(dir) => move(i, dir)}
            />
          ))}
        </Reorder.Group>

        <p className="micro mt-4 leading-relaxed">
          {visible.length} de {sections.length} seções visíveis · o restante continua salvo, apenas
          oculto do perfil público.
        </p>
      </section>

      <aside className="lg:sticky lg:top-16 lg:self-start">
        <div className="panel scan overflow-hidden">
          <div className="flex items-center gap-2 border-b border-[#232327] px-3 py-2.5">
            <span className="flex gap-1.5">
              <span className="led bg-[#F2604C]" />
              <span className="led bg-[#F2B33D]" />
              <span className="led bg-[#2FD4A0]" />
            </span>
            <span className="micro flex-1 text-center">Prévia pública</span>
            <span className="led bg-[#2FD4A0]" />
          </div>

          <div className="relative h-[72px] overflow-hidden">
            <div className="absolute inset-0 bg-[linear-gradient(120deg,#1b1608,#0f0f11_55%,#161a24)]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#101012] to-transparent" />
          </div>

          <div className="px-4 pb-4">
            <div className="-mt-8 mb-3 h-16 w-16 overflow-hidden rounded-2xl border-2 border-[#F2B33D]/70 bg-[#1c1c20]">
              <img
                src={profile.avatar || "images/avatar.jpg"}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            <div className="font-display text-[15px] font-bold leading-tight">
              {profile.name}
            </div>
            <div className="micro mt-1 text-[#F2B33D]">@{profile.username}</div>
            <p className="mt-2 line-clamp-2 text-[10.5px] leading-relaxed text-[#8c8c94]">
              {profile.role}
            </p>

            <div className="mt-4 space-y-3.5">
              {visible.map((s) => (
                <PreviewBlock key={s.key} s={s} profile={profile} />
              ))}
              {visible.length === 0 && (
                <div className="rounded-lg border border-dashed border-[#2a2a30] px-3 py-6 text-center">
                  <p className="micro leading-relaxed">
                    Nenhuma seção visível.
                    <br />
                    Ative ao menos uma para publicar.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
