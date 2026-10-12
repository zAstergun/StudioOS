import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./ui";
import { useAuth } from "../auth";
import { useI18n } from "../i18n";
import { cn } from "../utils/cn";

export function openVipModal() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("studioos:open-vip-modal"));
  }
}

export interface VipModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function VipModal({ isOpen: controlledIsOpen, onClose: controlledOnClose }: VipModalProps) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [internalOpen, setInternalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const isVip = Boolean(user?.is_vip);
  const isControlled = typeof controlledIsOpen === "boolean";
  const isOpen = isControlled ? controlledIsOpen : internalOpen;

  const handleClose = () => {
    if (isControlled && controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalOpen(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    const handleOpenEvent = () => setInternalOpen(true);
    window.addEventListener("studioos:open-vip-modal", handleOpenEvent);
    return () => {
      window.removeEventListener("studioos:open-vip-modal", handleOpenEvent);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") handleClose();
      };
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = prevOverflow;
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen]);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText("donate@asterdev.me");
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2500);
    } catch {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2500);
    }
  };

  if (!mounted || !isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-ink-950/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="relative w-full max-w-[620px] max-h-[92vh] overflow-y-auto rounded-2xl sm:rounded-3xl border border-signal-400/30 bg-gradient-to-b from-[#14151c] via-[#0d0e14] to-[#08090d] p-5 sm:p-7 text-bone-100 shadow-[0_25px_80px_-15px_rgba(0,0,0,0.95),0_0_50px_-10px_rgba(242,179,61,0.22)] ring-1 ring-inset ring-white/[0.06] animate-in zoom-in-95 duration-200 scrollbar-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glows de iluminação de fundo */}
        <div className="absolute top-0 right-1/4 -mt-24 h-64 w-64 rounded-full bg-signal-400/15 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-0 -ml-20 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        {/* Botão Fechar com micro-hover */}
        <button
          onClick={handleClose}
          className="absolute top-3.5 right-3.5 sm:top-5 sm:right-5 flex h-8 w-8 items-center justify-center rounded-xl border border-ink-700/60 bg-ink-900/70 text-ink-300 hover:text-white hover:border-signal-400/50 hover:bg-ink-800 transition-all cursor-pointer z-10 active:scale-95"
          title={t("common.close", undefined, "Fechar")}
        >
          <Icon name="close" className="h-3.5 w-3.5" />
        </button>

        {/* ========================================================
            CABEÇALHO: EMBLEMA DA COROA & TÍTULO
           ======================================================== */}
        <div className="flex flex-col items-center text-center pb-5 border-b border-white/[0.07] relative z-10">
          
          {/* Emblema Dourado com Coroa Vetorial */}
          <div className="relative mb-3 flex items-center justify-center">
            <div className="relative flex h-16 w-16 sm:h-18 sm:w-18 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/20 via-signal-400/10 to-yellow-500/25 border border-signal-400/50 shadow-[0_0_30px_rgba(242,179,61,0.35)] ring-1 ring-white/10">
              
              {/* Vetor Realista de Coroa Dourada */}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="w-9 h-9 sm:w-10 sm:h-10 text-signal-400 filter drop-shadow-[0_2px_12px_rgba(242,179,61,0.7)]"
              >
                <defs>
                  <linearGradient id="vip-gold-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFF1B8" />
                    <stop offset="45%" stopColor="#F2B33D" />
                    <stop offset="100%" stopColor="#D97706" />
                  </linearGradient>
                </defs>
                <path
                  d="M2.5 6L5.5 17H18.5L21.5 6L15.5 12L12 5L8.5 12L2.5 6Z"
                  fill="url(#vip-gold-grad)"
                  stroke="#FFE27A"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
                <circle cx="2.5" cy="5" r="1.4" fill="#FFF8DC" stroke="#D97706" strokeWidth="0.8" />
                <circle cx="12" cy="4" r="1.6" fill="#FFF8DC" stroke="#D97706" strokeWidth="0.8" />
                <circle cx="21.5" cy="5" r="1.4" fill="#FFF8DC" stroke="#D97706" strokeWidth="0.8" />
                <path
                  d="M5.5 19H18.5"
                  stroke="url(#vip-gold-grad)"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
              </svg>

              {/* Mini Sparkles flutuantes */}
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-signal-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400" />
              </span>
            </div>

            {/* Badge flutuante VIP */}
            <div className="absolute -bottom-2.5 rounded-full border border-signal-400/60 bg-ink-950 px-2.5 py-0.5 text-[8.5px] font-mono font-bold tracking-[0.18em] uppercase text-signal-400 shadow-[0_0_12px_rgba(242,179,61,0.35)]">
              VIP PASS
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-signal-400/35 bg-signal-400/10 px-3 py-0.5 mt-2 mb-2 font-mono text-[9px] font-bold tracking-[0.16em] uppercase text-signal-300">
            <span className="h-1.5 w-1.5 rounded-full bg-signal-400 animate-pulse shadow-[0_0_6px_#f59e0b]" />
            {t("vip.supporter_role", undefined, "Cargo de Apoiador dos Projetos do Aster")}
          </div>

          <h2 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-bone-50">
            {t("vip.modal_title", undefined, "Seja VIP no StudioOS")}
          </h2>

          <p className="mt-1.5 text-[12px] sm:text-[13px] text-bone-300 max-w-md leading-relaxed">
            {t("vip.modal_desc", undefined, "O VIP é o cargo oficial para os apoiadores dos projetos do Aster. Ao se tornar VIP, o privilégio é válido em todos os projetos do Aster!")}
          </p>

          {isVip && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-1 text-[11px] font-mono text-emerald-300">
              <Icon name="check" className="h-3.5 w-3.5 text-emerald-400" strokeWidth={2.5} />
              <span>{t("vip.already_active", undefined, "Você já é um membro VIP ativo! Muito obrigado pelo apoio.")}</span>
            </div>
          )}
        </div>

        {/* ========================================================
            GRID DE BENEFÍCIOS (4 TILES POLIDOS)
           ======================================================== */}
        <div className="py-4 sm:py-5 border-b border-white/[0.07] relative z-10">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-ink-400 font-bold">
              {t("vip.perks_title", undefined, "Privilégios & Vantagens Inclusas")}
            </span>
            <span className="text-[9.5px] font-mono text-signal-400/80 bg-signal-400/10 px-2 py-0.5 rounded border border-signal-400/20">
              {t("vip.full_access", undefined, "Acesso Completo")}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            
            {/* Tile 1: Badge VIP */}
            <div className="group rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 hover:border-signal-400/40 hover:bg-signal-400/[0.03] transition-all">
              <div className="flex items-start gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-400/10 border border-amber-400/25 text-signal-400 group-hover:scale-105 transition-transform">
                  <Icon name="crown" className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-display text-[12.5px] font-bold text-bone-100">
                      {t("vip.badge_title", undefined, "Badge VIP com Brilho")}
                    </h4>
                  </div>
                  <p className="mt-0.5 text-[10.5px] text-bone-400 leading-snug">
                    {t("vip.badge_desc", undefined, "Selo oficial dourado nos rankings, projetos, tarefas e perfil de usuário.")}
                  </p>
                </div>
              </div>
            </div>

            {/* Tile 2: Cores RGB */}
            <div className="group rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 hover:border-signal-400/40 hover:bg-signal-400/[0.03] transition-all">
              <div className="flex items-start gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-pink-500/20 via-purple-500/20 to-cyan-500/20 border border-purple-400/30 group-hover:scale-105 transition-transform shadow-sm">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-4 w-4 text-signal-400"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.29-.29-.44-.65-.44-1.13a1.64 1.64 0 0 1 1.67-1.67h2c3.05 0 5.56-2.51 5.56-5.56C22 6.5 17.5 2 12 2Z" />
                    <circle cx="7.5" cy="11.5" r="1.1" fill="#F43F5E" stroke="#F43F5E" />
                    <circle cx="10" cy="7.5" r="1.1" fill="#EAB308" stroke="#EAB308" />
                    <circle cx="14.5" cy="7.5" r="1.1" fill="#10B981" stroke="#10B981" />
                    <circle cx="17" cy="11.5" r="1.1" fill="#3B82F6" stroke="#3B82F6" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-display text-[12.5px] font-bold text-bone-100">
                      {t("vip.rgb_title", undefined, "Cores RGB Ilimitadas")}
                    </h4>
                  </div>
                  <p className="mt-0.5 text-[10.5px] text-bone-400 leading-snug">
                    {t("vip.rgb_desc", undefined, "Seletor livre com espectro RGB, HEX personalizado e gradientes exclusivos.")}
                  </p>
                </div>
              </div>
            </div>

            {/* Tile 3: Capa & GIFs */}
            <div className="group rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 hover:border-signal-400/40 hover:bg-signal-400/[0.03] transition-all">
              <div className="flex items-start gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-400/10 border border-amber-400/25 text-signal-400 group-hover:scale-105 transition-transform">
                  <Icon name="image" className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-display text-[12.5px] font-bold text-bone-100">
                      {t("vip.gif_title", undefined, "Capa & GIFs Animados")}
                    </h4>
                  </div>
                  <p className="mt-0.5 text-[10.5px] text-bone-400 leading-snug">
                    {t("vip.gif_desc", undefined, "Personalização da capa de fundo do perfil e fotos com GIFs animados.")}
                  </p>
                </div>
              </div>
            </div>

            {/* Tile 4: Todos os Projetos */}
            <div className="group rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 hover:border-signal-400/40 hover:bg-signal-400/[0.03] transition-all">
              <div className="flex items-start gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10 border border-emerald-400/25 text-emerald-400 group-hover:scale-105 transition-transform">
                  <Icon name="globe" className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-display text-[12.5px] font-bold text-bone-100">
                      {t("vip.all_projects_title", undefined, "Todos os Projetos do Aster")}
                    </h4>
                  </div>
                  <p className="mt-0.5 text-[10.5px] text-bone-400 leading-snug">
                    {t("vip.all_projects_desc", undefined, "Válido no StudioOS e em quaisquer futuras ferramentas e plataformas do Aster.")}
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ========================================================
            PASSO A PASSO DE ATIVAÇÃO
           ======================================================== */}
        <div className="pt-4 sm:pt-5 relative z-10">
          <div className="rounded-xl border border-signal-400/30 bg-gradient-to-r from-signal-400/10 via-ink-900/60 to-amber-500/10 p-3.5 sm:p-4 mb-4 shadow-inner">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-signal-400 text-ink-950 font-bold text-[10px]">
                ⚡
              </span>
              <h4 className="font-display text-[13px] font-bold text-white tracking-tight">
                {t("vip.how_to_activate", undefined, "Como ativar seus privilégios VIP:")}
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
              {/* Passo 1 */}
              <div className="rounded-lg border border-white/[0.06] bg-ink-950/60 p-2.5">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-signal-400 font-bold uppercase mb-1">
                  <span>{t("vip.step_1", undefined, "Passo 1")}</span>
                  <span className="text-ink-500">·</span>
                  <span className="text-bone-300">{t("vip.contribution", undefined, "Contribuição")}</span>
                </div>
                <p className="text-[11px] text-bone-300 leading-relaxed">
                  {t("vip.step_1_desc", undefined, "Faça uma contribuição de qualquer valor para o Aster em")} <strong className="text-signal-300">donate.asterdev.me</strong>.
                </p>
              </div>

              {/* Passo 2 */}
              <div className="rounded-lg border border-white/[0.06] bg-ink-950/60 p-2.5">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-signal-400 font-bold uppercase mb-1">
                  <span>{t("vip.step_2", undefined, "Passo 2")}</span>
                  <span className="text-ink-500">·</span>
                  <span className="text-bone-300">{t("vip.activation", undefined, "Ativação")}</span>
                </div>
                <p className="text-[11px] text-bone-300 leading-relaxed">
                  {t("vip.step_2_desc", undefined, "Envie um e-mail para")} <strong className="text-signal-300">donate@asterdev.me</strong> {t("vip.step_2_sub", undefined, "com seu usuário/canal para ativarmos seu VIP.")}
                </p>
              </div>
            </div>
          </div>

          {/* ========================================================
              BOTÕES DE AÇÃO PRINCIPAIS
             ======================================================== */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* Link direto de doação */}
            <a
              href="https://donate.asterdev.me"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-signal-400 to-yellow-500 px-4 py-2.5 font-mono text-[11px] font-bold tracking-[0.08em] text-ink-950 uppercase shadow-[0_6px_20px_-3px_rgba(242,179,61,0.5)] transition-all hover:brightness-110 active:scale-[0.98] cursor-pointer"
            >
              <span>{t("vip.support_btn", undefined, "Apoiar no donate.asterdev.me")}</span>
              <Icon name="arrow" className="h-3 w-3 -rotate-45" strokeWidth={3} />
            </a>

            {/* Copiar e-mail com feedback instantâneo */}
            <button
              type="button"
              onClick={handleCopyEmail}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl border px-3.5 py-2.5 font-mono text-[10.5px] font-bold tracking-[0.08em] uppercase transition-all cursor-pointer select-none active:scale-95",
                copiedEmail
                  ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]"
                  : "border-white/[0.12] bg-white/[0.03] text-bone-200 hover:border-signal-400/50 hover:bg-white/[0.07] hover:text-white"
              )}
              title={t("vip.copy_email_title", undefined, "Copiar e-mail donate@asterdev.me")}
            >
              <Icon name={copiedEmail ? "check" : "copy"} className="h-3.5 w-3.5 text-signal-400" />
              <span>{copiedEmail ? t("common.copied", undefined, "Copiado!") : "donate@asterdev.me"}</span>
            </button>

            {/* Fechar */}
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl px-3 py-2.5 font-mono text-[10.5px] uppercase tracking-wider text-bone-400 hover:text-white transition-colors cursor-pointer text-center sm:text-left active:scale-95"
            >
              {t("common.close", undefined, "Fechar")}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
