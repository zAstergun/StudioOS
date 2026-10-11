import { useEffect, useState } from "react";
import { cn } from "../utils/cn";
import { Icon } from "./ui";
import { openVipModal } from "./VipModal";
import { useAuth } from "../auth";

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const time = now.toLocaleTimeString("pt-BR", { hour12: false });
  return (
    <span className="font-mono text-[11px] tracking-[0.1em] text-bone-300 tabular-nums">
      {time}
      <span className="ml-1.5 text-ink-400">BRT</span>
    </span>
  );
}

function formatRemaining(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "expirada";
  const h = Math.floor(diff / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${h}h ${m}m restantes`;
}

export function StatusBar({
  onGo,
  calibrated,
  demo,
  userName,
  isTemporary,
  expiresAt,
  onSignOut,
  profileName,
  profileColor,
}: {
  onGo: (id: string) => void;
  calibrated: boolean;
  demo?: boolean;
  userName?: string;
  isTemporary?: boolean;
  expiresAt?: string;
  onSignOut?: () => void;
  profileName?: string;
  profileColor?: string;
}) {
  const { user } = useAuth();
  const isVip = Boolean(user?.is_vip);

  return (
    <div className="relative z-30 flex items-center gap-x-4 sm:gap-x-5 border-b border-ink-700/70 bg-ink-950/90 px-4 py-2 backdrop-blur-sm sm:px-6 lg:px-8 overflow-x-auto scrollbar-hide whitespace-nowrap">
      <div className="flex shrink-0 items-center gap-2.5">
        <span className="on-air-dot h-2 w-2 rounded-full bg-oxide-400" />
        <span className="anim-blink font-mono text-[10px] font-bold tracking-[0.3em] text-oxide-400 uppercase">On air</span>
      </div>
      <span className="hidden shrink-0 h-3 w-px bg-ink-600 sm:block" />
      <span className="shrink-0 font-mono text-[10px] tracking-[0.18em] text-bone-400 uppercase">
        StudioOS <span className="text-ink-400">/</span> build 2.5.0
      </span>
      {isTemporary && (
        <span
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-signal-400/40 bg-signal-400/10 px-2.5 py-0.5 font-mono text-[9px] tracking-[0.1em] text-signal-300 uppercase shadow-[0_0_10px_rgba(247,183,51,0.15)]"
          title="Conta temporária de teste. Todos os dados serão apagados automaticamente após 24h."
        >
          <span className="h-1.5 w-1.5 rounded-full bg-signal-400 animate-pulse" />
          Conta teste {expiresAt ? `· ${formatRemaining(expiresAt)}` : "(24h)"}
        </span>
      )}
      <button
        type="button"
        onClick={openVipModal}
        className={cn(
          "group relative overflow-hidden flex shrink-0 items-center gap-2 rounded-full border px-2.5 sm:px-3 py-1 font-mono text-[9.5px] font-bold tracking-[0.14em] uppercase transition-all duration-300 cursor-pointer select-none active:scale-95",
          isVip
            ? "border-amber-400/60 bg-gradient-to-r from-amber-500/25 via-yellow-400/15 to-amber-500/25 text-amber-100 shadow-[0_0_16px_rgba(245,158,11,0.3),inset_0_1px_1px_rgba(255,255,255,0.25)] hover:border-amber-300 hover:shadow-[0_0_24px_rgba(245,158,11,0.45)]"
            : "border-amber-400/60 bg-gradient-to-r from-amber-500/20 via-yellow-400/15 to-amber-500/25 text-amber-100 shadow-[0_0_16px_rgba(245,158,11,0.25),inset_0_1px_1px_rgba(255,255,255,0.2)] hover:border-amber-300 hover:from-amber-500/35 hover:via-yellow-300/25 hover:to-amber-500/40 hover:text-white hover:shadow-[0_0_24px_rgba(245,158,11,0.5)]"
        )}
        title={isVip ? "Você é um membro VIP! Clique para ver seus privilégios." : "Torne-se VIP agora e apoie os projetos do Aster!"}
      >
        {/* Shimmer sweep effect */}
        <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />

        <span className="relative flex items-center justify-center">
          <Icon
            name="crown"
            className="h-3 w-3 text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.85)] shrink-0 transition-transform duration-300 group-hover:scale-115 group-hover:-rotate-6"
            strokeWidth={2.4}
          />
        </span>
        <span className="relative drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
          {isVip ? "VIP Ativo" : "Se torne VIP agora"}
        </span>
        <span className="relative flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-amber-400/20 text-amber-200 transition-all duration-200 group-hover:bg-amber-300 group-hover:text-ink-950 group-hover:translate-x-0.5">
          <Icon name="arrow" className="h-2 w-2" strokeWidth={2.8} />
        </span>
      </button>
      <span className="hidden shrink-0 h-3 w-px bg-ink-600 sm:block" />
      <button
        type="button"
        onClick={() => onGo("calibracao")}
        className={cn(
          "group flex shrink-0 items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] uppercase transition-colors cursor-pointer",
          demo
            ? "text-sky-400/90 hover:text-sky-300"
            : calibrated
            ? "text-mint-400 hover:text-mint-300"
            : "text-oxide-400 hover:text-oxide-300"
        )}
        title="Ver ou trocar perfil de calibração"
      >
        {!demo && calibrated && profileColor ? (
          <span
            className="h-2 w-2 rounded-full shrink-0 shadow-[0_0_6px_currentColor] transition-transform group-hover:scale-110"
            style={{ backgroundColor: profileColor }}
          />
        ) : !demo && !calibrated ? (
          <span className="h-2 w-2 rounded-full shrink-0 bg-oxide-400 shadow-[0_0_6px_currentColor] transition-transform group-hover:scale-110" />
        ) : (
          <Icon
            name={demo ? "eye" : calibrated ? "check" : "dial"}
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-200 group-hover:scale-110",
              demo
                ? "text-sky-400"
                : calibrated
                ? "text-mint-400"
                : "text-oxide-400"
            )}
            strokeWidth={1.8}
          />
        )}
        <span>
          {demo
            ? "Dados de exemplo"
            : calibrated
            ? (profileName ? `Perfil: ${profileName}` : "Canal calibrado")
            : "Calibração pendente"}
        </span>
      </button>
      <span className="hidden shrink-0 h-3 w-px bg-ink-600 sm:block" />
      <a
        href="https://discord.gg/EDzYV5JvMk"
        target="_blank"
        rel="noopener noreferrer"
        className="group relative overflow-hidden flex shrink-0 items-center gap-2 rounded-full border border-[#5865F2]/50 bg-gradient-to-r from-[#5865F2]/20 via-[#4752C4]/15 to-[#5865F2]/20 px-2.5 sm:px-3 py-1 font-mono text-[9.5px] font-bold tracking-[0.14em] uppercase text-[#c2cbff] shadow-[0_0_14px_rgba(88,101,242,0.25),inset_0_1px_1px_rgba(255,255,255,0.15)] transition-all duration-300 hover:border-[#5865F2] hover:from-[#5865F2]/35 hover:via-[#5865F2]/25 hover:to-[#4752C4]/40 hover:text-white hover:shadow-[0_0_22px_rgba(88,101,242,0.5)] cursor-pointer select-none active:scale-95 no-underline"
        title="Entrar na comunidade Discord do Aster (convite: EDzYV5JvMk)"
      >
        {/* Shimmer sweep effect */}
        <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" />

        <span className="relative flex items-center justify-center">
          <Icon
            name="discord"
            className="h-3 w-3 text-[#7983f5] drop-shadow-[0_0_6px_rgba(88,101,242,0.85)] shrink-0 transition-transform duration-300 group-hover:scale-115 group-hover:-rotate-6 group-hover:text-white"
          />
        </span>
        <span className="relative drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
          Discord
        </span>
        <span className="relative flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-[#5865F2]/25 text-[#d5dbff] transition-all duration-200 group-hover:bg-[#5865F2] group-hover:text-white group-hover:translate-x-0.5">
          <Icon name="arrow" className="h-2 w-2" strokeWidth={2.8} />
        </span>
      </a>
      <div className="ml-auto flex shrink-0 items-center gap-4 pl-4 sm:pl-0">
        <Clock />
        {userName ? (
          <button
            type="button"
            onClick={onSignOut}
            className="rounded border border-ink-700 px-2.5 py-1 font-mono text-[9px] tracking-[0.12em] text-bone-300 uppercase transition-colors hover:border-signal-400/50 hover:text-signal-300"
            title={`Sair da conta de ${userName}`}
          >
            {userName} · sair
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onGo("login")}
            className="rounded border border-signal-400/40 bg-signal-400/10 px-2.5 py-1 font-mono text-[9px] tracking-[0.12em] text-signal-300 uppercase transition-colors hover:border-signal-400 hover:bg-signal-400/20"
          >
            Entrar
          </button>
        )}
        <span className="hidden shrink-0 items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] text-bone-400 uppercase sm:flex">
          <Icon name="cloud" className="h-3.5 w-3.5 text-signal-400" strokeWidth={1.8} />
          Cloud Sync
        </span>
      </div>
    </div>
  );
}
