import ptBRExtra from "./pt-BR.json";
import enExtra from "./en.json";
import esExtra from "./es.json";
import ptPTExtra from "./pt-PT.json";
import frExtra from "./fr.json";
import deExtra from "./de.json";
import itExtra from "./it.json";
import zhCNExtra from "./zh-CN.json";
import jaExtra from "./ja.json";
import koExtra from "./ko.json";
import arExtra from "./ar.json";
import idExtra from "./id.json";
import nlExtra from "./nl.json";
import ruExtra from "./ru.json";
import viExtra from "./vi.json";
import type { SupportedLanguage } from "../../types";

export const EXTRA_DICTIONARIES: Record<SupportedLanguage, Record<string, string>> = {
  "pt-BR": ptBRExtra as Record<string, string>,
  en: enExtra as Record<string, string>,
  es: esExtra as Record<string, string>,
  "pt-PT": ptPTExtra as Record<string, string>,
  fr: frExtra as Record<string, string>,
  de: deExtra as Record<string, string>,
  it: itExtra as Record<string, string>,
  "zh-CN": zhCNExtra as Record<string, string>,
  ja: jaExtra as Record<string, string>,
  ko: koExtra as Record<string, string>,
  ar: arExtra as Record<string, string>,
  id: idExtra as Record<string, string>,
  nl: nlExtra as Record<string, string>,
  ru: ruExtra as Record<string, string>,
  vi: viExtra as Record<string, string>,
};
