import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./ui";
import { useAuth } from "../auth";
import { cn } from "../utils/cn";

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): RgbColor {
  let clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    clean = clean.split("").map((c) => c + c).join("");
  }
  const num = parseInt(clean, 16);
  if (isNaN(num) || clean.length < 6) return { r: 242, g: 179, b: 61 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export function parseAnyColorToHex(val?: string | null): string {
  if (!val) return "#F2B33D";
  const trimmed = val.trim();
  if (trimmed.startsWith("#")) {
    if (trimmed.length === 7) return trimmed.toUpperCase();
    if (trimmed.length === 4) {
      return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`.toUpperCase();
    }
  }
  const rgbMatch = trimmed.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgbMatch) {
    return rgbToHex(Number(rgbMatch[1]), Number(rgbMatch[2]), Number(rgbMatch[3]));
  }
  return "#F2B33D";
}

export function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(1, s));
  v = Math.max(0, Math.min(1, v));

  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let r = 0, g = 0, b = 0;
  if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
  else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
  else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
  else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
  else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

export function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  r = Math.max(0, Math.min(255, r)) / 255;
  g = Math.max(0, Math.min(255, g)) / 255;
  b = Math.max(0, Math.min(255, b)) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (d !== 0) {
    if (max === r) {
      h = ((g - b) / d) % 6;
    } else if (max === g) {
      h = (b - r) / d + 2;
    } else {
      h = (r - g) / d + 4;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  return { h, s, v };
}

const DEFAULT_PALETTE = ["#F2604C", "#F2B33D", "#2FD4A0", "#6E93F5", "#D946EF", "#A855F7", "#F472B6", "#38BDF8"];
const VIP_PRESETS = ["#F2B33D", "#00E5FF", "#A855F7", "#FF4757", "#2FD4A0", "#FFFFFF", "#0D0F13"];

export interface VipRgbColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  palette?: string[];
  label?: string;
  showLabel?: boolean;
  className?: string;
  allowGradients?: boolean;
}

export function VipRgbColorPicker({
  value,
  onChange,
  palette = DEFAULT_PALETTE,
  label = "Cor de Destaque",
  showLabel = true,
  className,
}: VipRgbColorPickerProps) {
  const { user } = useAuth();
  const isVip = Boolean(user?.is_vip);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const satValRef = useRef<HTMLDivElement>(null);
  const hueBarRef = useRef<HTMLDivElement>(null);

  const currentHex = useMemo(() => parseAnyColorToHex(value), [value]);
  const currentRgb = useMemo(() => hexToRgb(currentHex), [currentHex]);

  const [mounted, setMounted] = useState(false);
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  const [hue, setHue] = useState<number>(30);
  const [sat, setSat] = useState<number>(0.8);
  const [val, setVal] = useState<number>(0.9);
  const [red, setRed] = useState<number>(currentRgb.r);
  const [green, setGreen] = useState<number>(currentRgb.g);
  const [blue, setBlue] = useState<number>(currentRgb.b);
  const [hexInput, setHexInput] = useState<string>(currentHex);
  const [inputMode, setInputMode] = useState<"hex" | "rgb">("rgb");
  const [copiedHex, setCopiedHex] = useState(false);
  const [showNonVipAlert, setShowNonVipAlert] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isCustomSelected = useMemo(() => {
    return !palette.some((c) => c.toLowerCase() === currentHex.toLowerCase());
  }, [palette, currentHex]);

  const pureHueRgb = useMemo(() => hsvToRgb(hue, 1, 1), [hue]);
  const pureHueColor = useMemo(() => rgbToHex(pureHueRgb.r, pureHueRgb.g, pureHueRgb.b), [pureHueRgb]);

  // Sincroniza estado interno quando a prop `value` mudar externamente
  useEffect(() => {
    const rgb = hexToRgb(currentHex);
    setRed(rgb.r);
    setGreen(rgb.g);
    setBlue(rgb.b);
    setHexInput(currentHex);

    const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
    if (hsv.s > 0.02) {
      setHue(hsv.h);
    }
    setSat(hsv.s);
    setVal(hsv.v);
  }, [currentHex]);

  // Atualiza posição do modal flutuante com base nas coordenadas do botão
  useEffect(() => {
    if (!isOpenModal || !buttonRef.current) return;

    const updatePosition = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      const modalWidth = 275;
      const modalHeight = 350;

      // Alinhamento horizontal seguro contra overflow da viewport
      let left = rect.left;
      if (left + modalWidth > window.innerWidth - 16) {
        left = window.innerWidth - modalWidth - 16;
      }
      if (left < 16) left = 16;

      // Alinhamento vertical (abaixo ou acima se faltar espaço na parte inferior)
      let top = rect.bottom + 8;
      if (top + modalHeight > window.innerHeight && rect.top > modalHeight + 16) {
        top = rect.top - modalHeight - 8;
      }

      setCoords({ top, left });
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isOpenModal]);

  // Fecha o mini modal ao clicar fora
  useEffect(() => {
    if (!isOpenModal) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        modalRef.current && 
        !modalRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpenModal(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpenModal]);

  // Arrastar no Canvas 2D (Saturação x Brilho)
  const handleSatValPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const el = satValRef.current;
    if (!el) return;

    const updateColor = (clientX: number, clientY: number) => {
      const rect = el.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, clientY - rect.top));
      const newSat = x / rect.width;
      const newVal = 1 - y / rect.height;
      setSat(newSat);
      setVal(newVal);

      const rgb = hsvToRgb(hue, newSat, newVal);
      const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
      onChange(hex);
    };

    updateColor(e.clientX, e.clientY);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      updateColor(moveEvent.clientX, moveEvent.clientY);
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  // Arrastar na barra de Hue (Matiz)
  const handleHuePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const el = hueBarRef.current;
    if (!el) return;

    const updateHue = (clientX: number) => {
      const rect = el.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const newHue = Math.round((x / rect.width) * 360) % 360;
      setHue(newHue);

      const rgb = hsvToRgb(newHue, sat, val);
      const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
      onChange(hex);
    };

    updateHue(e.clientX);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      updateHue(moveEvent.clientX);
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  // Atualização direta por inputs RGB
  const updateFromRgbInputs = (r: number, g: number, b: number) => {
    const validR = Math.max(0, Math.min(255, r));
    const validG = Math.max(0, Math.min(255, g));
    const validB = Math.max(0, Math.min(255, b));
    setRed(validR);
    setGreen(validG);
    setBlue(validB);
    const newHex = rgbToHex(validR, validG, validB);
    setHexInput(newHex);
    onChange(newHex);
  };

  // Conta-gotas nativo (Chrome / Edge / Opera)
  const hasEyeDropper = typeof window !== "undefined" && "EyeDropper" in window;
  const handleEyeDropper = async () => {
    if (!hasEyeDropper) return;
    try {
      const eyeDropper = new (window as any).EyeDropper();
      const result = await eyeDropper.open();
      if (result?.sRGBHex) {
        const hex = result.sRGBHex.toUpperCase();
        onChange(hex);
      }
    } catch {}
  };

  const handleCopyHex = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(currentHex);
      setCopiedHex(true);
      setTimeout(() => setCopiedHex(false), 2000);
    } catch {}
  };

  return (
    <div className={cn("relative flex flex-col gap-2", className)}>
      {showLabel && (
        <div className="flex items-center justify-between">
          <label className="block font-mono text-[10px] tracking-[0.14em] text-ink-300 uppercase">
            {label}
          </label>
          <span className="font-mono text-[9px] text-ink-400">
            {currentHex} · rgb({red}, {green}, {blue})
          </span>
        </div>
      )}

      {/* Barra de Cores Rápidas + Círculo RGB VIP */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {palette.map((c) => {
          const isSelected = currentHex.toLowerCase() === c.toLowerCase();
          return (
            <button
              key={c}
              type="button"
              onClick={() => {
                onChange(c);
                setShowNonVipAlert(false);
                setIsOpenModal(false);
              }}
              className={cn(
                "relative flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200 cursor-pointer shrink-0 shadow-sm",
                isSelected
                  ? "scale-110 ring-2 ring-bone-200 ring-offset-2 ring-offset-ink-950 shadow-[0_0_12px_rgba(255,255,255,0.3)] z-10"
                  : "hover:scale-110 hover:opacity-90"
              )}
              style={{ backgroundColor: c }}
              title={`Cor ${c}`}
            >
              {isSelected && (
                <Icon name="check" className="h-3 w-3 text-ink-950 drop-shadow-sm" strokeWidth={3} />
              )}
            </button>
          );
        })}

        {/* CÍRCULO RGB VIP (ao lado das cores) */}
        <div className="relative shrink-0">
          <button
            ref={buttonRef}
            type="button"
            onClick={() => {
              if (!isVip) {
                setShowNonVipAlert(true);
              } else {
                setIsOpenModal((prev) => !prev);
              }
            }}
            className={cn(
              "relative flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200 cursor-pointer shrink-0 shadow-sm overflow-hidden",
              isOpenModal
                ? "scale-110 ring-2 ring-amber-400 ring-offset-2 ring-offset-ink-950 shadow-[0_0_14px_rgba(242,179,61,0.6)] z-10"
                : isCustomSelected
                ? "scale-110 ring-2 ring-bone-200 ring-offset-2 ring-offset-ink-950 shadow-[0_0_12px_rgba(255,255,255,0.4)] z-10"
                : isVip
                ? "hover:scale-110 hover:opacity-90"
                : "opacity-60 hover:opacity-80 grayscale cursor-not-allowed"
            )}
            style={{
              background: "conic-gradient(from 180deg at 50% 50%, #FF0000 0deg, #FF7A00 60deg, #FFD600 120deg, #00FF00 180deg, #0000FF 240deg, #FF00C7 300deg, #FF0000 360deg)"
            }}
            title={isVip ? "Abrir Seletor RGB Personalizado" : "Recurso exclusivo para assinantes VIP"}
          >
            {/* Se cor personalizada estiver ativa, mostra a cor selecionada com check */}
            {isCustomSelected ? (
              <div 
                className="absolute inset-[2.5px] rounded-full flex items-center justify-center shadow-inner"
                style={{ backgroundColor: currentHex }}
              >
                <Icon name="check" className="h-3 w-3 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" strokeWidth={3} />
              </div>
            ) : (
              <div className="absolute inset-[2.5px] rounded-full bg-ink-950/40 flex items-center justify-center backdrop-blur-[1px]">
                <Icon name="crown" className="h-3 w-3 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" strokeWidth={2.4} />
              </div>
            )}
          </button>

          {/* Micro coroinha indicadora quando a cor selecionada for personalizada */}
          {isCustomSelected && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-amber-400 text-[7px] text-ink-950 font-black shadow pointer-events-none">
              👑
            </span>
          )}
        </div>
      </div>

      {/* Alerta Não-VIP */}
      {showNonVipAlert && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-300 anim-fade">
          <div className="flex items-center gap-2">
            <Icon name="lock" className="h-3.5 w-3.5 shrink-0 text-amber-400" />
            <span>O seletor RGB livre é um benefício exclusivo de membros <strong className="text-amber-400">VIP</strong>.</span>
          </div>
          <button
            type="button"
            onClick={() => setShowNonVipAlert(false)}
            className="text-amber-400/80 hover:text-amber-200"
          >
            <Icon name="close" className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* MINI MODAL PERSONALIZADO STUDIOOS (RENDERIZADO VIA PORTAL - NUNCA PRESO DENTRO DE CARDS) */}
      {isOpenModal && isVip && mounted && typeof document !== "undefined" && coords && createPortal(
        <div
          ref={modalRef}
          className="fixed z-[99999] w-[260px] sm:w-[275px] max-w-[94vw] overflow-hidden rounded-2xl border border-ink-700/80 bg-[#0e0f14]/98 p-3.5 shadow-[0_24px_60px_-10px_rgba(0,0,0,0.95)] backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150"
          style={{
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            boxShadow: "0 24px 60px -10px rgba(0,0,0,0.95), 0 0 0 1px rgba(242,179,61,0.22)"
          }}
        >
          {/* Header do Mini Modal */}
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-ink-800/80">
            <div className="flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-500/10 border border-amber-500/25 text-amber-400">
                <Icon name="crown" className="h-3 w-3" strokeWidth={2} />
              </span>
              <span className="font-display text-[11.5px] font-bold text-bone-100 tracking-tight">
                Seletor RGB VIP
              </span>
              <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 font-mono text-[7.5px] font-bold text-amber-300 uppercase">
                Ativo
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsOpenModal(false)}
              className="rounded-md p-1 text-ink-400 hover:text-white hover:bg-ink-800/60 transition-colors cursor-pointer"
              title="Fechar"
            >
              <Icon name="close" className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* 1. Canvas 2D: Saturação x Brilho */}
          <div
            ref={satValRef}
            onPointerDown={handleSatValPointerDown}
            className="relative h-32 w-full cursor-crosshair rounded-xl overflow-hidden select-none border border-ink-800/80 shadow-inner"
            style={{ backgroundColor: pureHueColor }}
          >
            {/* Gradiente Branco para Transparente */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "linear-gradient(to right, #ffffff, transparent)"
              }}
            />
            {/* Gradiente Transparente para Preto */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "linear-gradient(to top, #000000, transparent)"
              }}
            />
            {/* Indicador / Cursor Interativo */}
            <div
              className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_6px_rgba(0,0,0,0.9)] pointer-events-none transition-transform active:scale-125"
              style={{
                left: `${Math.round(sat * 100)}%`,
                top: `${Math.round((1 - val) * 100)}%`,
                backgroundColor: currentHex
              }}
            />
          </div>

          {/* 2. Barra de Controles: Conta-gotas + Swatch + Barra de Matiz (Hue) */}
          <div className="flex items-center gap-2 mt-3">
            {/* Conta-gotas (EyeDropper) */}
            {hasEyeDropper && (
              <button
                type="button"
                onClick={handleEyeDropper}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-ink-800/80 bg-ink-900/80 text-ink-300 hover:border-amber-400/40 hover:text-amber-300 transition-colors shrink-0 cursor-pointer shadow-sm"
                title="Conta-gotas: capturar qualquer cor da tela"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                  <path d="m14 7 3 3m-4.5-4.5L6 12l-1 5 5-1 6.5-6.5a2.12 2.12 0 0 0-3-3Z" />
                  <path d="M19 8l-2-2" />
                  <circle cx="4" cy="20" r="1" fill="currentColor" />
                </svg>
              </button>
            )}

            {/* Círculo com Preview da Cor Atual */}
            <div
              className="h-7 w-7 rounded-lg border border-white/20 shadow-inner shrink-0"
              style={{ backgroundColor: currentHex }}
              title={`Cor ativa: ${currentHex}`}
            />

            {/* Barra Contínua de Matiz (Hue Slider) */}
            <div
              ref={hueBarRef}
              onPointerDown={handleHuePointerDown}
              className="relative h-3.5 flex-1 cursor-pointer rounded-full select-none shadow-inner border border-white/10"
              style={{
                background: "linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)"
              }}
              title="Ajustar Matiz (Hue)"
            >
              {/* Cursor do Hue */}
              <div
                className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_6px_rgba(0,0,0,0.8)] pointer-events-none"
                style={{
                  left: `${Math.round((hue / 360) * 100)}%`,
                  backgroundColor: pureHueColor
                }}
              />
            </div>
          </div>

          {/* 3. Inputs de Valores (HEX ou RGB) com Alternador */}
          <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-ink-800/60">
            {inputMode === "rgb" ? (
              <div className="flex items-center gap-1.5 flex-1">
                {/* R */}
                <div className="flex flex-col items-center flex-1 rounded-lg border border-ink-800 bg-ink-950/70 px-1 py-0.5">
                  <input
                    type="number"
                    min={0}
                    max={255}
                    value={red}
                    onChange={(e) => updateFromRgbInputs(Number(e.target.value), green, blue)}
                    className="w-full bg-transparent text-center font-mono text-[11px] text-bone-100 focus:outline-none"
                  />
                  <span className="font-mono text-[7.5px] font-bold text-red-400">R</span>
                </div>
                {/* G */}
                <div className="flex flex-col items-center flex-1 rounded-lg border border-ink-800 bg-ink-950/70 px-1 py-0.5">
                  <input
                    type="number"
                    min={0}
                    max={255}
                    value={green}
                    onChange={(e) => updateFromRgbInputs(red, Number(e.target.value), blue)}
                    className="w-full bg-transparent text-center font-mono text-[11px] text-bone-100 focus:outline-none"
                  />
                  <span className="font-mono text-[7.5px] font-bold text-emerald-400">G</span>
                </div>
                {/* B */}
                <div className="flex flex-col items-center flex-1 rounded-lg border border-ink-800 bg-ink-950/70 px-1 py-0.5">
                  <input
                    type="number"
                    min={0}
                    max={255}
                    value={blue}
                    onChange={(e) => updateFromRgbInputs(red, green, Number(e.target.value))}
                    className="w-full bg-transparent text-center font-mono text-[11px] text-bone-100 focus:outline-none"
                  />
                  <span className="font-mono text-[7.5px] font-bold text-blue-400">B</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 flex-1">
                <div className="flex items-center gap-1 flex-1 rounded-lg border border-ink-800 bg-ink-950/70 px-2 py-1">
                  <span className="font-mono text-[10px] font-bold text-ink-400">#</span>
                  <input
                    type="text"
                    value={hexInput.replace("#", "")}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/[^0-9A-Fa-f]/g, "").slice(0, 6);
                      setHexInput(`#${clean}`);
                      if (clean.length === 6) {
                        onChange(`#${clean.toUpperCase()}`);
                      }
                    }}
                    className="w-full bg-transparent font-mono text-xs text-bone-100 uppercase focus:outline-none"
                    placeholder="FFFFFF"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCopyHex}
                  className="rounded-lg bg-ink-800/80 px-2 py-1.5 font-mono text-[9px] text-ink-300 hover:text-white transition-colors shrink-0 cursor-pointer"
                  title="Copiar código HEX"
                >
                  {copiedHex ? "Copiado!" : "Copiar"}
                </button>
              </div>
            )}

            {/* Alternador de Modo (RGB / HEX) */}
            <button
              type="button"
              onClick={() => setInputMode((m) => (m === "hex" ? "rgb" : "hex"))}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-ink-800 bg-ink-900/60 text-ink-400 hover:text-white transition-colors shrink-0 cursor-pointer"
              title={`Alternar para ${inputMode === "hex" ? "RGB" : "HEX"}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <path d="m7 15 5 5 5-5M7 9l5-5 5 5"/>
              </svg>
            </button>
          </div>

          {/* 4. Presets VIP Rápidos */}
          <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-ink-800/60">
            <span className="font-mono text-[8.5px] uppercase tracking-wider text-ink-400">Tons VIP</span>
            <div className="flex items-center gap-1.5">
              {VIP_PRESETS.map((presetHex) => (
                <button
                  key={presetHex}
                  type="button"
                  onClick={() => onChange(presetHex)}
                  className="h-4 w-4 rounded-full border border-white/20 transition-transform hover:scale-125 cursor-pointer shadow-sm"
                  style={{ backgroundColor: presetHex }}
                  title={`Preset ${presetHex}`}
                />
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
