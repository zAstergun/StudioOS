import { db } from "@/db";
import {
  profiles,
  profileSections,
  usageMetrics,
  activityDays,
  toolUsage,
} from "@/db/schema";

export const PROFILE_ID = "usr_marina_alcantara";

const SECTIONS: Array<{
  key: string;
  label: string;
  hint: string;
  visible: boolean;
}> = [
  { key: "sobre", label: "Sobre", hint: "Bio, localização e links", visible: true },
  {
    key: "estatisticas",
    label: "Estatísticas de uso",
    hint: "Métricas públicas do estúdio",
    visible: true,
  },
  {
    key: "destaques",
    label: "Destaques",
    hint: "6 produções fixadas",
    visible: true,
  },
  { key: "links", label: "Links e canais", hint: "YouTube, Instagram, newsletter", visible: true },
  {
    key: "atividade",
    label: "Atividade recente",
    hint: "Últimas 12 ações no StudioOS",
    visible: false,
  },
  {
    key: "equipamento",
    label: "Equipamento",
    hint: "Câmera, microfone e iluminação",
    visible: true,
  },
];

const METRICS: Array<{
  label: string;
  value: string;
  delta: string;
  tone: string;
  hint: string;
}> = [
  {
    label: "Sessões no mês",
    value: "128",
    delta: "+12%",
    tone: "green",
    hint: "vs. 114 no mês anterior",
  },
  {
    label: "Horas em estúdio",
    value: "46h 20m",
    delta: "+8%",
    tone: "green",
    hint: "meta mensal: 40h",
  },
  {
    label: "Ideias ranqueadas",
    value: "214",
    delta: "-3%",
    tone: "coral",
    hint: "média 6,8 ideias/dia",
  },
  {
    label: "Sequência atual",
    value: "12 dias",
    delta: "+4",
    tone: "amber",
    hint: "recorde: 21 dias",
  },
];

const TOOLS: Array<{ tool: string; runs: number; share: number }> = [
  { tool: "Rank de Ideia", runs: 71, share: 34 },
  { tool: "Gerador de Hooks", runs: 54, share: 26 },
  { tool: "Briefing Thumbnail", runs: 38, share: 18 },
  { tool: "Roteiro & Gravação", runs: 29, share: 14 },
  { tool: "Receita Viral", runs: 17, share: 8 },
];

function lcg(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export async function ensureSeed() {
  const existing = await db.select().from(profiles).limit(1);
  if (existing.length > 0) return;

  await db.insert(profiles).values({
    id: PROFILE_ID,
    name: "Marina Alcântara",
    username: "marina.alcantara",
    email: "marina@asterdev.studio",
    role: "Criadora de conteúdo · Asterdev Studio",
    bio: "Faço vídeos sobre finanças pessoais sem achismo. Doze ferramentas do StudioOS ligadas ao mesmo cérebro — da ideia crua ao post publicado, com régua, número e critério em cada etapa.",
    location: "Recife, PE — Brasil",
    website: "asterdev.studio",
    pronouns: "ela/dela",
    avatar: "images/avatar.jpg",
    cover: "images/cover.jpg",
    plan: "Studio Pro",
    memberSince: "março de 2023",
    isPublic: true,
    showStats: true,
    allowMessages: true,
  });

  await db.insert(profileSections).values(
    SECTIONS.map((s, i) => ({
      profileId: PROFILE_ID,
      key: s.key,
      label: s.label,
      hint: s.hint,
      position: i,
      visible: s.visible,
    })),
  );

  await db.insert(usageMetrics).values(
    METRICS.map((m, i) => ({
      profileId: PROFILE_ID,
      label: m.label,
      value: m.value,
      delta: m.delta,
      tone: m.tone,
      hint: m.hint,
      position: i,
    })),
  );

  await db.insert(toolUsage).values(
    TOOLS.map((t, i) => ({
      profileId: PROFILE_ID,
      tool: t.tool,
      runs: t.runs,
      share: t.share,
      position: i,
    })),
  );

  const rand = lcg(20260412);
  const rows: Array<{
    profileId: string;
    day: string;
    weekday: number;
    minutes: number;
  }> = [];
  const today = new Date();
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const weekday = d.getDay();
    const base = weekday === 0 || weekday === 6 ? 34 : 96;
    const wave = Math.sin(i / 6.5) * 26;
    const minutes = Math.max(
      0,
      Math.round(base + wave + rand() * 78 - 18),
    );
    rows.push({
      profileId: PROFILE_ID,
      day: d.toISOString().slice(0, 10),
      weekday,
      minutes,
    });
  }
  await db.insert(activityDays).values(rows);
}
