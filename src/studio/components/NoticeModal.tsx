import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { Icon, Button } from "./ui";
import { cn } from "../utils/cn";
import { useI18n } from "../i18n";

export type NoticeType = "success" | "error" | "warning" | "info";

export interface NoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: NoticeType;
  actionText?: string;
  cancelText?: string;
  onAction?: () => void;
  customIcon?: string;
}

export function NoticeModal({
  isOpen,
  onClose,
  title,
  message,
  type = "info",
  actionText,
  cancelText,
  onAction,
  customIcon,
}: NoticeModalProps) {
  const { t } = useI18n();
  const effectiveActionText = actionText || t("common.understood", undefined, "Entendido");
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  const typeConfig: Record<
    NoticeType,
    {
      borderColor: string;
      glowColor: string;
      iconBg: string;
      iconColor: string;
      iconName: string;
      buttonClass: string;
    }
  > = {
    success: {
      borderColor: "border-[#2FD4A0]/35",
      glowColor: "bg-[#2FD4A0]/15",
      iconBg: "bg-[#2FD4A0]/10 border border-[#2FD4A0]/30",
      iconColor: "text-[#2FD4A0]",
      iconName: "check",
      buttonClass:
        "bg-[#2FD4A0] hover:bg-[#34e5ad] text-[#081a13] font-bold shadow-[0_0_20px_rgba(47,212,160,0.3)]",
    },
    error: {
      borderColor: "border-[#F2604C]/35",
      glowColor: "bg-[#F2604C]/15",
      iconBg: "bg-[#F2604C]/10 border border-[#F2604C]/30",
      iconColor: "text-[#F2604C]",
      iconName: "close",
      buttonClass:
        "bg-[#F2604C] hover:bg-[#ff725e] text-[#1a0a08] font-bold shadow-[0_0_20px_rgba(242,96,76,0.3)]",
    },
    warning: {
      borderColor: "border-[#F2B33D]/35",
      glowColor: "bg-[#F2B33D]/15",
      iconBg: "bg-[#F2B33D]/10 border border-[#F2B33D]/30",
      iconColor: "text-[#F2B33D]",
      iconName: "alert",
      buttonClass:
        "bg-[#F2B33D] hover:bg-[#ffc24d] text-[#1a1308] font-bold shadow-[0_0_20px_rgba(242,179,61,0.3)]",
    },
    info: {
      borderColor: "border-[#6E93F5]/35",
      glowColor: "bg-[#6E93F5]/15",
      iconBg: "bg-[#6E93F5]/10 border border-[#6E93F5]/30",
      iconColor: "text-[#6E93F5]",
      iconName: "spark",
      buttonClass:
        "bg-[#6E93F5] hover:bg-[#85a6ff] text-[#080e1a] font-bold shadow-[0_0_20px_rgba(110,147,245,0.3)]",
    },
  };

  const cfg = typeConfig[type] || typeConfig.info;

  const handleConfirm = () => {
    if (onAction) onAction();
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-ink-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          "relative w-full max-w-[420px] overflow-hidden rounded-2xl sm:rounded-3xl border bg-gradient-to-b from-[#14151c] via-[#0d0e14] to-[#08090d] p-6 text-bone-100 shadow-[0_30px_90px_-20px_rgba(0,0,0,0.95)] ring-1 ring-inset ring-white/[0.06] animate-in zoom-in-95 duration-200",
          cfg.borderColor
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow de fundo */}
        <div
          className={cn(
            "absolute -top-20 -right-20 h-48 w-48 rounded-full blur-3xl pointer-events-none",
            cfg.glowColor
          )}
        />

        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-xl border border-ink-700/60 bg-ink-900/70 text-ink-300 hover:text-white hover:border-ink-500 hover:bg-ink-800 transition-all cursor-pointer z-10 active:scale-95"
          title={t("common.close", undefined, "Fechar")}
        >
          <Icon name="close" className="h-3.5 w-3.5" />
        </button>

        {/* Conteúdo */}
        <div className="relative z-10 flex flex-col items-center text-center">
          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-2xl mb-4 shadow-inner",
              cfg.iconBg
            )}
          >
            <Icon name={customIcon || cfg.iconName} className={cn("h-6 w-6 stroke-[2.2]", cfg.iconColor)} />
          </div>

          <h3 className="font-display text-lg font-bold text-white tracking-tight mb-2">
            {title}
          </h3>

          <p className="text-[13px] text-[#9a9aa2] leading-relaxed font-sans mb-6 max-w-sm">
            {message}
          </p>

          <div className="flex w-full gap-2.5">
            {cancelText && (
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1 justify-center text-[11px] font-bold uppercase tracking-[0.12em] py-2.5 rounded-xl border-[#232327] bg-[#101012] text-[#8c8c94] hover:bg-[#18181b] hover:text-white transition-all cursor-pointer"
              >
                {cancelText}
              </Button>
            )}
            <Button
              variant="solid"
              onClick={handleConfirm}
              className={cn(
                cancelText ? "flex-1" : "w-full",
                "justify-center text-[11px] font-bold uppercase tracking-[0.12em] py-2.5 rounded-xl transition-all cursor-pointer",
                cfg.buttonClass
              )}
            >
              {effectiveActionText}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
