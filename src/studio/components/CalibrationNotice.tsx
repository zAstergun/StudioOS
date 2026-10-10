import { cn } from "../utils/cn";
import { Icon } from "./ui";
import { isCalibrated, type Calib } from "../calibration";

export function CalibrationNotice({
  calibrated,
  calib,
  profileName = "Canal Principal",
  profileColor = "#F2B33D",
  toolName,
  onGo,
  onGoCalib,
  compact = false,
  className,
}: {
  calibrated?: boolean;
  calib?: Calib;
  profileName?: string;
  profileColor?: string;
  toolName?: string;
  onGo?: (id: string) => void;
  onGoCalib?: () => void;
  compact?: boolean;
  className?: string;
}) {
  const isCalib = calibrated !== undefined ? calibrated : isCalibrated(calib);

  const handleGoCalib = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onGoCalib) {
      onGoCalib();
    } else if (onGo) {
      onGo("calibracao");
    } else if (typeof window !== "undefined") {
      try {
        localStorage.setItem("studioos_last_view", "calibracao");
        const url = new URL(window.location.href);
        url.searchParams.set("view", "calibracao");
        window.history.pushState({ view: "calibracao" }, "", url.toString());
        window.dispatchEvent(new PopStateEvent("popstate"));
      } catch {
        window.location.href = "/?view=calibracao";
      }
    }
  };

  if (isCalib) {
    return (
      <div
        className={cn(
          "mb-6 flex items-center justify-between gap-3 rounded-lg border border-mint-400/25 bg-mint-950/30 px-4 py-2.5 text-[12.5px] text-mint-300 shadow-sm transition-all",
          compact && "mb-4 py-1.5 px-3 text-[11px]",
          className
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className="h-2 w-2 shrink-0 rounded-full shadow-[0_0_8px_rgba(47,212,160,0.7)]"
            style={{ backgroundColor: profileColor }}
          />
          <span className="truncate">
            Parâmetros adaptados ao perfil:{" "}
            <strong className="text-bone-50 font-semibold">{profileName}</strong>
          </span>
        </div>
        <button
          type="button"
          onClick={handleGoCalib}
          className="ml-auto shrink-0 font-mono text-[10px] tracking-wider text-mint-400 uppercase underline underline-offset-2 transition-colors hover:text-mint-200 cursor-pointer"
        >
          Trocar perfil
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mb-6 flex flex-col gap-3.5 rounded-xl border border-signal-400/30 bg-signal-400/[0.08] p-4 sm:p-4.5 text-[12.5px] text-signal-200 shadow-sm backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between transition-all",
        compact && "mb-4 py-2.5 px-3.5 text-[11.5px]",
        className
      )}
    >
      <div className="flex items-start sm:items-center gap-3 min-w-0">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-signal-400/20 text-signal-400 mt-0.5 sm:mt-0 shadow-sm">
          <Icon name="spark" className="h-3.5 w-3.5" />
        </span>
        <span className="leading-relaxed">
          <strong className="text-bone-50 font-semibold">Respostas genéricas:</strong> Sem calibração do canal, as respostas e sugestões {toolName ? `do ${toolName}` : "desta ferramenta"} são baseadas em parâmetros padrão. As análises ficam muito melhores quando o perfil do canal é preenchido.
        </span>
      </div>
      <button
        type="button"
        onClick={handleGoCalib}
        className="inline-flex shrink-0 items-center gap-2 self-start sm:self-auto rounded-lg bg-signal-400 px-3.5 py-2 font-mono text-[10.5px] font-bold tracking-wider text-ink-950 uppercase shadow-md transition-all hover:bg-signal-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
      >
        <span>Calibrar canal</span>
        <Icon name="arrow" className="h-3 w-3" strokeWidth={2.5} />
      </button>
    </div>
  );
}
