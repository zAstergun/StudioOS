import { ptBR } from "./pt-BR";
import { en } from "./en";
import { es } from "./es";
import { ptPT } from "./pt-PT";
import { fr } from "./fr";
import { de } from "./de";
import { it } from "./it";
import { ar } from "./ar";
import { zhCN } from "./zh-CN";
import { ja } from "./ja";
import { ko } from "./ko";
import { id } from "./id";
import { vi } from "./vi";
import { nl } from "./nl";
import { ru } from "./ru";
import { EXTRA_DICTIONARIES } from "./extra";
import type { SupportedLanguage, TranslationDictionary } from "../types";

export const DICTIONARIES: Record<SupportedLanguage, TranslationDictionary> = {
  "pt-BR": { ...ptBR, ...(EXTRA_DICTIONARIES["pt-BR"] || {}) },
  en: { ...en, ...(EXTRA_DICTIONARIES["en"] || {}) },
  es: { ...es, ...(EXTRA_DICTIONARIES["es"] || {}) },
  "zh-CN": { ...zhCN, ...(EXTRA_DICTIONARIES["zh-CN"] || {}) },
  fr: { ...fr, ...(EXTRA_DICTIONARIES["fr"] || {}) },
  de: { ...de, ...(EXTRA_DICTIONARIES["de"] || {}) },
  it: { ...it, ...(EXTRA_DICTIONARIES["it"] || {}) },
  ar: { ...ar, ...(EXTRA_DICTIONARIES["ar"] || {}) },
  id: { ...id, ...(EXTRA_DICTIONARIES["id"] || {}) },
  ja: { ...ja, ...(EXTRA_DICTIONARIES["ja"] || {}) },
  ko: { ...ko, ...(EXTRA_DICTIONARIES["ko"] || {}) },
  nl: { ...nl, ...(EXTRA_DICTIONARIES["nl"] || {}) },
  "pt-PT": { ...ptPT, ...(EXTRA_DICTIONARIES["pt-PT"] || {}) },
  ru: { ...ru, ...(EXTRA_DICTIONARIES["ru"] || {}) },
  vi: { ...vi, ...(EXTRA_DICTIONARIES["vi"] || {}) },
};

export {
  ptBR,
  en,
  es,
  ptPT,
  fr,
  de,
  it,
  ar,
  zhCN,
  ja,
  ko,
  id,
  vi,
  nl,
  ru,
};
