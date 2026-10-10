import { useState, type ReactNode } from "react";
import { cn } from "../utils/cn";
import { TOOL_BY_ID, accentSoft, type Accent } from "../data";
import { Icon } from "./ui";
import { SaveToProjectModal, type SaveToProjectPayload } from "./SaveToProjectModal";
import { useStudioOS } from "../history";

export function ToolShell({
  id,
  title,
  lede,
  accent = "signal",
  meta,
  children,
  aside,
  onBack,
  saveItem,
  onGo,
  canSaveToProject,
}: {
  id: string;
  title: string;
  lede: string;
  accent?: Accent;
  meta?: { k: string; v: string }[];
  children: ReactNode;
  aside?: ReactNode;
  onBack: () => void;
  saveItem?: SaveToProjectPayload | (() => SaveToProjectPayload | null) | null;
  onGo?: (view: string) => void;
  canSaveToProject?: boolean;
}) {
  const tool = TOOL_BY_ID[id];
  const os = useStudioOS();
  const [openSaveModal, setOpenSaveModal] = useState(false);
  const [currentSaveItem, setCurrentSaveItem] = useState<SaveToProjectPayload | null>(null);

  const isSystemTool = id === "wiki" || id === "calibracao" || id === "config";
  const allowSave = canSaveToProject !== undefined ? canSaveToProject : !isSystemTool;

  const lastHistoryRun = os.history.find((h) => h.tool === id);

  const handleOpenSaveToProject = () => {
    const itemToSave = typeof saveItem === "function" ? saveItem() : saveItem;
    if (itemToSave && itemToSave.title) {
      setCurrentSaveItem(itemToSave);
      setOpenSaveModal(true);
    } else if (lastHistoryRun) {
      setCurrentSaveItem({
        type: id,
        group: tool?.group,
        toolName: tool?.name,
        title: lastHistoryRun.title,
        summary: lastHistoryRun.summary,
        content: lastHistoryRun.content,
        tag: lastHistoryRun.tag,
      });
      setOpenSaveModal(true);
    } else {
      alert("Preencha ou execute a ferramenta primeiro para gerar um conteúdo e salvar no projeto.");
    }
  };

  return (
    <div className="anim-rise">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="group inline-flex items-center gap-2 font-mono text-[10.5px] tracking-[0.18em] text-ink-400 uppercase transition-colors hover:text-signal-400 cursor-pointer"
        >
          <Icon
            name="arrow"
            className="h-3.5 w-3.5 rotate-180 transition-transform duration-300 group-hover:-translate-x-1"
            strokeWidth={2}
          />
          Visão geral
        </button>

        {/* Botão de Salvar no Projeto no Topo */}
        {allowSave && (
          <button
            type="button"
            onClick={handleOpenSaveToProject}
            className="flex items-center gap-2 rounded-lg border border-signal-400/40 bg-signal-400/10 px-3.5 py-1.5 font-mono text-[10.5px] font-bold tracking-[0.1em] text-signal-400 uppercase transition-all duration-200 hover:bg-signal-400 hover:text-ink-950 hover:shadow-[0_0_20px_rgba(242,179,61,0.25)] cursor-pointer"
            title="Salvar o resultado desta ferramenta nos Itens Salvos de um projeto"
          >
            <Icon name="bookmark" className="h-3.5 w-3.5" />
            <span>Salvar no Projeto</span>
          </button>
        )}
      </div>

      <div className="mb-8 flex flex-col gap-6 border-b border-ink-800 pb-7 md:flex-row md:items-start md:justify-between">
        <div className="max-w-2xl">
          <div className="mb-3 flex flex-wrap items-center gap-2.5">
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded border px-2.5 py-1 font-mono text-[10px] tracking-[0.16em] uppercase",
                accentSoft[accent]
              )}
            >
              {tool && <Icon name={tool.icon} className="h-3.5 w-3.5" strokeWidth={1.8} />}
              {tool?.kicker}
            </span>
            <span className="font-mono text-[10px] tracking-[0.16em] text-ink-400 uppercase">
              {tool?.group} · /{id}
            </span>
          </div>
          <h1 className="font-display text-[clamp(2.1rem,5vw,3.4rem)] leading-[0.92] font-extrabold tracking-[-0.035em] text-bone-50">
            {title}
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-bone-400">{lede}</p>
        </div>
        {meta && (
          <div className="grid shrink-0 grid-cols-2 gap-px overflow-hidden rounded-lg border border-ink-700/80 bg-ink-700/60 sm:grid-cols-2">
            {meta.map((m) => (
              <div key={m.k} className="bg-ink-900 px-4 py-3">
                <div className="font-mono text-[9px] tracking-[0.16em] text-ink-400 uppercase">
                  {m.k}
                </div>
                <div className="font-display text-lg font-bold text-bone-100 tabular-nums">{m.v}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {allowSave && (
        <SaveToProjectModal
          isOpen={openSaveModal}
          onClose={() => setOpenSaveModal(false)}
          item={currentSaveItem}
          onGoToProject={(projectId) => {
            try {
              const url = new URL(window.location.href);
              url.searchParams.set("view", "projetos");
              if (projectId) {
                url.searchParams.set("project", projectId);
              }
              window.history.pushState({ view: "projetos", project: projectId }, "", url.toString());
            } catch {}
            onGo?.("projetos");
          }}
        />
      )}

      <div className={cn("grid gap-6", aside && "xl:grid-cols-[minmax(0,1fr)_23rem]")}>
        <div className="min-w-0">{children}</div>
        {aside && <div className="min-w-0">{aside}</div>}
      </div>
    </div>
  );
}

export function Card({
  title,
  note,
  children,
  className,
  accent = "signal",
}: {
  title?: string;
  note?: string;
  children: ReactNode;
  className?: string;
  accent?: Accent;
}) {
  return (
    <section
      className={cn(
        "relative rounded-lg border border-ink-700/80 bg-ink-900/70",
        className
      )}
    >
      {title && (
        <header className="flex items-center gap-3 rounded-t-lg border-b border-ink-800 px-4 py-3">
          <span
            className={cn("h-3.5 w-[3px] rounded-full", {
              "bg-signal-400": accent === "signal",
              "bg-oxide-400": accent === "oxide",
              "bg-mint-400": accent === "mint",
              "bg-sky-400": accent === "sky",
              "bg-plum-400": accent === "plum",
              "bg-bone-300": accent === "bone",
            })}
          />
          <h3 className="font-display text-[14px] font-bold tracking-tight text-bone-100">
            {title}
          </h3>
          {note && (
            <span className="ml-auto font-mono text-[9.5px] tracking-[0.14em] text-ink-400 uppercase">
              {note}
            </span>
          )}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function CopyButton({ text, className }: { text: string; className?: string }) {
  return (
    <button
      onClick={() => {
        navigator.clipboard?.writeText(text).catch(() => {});
      }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded border border-ink-700 bg-ink-950/60 px-2 py-1 font-mono text-[9.5px] tracking-[0.14em] text-ink-400 uppercase transition-all duration-200 hover:border-signal-400/50 hover:text-signal-300 active:scale-95",
        className
      )}
    >
      <Icon name="copy" className="h-3 w-3" strokeWidth={1.8} />
      copiar
    </button>
  );
}
