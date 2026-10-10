import { useState, useEffect } from "react";
import { Icon, Button } from "./ui";
import { cn } from "../utils/cn";
import { supabase, useAuth } from "../auth";
import { 
  type ProjectSavedItem, 
  TOOL_GROUP_MAP, 
  TOOL_NAME_MAP, 
  TOOL_ICON_MAP, 
  TOOL_ACCENT_STYLES 
} from "../types/projectSavedItem";
import { formatFriendlySummary } from "../utils/toolStateRestore";

export interface SaveToProjectPayload {
  type: string; // 'rank', 'titulos', 'hooks', etc. or 'link'
  group?: "Criação" | "Publicação" | "Estratégia" | "Link";
  toolName?: string;
  title: string;
  summary?: string;
  content?: string;
  tag?: string;
  url?: string;
  metadata?: any;
}

interface SaveToProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: SaveToProjectPayload | null;
  preselectedProjectId?: string;
  onSavedSuccess?: (projectId: string, savedItem: ProjectSavedItem) => void;
  onGoToProject?: (projectId: string) => void;
}

interface MiniProject {
  id: string;
  name: string;
  status: string;
  color?: string;
  saved_links?: any[];
}

export function SaveToProjectModal({
  isOpen,
  onClose,
  item,
  preselectedProjectId,
  onSavedSuccess,
  onGoToProject,
}: SaveToProjectModalProps) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<MiniProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [customTitle, setCustomTitle] = useState("");
  const [savedSuccessProject, setSavedSuccessProject] = useState<MiniProject | null>(null);

  useEffect(() => {
    if (isOpen && user && supabase) {
      setLoading(true);
      setSavedSuccessProject(null);
      supabase
        .from("studioos_projects")
        .select("id, name, status, color, saved_links")
        .neq("status", "trashed")
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          if (data) {
            setProjects(data);
            if (preselectedProjectId && data.some(p => p.id === preselectedProjectId)) {
              setSelectedProjectId(preselectedProjectId);
            } else if (data.length > 0) {
              setSelectedProjectId(data[0].id);
            }
          }
          setLoading(false);
        });
    }
  }, [isOpen, user, preselectedProjectId]);

  useEffect(() => {
    if (item) {
      setCustomTitle(item.title || "");
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const toolType = item.type || "link";
  const group = item.group || TOOL_GROUP_MAP[toolType] || (toolType === "link" ? "Link" : "Criação");
  const toolName = item.toolName || TOOL_NAME_MAP[toolType] || (toolType === "link" ? "Link Externo" : "Ferramenta");
  const iconName = TOOL_ICON_MAP[toolType] || "bookmark";
  const style = TOOL_ACCENT_STYLES[toolType] || TOOL_ACCENT_STYLES.link;

  const handleSave = async () => {
    if (!selectedProjectId || !supabase || !user) return;
    setSaving(true);

    try {
      const targetProject = projects.find(p => p.id === selectedProjectId);
      const currentLinks = Array.isArray(targetProject?.saved_links) ? targetProject!.saved_links : [];

      const newItem: ProjectSavedItem = {
        id: `psi_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        type: toolType,
        group,
        toolName,
        title: customTitle.trim() || item.title,
        url: item.url,
        summary: formatFriendlySummary(toolType, item.summary, item.content) || item.summary,
        content: item.content,
        tag: item.tag,
        metadata: item.metadata,
        createdAt: Date.now(),
      };

      const updatedLinks = [newItem, ...currentLinks];

      const { error } = await supabase
        .from("studioos_projects")
        .update({ saved_links: updatedLinks })
        .eq("id", selectedProjectId);

      if (error) {
        alert("Erro ao salvar no projeto: " + error.message);
        setSaving(false);
        return;
      }

      // Disparar evento para atualizar a tela caso ela esteja aberta
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("studioos:project_saved_items", {
          detail: { projectId: selectedProjectId, savedItem: newItem }
        }));
      }

      onSavedSuccess?.(selectedProjectId, newItem);
      setSavedSuccessProject(targetProject || null);
    } catch (err: any) {
      alert("Erro ao salvar: " + (err.message || String(err)));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/85 p-4 backdrop-blur-md"
      onClick={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}
    >
      <div 
        className="relative w-full max-w-[500px] overflow-hidden rounded-2xl border border-ink-700/60 bg-ink-900 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.9)] animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ink-800/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg border", style.badge)}>
              <Icon name={iconName} className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-bone-100">
                Salvar no Projeto
              </h3>
              <p className="font-mono text-[10px] tracking-wider text-ink-400 uppercase">
                {group} · {toolName}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            disabled={saving}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-800 hover:text-bone-100 disabled:opacity-50"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {savedSuccessProject ? (
            /* TELA DE SUCESSO */
            <div className="py-6 text-center animate-in fade-in">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Icon name="check" className="h-6 w-6" strokeWidth={2.5} />
              </div>
              <h4 className="font-display text-lg font-bold text-bone-50">
                Item salvo com sucesso!
              </h4>
              <p className="mt-1 text-[13px] text-ink-300">
                Salvo nos <strong className="text-bone-100">Itens Salvos</strong> do projeto{" "}
                <span className="text-signal-400 font-medium">{savedSuccessProject.name}</span>.
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Button 
                  variant="outline"
                  onClick={onClose}
                  className="font-mono text-[10.5px] uppercase tracking-wider"
                >
                  Fechar
                </Button>
                {onGoToProject && (
                  <Button 
                    variant="solid"
                    onClick={() => {
                      onClose();
                      onGoToProject(savedSuccessProject.id);
                    }}
                    className="font-mono text-[10.5px] uppercase tracking-wider gap-1.5 shadow-[0_0_15px_rgba(242,179,61,0.25)]"
                  >
                    Abrir Projeto
                    <Icon name="arrow" className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ) : (
            /* FORMULÁRIO DE SELEÇÃO */
            <div className="space-y-5">
              {/* Título do item */}
              <div>
                <label className="block mb-1.5 font-mono text-[10px] uppercase tracking-wider text-ink-400">
                  Título do item no projeto
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Nome do item salvo..."
                  className="w-full rounded-lg border border-ink-800 bg-ink-950 px-3.5 py-2.5 text-[13px] text-bone-100 placeholder:text-ink-600 transition-colors focus:border-signal-400/50 focus:outline-none"
                />
              </div>

              {/* Preview Resumo */}
              {(item.summary || item.tag) && (
                <div className="rounded-lg border border-ink-800/60 bg-ink-950/40 p-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-ink-500">
                      Prévia do Conteúdo
                    </span>
                    {item.tag && (
                      <span className="rounded bg-signal-400/10 border border-signal-400/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-signal-400">
                        {item.tag}
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-bone-300 line-clamp-2">
                    {formatFriendlySummary(toolType, item.summary, item.content) || item.summary || item.content?.slice(0, 140)}
                  </p>
                </div>
              )}

              {/* Escolha do Projeto de Destino */}
              <div>
                <label className="block mb-2 font-mono text-[10px] uppercase tracking-wider text-ink-400">
                  Selecione o Projeto de Destino ({projects.length})
                </label>

                {loading ? (
                  <div className="flex items-center justify-center py-8 text-ink-400 font-mono text-xs">
                    Carregando projetos...
                  </div>
                ) : projects.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-ink-800 p-6 text-center">
                    <Icon name="layers" className="mx-auto h-6 w-6 text-ink-600 mb-2" />
                    <p className="text-[13px] text-bone-300 font-medium">Nenhum projeto encontrado</p>
                    <p className="text-[11px] text-ink-400 mt-0.5">
                      Crie um projeto primeiro na aba Projetos para poder salvar conteúdos nele.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-[220px] space-y-1.5 overflow-y-auto pr-1">
                    {projects.map((proj) => {
                      const isSelected = selectedProjectId === proj.id;
                      const savedCount = Array.isArray(proj.saved_links) ? proj.saved_links.length : 0;
                      return (
                        <div
                          key={proj.id}
                          onClick={() => setSelectedProjectId(proj.id)}
                          className={cn(
                            "flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-all",
                            isSelected
                              ? "border-signal-400 bg-signal-400/[0.08] text-bone-50 shadow-sm"
                              : "border-ink-800/70 bg-ink-950/30 text-bone-300 hover:border-ink-700 hover:bg-ink-900/50"
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span 
                              className="h-2 w-2 rounded-full shrink-0" 
                              style={{ backgroundColor: proj.color || "#F2B33D" }} 
                            />
                            <div className="min-w-0">
                              <span className="block truncate text-[13px] font-semibold text-bone-100">
                                {proj.name}
                              </span>
                              <span className="font-mono text-[9px] uppercase tracking-wider text-ink-400">
                                {savedCount === 1 ? "1 item salvo" : `${savedCount} itens salvos`}
                              </span>
                            </div>
                          </div>

                          <div className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all",
                            isSelected 
                              ? "border-signal-400 bg-signal-400 text-ink-950" 
                              : "border-ink-700 bg-transparent"
                          )}>
                            {isSelected && <Icon name="check" className="h-2.5 w-2.5 stroke-[3]" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Botões do Rodapé */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-ink-800/80">
                <Button 
                  variant="outline" 
                  onClick={onClose}
                  disabled={saving}
                  className="font-mono text-[10.5px] uppercase tracking-wider"
                >
                  Cancelar
                </Button>
                <Button 
                  variant="solid" 
                  onClick={handleSave}
                  disabled={saving || !selectedProjectId || projects.length === 0}
                  className="font-mono text-[10.5px] uppercase tracking-wider gap-1.5 shadow-[0_0_20px_rgba(242,179,61,0.25)]"
                >
                  {saving ? (
                    <>Salvando...</>
                  ) : (
                    <>
                      <Icon name="bookmark" className="h-3.5 w-3.5" />
                      Salvar no Projeto
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
