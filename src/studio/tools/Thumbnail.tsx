import { useState, useEffect, useMemo } from "react";
import { cn } from "../utils/cn";
import { Button, Icon, Input, Label, Textarea, Segmented } from "../components/ui";
import { Card, CopyButton, ToolShell } from "../components/ToolShell";
import { useAutosave } from "./useAutosave";
import { useExampleMode } from "../auth";
import { useToolRestore } from "../utils/toolStateRestore";
import { type Calib } from "../calibration";
import { CalibrationNotice } from "../components/CalibrationNotice";
import { VipRgbColorPicker } from "../components/VipRgbColorPicker";

/* ----------------------------------------------------------- ARQUÉTIPOS */

export interface Archetype {
  id: string;
  name: string;
  tag: string;
  description: string;
  bestFor: string;
}

const ARCHETYPES: Archetype[] = [
  {
    id: "rosto-prova",
    name: "Rosto + Prova",
    tag: "40 / 60",
    description: "Criador recortado reagindo ou apontando para um elemento visual de alto impacto.",
    bestFor: "Finanças, Opinião, Notícias, Estratégia, Reações",
  },
  {
    id: "split-comparativo",
    name: "Split Comparativo",
    tag: "50 / 50",
    description: "Contraste central: Antes vs Depois, Certo vs Errado, Barato vs Caro.",
    bestFor: "Reviews, Métodos, Transformações, Desafios",
  },
  {
    id: "heroi-solo",
    name: "Herói Central",
    tag: "Foco 100%",
    description: "Sujeito ou objeto isolado no centro com iluminação dramática e holofote.",
    bestFor: "Tech reviews, Unboxing, Documentários, Histórias épicas",
  },
  {
    id: "interface-zoom",
    name: "Interface / Tela",
    tag: "SaaS & Code",
    description: "Screenshot real de software ou código com lupa/zoom e micro-avatar no canto.",
    bestFor: "Tutoriais técnicos, Programação, Ferramentas, Produtividade",
  },
  {
    id: "narrativa-cena",
    name: "Cena Narrativa",
    tag: "Storytelling",
    description: "Composição cinematográfica em 3 planos: sujeito + conflito + elemento de mistério.",
    bestFor: "Vlogs imersivos, Casos reais, Investigações, Gaming",
  },
];

/* ------------------------------------------------------------- PALETAS */

const BG_SWATCHES = [
  { name: "Preto Carvão", hex: "#0d0f13" },
  { name: "Azul Meia-Noite", hex: "#111827" },
  { name: "Bordô Profundo", hex: "#231114" },
  { name: "Verde Estúdio", hex: "#0f1f17" },
  { name: "Roxo Ultravioleta", hex: "#1e1329" },
  { name: "Âmbar Dark", hex: "#2c1c06" },
];

const RIM_LIGHT_SWATCHES = [
  { name: "Âmbar Sinal", hex: "#f7b733" },
  { name: "Menta Neon", hex: "#43d9a3" },
  { name: "Céu Elétrico", hex: "#3f8ae0" },
  { name: "Óxido Alerta", hex: "#dc4a30" },
  { name: "Ameixa", hex: "#b98cf0" },
  { name: "Branco Puro", hex: "#ffffff" },
];

const QUICK_TEXT_CHIPS = [
  "NÃO FAÇA ISSO",
  "O FIM DE...",
  "VALE A PENA?",
  "R$ 0 A R$ 10k",
  "O SEGREDO",
  "TESTEI TODOS",
  "ERRO GRAVE",
  "FINALMENTE!",
];

const PROOF_TYPES = [
  { id: "grafico", label: "Gráfico / Curva" },
  { id: "extrato", label: "Extrato / Valor" },
  { id: "print", label: "Print / Prova Real" },
  { id: "hardware", label: "Produto / Objeto" },
  { id: "software", label: "Tela / Interface" },
  { id: "censurado", label: "Doc / Censurado" },
];

export function getProofIcon(type: string): string {
  switch (type) {
    case "grafico":
      return "chart";
    case "extrato":
      return "receipt";
    case "print":
      return "image";
    case "hardware":
      return "box";
    case "software":
      return "monitor";
    case "censurado":
      return "eyeOff";
    default:
      return "image";
  }
}

/* ------------------------------------------------------------- SILHUETA DO APRESENTADOR */

function PresenterSilhouette({ rimHex, isMobile = false }: { rimHex: string; isMobile?: boolean }) {
  const idPrefix = isMobile ? "m" : "d";
  return (
    <svg viewBox="0 0 140 180" className="h-full w-auto opacity-95">
      <defs>
        <linearGradient id={`bodyGrad-${idPrefix}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2c3340" />
          <stop offset="100%" stopColor="#12151b" />
        </linearGradient>
        <linearGradient id={`headGrad-${idPrefix}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a4354" />
          <stop offset="100%" stopColor="#1c2028" />
        </linearGradient>
      </defs>
      <path
        d="M10 180c0-42 24-64 60-64s60 22 60 64z"
        fill={`url(#bodyGrad-${idPrefix})`}
        stroke={rimHex}
        strokeWidth="2.8"
      />
      <ellipse
        cx="70"
        cy="62"
        rx="30"
        ry="34"
        fill={`url(#headGrad-${idPrefix})`}
        stroke={rimHex}
        strokeWidth="2.8"
      />
      <path
        d="M46 52c4-18 16-24 24-24"
        stroke={rimHex}
        strokeWidth="2"
        fill="none"
        opacity="0.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ------------------------------------------------------------- COMPOSIÇÃO DA THUMBNAIL */

interface ThumbnailCanvasProps {
  archetypeId: string;
  bgHex: string;
  rimHex: string;
  showGuides: boolean;
  thumbText: string;
  slotType: string;
  slotDetail: string;
  facePosition: "direita" | "esquerda" | "centro" | "sem-rosto";
  faceExpression: string;
  isMobile?: boolean;
}

function ThumbnailCanvas({
  archetypeId,
  bgHex,
  rimHex,
  showGuides,
  thumbText,
  slotType,
  slotDetail,
  facePosition,
  faceExpression,
  isMobile = false,
}: ThumbnailCanvasProps) {
  return (
    <div className="relative aspect-video w-full overflow-hidden select-none">
      {/* Plano de fundo dinâmico com vinheta */}
      <div
        className="absolute inset-0 transition-colors duration-500"
        style={{
          background: `radial-gradient(110% 90% at 50% 30%, ${bgHex}ee, ${bgHex}66 60%, #08090b 100%)`,
        }}
      />

      {/* Grid de Linhas dos Terços */}
      {showGuides && !isMobile && (
        <div className="pointer-events-none absolute inset-0 z-20">
          <div className="absolute inset-y-0 left-[33.33%] w-px border-r border-dashed border-bone-100/15" />
          <div className="absolute inset-y-0 left-[66.66%] w-px border-r border-dashed border-bone-100/15" />
          <div className="absolute inset-x-0 top-[33.33%] h-px border-b border-dashed border-bone-100/15" />
          <div className="absolute inset-x-0 top-[66.66%] h-px border-b border-dashed border-bone-100/15" />
        </div>
      )}

      {/* RENDERIZAÇÃO ESPECÍFICA POR ARQUÉTIPO */}
      {archetypeId === "rosto-prova" && (
        <>
          {facePosition === "sem-rosto" ? (
            /* COMPOSIÇÃO 100% FOCADA NA PROVA (SEM ROSTO / FACELESS) */
            <div className="relative z-10 flex h-full w-full flex-col justify-between p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border border-ink-700 bg-ink-900/80 font-mono tracking-wider uppercase text-bone-300",
                    isMobile ? "px-1.5 py-0.2 text-[7px]" : "px-2.5 py-0.5 text-[9px]"
                  )}
                >
                  <span
                    className={cn("rounded-full", isMobile ? "h-1 w-1" : "h-1.5 w-1.5")}
                    style={{ background: rimHex }}
                  />
                  {slotType} · Foco 100%
                </div>
                <span className="font-mono text-[9px] text-ink-400 uppercase tracking-widest">
                  Estilo Sem Apresentador
                </span>
              </div>

              {thumbText.trim() && (
                <div className="my-auto text-center">
                  <span
                    className={cn(
                      "font-display font-black uppercase tracking-tight text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] leading-tight block",
                      isMobile ? "text-lg sm:text-xl" : "text-3xl sm:text-4xl"
                    )}
                    style={{ textShadow: `0 0 30px ${rimHex}55` }}
                  >
                    {thumbText}
                  </span>
                </div>
              )}

              {/* Card Centralizado Expansivo */}
              <div
                className={cn(
                  "mx-auto w-full max-w-md rounded-xl border transition-colors duration-300 text-center",
                  isMobile ? "p-2" : "p-4"
                )}
                style={{
                  background: "rgba(13, 15, 19, 0.8)",
                  borderColor: `${rimHex}66`,
                  boxShadow: `0 10px 40px -10px ${rimHex}33`,
                }}
              >
                <div className="flex items-center justify-center gap-1.5 font-mono uppercase tracking-wider text-ink-300 text-[10px]">
                  <Icon name={getProofIcon(slotType)} className="h-4 w-4" style={{ color: rimHex }} />
                  <span>{slotType} em destaque máximo</span>
                </div>
                <p className={cn("mt-1 font-bold text-bone-100", isMobile ? "text-[9.5px]" : "text-[13px]")}>
                  {slotDetail}
                </p>
              </div>
            </div>
          ) : facePosition === "centro" ? (
            /* APRESENTADOR NO CENTRO COM ELEMENTOS LATERAIS */
            <div className="relative z-10 flex h-full w-full flex-col justify-between p-3 sm:p-5">
              {/* Copy Superior Centralizada */}
              <div className="text-center z-20">
                {thumbText.trim() ? (
                  <span
                    className={cn(
                      "font-display font-black uppercase tracking-tight text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] leading-none inline-block",
                      isMobile ? "text-base" : "text-2xl sm:text-3xl"
                    )}
                    style={{ textShadow: `0 0 25px ${rimHex}44` }}
                  >
                    {thumbText}
                  </span>
                ) : (
                  <div
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border border-ink-700 bg-ink-900/80 font-mono tracking-wider uppercase text-bone-300",
                      isMobile ? "px-1.5 py-0.2 text-[7px]" : "px-2.5 py-0.5 text-[9px]"
                    )}
                  >
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: rimHex }} />
                    Apresentador Central + {slotType}
                  </div>
                )}
              </div>

              {/* Silhueta Centralizada */}
              <div className="relative flex h-[82%] w-full items-end justify-center">
                <div
                  className="relative flex h-full w-auto items-end justify-center overflow-hidden"
                  style={{ filter: `drop-shadow(0 0 20px ${rimHex}66)` }}
                >
                  <PresenterSilhouette rimHex={rimHex} isMobile={isMobile} />
                </div>

                {!isMobile && (
                  <div className="absolute bottom-12 sm:bottom-14 flex flex-col items-center pointer-events-none z-10">
                    <span className="rounded bg-black/90 border border-ink-600/80 px-2.5 py-0.5 font-mono text-[8.5px] uppercase tracking-wider text-bone-100 shadow-md">
                      Apresentador no Centro
                    </span>
                    <span className="mt-1 font-mono text-[8.5px] text-bone-300 bg-black/75 px-2 py-0.5 rounded border border-ink-800 shadow">
                      {faceExpression.slice(0, 26)}…
                    </span>
                  </div>
                )}

                {/* Card de Prova Flutuando no Canto Esquerdo */}
                <div
                  className={cn(
                    "absolute left-3 bottom-3 rounded-lg border z-20 max-w-[160px] sm:max-w-[210px]",
                    isMobile ? "p-1.5" : "p-3"
                  )}
                  style={{
                    background: "rgba(13, 15, 19, 0.85)",
                    borderColor: `${rimHex}55`,
                    boxShadow: `0 8px 30px -10px ${rimHex}25`,
                  }}
                >
                  <div className={cn("flex items-center gap-1 font-mono uppercase text-ink-300", isMobile ? "text-[7.5px]" : "text-[9.5px]")}>
                    <Icon name={getProofIcon(slotType)} className={isMobile ? "h-2.5 w-2.5" : "h-3.5 w-3.5"} style={{ color: rimHex }} />
                    {slotType}
                  </div>
                  <p className={cn("mt-0.5 line-clamp-2 font-medium text-bone-200 leading-tight", isMobile ? "text-[8.5px]" : "text-[11.5px]")}>
                    {slotDetail}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* DIREITA OU ESQUERDA (LAYOUT 40/60 INVERSÍVEL) */
            <div className={cn(
              "relative z-10 flex h-full w-full",
              facePosition === "esquerda" ? "flex-row-reverse" : "flex-row"
            )}>
              {/* LADO DA PROVA (60%) */}
              <div className={cn(
                "flex w-[60%] flex-col justify-between",
                isMobile ? "p-2.5" : "p-6",
                facePosition === "esquerda" ? "items-end text-right" : "items-start text-left"
              )}>
                <div>
                  <div
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border border-ink-700 bg-ink-900/80 font-mono tracking-wider uppercase text-bone-300",
                      isMobile ? "px-1.5 py-0.2 text-[7px]" : "px-2.5 py-0.5 text-[9px]"
                    )}
                  >
                    <span
                      className={cn("rounded-full", isMobile ? "h-1 w-1" : "h-1.5 w-1.5")}
                      style={{ background: rimHex }}
                    />
                    {slotType} focal
                  </div>

                  {thumbText.trim() && (
                    <div className={isMobile ? "mt-1" : "mt-3"}>
                      <span
                        className={cn(
                          "font-display font-black uppercase tracking-tight text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] leading-none block",
                          isMobile ? "text-sm sm:text-base" : "text-2xl sm:text-3xl"
                        )}
                        style={{ textShadow: `0 0 25px ${rimHex}44` }}
                      >
                        {thumbText}
                      </span>
                    </div>
                  )}
                </div>

                {/* Card do Elemento de Prova */}
                <div
                  className={cn(
                    "rounded-lg border transition-colors duration-300",
                    isMobile ? "p-1.5 max-w-[150px]" : "p-3",
                    facePosition === "esquerda" && !isMobile && "mr-24" // afasta da zona cega do timecode 14:28
                  )}
                  style={{
                    background: "rgba(13, 15, 19, 0.75)",
                    borderColor: `${rimHex}55`,
                    boxShadow: `0 8px 30px -10px ${rimHex}25`,
                  }}
                >
                  <div
                    className={cn(
                      "flex items-center gap-1 font-mono uppercase tracking-wider text-ink-300",
                      isMobile ? "text-[7.5px]" : "text-[9.5px]",
                      facePosition === "esquerda" && "justify-end"
                    )}
                  >
                    <Icon
                      name={getProofIcon(slotType)}
                      className={isMobile ? "h-2.5 w-2.5" : "h-3.5 w-3.5"}
                      style={{ color: rimHex }}
                    />
                    {slotType}
                  </div>
                  <p
                    className={cn(
                      "mt-0.5 line-clamp-2 font-medium text-bone-200 leading-tight",
                      isMobile ? "text-[8.5px]" : "text-[11.5px]"
                    )}
                  >
                    {slotDetail}
                  </p>
                </div>
              </div>

              {/* LADO DO APRESENTADOR (40%) */}
              <div className="relative flex w-[40%] items-end justify-center">
                <div className="relative flex h-[90%] w-full flex-col items-center justify-end">
                  {/* Silhueta com Rim Light */}
                  <div
                    className="relative flex h-full w-full items-end justify-center overflow-hidden"
                    style={{ filter: `drop-shadow(0 0 18px ${rimHex}66)` }}
                  >
                    <PresenterSilhouette rimHex={rimHex} isMobile={isMobile} />
                  </div>
                  {!isMobile && (
                    <div className="absolute bottom-12 sm:bottom-14 flex flex-col items-center pointer-events-none z-10">
                      <span className="rounded bg-black/90 border border-ink-600/80 px-2.5 py-0.5 font-mono text-[8.5px] uppercase tracking-wider text-bone-100 shadow-md">
                        {facePosition === "esquerda" ? "Criador à Esquerda" : "Criador à Direita"}
                      </span>
                      <span className="mt-1 font-mono text-[8.5px] text-bone-300 bg-black/75 px-2 py-0.5 rounded border border-ink-800 shadow">
                        {faceExpression.slice(0, 26)}…
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {archetypeId === "split-comparativo" && (
        <div className="relative z-10 flex h-full w-full">
          {/* LADO A */}
          <div
            className={cn(
              "flex w-1/2 flex-col justify-between border-r border-ink-700 bg-red-950/20",
              isMobile ? "p-2" : "p-5"
            )}
          >
            <div>
              <span
                className={cn(
                  "rounded bg-red-500/20 border border-red-500/40 font-mono font-bold text-red-300 uppercase tracking-wider",
                  isMobile ? "px-1 py-0.2 text-[7px]" : "px-2 py-0.5 text-[9px]"
                )}
              >
                {isMobile ? "Erro / Antes" : "Lado A · O Erro / Antes"}
              </span>
              <p
                className={cn(
                  "text-bone-300 font-medium leading-tight",
                  isMobile ? "mt-1 text-[8.5px]" : "mt-2 text-[12px]"
                )}
              >
                {isMobile ? "Situação comum" : "Situação comum ou produto barato"}
              </p>
            </div>
            <div
              className={cn(
                "rounded border border-red-500/20 bg-ink-950/60 font-mono text-red-400 text-center",
                isMobile ? "p-1 text-[8px]" : "p-2.5 text-[11px]"
              )}
            >
              [Elemento ruim]
            </div>
          </div>

          {/* DIVISOR VS */}
          <div className="absolute inset-y-0 left-1/2 z-20 flex -translate-x-1/2 items-center">
            <span
              className={cn(
                "flex items-center justify-center rounded-full border-2 font-black shadow-lg",
                isMobile ? "h-6 w-6 text-[8.5px]" : "h-9 w-9 text-[11px]"
              )}
              style={{ borderColor: rimHex, background: "#0d0f13", color: rimHex }}
            >
              VS
            </span>
          </div>

          {/* LADO B */}
          <div
            className={cn(
              "flex w-1/2 flex-col justify-between bg-emerald-950/20",
              isMobile ? "p-2" : "p-5"
            )}
          >
            <div>
              <span
                className={cn(
                  "rounded border font-mono font-bold uppercase tracking-wider",
                  isMobile ? "px-1 py-0.2 text-[7px]" : "px-2 py-0.5 text-[9px]"
                )}
                style={{ borderColor: rimHex, background: `${rimHex}22`, color: rimHex }}
              >
                {isMobile ? "Método / Depois" : "Lado B · O Método / Depois"}
              </span>
              {thumbText.trim() && (
                <p
                  className={cn(
                    "font-display font-black uppercase text-white leading-tight",
                    isMobile ? "mt-1 text-xs" : "mt-2 text-lg"
                  )}
                >
                  {thumbText}
                </p>
              )}
            </div>
            <div
              className={cn(
                "rounded border font-mono font-semibold flex items-center justify-center gap-1.5 text-center",
                isMobile ? "p-1 text-[8px]" : "p-2.5 text-[11px]"
              )}
              style={{ borderColor: rimHex, background: `${rimHex}18`, color: rimHex }}
            >
              <Icon
                name={getProofIcon(slotType)}
                className={isMobile ? "h-2.5 w-2.5 shrink-0" : "h-3.5 w-3.5 shrink-0"}
                style={{ color: rimHex }}
              />
              <span className="truncate">{slotDetail.slice(0, 30)}</span>
            </div>
          </div>
        </div>
      )}

      {archetypeId === "heroi-solo" && (
        <div
          className={cn(
            "relative z-10 flex h-full w-full flex-col items-center justify-between",
            isMobile ? "p-2.5" : "p-6"
          )}
        >
          {thumbText.trim() && (
            <span
              className={cn(
                "font-display font-black uppercase tracking-tight text-white drop-shadow-lg text-center",
                isMobile ? "text-sm sm:text-base leading-tight" : "text-2xl sm:text-3xl"
              )}
              style={{ textShadow: `0 0 30px ${rimHex}66` }}
            >
              {thumbText}
            </span>
          )}

          {/* ELEMENTO CENTRAL */}
          <div className="relative flex flex-col items-center justify-center my-auto">
            <div
              className={cn(
                "flex items-center justify-center rounded-xl border-2 transition-transform",
                isMobile ? "h-14 w-36 px-2" : "h-24 w-44 px-2"
              )}
              style={{
                borderColor: rimHex,
                background: "rgba(13, 15, 19, 0.8)",
                boxShadow: `0 0 50px -10px ${rimHex}44`,
              }}
            >
              <div className="text-center px-1">
                <Icon
                  name={getProofIcon(slotType)}
                  className={cn("mx-auto", isMobile ? "h-4 w-4 mb-0.5" : "h-7 w-7 mb-1")}
                  style={{ color: rimHex }}
                />
                <span
                  className={cn(
                    "font-mono font-bold uppercase tracking-wider text-bone-100 line-clamp-2 block leading-tight",
                    isMobile ? "text-[8px]" : "text-[10px]"
                  )}
                >
                  {slotDetail.slice(0, 28)}
                </span>
              </div>
            </div>
          </div>

          <span
            className={cn(
              "font-mono uppercase tracking-wider text-ink-400 text-center",
              isMobile ? "text-[7.5px]" : "text-[9px]"
            )}
          >
            Holofote central 100% no herói
          </span>
        </div>
      )}

      {archetypeId === "interface-zoom" && (
        <div
          className={cn(
            "relative z-10 flex h-full w-full flex-col justify-between",
            isMobile ? "p-2" : "p-5"
          )}
        >
          <div className="flex items-center justify-between">
            <div
              className={cn(
                "flex items-center gap-1 rounded-full border border-ink-700 bg-ink-900 font-mono uppercase text-bone-300",
                isMobile ? "px-1.5 py-0.5 text-[7px]" : "px-3 py-1 text-[9.5px]"
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-red-400 inline-block mr-0.5" />
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 inline-block mr-0.5" />
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 inline-block mr-1" />
              Tela / Sistema
            </div>
            {thumbText.trim() && (
              <span
                className={cn(
                  "font-display font-black uppercase text-white drop-shadow",
                  isMobile ? "text-xs" : "text-xl"
                )}
              >
                {thumbText}
              </span>
            )}
          </div>

          {/* LUPA DE ZOOM */}
          <div className="my-auto flex items-center justify-center">
            <div
              className={cn(
                "relative rounded-xl border-2 text-center",
                isMobile ? "p-1.5 max-w-[200px]" : "p-4 max-w-sm"
              )}
              style={{
                borderColor: rimHex,
                background: "rgba(13, 15, 19, 0.9)",
                boxShadow: `0 0 40px ${rimHex}33`,
              }}
            >
              <span
                className={cn(
                  "rounded bg-signal-400/20 font-mono font-bold text-signal-400 uppercase",
                  isMobile ? "px-1 py-0.2 text-[7px]" : "px-2 py-0.5 text-[9px]"
                )}
              >
                Zoom 200%
              </span>
              <p
                className={cn(
                  "font-bold text-bone-100 line-clamp-2 leading-tight",
                  isMobile ? "mt-0.5 text-[8.5px]" : "mt-1.5 text-[12px]"
                )}
              >
                {slotDetail}
              </p>
            </div>
          </div>

          <div
            className={cn(
              "font-mono tracking-wider text-ink-400 uppercase",
              isMobile ? "text-[7.5px]" : "text-[9px]"
            )}
          >
            Micro-avatar no canto inferior
          </div>
        </div>
      )}

      {archetypeId === "narrativa-cena" && (
        <div
          className={cn(
            "relative z-10 flex h-full w-full flex-col justify-between",
            isMobile ? "p-2.5" : "p-6"
          )}
        >
          <div>
            <span
              className={cn(
                "font-mono tracking-widest text-ink-400 uppercase",
                isMobile ? "text-[7.5px]" : "text-[9px]"
              )}
            >
              Cena Narrativa
            </span>
            {thumbText.trim() && (
              <p
                className={cn(
                  "font-display font-black uppercase text-white leading-tight",
                  isMobile ? "mt-0.5 text-xs" : "mt-1 text-2xl"
                )}
              >
                {thumbText}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-1">
            <div
              className={cn(
                "rounded border border-ink-800 bg-ink-900/60 text-center font-mono text-bone-300",
                isMobile ? "p-1 text-[7.5px]" : "p-2.5 text-[10px]"
              )}
            >
              1. Contexto
            </div>
            <div
              className={cn(
                "rounded border text-center font-mono font-bold flex flex-col items-center justify-center gap-0.5",
                isMobile ? "p-1 text-[7.5px]" : "p-2.5 text-[10px]"
              )}
              style={{ borderColor: rimHex, background: `${rimHex}15`, color: rimHex }}
            >
              <Icon
                name={getProofIcon(slotType)}
                className={isMobile ? "h-2.5 w-2.5" : "h-4 w-4"}
                style={{ color: rimHex }}
              />
              <span className="truncate">2. {slotType}</span>
            </div>
            <div
              className={cn(
                "rounded border border-ink-800 bg-ink-900/60 text-center font-mono text-bone-300",
                isMobile ? "p-1 text-[7.5px]" : "p-2.5 text-[10px]"
              )}
            >
              3. Sujeito
            </div>
          </div>

          <span
            className={cn(
              "font-mono text-ink-400 text-center",
              isMobile ? "text-[7.5px]" : "text-[9px]"
            )}
          >
            Equilíbrio triangular
          </span>
        </div>
      )}

      {/* TIMECODE 14:28 NO CANTO INFERIOR DIREITO */}
      <div
        className={cn(
          "pointer-events-none absolute z-30 flex items-center gap-1",
          isMobile ? "bottom-1.5 right-1.5" : "bottom-2.5 right-2.5"
        )}
      >
        <div
          className={cn(
            "rounded bg-black/90 font-mono font-bold tracking-wider text-white shadow-md border border-white/10",
            isMobile ? "px-1 py-0.2 text-[8px]" : "px-1.5 py-0.5 text-[10px]"
          )}
        >
          14:28
        </div>
        {!isMobile && (
          <div className="hidden sm:flex items-center gap-1 rounded bg-red-950/80 border border-red-500/40 px-2 py-0.5 font-mono text-[8px] uppercase tracking-wider text-red-300">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            Zona do player (não coloque nada aqui)
          </div>
        )}
      </div>
    </div>
  );
}

export function Thumbnail({
  onBack,
  onGo,
  calib,
  profileName,
  profileColor,
}: {
  onBack: () => void;
  onGo: (id: string) => void;
  calib?: Calib;
  profileName?: string;
  profileColor?: string;
}) {
  const examples = useExampleMode();

  /* Form States */
  const [tema, setTema] = useState(
    examples ? "FIIs com R$100 não valem mais a pena" : calib?.niche ? calib.niche.slice(0, 50) : ""
  );
  const [ctr, setCtr] = useState(examples ? "4.8" : calib?.ctr || "");
  const [archetypeId, setArchetypeId] = useState("rosto-prova");
  const [thumbText, setThumbText] = useState(examples ? "NÃO FAÇA ISSO" : "");
  const [slotType, setSlotType] = useState(examples ? "extrato" : "print");
  const [slotDetail, setSlotDetail] = useState(
    examples ? "Extrato de rendimentos caindo de R$1.200 para R$120 com seta vermelha" : "Print ou objeto de prova com número evidente"
  );
  const [facePosition, setFacePosition] = useState<"direita" | "esquerda" | "centro" | "sem-rosto">("direita");
  const [faceExpression, setFaceExpression] = useState(
    examples ? "Meio-corpo, olhar direcionado para o extrato, expressão de alerta contido" : "Expressão alinhada ao tom do vídeo"
  );
  const [bgHex, setBgHex] = useState("#0d0f13");
  const [rimHex, setRimHex] = useState("#f7b733");
  const [topThumbs, setTopThumbs] = useState(
    examples
      ? "Print de extrato + rosto à direita\nGráfico caindo + expressão neutra"
      : calib?.tops && calib.tops.length > 0
      ? calib.tops.slice(0, 3).map((t) => `Estilo do top: ${t}`).join("\n")
      : ""
  );

  /* View Modes */
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [showGuides, setShowGuides] = useState(true);
  const [activeTab, setActiveTab] = useState<"designer" | "prompt-ia">("designer");

  const currentArchetype = useMemo(
    () => ARCHETYPES.find((a) => a.id === archetypeId) || ARCHETYPES[0],
    [archetypeId]
  );

  /* Calibration sync */
  useEffect(() => {
    if (calib) {
      if (!ctr && calib.ctr) setCtr(calib.ctr);
      if (!tema && calib.niche) setTema(calib.niche.slice(0, 50));
      if (!topThumbs && calib.tops && calib.tops.length > 0) {
        setTopThumbs(calib.tops.slice(0, 3).map((t) => `Estilo do top: ${t}`).join("\n"));
      }
    }
  }, [calib]);

  /* State restore */
  useToolRestore("thumbnail", (payload) => {
    if (payload.metadata) {
      if (payload.metadata.tema !== undefined) setTema(payload.metadata.tema);
      if (payload.metadata.ctr !== undefined) setCtr(payload.metadata.ctr);
      if (payload.metadata.archetypeId !== undefined) setArchetypeId(payload.metadata.archetypeId);
      if (payload.metadata.thumbText !== undefined) setThumbText(payload.metadata.thumbText);
      if (payload.metadata.slotType !== undefined) setSlotType(payload.metadata.slotType);
      if (payload.metadata.slotDetail !== undefined) setSlotDetail(payload.metadata.slotDetail);
      if (payload.metadata.facePosition !== undefined) setFacePosition(payload.metadata.facePosition);
      if (payload.metadata.faceExpression !== undefined) setFaceExpression(payload.metadata.faceExpression);
      if (payload.metadata.bgHex !== undefined) setBgHex(payload.metadata.bgHex);
      if (payload.metadata.rimHex !== undefined) setRimHex(payload.metadata.rimHex);
      if (payload.metadata.topThumbs !== undefined) setTopThumbs(payload.metadata.topThumbs);
    }
  });

  /* Verificador de Complementaridade (Curiosity Gap) */
  const complementarityCheck = useMemo(() => {
    if (!thumbText.trim()) {
      return {
        status: "neutral",
        message: "Capa sem texto. Funciona muito bem quando o elemento visual é autoexplicativo.",
      };
    }
    const words = thumbText.trim().split(/\s+/);
    if (words.length > 4) {
      return {
        status: "warning",
        message: "Texto longo (mais de 4 palavras). No feed mobile do YouTube, palavras em excesso reduzem a legibilidade e o clique.",
      };
    }
    if (tema.trim()) {
      const lowerTema = tema.toLowerCase();
      const lowerThumb = thumbText.toLowerCase();
      const overlapWords = words.filter(
        (w) => w.length > 3 && lowerTema.includes(w.toLowerCase())
      );
      if (overlapWords.length >= 2 || lowerTema.startsWith(lowerThumb)) {
        return {
          status: "alert",
          message: "Atenção: A thumb está repetindo o título do vídeo. O título entrega a promessa racional; a thumb deve abrir uma lacuna de curiosidade complementar.",
        };
      }
    }
    return {
      status: "success",
      message: "Excelente! Texto de apoio conciso e com alto potencial de curiosity gap.",
    };
  }, [thumbText, tema]);

  /* Geração do Briefing Técnico para Designer */
  const designerBrief = useMemo(() => {
    return `BRIEFING DE THUMBNAIL — ${tema || "Sem título definido"}
Canal: ${profileName || "Canal Principal"} | CTR Base: ${ctr ? `${ctr}%` : "Não informado"}

1. ARQUÉTIPO & ENQUADRAMENTO
- Layout: ${currentArchetype.name} (${currentArchetype.tag})
- Proporção: 16:9 (1280 × 720 px, renderizado em sRGB)
- Foco: ${currentArchetype.description}

2. ELEMENTO PRINCIPAL DE PROVA (${slotType.toUpperCase()})
- O que colocar: ${slotDetail}
- Regra de legibilidade: O elemento deve ser compreendido em 1 segundo em uma tela de 300px.
- Zonas de segurança: Manter margem livre de 15% no canto inferior direito (onde o YouTube projeta o timecode de duração).

3. APRESENTADOR & FOTO DO CRIADOR
- Posição: ${
      facePosition === "sem-rosto"
        ? "Sem rosto nesta capa (foco 100% no elemento/interface)"
        : facePosition === "direita"
        ? "Recorte de meio-corpo no terço direito"
        : facePosition === "esquerda"
        ? "Recorte de meio-corpo no terço esquerdo"
        : "Recorte centralizado"
    }
- Expressão & Olhar: ${faceExpression}
- Iluminação de contorno (Rim Light): Luz de recorte na cor ${rimHex} para separar o criador do fundo escuro.
- Regra de Ouro: Sempre compor por cima da foto real. Nunca substituir ou regenerar o rosto com IA.

4. TEXTO NA CAPA (COPY VISUAL)
- Texto exato: ${thumbText.trim() ? `"${thumbText.toUpperCase()}"` : "[SEM TEXTO NA CAPA — FOCO VISUAL PURO]"}
- Hierarquia: Tipografia bold/black sem serifa, alto contraste, sem sobrepor o elemento focal.
- Complementaridade: Não repetir as palavras do título do vídeo.

5. PALETA & ATMOSFERA
- Fundo: ${bgHex} (atmosfera de estúdio escuro com vinheta/profundidade)
- Luz de Destaque / Rim Light: ${rimHex}
- Contraste: Alto contraste entre sujeito, elemento e fundo.

6. HISTÓRICO DE THUMBS COM ALTO CTR NO CANAL
${topThumbs || "Sem histórico registrado"}`;
  }, [
    tema,
    profileName,
    ctr,
    currentArchetype,
    slotType,
    slotDetail,
    facePosition,
    faceExpression,
    rimHex,
    thumbText,
    bgHex,
    topThumbs,
  ]);

  /* Geração do Prompt Estruturado para IA (Midjourney / Flux / Firefly) */
  const aiPrompt = useMemo(() => {
    const slotEnglishMap: Record<string, string> = {
      grafico: "dramatic stock market chart with glowing downward trend line",
      extrato: "detailed bank statement document with highlighted red balance and warning badge",
      print: "social media screenshot proof with highlighted engagement numbers",
      hardware: "sleek tech gadget product on dark reflective surface",
      software: "modern dark-mode computer software interface window with glowing spotlight",
      censurado: "classified dossier document with bold censored black markers",
    };
    const slotDesc = slotEnglishMap[slotType] || "compelling visual proof element";

    return `/imagine prompt: high-CTR YouTube thumbnail background, ${currentArchetype.name.toLowerCase()} style, ${slotDesc}, dark studio backdrop in ${bgHex} tones, sharp vibrant rim lighting in ${rimHex}, cinematic studio lighting, shallow depth of field, high visual contrast, uncluttered composition with clean negative space on ${facePosition === "esquerda" ? "left" : "right"} for subject placement, clean 8k resolution, photorealistic, commercial photography --ar 16:9 --style raw --v 6.1`;
  }, [slotType, currentArchetype, bgHex, rimHex, facePosition]);

  const currentBriefOutput = activeTab === "designer" ? designerBrief : aiPrompt;

  const friendlySummary = `Briefing de Thumbnail (${currentArchetype.name}) · Destaque: ${slotType} · ${
    thumbText ? `Copy: "${thumbText}"` : "Sem texto"
  }`;

  useAutosave(
    () => ({
      tool: "thumbnail",
      toolName: "Briefing Thumbnail",
      title: tema.trim() ? `Thumb — ${tema}` : "Briefing de Thumbnail",
      summary: friendlySummary,
      tag: currentArchetype.name,
      content: designerBrief,
    }),
    [designerBrief, tema, friendlySummary, currentArchetype.name],
    8
  );

  return (
    <ToolShell
      id="thumbnail"
      title="Briefing Thumbnail"
      accent="plum"
      lede="Engenharia visual de CTR: composição por arquétipos reais, validação de curiosity gap e briefing executável para designer ou IA, livre de dogmas engessados."
      meta={[
        { k: "Proporção", v: "16:9" },
        { k: "Arquétipo", v: currentArchetype.tag },
        { k: "Texto na capa", v: thumbText ? `${thumbText.split(/\s+/).length} pal.` : "0" },
        { k: "CTR Base", v: ctr ? `${ctr}%` : "—" },
      ]}
      onBack={onBack}
      onGo={onGo}
      saveItem={
        tema.trim()
          ? {
              type: "thumbnail",
              group: "Criação",
              toolName: "Briefing Thumbnail",
              title: `Thumb — ${tema}`,
              summary: friendlySummary,
              tag: currentArchetype.name,
              content: designerBrief,
              metadata: {
                tema,
                ctr,
                archetypeId,
                thumbText,
                slotType,
                slotDetail,
                facePosition,
                faceExpression,
                bgHex,
                rimHex,
                topThumbs,
              },
            }
          : null
      }
      aside={
        <div className="space-y-4 xl:sticky xl:top-6">
          {/* Princípios de Alto CTR */}
          <Card title="Princípios de Alto CTR" note="métricas reais" accent="plum">
            <ul className="space-y-2.5 text-[12px] leading-relaxed text-bone-300">
              <li className="flex items-start gap-2">
                <Icon name="check" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-plum-400" strokeWidth={2.4} />
                <span>
                  <strong className="text-bone-100">Complementaridade:</strong> A thumb e o título formam uma história de duas partes. A thumb nunca repete o título.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Icon name="check" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-plum-400" strokeWidth={2.4} />
                <span>
                  <strong className="text-bone-100">Teste de 1 segundo:</strong> Em uma tela pequena de celular, o espectador precisa entender o assunto sem ler nada.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Icon name="check" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-plum-400" strokeWidth={2.4} />
                <span>
                  <strong className="text-bone-100">Luz de Contorno (Rim Light):</strong> Isola o sujeito do fundo escuro e garante que a imagem não vire uma massa cinzenta.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Icon name="check" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-plum-400" strokeWidth={2.4} />
                <span>
                  <strong className="text-bone-100">Zonas Cegas:</strong> O timecode do YouTube cobre cerca de 15% do canto inferior direito no mobile e desktop.
                </span>
              </li>
            </ul>
          </Card>

          {/* Paleta Ativa */}
          <Card title="Paleta da Composição" accent="signal">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[11.5px]">
                <span className="text-bone-400 font-mono text-[11px]">Fundo:</span>
                <div className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border border-ink-600" style={{ background: bgHex }} />
                  <span className="font-mono text-[10.5px] text-bone-200">{bgHex}</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-[11.5px]">
                <span className="text-bone-400 font-mono text-[11px]">Luz de recorte (Rim):</span>
                <div className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border border-ink-600 shadow-[0_0_8px_currentColor]" style={{ background: rimHex, color: rimHex }} />
                  <span className="font-mono text-[10.5px] text-signal-300 font-semibold">{rimHex}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Regra de Ouro */}
          <div className="rounded-lg border border-oxide-400/30 bg-oxide-400/[0.07] p-4">
            <div className="mb-1.5 flex items-center gap-2">
              <Icon name="eye" className="h-4 w-4 text-oxide-400" />
              <span className="font-mono text-[9.5px] tracking-[0.18em] text-oxide-400 uppercase">
                Regra Inviolável
              </span>
            </div>
            <p className="text-[12px] leading-relaxed text-bone-200">
              Nunca substitua seu rosto por IA. O público do YouTube clica na confiança e na expressão humana real. Use IA apenas para gerar fundos, objetos ou texturas.
            </p>
          </div>
        </div>
      }
    >
      <CalibrationNotice
        calib={calib}
        profileName={profileName}
        profileColor={profileColor}
        toolName="Briefing Thumbnail"
        onGo={onGo}
        onGoCalib={() => onGo("calibracao")}
      />

      {/* ------------------------------------------------ SELETOR DE ARQUÉTIPOS */}
      <Card title="Arquétipo de Composição" note="escolha a estrutura visual" accent="plum">
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {ARCHETYPES.map((arch) => {
            const isSelected = arch.id === archetypeId;
            return (
              <button
                key={arch.id}
                type="button"
                onClick={() => setArchetypeId(arch.id)}
                className={cn(
                  "flex flex-col justify-between rounded-lg border p-3.5 text-left transition-all duration-200",
                  isSelected
                    ? "border-plum-400 bg-plum-400/10 shadow-[0_0_20px_-8px_rgba(185,140,240,0.4)]"
                    : "border-ink-800 bg-ink-950/60 hover:border-ink-700 hover:bg-ink-900/60"
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("font-display text-[13.5px] font-bold", isSelected ? "text-plum-300" : "text-bone-100")}>
                      {arch.name}
                    </span>
                    <span className="rounded bg-ink-800 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-ink-300">
                      {arch.tag}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-bone-400">
                    {arch.description}
                  </p>
                </div>
                <div className="mt-3 border-t border-ink-800/60 pt-2 font-mono text-[9px] tracking-wider text-ink-400 uppercase">
                  Ideal p/: <span className="text-bone-300">{arch.bestFor}</span>
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {/* ------------------------------------------- MOCKUP DE COMPOSIÇÃO DINÂMICO */}
      <Card
        title="Layout de Composição & Mockup Visual"
        note="prévia em escala real"
        accent="signal"
        className="mt-6"
      >
        {/* Controles de visualização */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-ink-800/80 pb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink-400">
              Modo de Visualização:
            </span>
            <Segmented
              value={previewMode}
              onChange={(v) => setPreviewMode(v as "desktop" | "mobile")}
              options={[
                { id: "desktop", label: "Desktop (16:9)" },
                { id: "mobile", label: "Feed Mobile (Teste 1s)" },
              ]}
            />
          </div>

          <button
            type="button"
            onClick={() => setShowGuides((prev) => !prev)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded border px-2.5 py-1 font-mono text-[10px] tracking-wider uppercase transition-colors",
              showGuides
                ? "border-signal-400/50 bg-signal-400/10 text-signal-400"
                : "border-ink-800 bg-ink-950/60 text-ink-400 hover:text-bone-300"
            )}
          >
            <Icon name="frame" className="h-3 w-3" />
            {showGuides ? "Guias Ativas (Regra dos Terços)" : "Ocultar Guias"}
          </button>
        </div>

        {/* CONTAINER DO MOCKUP */}
        <div className="flex justify-center p-2">
          {previewMode === "desktop" ? (
            /* VISUALIZAÇÃO DESKTOP EXPANDIDA */
            <div className="relative aspect-video w-full max-w-[760px] overflow-hidden rounded-xl border border-ink-700 bg-ink-950 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)]">
              <ThumbnailCanvas
                archetypeId={archetypeId}
                bgHex={bgHex}
                rimHex={rimHex}
                showGuides={showGuides}
                thumbText={thumbText}
                slotType={slotType}
                slotDetail={slotDetail}
                facePosition={facePosition}
                faceExpression={faceExpression}
                isMobile={false}
              />
            </div>
          ) : (
            /* SIMULADOR MOBILE FEED (TESTE DE 1 SEGUNDO REALISTA) */
            <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-8 w-full max-w-4xl py-2">
              {/* Smartphone Frame Realista */}
              <div className="w-[310px] sm:w-[340px] shrink-0 rounded-[38px] border-[5px] border-ink-700 bg-[#0c0d10] p-3 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.95)] ring-1 ring-white/10">
                {/* Dynamic Island / Top Notch & Barra de Status */}
                <div className="relative mb-2 flex items-center justify-between px-3 pt-1 select-none">
                  <span className="font-mono text-[11px] font-bold text-bone-200">09:41</span>
                  <div className="h-3.5 w-20 rounded-full bg-black border border-ink-800 flex items-center justify-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-ink-800" />
                  </div>
                  <div className="flex items-center gap-1 text-bone-300">
                    <span className="font-mono text-[9px] font-bold">5G</span>
                    <div className="h-2.5 w-4 rounded-sm border border-bone-300 p-0.5">
                      <div className="h-full w-full bg-bone-200 rounded-[1px]" />
                    </div>
                  </div>
                </div>

                {/* YouTube App Header */}
                <div className="flex items-center justify-between px-1 py-1.5 mb-2 border-b border-ink-800/80 select-none">
                  <div className="flex items-center gap-1.5">
                    <div className="flex h-4 w-5 items-center justify-center rounded-[4px] bg-red-600 text-white font-bold text-[8px]">
                      ▶
                    </div>
                    <span className="font-display font-black tracking-tight text-white text-[13px]">
                      YouTube
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 text-bone-300 text-[12px]">
                    <Icon name="cast" className="h-3.5 w-3.5 text-bone-300" />
                    <Icon name="bell" className="h-3.5 w-3.5 text-bone-300" />
                    <Icon name="search" className="h-3.5 w-3.5 text-bone-300" />
                    <div className="h-5 w-5 rounded-full bg-signal-400/20 border border-signal-400/50 flex items-center justify-center font-mono text-[8px] font-bold text-signal-400">
                      {(profileName ? profileName.slice(0, 2) : "OS").toUpperCase()}
                    </div>
                  </div>
                </div>

                {/* Card do Vídeo no Feed (Miniatura 100% Real!) */}
                <div className="rounded-xl overflow-hidden border border-ink-800/80 bg-ink-950 shadow-md">
                  {/* A CAPA REAL COMPLETA COM ARQUÉTIPO E ELEMENTOS */}
                  <div className="relative aspect-video w-full overflow-hidden bg-black">
                    <ThumbnailCanvas
                      archetypeId={archetypeId}
                      bgHex={bgHex}
                      rimHex={rimHex}
                      showGuides={false}
                      thumbText={thumbText}
                      slotType={slotType}
                      slotDetail={slotDetail}
                      facePosition={facePosition}
                      faceExpression={faceExpression}
                      isMobile={true}
                    />
                  </div>

                  {/* Detalhes do Vídeo como aparecem no Feed do Celular */}
                  <div className="p-2.5">
                    <div className="flex items-start gap-2.5">
                      <div className="h-7 w-7 shrink-0 rounded-full bg-gradient-to-tr from-signal-500 to-plum-500 p-0.5 shadow">
                        <div className="h-full w-full rounded-full bg-ink-900 flex items-center justify-center font-mono text-[9px] font-bold text-bone-100 uppercase">
                          {(profileName ? profileName.slice(0, 2) : "OS").toUpperCase()}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="line-clamp-2 text-[11.5px] font-bold leading-snug text-white">
                          {tema || "Título do vídeo otimizado para o algoritmo do YouTube"}
                        </h4>
                        <div className="mt-1 flex items-center gap-1 text-[9px] text-ink-400 font-mono">
                          <span className="truncate max-w-[100px] text-bone-300 font-medium">
                            {profileName || "Seu Canal"}
                          </span>
                          <span>•</span>
                          <span>128 mil views</span>
                          <span>•</span>
                          <span>há 1 dia</span>
                        </div>
                      </div>
                      <button type="button" className="text-ink-400 hover:text-bone-200 text-sm font-bold px-0.5">
                        ⋮
                      </button>
                    </div>
                  </div>
                </div>

                {/* Barra de Navegação Inferior do YouTube Mobile */}
                <div className="mt-2.5 flex items-center justify-around border-t border-ink-800/80 pt-2 pb-1 text-ink-400 text-[8.5px] font-mono uppercase tracking-wider select-none">
                  <div className="flex flex-col items-center gap-0.5 text-white font-bold">
                    <span className="text-[11px]">🏠</span>
                    <span>Início</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[11px]">⚡</span>
                    <span>Shorts</span>
                  </div>
                  <div className="flex h-5 w-5 items-center justify-center rounded-full border border-bone-300 text-white font-bold text-[11px]">
                    +
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[11px]">🔔</span>
                    <span>Inscrições</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[11px]">👤</span>
                    <span>Você</span>
                  </div>
                </div>
              </div>

              {/* Diagnóstico & Checklist de 1 Segundo */}
              <div className="flex-1 max-w-md space-y-3.5">
                <div className="rounded-xl border border-ink-700 bg-ink-900/80 p-5 shadow-lg">
                  <div className="flex items-center justify-between mb-3 border-b border-ink-800 pb-2">
                    <div className="flex items-center gap-2">
                      <Icon name="gauge" className="h-4 w-4 text-signal-400" />
                      <h4 className="font-mono text-[11px] font-bold uppercase tracking-wider text-bone-100">
                        Auditoria de 1 Segundo no Feed
                      </h4>
                    </div>
                    <span className="font-mono text-[10px] text-signal-400 font-bold bg-signal-400/10 px-2 py-0.5 rounded border border-signal-400/30">
                      Mobile ~320px
                    </span>
                  </div>

                  <div className="space-y-3 text-[12px] leading-relaxed">
                    <div className="rounded-lg border border-ink-800 bg-ink-950/60 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-bone-100 flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-signal-400" />
                          1. Legibilidade do Texto (Copy)
                        </span>
                        <span
                          className={cn(
                            "font-mono text-[9px] uppercase px-1.5 py-0.2 rounded font-bold",
                            thumbText
                              ? thumbText.split(/\s+/).length <= 4
                                ? "bg-mint-400/20 text-mint-300"
                                : "bg-signal-400/20 text-signal-300"
                              : "bg-ink-800 text-bone-400"
                          )}
                        >
                          {thumbText ? `${thumbText.split(/\s+/).length} palavras` : "Sem texto"}
                        </span>
                      </div>
                      <p className="text-ink-400 text-[11px]">
                        {thumbText
                          ? thumbText.split(/\s+/).length <= 4
                            ? "Excelente: o texto é curto o suficiente para ser lido em fração de segundo enquanto o usuário rola o feed."
                            : "Atenção: textos longos viram ruído visual no celular. Mantenha em 1 a 4 palavras."
                          : "Sem texto na capa: toda a conversão dependerá da força do elemento visual e do título."}
                      </p>
                    </div>

                    <div className="rounded-lg border border-ink-800 bg-ink-950/60 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-bone-100 flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ background: rimHex }} />
                          2. Destaque Visual & Rim Light
                        </span>
                        <span
                          className="font-mono text-[9px] uppercase px-1.5 py-0.2 rounded font-bold"
                          style={{ color: rimHex, background: `${rimHex}20` }}
                        >
                          {currentArchetype.tag}
                        </span>
                      </div>
                      <p className="text-ink-400 text-[11px]">
                        O contorno de recorte em <strong style={{ color: rimHex }}>{rimHex}</strong> garante que a silhueta ou o objeto <strong className="text-bone-200">({slotType})</strong> não desapareçam no fundo escuro do YouTube móvel.
                      </p>
                    </div>

                    <div className="rounded-lg border border-ink-800 bg-ink-950/60 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-bone-100 flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-mint-400" />
                          3. Zona Cega do Timecode (14:28)
                        </span>
                        <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 rounded font-bold bg-mint-400/20 text-mint-300">
                          Verificado
                        </span>
                      </div>
                      <p className="text-ink-400 text-[11px]">
                        A badge oficial de tempo do YouTube sobrepõe o canto inferior direito. Certifique-se no mockup de que rostos ou textos críticos não estão nessa área.
                      </p>
                    </div>

                    <div className="rounded-lg border border-ink-800 bg-ink-950/60 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-bone-100 flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-plum-400" />
                          4. Complementaridade (Capa + Título)
                        </span>
                        <span className="font-mono text-[9px] uppercase px-1.5 py-0.2 rounded font-bold bg-plum-400/20 text-plum-300">
                          Curiosity Gap
                        </span>
                      </div>
                      <p className="text-ink-400 text-[11px]">
                        A thumbnail chama a atenção sensorial; o título explica a proposta de valor. Juntos, eles geram a urgência do clique no feed.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* ------------------------------------------- CONFIGURAÇÃO DETALHADA */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Card: Elemento de Prova & Copy */}
        <Card title="Gatilhos Visuais & Copy" note="elementos da capa" accent="mint">
          <div className="space-y-4">
            {/* Texto da Capa */}
            <div>
              <div className="flex items-center justify-between">
                <Label hint="máx 3 a 4 palavras">Texto na Capa (Copy da Thumb)</Label>
                {thumbText && (
                  <button
                    type="button"
                    onClick={() => setThumbText("")}
                    className="font-mono text-[10px] text-ink-400 hover:text-bone-200"
                  >
                    limpar (sem texto)
                  </button>
                )}
              </div>
              <Input
                value={thumbText}
                onChange={(e) => setThumbText(e.target.value)}
                placeholder="Ex: NÃO FAÇA ISSO, R$ 0 A R$ 10k..."
                className="font-display text-[15px] font-bold uppercase tracking-tight"
              />

              {/* Feedback de Complementaridade */}
              <div
                className={cn(
                  "mt-2 rounded-md border p-2.5 text-[11.5px] leading-relaxed transition-colors",
                  complementarityCheck.status === "alert" &&
                    "border-oxide-400/40 bg-oxide-400/10 text-oxide-300",
                  complementarityCheck.status === "warning" &&
                    "border-signal-400/40 bg-signal-400/10 text-signal-300",
                  complementarityCheck.status === "success" &&
                    "border-mint-400/40 bg-mint-400/10 text-mint-300",
                  complementarityCheck.status === "neutral" &&
                    "border-ink-800 bg-ink-950/60 text-ink-400"
                )}
              >
                {complementarityCheck.message}
              </div>

              {/* Chips Rápidos de Inspiração */}
              <div className="mt-2.5">
                <span className="block font-mono text-[9.5px] uppercase tracking-wider text-ink-400 mb-1.5">
                  Sugestões de Curiosity Gap:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_TEXT_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setThumbText(chip)}
                      className="rounded border border-ink-800 bg-ink-950/60 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-bone-300 transition-colors hover:border-signal-400/50 hover:text-signal-300"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Elemento de Prova */}
            <div>
              <Label hint="o que o olho busca primeiro">Tipo de Elemento Central</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {PROOF_TYPES.map((pt) => (
                  <button
                    key={pt.id}
                    type="button"
                    onClick={() => setSlotType(pt.id)}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded border px-2 py-1.5 font-mono text-[10px] tracking-wider uppercase transition-colors text-center",
                      slotType === pt.id
                        ? "border-mint-400/60 bg-mint-400/15 text-mint-300 font-semibold"
                        : "border-ink-800 bg-ink-950/60 text-bone-400 hover:border-ink-700 hover:text-bone-200"
                    )}
                  >
                    <Icon name={getProofIcon(pt.id)} className="h-3.5 w-3.5 shrink-0" />
                    <span>{pt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label hint="específico e concreto">Detalhe do Elemento Central</Label>
              <Textarea
                rows={2}
                value={slotDetail}
                onChange={(e) => setSlotDetail(e.target.value)}
                placeholder="Ex: Print do extrato bancário com rendimentos em queda e seta vermelha apontando..."
              />
            </div>
          </div>
        </Card>

        {/* Card: Direção do Criador & Cores */}
        <Card title="Criador & Iluminação" note="foto e iluminação" accent="signal">
          <div className="space-y-4">
            {/* Tema do Vídeo */}
            <div>
              <Label hint="para conferir complementaridade">Título / Tema do Vídeo</Label>
              <Input
                value={tema}
                onChange={(e) => setTema(e.target.value)}
                placeholder="Ex: FIIs com R$100 não valem mais a pena"
              />
            </div>

            {/* Posição do Apresentador */}
            <div>
              <Label hint="enquadramento no canvas">Posição do Apresentador</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {[
                  { id: "direita", label: "Direita", tag: "40%" },
                  { id: "esquerda", label: "Esquerda", tag: "40%" },
                  { id: "centro", label: "Centro", tag: "Foco" },
                  { id: "sem-rosto", label: "Sem Rosto", tag: "100% Prova" },
                ].map((pos) => {
                  const isSel = facePosition === pos.id;
                  return (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => setFacePosition(pos.id as "direita" | "esquerda" | "centro" | "sem-rosto")}
                      className={cn(
                        "flex flex-col items-center justify-center rounded-lg border py-2 px-1 font-mono transition-all duration-200 text-center",
                        isSel
                          ? "border-signal-400 bg-signal-400 text-ink-950 font-bold shadow-[0_4px_16px_-4px_rgba(247,183,51,0.8)]"
                          : "border-ink-800 bg-ink-950/70 text-bone-300 hover:border-ink-700 hover:text-bone-100"
                      )}
                    >
                      <span className="text-[11px] uppercase tracking-wider leading-none">
                        {pos.label}
                      </span>
                      <span className={cn("text-[8.5px] mt-1 font-normal leading-none", isSel ? "text-ink-900 font-semibold" : "text-ink-400")}>
                        {pos.tag}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Expressão do Apresentador */}
            {facePosition !== "sem-rosto" && (
              <div>
                <Label hint="como o criador deve posar">Expressão & Olhar da Foto</Label>
                <Input
                  value={faceExpression}
                  onChange={(e) => setFaceExpression(e.target.value)}
                  placeholder="Ex: Meio-corpo, olhar fixo para o gráfico, sobrancelha franzida..."
                />
              </div>
            )}

            {/* Seletores de Cor */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-ink-800/80 pt-3">
              <div>
                <VipRgbColorPicker
                  value={bgHex}
                  onChange={setBgHex}
                  label="Fundo da Capa"
                  palette={BG_SWATCHES.map((s) => s.hex)}
                />
              </div>

              <div>
                <VipRgbColorPicker
                  value={rimHex}
                  onChange={setRimHex}
                  label="Luz de Contorno (Rim)"
                  palette={RIM_LIGHT_SWATCHES.map((s) => s.hex)}
                />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ------------------------------------------- BRIEFING EXECUTÁVEL FINAL */}
      <Card
        title="Briefing Executável"
        note="saída para produção"
        accent="plum"
        className="mt-6"
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("designer")}
              className={cn(
                "rounded px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider transition-colors",
                activeTab === "designer"
                  ? "bg-plum-400 text-ink-950 shadow"
                  : "bg-ink-900 text-bone-400 hover:text-bone-100"
              )}
            >
              Para Designer (Humano)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("prompt-ia")}
              className={cn(
                "rounded px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider transition-colors",
                activeTab === "prompt-ia"
                  ? "bg-signal-400 text-ink-950 shadow"
                  : "bg-ink-900 text-bone-400 hover:text-bone-100"
              )}
            >
              Prompt para IA (Midjourney / Flux)
            </button>
          </div>

          <span className="font-mono text-[10px] text-ink-400 hidden sm:inline">
            {activeTab === "designer" ? "Guia sem reuniões" : "Geração de Assets / Fundo"}
          </span>
        </div>

        <pre className="overflow-x-auto whitespace-pre-wrap rounded-md border border-ink-800 bg-ink-950/80 p-4 font-mono text-[12px] leading-relaxed text-bone-200">
          {currentBriefOutput}
        </pre>

        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <CopyButton text={currentBriefOutput} />
          <Button size="sm" variant="outline" icon="mic" onClick={() => onGo("roteiro")}>
            Ir para Roteiro
          </Button>
          <Button size="sm" variant="ghost" icon="type" onClick={() => onGo("titulos")}>
            Ajustar Títulos
          </Button>
        </div>
      </Card>
    </ToolShell>
  );
}
