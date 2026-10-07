import { useEffect, useState } from "react";
import { cn } from "../utils/cn";
import { Icon } from "./ui";

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

export function StatusBar({
  onGo,
  calibrated,
  demo,
  userName,
  onSignOut,
}: {
  onGo: (id: string) => void;
  calibrated: boolean;
  demo?: boolean;
  userName?: string;
  onSignOut?: () => void;
}) {
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
      <button
        onClick={() => onGo("historico")}
        className="group hidden shrink-0 items-center gap-1.5 rounded-full border border-mint-400/30 bg-mint-400/10 px-2.5 py-0.5 font-mono text-[9px] tracking-[0.12em] text-mint-300 uppercase transition-colors hover:border-mint-400/60 hover:bg-mint-400/20 md:flex"
      >
        <span className="h-1 w-1 rounded-full bg-mint-400" />
        novo: histórico & lixeira
        <Icon name="arrow" className="h-2.5 w-2.5 transition-transform group-hover:translate-x-0.5" strokeWidth={2.6} />
      </button>
      <span className="hidden shrink-0 h-3 w-px bg-ink-600 sm:block" />
      <span className={cn(
        "flex shrink-0 items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] uppercase",
        demo ? "text-signal-400" : calibrated ? "text-mint-400" : "text-signal-400"
      )}>
        <Icon name={demo ? "eye" : calibrated ? "check" : "dial"} className="h-3.5 w-3.5" strokeWidth={2} />
        {demo ? "Dados de exemplo" : calibrated ? "Canal calibrado" : "Calibração pendente"}
      </span>
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
