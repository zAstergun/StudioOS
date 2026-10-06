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
  const b = burstiness(t);
  const c = findCliches(t).length;
  const w = words(t).length;
  const burst = Math.min(30, (b / 8) * 30);
  const clean = Math.max(0, 40 - c * 8);
  const size = Math.min(20, (w / 120) * 20);
  const lines = Math.min(10, paragraphs(t).length * 2.5);
  return Math.round(burst + clean + size + lines);
}
