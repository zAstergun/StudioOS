import { AI_CLICHES } from "../data";

export type Hit = { word: string; index: number; length: number; fix: string };

export const FIXES: Record<string, string> = {
  jornada: "caminho",
  mergulhar: "entrar em",
  mergulhe: "entre em",
  "neste post": "aqui",
  "neste artigo": "aqui",
  otimizar: "melhorar",
  otimize: "melhore",
  desbloquear: "liberar",
  destravar: "resolver",
  "game changer": "divisor de águas",
  revolucionar: "mudar",
  elevar: "subir",
  alavancar: "usar",
  potencializar: "aumentar",
  "no mundo de hoje": "hoje",
  "em um mundo": "hoje",
  "cada vez mais": "mais",
  "sem mais delongas": "",
  "vale lembrar": "",
  "é importante notar": "",
  "importante ressaltar": "",
  "em resumo": "",
  "em suma": "",
  conclusão: "fechando",
  abraçar: "aceitar",
  transformador: "que muda",
  incrível: "bom",
  poderoso: "forte",
  "dicas práticas": "o que fazer",
  "passo a passo completo": "passo a passo",
  segredos: "o que ninguém mostra",
  "além disso": "e",
  "por outro lado": "mas",
  maximizar: "aumentar",
  "aproveitar ao máximo": "usar bem",
  "levando em consideração": "considerando",
  "no cenário atual": "hoje",
  "de forma eficiente": "bem",
  robusto: "sólido",
  inovador: "novo",
};

const ESC = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const ClicheRe = new RegExp(
  `\\b(${AI_CLICHES.sort((a, b) => b.length - a.length).map(ESC).join("|")})\\b`,
  "gi"
);

export function sentences(t: string) {
  return t
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function burstiness(t: string) {
  const s = sentences(t);
  if (s.length < 2) return 0;
  const lens = s.map((x) => x.split(/\s+/).filter(Boolean).length);
  const avg = lens.reduce((a, b) => a + b, 0) / lens.length;
  const sd = Math.sqrt(lens.reduce((a, b) => a + (b - avg) ** 2, 0) / lens.length);
  return Math.round(sd * 10) / 10;
}

export function findCliches(t: string): Hit[] {
  const out: Hit[] = [];
  const re = new RegExp(ClicheRe.source, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(t)) !== null) {
    const w = m[0].toLowerCase();
    out.push({ word: m[0], index: m.index, length: m[0].length, fix: FIXES[w] ?? "" });
    if (m.index === re.lastIndex) re.lastIndex++;
  }
  return out;
}

export function words(t: string) {
  return t.trim() ? t.trim().split(/\s+/).filter(Boolean) : [];
}

export function paragraphs(t: string) {
  return t.split(/\n{1,}/).map((p) => p.trim()).filter(Boolean);
}

export function rewrite(t: string) {
  let out = t;
  AI_CLICHES.sort((a, b) => b.length - a.length).forEach((c) => {
    const fix = FIXES[c];
    const re = new RegExp(`\\b${ESC(c)}\\b`, "gi");
    if (fix === undefined) return;
    out = out.replace(re, (m) => {
      if (fix === "") return "";
      const isCap = m[0] === m[0].toUpperCase();
      return isCap ? fix[0].toUpperCase() + fix.slice(1) : fix;
    });
  });
  return out
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/^[,;:\s]+/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function humanScore(t: string) {
  if (!t.trim()) return 0;
  const w = words(t).length;
  if (w === 0) return 0;

  const cliches = findCliches(t);
  const c = cliches.length;
  const sents = sentences(t);
  const b = burstiness(t);
  const paras = paragraphs(t).length;

  // 1. Ausência de clichês e vocabulário robótico (0 a 45 pontos)
  // Densidade relativa de termos de IA por volume de texto
  const clicheDensity = c / Math.max(10, w);
  const cleanScore = Math.max(0, Math.round(45 - (c * 7) - (clicheDensity * 60)));

  // 2. Ritmo, Cadência e Alternância de Frases (0 a 30 pontos)
  let rhythmScore = 0;
  if (w < 12 || sents.length < 2) {
    // Amostra muito curta ou frase única:
    // Não penalizar injustamente como robô se a frase for direta e enxuta
    if (w <= 18) {
      rhythmScore = 20; // Frase direta e concisa
    } else if (w <= 28) {
      rhythmScore = 15; // Frase média
    } else {
      rhythmScore = 8; // Frase excessivamente longa e arrastada sem pausas
    }
  } else {
    // Múltiplas frases: burstiness estatístico
    if (b >= 5.5) {
      rhythmScore = 30; // Excelente variação de frases curtas e longas
    } else if (b >= 4.0) {
      rhythmScore = 25; // Boa dinâmica de fala
    } else if (b >= 2.5) {
      rhythmScore = 18; // Ritmo aceitável
    } else if (b >= 1.0) {
      rhythmScore = 12; // Pouca variação
    } else {
      rhythmScore = 6; // Frases com comprimento monótono (estilo típico de IA)
    }
  }

  // 3. Extensão e Substância do Texto (0 a 15 pontos)
  let substanceScore = 0;
  if (w >= 45) {
    substanceScore = 15;
  } else if (w >= 28) {
    substanceScore = 13;
  } else if (w >= 16) {
    substanceScore = 10;
  } else if (w >= 10) {
    substanceScore = 8;
  } else {
    substanceScore = 5; // Frase curta de teste
  }

  // 4. Estrutura e Escaneabilidade (0 a 10 pontos)
  let structureScore = 0;
  if (paras >= 3) {
    structureScore = 10;
  } else if (paras >= 2) {
    structureScore = 8;
  } else {
    structureScore = w <= 40 ? 7 : 4;
  }

  const total = Math.min(100, Math.max(0, cleanScore + rhythmScore + substanceScore + structureScore));
  return Math.round(total);
}

