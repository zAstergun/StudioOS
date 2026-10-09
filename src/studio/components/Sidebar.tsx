import { useEffect } from "react";
import { cn } from "../utils/cn";
import { TOOLS, accentText, type Accent } from "../data";
import { Icon } from "./ui";
import { useAuth, supabase } from "../auth";

const GROUPS = ["Criação", "Publicação", "Estratégia"] as const;

type Props = {
  active: string;
  onNavigate: (id: string) => void;
  open: boolean;
  onClose: () => void;
  provider: string;
  hasKey: boolean;
  progress: number;
  historyCount: number;
  trashCount: number;
  authenticated: boolean;
};

export function Sidebar({
  active,
  onNavigate,
  open,
  onClose,
  provider,
  hasKey,
  progress,
  historyCount,
  trashCount,
  authenticated,
}: Props) {
  const auth = useAuth();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const go = (id: string) => {
    onNavigate(id);
    onClose();
  };

  const body = (
    <div className="flex h-full flex-col bg-ink-950/95">
      {/* brand */}
      <button
        onClick={() => go("home")}
        className="group flex items-center gap-3 border-b border-ink-800 px-5 py-4 text-left"
      >
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-signal-400 text-ink-950 transition-transform duration-300 group-hover:rotate-[-8deg]">
          <Icon name="logo" className="h-5 w-5" strokeWidth={1.7} />
        </span>
        <span className="min-w-0">
          <span className="block font-display text-[17px] leading-none font-extrabold tracking-[-0.03em] text-bone-50">
            StudioOS
          </span>
          <span className="mt-1 block font-mono text-[9px] tracking-[0.2em] text-ink-400 uppercase">
            asterdev · studio
          </span>
        </span>
        <Icon
          name="close"
          className="ml-auto h-4 w-4 text-ink-400 transition-colors hover:text-bone-100 lg:hidden"
          strokeWidth={2}
        />
      </button>

      {/* nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <NavItem
          active={active === "home"}
          onClick={() => go("home")}
          icon="stack"
          label="Visão geral"
          accent="signal"
        />

        <div className="mt-0.5 space-y-0.5">
          <NavItem
            active={active === "login" || active === "perfil"}
            onClick={() => go(authenticated ? "perfil" : "login")}
            icon={authenticated ? "user" : "login"}
            label={authenticated ? "Meu Perfil" : "Entrar"}
            kicker={authenticated ? "Gerenciar conta" : "Acesse dados salvos"}
            accent="signal"
          />
          {authenticated && !!supabase && auth.user?.provider !== "demo" && (
            <>
              <NavItem
                active={active === "projetos"}
                onClick={() => go("projetos")}
                icon="layers"
                label="Projetos"
                kicker="Gerenciar projetos"
                accent="signal"
              />
              <NavItem
                active={active === "salvos"}
                onClick={() => go("salvos")}
                icon="bookmark"
                label="Salvos"
                kicker="Meus itens salvos"
                accent="signal"
              />
            </>
          )}
          <NavItem
            active={active === "historico" || active === "lixeira"}
            onClick={() => go("historico")}
            icon="historico"
            label="Histórico & Lixeira"
            kicker={authenticated ? `${historyCount} logs · ${trashCount} lixeira` : "entre para acessar"}
            accent="signal"
            badge={authenticated ? historyCount : undefined}
          />
          <NavItem
            active={active === "calibracao"}
            onClick={() => go("calibracao")}
            icon="dial"
            label="Calibração do Canal"
            kicker="Base de dados"
            accent="bone"
          />
        </div>

        {GROUPS.map((g, index) => {
          const items = TOOLS.filter((t) => t.group === g);
          if (!items.length) return null;
          return (
            <div key={g} className="mt-6">
              <div className="mb-2 flex items-center gap-2 px-2">
                <span className="font-mono text-[9.5px] tracking-[0.22em] text-ink-400 uppercase">
                  {g}
                </span>
                <span className="h-px flex-1 bg-ink-800" />
                <span className="font-mono text-[9.5px] text-ink-500 tabular-nums">
                  {(index + 1).toString().padStart(2, "0")}
                </span>
              </div>
              <div className="space-y-0.5">
                {items.map((t) => (
                  <NavItem
                    key={t.id}
                    active={active === t.id}
                    onClick={() => go(t.id)}
                    icon={t.icon}
                    label={t.name}
                    kicker={t.kicker}
                    accent={t.accent}
                  />
                ))}
              </div>
            </div>
          );
        })}

        <div className="mt-6">
          <div className="mb-2 flex items-center gap-2 px-2">
            <span className="font-mono text-[9.5px] tracking-[0.22em] text-ink-400 uppercase">
              Sistema
            </span>
            <span className="h-px flex-1 bg-ink-800" />
            <span className="font-mono text-[9.5px] text-ink-500 tabular-nums">04</span>
          </div>
          <div className="space-y-0.5">
            <NavItem
              active={active === "wiki"}
              onClick={() => go("wiki")}
              icon="book"
              label="Wiki do Painel"
              kicker="Ajuda"
              accent="bone"
            />
          </div>
        </div>
      </nav>

      {/* footer status */}
      <div className="border-t border-ink-800 p-4">
        <div className="mb-3 rounded-md border border-ink-800 bg-ink-900/70 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-mono text-[9.5px] tracking-[0.18em] text-ink-400 uppercase">
              Calibração
            </span>
            <span
              className={cn(
                "font-mono text-[10px] tabular-nums",
                progress >= 100 ? "text-mint-400" : "text-signal-400"
              )}
            >
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-ink-800">
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-700",
                progress >= 100 ? "bg-mint-400" : "bg-signal-400"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          <button
            onClick={() => go("calibracao")}
            className="mt-2.5 flex items-center gap-1.5 font-mono text-[10px] tracking-[0.1em] text-bone-400 uppercase transition-colors hover:text-signal-300"
          >
            {progress >= 100 ? "Revisar dados" : "Completar agora"}
            <Icon name="arrow" className="h-3 w-3" strokeWidth={2} />
          </button>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                hasKey ? "bg-mint-400 shadow-[0_0_8px_rgba(67,217,163,0.9)]" : "bg-ink-500"
              )}
            />
            <span className="font-mono text-[9.5px] tracking-[0.14em] text-bone-400 uppercase">
              {provider}
            </span>
          </div>
          <button
            onClick={() => go("config")}
            className="font-mono text-[9.5px] tracking-[0.14em] text-ink-400 uppercase transition-colors hover:text-bone-100"
          >
            {hasKey ? "conectado" : "configurar"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* desktop */}
      <aside className="sticky top-0 hidden h-screen w-[264px] shrink-0 border-r border-ink-800 lg:block">
        {body}
      </aside>

      {/* mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden",
          open ? "pointer-events-auto" : "pointer-events-none"
        )}
      >
        <div
          onClick={onClose}
          className={cn(
            "absolute inset-0 bg-ink-950/80 backdrop-blur-sm transition-opacity duration-300",
            open ? "opacity-100" : "opacity-0"
          )}
        />
        <div
          className={cn(
            "absolute inset-y-0 left-0 w-[280px] max-w-[86vw] border-r border-ink-800 shadow-2xl transition-transform duration-300 ease-out",
            open ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {body}
        </div>
      </div>
    </>
  );
}

function NavItem({
  active,
  onClick,
  icon,
  label,
  kicker,
  accent = "bone",
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  kicker?: string;
  accent: Accent;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-all duration-200",
        active ? "bg-ink-800 text-bone-50" : "text-bone-400 hover:bg-ink-900 hover:text-bone-100"
      )}
    >
      <span
        className={cn(
          "absolute left-0 top-1/2 h-5 w-[2.5px] -translate-y-1/2 rounded-r bg-signal-400 transition-all duration-300",
          active ? "opacity-100" : "opacity-0"
        )}
      />
      <Icon
        name={icon}
        className={cn(
          "h-[17px] w-[17px] shrink-0 transition-all duration-200",
          active
            ? accentText[accent]
            : "text-ink-400 group-hover:scale-110 group-hover:text-bone-200"
        )}
        strokeWidth={active ? 1.9 : 1.5}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium tracking-tight">{label}</span>
        {kicker && (
          <span className="block truncate font-mono text-[9px] tracking-[0.12em] text-ink-400 uppercase">
            {kicker}
          </span>
        )}
      </span>
      {badge !== undefined && badge > 0 && (
        <span
          className={cn(
            "rounded-sm px-1.5 py-0.5 font-mono text-[9.5px] tabular-nums transition-colors",
            active ? "bg-signal-400/20 text-signal-300" : "bg-ink-800 text-ink-400 group-hover:text-bone-300"
          )}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}
      {badge === 0 && active && (
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      )}
      {badge === undefined && active && (
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", `bg-current`)} />
      )}
    </button>
  );
}
