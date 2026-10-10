import { cn } from "../utils/cn";

export interface VipBadgeProps {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  showStar?: boolean;
}

export function VipBadge({ size = "sm", className, showStar }: VipBadgeProps) {
  const sizeClasses = {
    xs: "text-[7px] px-1.5 py-[1px] -top-1 -right-1 gap-0.5 tracking-wider rounded-full",
    sm: "text-[8px] px-2 py-0.5 -top-1 -right-1 gap-1 tracking-wider rounded-full",
    md: "text-[9px] px-2.5 py-0.5 -top-1.5 -right-1.5 gap-1 tracking-widest rounded-full",
    lg: "text-[10px] sm:text-[10.5px] px-2.5 sm:px-3 py-0.5 sm:py-1 top-0 right-0 sm:top-1 sm:right-1 gap-1.5 tracking-[0.16em] rounded-full",
  };

  const iconSizes = {
    xs: "w-2 h-2",
    sm: "w-2.5 h-2.5",
    md: "w-2.5 h-2.5",
    lg: "w-3.5 h-3.5",
  };

  const hasIcon = showStar ?? (size !== "xs");

  return (
    <span
      className={cn(
        "absolute z-20 select-none inline-flex items-center uppercase font-mono font-bold cursor-default pointer-events-none transition-all",
        // StudioOS Signature Console Aesthetic: dark ink base, signal-400 accent, soft broadcast glow
        "bg-ink-950/95 text-signal-400 border border-signal-400/50 ring-1 ring-ink-950/90",
        "shadow-[0_0_12px_rgba(247,183,51,0.25)] backdrop-blur-sm",
        sizeClasses[size],
        className
      )}
      title="Membro VIP Aster Account"
    >
      {hasIcon && (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(iconSizes[size], "text-signal-400 shrink-0")}
          aria-hidden="true"
        >
          {/* StudioOS Crown Vector */}
          <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7z" />
          <path d="M5 20h14" />
        </svg>
      )}
      <span className="text-signal-400">VIP</span>
    </span>
  );
}
