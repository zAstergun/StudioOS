import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./ui";
import { VipBadge } from "./VipBadge";
import { useAuth } from "../auth";
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
      // Fallback
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2500);
    }
  };

  if (!mounted || !isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-ink-950/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl sm:rounded-3xl border border-signal-400/35 bg-gradient-to-b from-[#121319] via-[#0d0e14] to-[#090a0f] p-5 sm:p-8 text-bone-100 shadow-[0_25px_80px_-15px_rgba(0,0,0,0.9),0_0_50px_-10px_rgba(242,179,61,0.2)] animate-in zoom-in-95 duration-200 scrollbar-thin"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow de fundo */}
        <div className="absolute top-0 right-1/4 -mt-20 h-56 w-56 rounded-full bg-signal-400/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 -mb-20 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        {/* Botão Fechar */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 flex h-8 w-8 items-center justify-center rounded-xl border border-ink-700/60 bg-ink-900/60 text-ink-300 hover:text-white hover:border-ink-600 transition-colors cursor-pointer z-10"
          title="Fechar"
        >
          <Icon name="close" className="h-4 w-4" />
        </button>

        {/* CABEÇALHO */}
        <div className="flex flex-col items-center text-center pb-6 sm:pb-7 border-b border-ink-800/80 relative z-10">
          <div className="relative mb-4 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl sm:rounded-3xl bg-gradient-to-tr from-signal-400/20 via-amber-500/15 to-yellow-400/30 border border-signal-400/50 shadow-[0_0_35px_rgba(242,179,61,0.35)]">
            <span className="text-3xl sm:text-4xl filter drop-shadow-[0_2px_10px_rgba(242,179,61,0.6)]">👑</span>
            <div className="absolute -bottom-2 -right-1">
              <VipBadge size="xs" />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-signal-400/40 bg-signal-400/10 px-3.5 py-1 mb-2.5 font-mono text-[9px] sm:text-[10px] font-bold tracking-[0.16em] uppercase text-signal-400 shadow-[0_0_15px_rgba(242,179,61,0.2)]">
            <span className="h-1.5 w-1.5 rounded-full bg-signal-400 animate-pulse" />
            Cargo Unificado de Apoiador
          </div>

          <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-bone-50">
            Torne-se VIP no StudioOS
          </h2>

          <p className="mt-2 text-xs sm:text-sm text-bone-300 max-w-lg leading-relaxed">
            O VIP é um cargo exclusivo criado para reconhecer os <strong className="text-white">apoiadores dos projetos do Aster</strong>. Uma vez obtido, ele é <strong className="text-signal-400 underline decoration-signal-400/40 underline-offset-4">válido para todos os projetos do Aster</strong>!
          </p>

          {isVip && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-1.5 text-[11px] font-mono text-emerald-300">
              <Icon name="check" className="h-3.5 w-3.5 text-emerald-400" strokeWidth={2.5} />
              <span>Você já é um membro VIP ativo! Obrigado pelo apoio constante.</span>
            </div>
          )}
        </div>

        {/* BENEFÍCIOS */}
        <div className="py-6 sm:py-7 border-b border-ink-800/80 relative z-10">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-400 block mb-3.5">
            Privilégios & Benefícios Inclusos
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
            {/* Benefício 1 */}
            <div className="rounded-xl sm:rounded-2xl border border-ink-800/70 bg-ink-900/40 p-3.5 sm:p-4 hover:border-signal-400/30 transition-colors">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-signal-400/10 border border-signal-400/25 text-signal-400">
                  <span className="text-sm">👑</span>
                </div>
                <div>
                  <h4 className="font-display text-[13px] font-bold text-bone-100">Badge VIP com Brilho</h4>
                  <p className="mt-1 text-[11px] text-bone-400 leading-relaxed">
                    Selo oficial dourado exibido ao lado do seu nome em projetos, tarefas, bloco de notas e no ranking.
                  </p>
                </div>
              </div>
            </div>

            {/* Benefício 2 */}
            <div className="rounded-xl sm:rounded-2xl border border-ink-800/70 bg-ink-900/40 p-3.5 sm:p-4 hover:border-signal-400/30 transition-colors">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-signal-400/10 border border-signal-400/25 text-signal-400">
                  <span className="text-sm">🎨</span>
                </div>
                <div>
                  <h4 className="font-display text-[13px] font-bold text-bone-100">Cores RGB Ilimitadas</h4>
                  <p className="mt-1 text-[11px] text-bone-400 leading-relaxed">
                    Desbloqueie o seletor livre com espectro RGB, HEX personalizado e gradientes para capas e projetos.
                  </p>
                </div>
              </div>
            </div>

            {/* Benefício 3 */}
            <div className="rounded-xl sm:rounded-2xl border border-ink-800/70 bg-ink-900/40 p-3.5 sm:p-4 hover:border-signal-400/30 transition-colors">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-signal-400/10 border border-signal-400/25 text-signal-400">
                  <span className="text-sm">✨</span>
                </div>
                <div>
                  <h4 className="font-display text-[13px] font-bold text-bone-100">Capa & GIFs Animados</h4>
                  <p className="mt-1 text-[11px] text-bone-400 leading-relaxed">
                    Personalize a capa de fundo do seu perfil e use avatares animados em formato GIF sem restrições.
                  </p>
                </div>
              </div>
            </div>

            {/* Benefício 4 */}
            <div className="rounded-xl sm:rounded-2xl border border-ink-800/70 bg-ink-900/40 p-3.5 sm:p-4 hover:border-signal-400/30 transition-colors">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-signal-400/10 border border-signal-400/25 text-signal-400">
                  <span className="text-sm">🌐</span>
                </div>
                <div>
                  <h4 className="font-display text-[13px] font-bold text-bone-100">Todos os Projetos do Aster</h4>
                  <p className="mt-1 text-[11px] text-bone-400 leading-relaxed">
                    Válido no StudioOS e em quaisquer futuras plataformas ou ferramentas lançadas pelo Aster.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* COMO SE TORNAR VIP */}
        <div className="pt-6 sm:pt-7 relative z-10">
          <div className="rounded-2xl border border-signal-400/30 bg-gradient-to-r from-signal-400/10 via-ink-900/50 to-amber-500/10 p-4 sm:p-5 mb-5">
            <div className="flex items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-signal-400 text-ink-950 font-bold shadow-[0_0_20px_rgba(242,179,61,0.5)]">
                <span className="text-lg">⚡</span>
              </div>
              <div className="space-y-1">
                <h4 className="font-display text-sm sm:text-[15px] font-bold text-bone-50">
                  Como ter seus privilégios VIP ativados:
                </h4>
                <p className="text-[12px] sm:text-[12.5px] text-bone-300 leading-relaxed">
                  Para ser VIP, você só precisa fazer uma contribuição de qualquer valor para o Aster na página oficial de apoio e, em seguida, enviar uma mensagem no e-mail <strong className="text-signal-400">donate@asterdev.me</strong> com seu usuário/canal para ativarmos seus privilégios!
                </p>
              </div>
            </div>
          </div>

          {/* BOTÕES DE AÇÃO */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Link para doar */}
            <a
              href="https://donate.asterdev.me"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-signal-400 to-amber-400 px-5 py-3 font-mono text-[11.5px] font-bold tracking-[0.1em] text-ink-950 uppercase shadow-[0_10px_25px_-5px_rgba(242,179,61,0.5)] transition-all hover:from-signal-300 hover:to-amber-300 hover:shadow-[0_12px_30px_-5px_rgba(242,179,61,0.65)] active:scale-[0.98] cursor-pointer"
            >
              <span>Apoiar no donate.asterdev.me</span>
              <Icon name="arrow" className="h-3 w-3 -rotate-45" strokeWidth={2.8} />
            </a>

            {/* Copiar e-mail */}
            <button
              onClick={handleCopyEmail}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl border px-4 py-3 font-mono text-[11px] font-bold tracking-[0.1em] uppercase transition-all cursor-pointer",
                copiedEmail
                  ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                  : "border-ink-700 bg-ink-900/60 text-bone-200 hover:border-signal-400/40 hover:text-white hover:bg-ink-800"
              )}
              title="Copiar email de contato: donate@asterdev.me"
            >
              <Icon name={copiedEmail ? "check" : "copy"} className="h-3.5 w-3.5 text-signal-400" />
              <span>{copiedEmail ? "E-mail Copiado!" : "donate@asterdev.me"}</span>
            </button>

            {/* Fechar */}
            <button
              onClick={handleClose}
              className="rounded-xl px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-bone-400 hover:text-bone-100 transition-colors cursor-pointer text-center sm:text-left"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
