export interface ProjectSavedItem {
  id: string;
  type: "link" | "rank" | "titulos" | "hooks" | "roteiro" | "thumbnail" | "receita" | "humanizador" | "score" | "mentor" | "membros" | string;
  group: "Criação" | "Publicação" | "Estratégia" | "Link";
  title: string;
  toolName?: string;
  url?: string;
  summary?: string;
  content?: string;
  tag?: string;
  metadata?: any;
  createdAt: number;
}

export const TOOL_GROUP_MAP: Record<string, "Criação" | "Publicação" | "Estratégia"> = {
  rank: "Criação",
  titulos: "Criação",
  hooks: "Criação",
  roteiro: "Criação",
  thumbnail: "Criação",
  receita: "Publicação",
  humanizador: "Publicação",
  score: "Publicação",
  mentor: "Estratégia",
  membros: "Estratégia",
};

export const TOOL_NAME_MAP: Record<string, string> = {
  rank: "Rank de Ideia",
  titulos: "Gerador de Títulos",
  hooks: "Gerador de Hooks",
  roteiro: "Roteiro & Gravação",
  thumbnail: "Briefing Thumbnail",
  receita: "Receita Viral",
  humanizador: "Humanizador",
  score: "Score de Post",
  mentor: "Mentor AI",
  membros: "Área de Membros",
};

export const TOOL_ICON_MAP: Record<string, string> = {
  rank: "gauge",
  titulos: "type",
  hooks: "bolt",
  roteiro: "mic",
  thumbnail: "frame",
  receita: "flask",
  humanizador: "wave",
  score: "check",
  mentor: "brain",
  membros: "layers",
  link: "globe",
};

export const TOOL_ACCENT_STYLES: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  rank: {
    bg: "bg-signal-400/10",
    text: "text-signal-400",
    border: "border-signal-400/30",
    badge: "border-signal-400/30 bg-signal-400/10 text-signal-400",
  },
  titulos: {
    bg: "bg-oxide-400/10",
    text: "text-oxide-400",
    border: "border-oxide-400/30",
    badge: "border-oxide-400/30 bg-oxide-400/10 text-oxide-400",
  },
  hooks: {
    bg: "bg-mint-400/10",
    text: "text-mint-400",
    border: "border-mint-400/30",
    badge: "border-mint-400/30 bg-mint-400/10 text-mint-400",
  },
  roteiro: {
    bg: "bg-sky-400/10",
    text: "text-sky-400",
    border: "border-sky-400/30",
    badge: "border-sky-400/30 bg-sky-400/10 text-sky-400",
  },
  thumbnail: {
    bg: "bg-plum-400/10",
    text: "text-plum-400",
    border: "border-plum-400/30",
    badge: "border-plum-400/30 bg-plum-400/10 text-plum-400",
  },
  receita: {
    bg: "bg-signal-400/10",
    text: "text-signal-400",
    border: "border-signal-400/30",
    badge: "border-signal-400/30 bg-signal-400/10 text-signal-400",
  },
  humanizador: {
    bg: "bg-oxide-400/10",
    text: "text-oxide-400",
    border: "border-oxide-400/30",
    badge: "border-oxide-400/30 bg-oxide-400/10 text-oxide-400",
  },
  score: {
    bg: "bg-mint-400/10",
    text: "text-mint-400",
    border: "border-mint-400/30",
    badge: "border-mint-400/30 bg-mint-400/10 text-mint-400",
  },
  mentor: {
    bg: "bg-sky-400/10",
    text: "text-sky-400",
    border: "border-sky-400/30",
    badge: "border-sky-400/30 bg-sky-400/10 text-sky-400",
  },
  membros: {
    bg: "bg-plum-400/10",
    text: "text-plum-400",
    border: "border-plum-400/30",
    badge: "border-plum-400/30 bg-plum-400/10 text-plum-400",
  },
  link: {
    bg: "bg-ink-800/80",
    text: "text-bone-300",
    border: "border-ink-700",
    badge: "border-ink-700 bg-ink-800 text-bone-300",
  },
};
