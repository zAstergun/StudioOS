import { CALIBRATION_QUESTIONS } from "./data";

export type Calib = {
  niche: string;
  answers: string[];
  tops: string;
  flops: string;
  ctr: string;
  prova: string;
  historias: string;
};

export type CalibProfile = {
  id: string;
  name: string;
  color: string;
  calib: Calib;
  createdAt: number;
  updatedAt: number;
};

export const CALIB_PALETTE = [
  "#F2B33D", // Amber
  "#2FD4A0", // Mint
  "#6E93F5", // Blue
  "#F2604C", // Coral
  "#D946EF", // Fuchsia
  "#A855F7", // Purple
  "#38BDF8", // Sky
  "#F472B6", // Rose
];

export const emptyCalib: Calib = {
  niche: "",
  answers: ["", "", "", ""],
  tops: "",
  flops: "",
  ctr: "",
  prova: "",
  historias: "",
};

export const exampleCalib: Calib = {
  niche: "Finanças pessoais para quem começa com pouco dinheiro e quer investir sem jargão de banco.",
  answers: [
    "Pessoas entre 22 e 35 anos que querem organizar o primeiro salário e têm medo de perder dinheiro.",
    "Explicações diretas, com extratos reais na tela e decisões financeiras do dia a dia.",
    "Comparações com números, testes por algumas semanas e erros que eu mesmo cometi.",
    "Promessas de enriquecimento rápido, siglas sem explicação e recomendações sem mostrar dados.",
  ],
  tops: "Como saí de R$0 para R$10 mil em 2 anos\nParei de ouvir gerente de banco\n3 erros que me custaram R$8.000",
  flops: "O que são fundos imobiliários\nMinha carteira completa de FIIs\nComo funciona a bolsa de valores",
  ctr: "4.8",
  prova: "Extrato da corretora, planilha de aportes e comparação com a poupança.",
  historias: "Meu primeiro aporte de R$100; a vez em que segui uma dica sem pesquisar; Psicologia Financeira.",
};

export const LS_CALIB_PROFILES = "studioos.calib_profiles.v1";
export const LS_ACTIVE_CALIB_ID = "studioos.active_calib_profile_id.v1";
export const LS_LEGACY_CALIB = "studioos.calib.v1";

export function calibProgress(c: Calib | undefined | null): number {
  if (!c) return 0;
  const answers = Array.isArray(c.answers) ? c.answers : [];
  const fields = [c.niche || "", ...answers, c.tops || "", c.flops || "", c.ctr || ""];
  const done = fields.filter((f) => f && f.trim().length > 1).length;
  return Math.round((done / Math.max(1, fields.length)) * 100);
}

export function isCalibrated(c: Calib | undefined | null): boolean {
  if (!c) return false;
  const hasNiche = Boolean(c.niche && c.niche.trim().length > 3);
  const hasTops = Boolean(c.tops && c.tops.trim().length > 5);
  return hasNiche || hasTops || calibProgress(c) >= 30;
}

export function loadCalibProfiles(isGuest: boolean): {
  profiles: CalibProfile[];
  activeProfileId: string;
  activeCalib: Calib;
} {
  try {
    const rawProfiles = localStorage.getItem(LS_CALIB_PROFILES);
    const activeId = localStorage.getItem(LS_ACTIVE_CALIB_ID) || "";

    if (rawProfiles) {
      const parsed = JSON.parse(rawProfiles) as CalibProfile[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        const validProfiles = parsed.map((p, idx) => ({
          ...p,
          id: p.id || `profile_${Date.now()}_${idx}`,
          name: p.name || `Canal ${idx + 1}`,
          color: p.color || CALIB_PALETTE[idx % CALIB_PALETTE.length],
          calib: { ...emptyCalib, ...(p.calib || {}) },
          createdAt: p.createdAt || Date.now(),
          updatedAt: p.updatedAt || Date.now(),
        }));

        const foundActive = validProfiles.find((p) => p.id === activeId) || validProfiles[0];
        return {
          profiles: validProfiles,
          activeProfileId: foundActive.id,
          activeCalib: foundActive.calib,
        };
      }
    }

    // Migrate from legacy single calibration if exists
    let initialCalib = isGuest ? exampleCalib : emptyCalib;
    const rawLegacy = localStorage.getItem(LS_LEGACY_CALIB);
    if (rawLegacy) {
      try {
        const legacyParsed = JSON.parse(rawLegacy) as Calib;
        const hasLegacyData = [
          legacyParsed.niche,
          ...(legacyParsed.answers || []),
          legacyParsed.tops,
          legacyParsed.flops,
          legacyParsed.ctr,
        ].some((f) => f && f.trim().length > 0);

        if (hasLegacyData) {
          initialCalib = { ...emptyCalib, ...legacyParsed };
        }
      } catch {}
    }

    const defaultProfile: CalibProfile = {
      id: "profile_default",
      name: "Canal Principal",
      color: CALIB_PALETTE[0],
      calib: initialCalib,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    return {
      profiles: [defaultProfile],
      activeProfileId: defaultProfile.id,
      activeCalib: defaultProfile.calib,
    };
  } catch {
    const fallbackProfile: CalibProfile = {
      id: "profile_default",
      name: "Canal Principal",
      color: CALIB_PALETTE[0],
      calib: isGuest ? exampleCalib : emptyCalib,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    return {
      profiles: [fallbackProfile],
      activeProfileId: fallbackProfile.id,
      activeCalib: fallbackProfile.calib,
    };
  }
}

export function saveCalibProfiles(profiles: CalibProfile[], activeProfileId: string) {
  try {
    localStorage.setItem(LS_CALIB_PROFILES, JSON.stringify(profiles));
    localStorage.setItem(LS_ACTIVE_CALIB_ID, activeProfileId);

    const activeProfile = profiles.find((p) => p.id === activeProfileId) || profiles[0];
    if (activeProfile) {
      localStorage.setItem(LS_LEGACY_CALIB, JSON.stringify(activeProfile.calib));
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("studioos:calib_changed", {
          detail: { activeProfileId, activeCalib: activeProfile?.calib },
        })
      );
    }
  } catch {
    /* ignore storage quota errors */
  }
}

export function deleteCalibProfile(
  profiles: CalibProfile[],
  idToDelete: string,
  activeId: string
): { profiles: CalibProfile[]; activeId: string } {
  if (profiles.length <= 1) {
    return { profiles, activeId };
  }

  const remaining = profiles.filter((p) => p.id !== idToDelete);
  let nextActiveId = activeId;
  if (activeId === idToDelete) {
    nextActiveId = remaining[0].id;
  }

  saveCalibProfiles(remaining, nextActiveId);
  return { profiles: remaining, activeId: nextActiveId };
}

/* ---------------------------------------------------------------- DYNAMIC SUGGESTIONS */

export function getDynamicSuggestions(calib: Calib | undefined | null): string[] {
  const DEFAULT_SUGGESTIONS = [
    "R$100 em FIIs não vale mais a pena em 2026",
    "Testei o método do vídeo flopado por 30 dias",
    "Mostrei meu extrato real depois de 2 anos aportando",
  ];

  if (!calib) return DEFAULT_SUGGESTIONS;

  const tops = (calib.tops || "")
    .split("\n")
    .map((t) => t.trim().replace(/^[-*•0-9.)]+\s*/, ""))
    .filter((t) => t.length > 4);

  const flops = (calib.flops || "")
    .split("\n")
    .map((t) => t.trim().replace(/^[-*•0-9.)]+\s*/, ""))
    .filter((t) => t.length > 4);

  const niche = (calib.niche || "").trim();
  const nextYear = new Date().getFullYear() + 1;

  // Clean niche into a concise phrase for headlines
  const shortNiche = niche
    .replace(/^(canal de|conteúdo sobre|vídeos sobre|focado em|nicho de|ex\.:)/i, "")
    .trim()
    .replace(/[.]+$/, "");

  // Scenario 1: We have outlier titles (tops)
  if (tops.length >= 2) {
    const t0 = tops[0];
    const t1 = tops[1];
    const t2 = tops[2] || (flops.length ? flops[0] : null);

    const s1 = `Testei o método de "${t0}" por 30 dias`;
    const s2 = t1.includes("—") || t1.includes(":") 
      ? `A verdade que ninguém contou em "${t1.split(/[:—]/)[0].trim()}"`
      : `Mostrei o resultado real de "${t1}" depois de 1 ano`;

    let s3 = "";
    if (flops.length > 0) {
      s3 = `Por que meu vídeo sobre "${flops[0]}" flopou feio (e o que mudei)`;
    } else if (t2) {
      s3 = `O maior erro que quase cometi com "${t2}"`;
    } else if (shortNiche) {
      s3 = `O que aprendi depois de focar 100% em ${shortNiche.slice(0, 40)}`;
    } else {
      s3 = `3 segredos de "${t0}" que mudaram as métricas do canal`;
    }

    return [s1, s2, s3];
  }

  if (tops.length === 1) {
    const t0 = tops[0];
    const s1 = `Testei o método de "${t0}" por 30 dias`;
    const s2 = shortNiche
      ? `Por que parei com o modelo tradicional de ${shortNiche.slice(0, 40)} em ${nextYear}`
      : `O maior erro que cometi gravando "${t0}"`;
    const s3 = flops.length
      ? `Por que "${flops[0]}" não performou e como vou refazer`
      : `Mostrei meus números reais e bastidores de "${t0}"`;

    return [s1, s2, s3];
  }

  // Scenario 2: Niche is calibrated but no tops yet
  if (shortNiche && shortNiche.length > 4) {
    return [
      `A verdade sobre ${shortNiche.slice(0, 45)} que ninguém tem coragem de falar em ${nextYear}`,
      `Testei a estratégia mais polêmica de ${shortNiche.slice(0, 42)} por 30 dias`,
      `Mostrei meus números reais depois de começar em ${shortNiche.slice(0, 45)}`,
    ];
  }

  // Fallback: Default generic suggestions
  return DEFAULT_SUGGESTIONS;
}
