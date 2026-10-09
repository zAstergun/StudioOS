import { useState, useEffect, useMemo } from "react";
import { Icon, Panel, Reveal, SectionHead } from "../components/ui";
import { cn } from "../utils/cn";

import { ProjetoDetailScreen } from "./ProjetoDetailScreen";
import { useAuth, supabase } from "../auth";

export interface Project {
  id: string;
  name: string;
  status: "active" | "planning" | "completed" | "archived" | "trashed";
  progress: number;
  lastUpdate: string;
  tasksCount: number;
  completedTasks: number;
  color: string;
  owner_id?: string;
  isShared?: boolean;
  saved_links?: Array<{ title: string, url: string }>;
}

const STATUS_MAP: Record<string, { label: string; dot: string }> = {
  active: { label: "Ativo", dot: "bg-emerald-400" },
  planning: { label: "Planejamento", dot: "bg-signal-400" },
  completed: { label: "Concluído", dot: "bg-blue-400" },
  archived: { label: "Arquivado", dot: "bg-ink-500" },
};

const PALETTE = ["#F2604C", "#F2B33D", "#2FD4A0", "#6E93F5", "#D946EF", "#A855F7", "#F472B6", "#38BDF8"];

export function ProjetosScreen({ onGo }: { onGo: (id: string) => void }) {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [showSharedOnly, setShowSharedOnly] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectColor, setNewProjectColor] = useState("#F2604C");
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  useEffect(() => {
    setMounted(true);
    if (!user) return;

    const fetchProjects = async () => {
      if (!supabase) return;
      const { data, error } = await supabase
        .from("studioos_projects")
        .select("*, studioos_project_members(user_id), saved_links")
        .order("created_at", { ascending: false });
        
      if (!error && data) {
        setProjects(data.map(d => ({
          id: d.id,
          name: d.name,
          status: d.status as any,
          progress: d.progress,
          lastUpdate: d.last_update,
          tasksCount: 0,
          completedTasks: 0,
          color: d.color,
          owner_id: d.owner_id,
          isShared: d.owner_id !== user.id || (d.studioos_project_members && d.studioos_project_members.length > 0),
          saved_links: d.saved_links || []
        })));
      }
    };

    fetchProjects();

    if (!supabase) return;

    const channel = supabase.channel('projects_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'studioos_projects' }, fetchProjects)
      .subscribe();

    return () => {
      supabase!.removeChannel(channel);
    };
  }, [user]);

  const filtered = projects.filter(p => {
    if (showSharedOnly && !p.isShared) return false;
    if (filter === "active") return p.status === "active" || p.status === "planning";
    if (filter === "completed") return p.status === "completed";
    return p.status !== "trashed";
  });

  const stats = useMemo(() => ({
    total: projects.filter(p => p.status !== "trashed").length,
    active: projects.filter(p => p.status === "active" || p.status === "planning").length,
    completed: projects.filter(p => p.status === "completed").length,
    avgProgress: projects.filter(p => p.status !== "trashed").length > 0
      ? Math.round(projects.filter(p => p.status !== "trashed").reduce((a, p) => a + p.progress, 0) / projects.filter(p => p.status !== "trashed").length)
      : 0,
  }), [projects]);

  if (selectedProject) {
    return <ProjetoDetailScreen project={selectedProject} onBack={() => setSelectedProject(null)} />;
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !user) return;

    const newId = `p${Date.now()}`;
    const newProject = {
      id: newId,
      name: newProjectName.trim(),
      status: "planning",
      progress: 0,
      last_update: "Agora mesmo",
      color: newProjectColor,
      owner_id: user.id
    };

    // Atualização otimista
    setProjects([{
      id: newProject.id,
      name: newProject.name,
      status: newProject.status as any,
      progress: newProject.progress,
      lastUpdate: newProject.last_update,
      tasksCount: 0,
      completedTasks: 0,
      color: newProject.color,
      owner_id: newProject.owner_id
    }, ...projects]);

    setNewProjectName("");
    setNewProjectColor("#F2604C");
    setShowModal(false);

    // Inserção no Supabase
    if (supabase) {
      const { error } = await supabase.from("studioos_projects").insert([newProject]);
      if (error) {
        console.error("Erro ao criar projeto:", error);
        alert("Erro ao criar projeto: " + error.message);
      }
    }
  };

  return (
    <div className="mx-auto w-full pt-4">
      {/* HEADER */}
      <Reveal className="mb-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-signal-400/10">
                <Icon name="layers" className="h-4 w-4 text-signal-400" strokeWidth={2} />
              </div>
              <span className="font-mono text-[10px] tracking-[0.22em] text-signal-400 uppercase">
                Workspace · Projetos
              </span>
            </div>
            <h1 className="font-display text-[2.6rem] leading-[0.95] font-extrabold tracking-[-0.03em] text-bone-50">
              Meus Projetos
            </h1>
            <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-ink-300">
              Gerencie roteiros, produção e andamento de cada projeto. 
            </p>
          </div>
          
          <button 
            onClick={() => setShowModal(true)}
            className="group flex h-11 items-center justify-center gap-2.5 rounded-lg bg-signal-400 px-6 font-mono text-[11px] font-bold tracking-[0.12em] text-ink-950 uppercase shadow-[0_8px_30px_-10px_rgba(242,179,61,0.5)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-10px_rgba(242,179,61,0.6)]"
          >
            <Icon name="plus" className="h-3.5 w-3.5 transition-transform duration-300 group-hover:rotate-90" strokeWidth={2.5} />
            Novo Projeto
          </button>
        </div>
      </Reveal>

      {/* STATS BAR */}
      <Reveal delay={80} className="mb-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total", value: stats.total, icon: "layers" },
            { label: "Ativos", value: stats.active, icon: "bolt" },
            { label: "Concluídos", value: stats.completed, icon: "check" },
            { label: "Progresso Médio", value: `${stats.avgProgress}%`, icon: "gauge" },
          ].map((s, i) => (
            <div 
              key={s.label}
              className="flex items-center gap-3.5 rounded-lg border border-ink-800/60 bg-ink-900/30 px-4 py-3.5"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-ink-800/60">
                <Icon name={s.icon} className="h-3.5 w-3.5 text-ink-300" strokeWidth={1.8} />
              </div>
              <div>
                <div className="font-display text-[20px] font-extrabold leading-none tabular-nums text-bone-100">
                  {s.value}
                </div>
                <div className="mt-0.5 font-mono text-[8.5px] tracking-[0.16em] text-bone-300 uppercase">
                  {s.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Reveal>

      {/* TABS & TOGGLE */}
      <Reveal delay={120} className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1 rounded-lg border border-ink-800/50 bg-ink-900/20 p-1">
            {[
              { id: "all", label: "Todos", count: stats.total },
              { id: "active", label: "Em Andamento", count: stats.active },
              { id: "completed", label: "Concluídos", count: stats.completed },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setFilter(t.id as any)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-4 py-2 font-mono text-[10px] tracking-[0.12em] uppercase transition-all duration-200",
                  filter === t.id 
                    ? "bg-ink-800/80 text-bone-50 shadow-sm" 
                    : "text-bone-300 hover:text-ink-300"
                )}
              >
                {t.label}
                <span className={cn(
                  "rounded px-1.5 py-0.5 text-[9px] tabular-nums",
                  filter === t.id ? "bg-signal-400/15 text-signal-400" : "bg-ink-800/50 text-ink-400"
                )}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          <button 
            onClick={() => setShowSharedOnly(!showSharedOnly)}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 transition-all duration-200",
              showSharedOnly 
                ? "border-signal-400/40 bg-signal-400/10 text-signal-400" 
                : "border-ink-800/50 bg-ink-900/20 text-bone-300 hover:border-ink-700 hover:text-bone-200"
            )}
          >
            <div className={cn(
              "flex h-3.5 w-6 shrink-0 items-center rounded-full transition-colors duration-200",
              showSharedOnly ? "bg-signal-400" : "bg-ink-700"
            )}>
              <div className={cn(
                "h-2.5 w-2.5 rounded-full bg-ink-950 transition-transform duration-200",
                showSharedOnly ? "translate-x-3" : "translate-x-0.5"
              )} />
            </div>
            <span className="font-mono text-[10px] tracking-[0.12em] uppercase">
              Projetos Compartilhados
            </span>
          </button>
        </div>
      </Reveal>

      {/* GRID DE PROJETOS */}
      <Reveal delay={200}>
        {filtered.length === 0 && filter !== "all" ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-ink-700/60 bg-ink-900/20 px-8 py-14 text-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-signal-400/8 blur-2xl" />
              <Icon name="layers" className="relative h-10 w-10 text-bone-300" strokeWidth={1.2} />
            </div>
            <p className="font-display text-lg font-bold text-bone-300">Nenhum projeto aqui</p>
            <p className="max-w-xs text-[13px] text-bone-300">
              {filter === "active" ? "Seus projetos ativos aparecerão aqui." : "Projetos concluídos aparecerão aqui."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((proj, i) => {
              const st = STATUS_MAP[proj.status] || STATUS_MAP.planning;
              return (
                <article 
                  key={proj.id} 
                  onClick={() => setSelectedProject(proj)}
                  className="group relative cursor-pointer overflow-hidden rounded-xl border border-ink-800/50 bg-ink-900/30 transition-all duration-400 hover:-translate-y-1 hover:border-ink-700 hover:bg-ink-900/60 hover:shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)]"
                >
                  {/* COLOR ACCENT STRIPE */}
                  <div 
                    className="absolute left-0 top-0 h-full w-[3px] transition-all duration-500 group-hover:w-[4px]"
                    style={{ backgroundColor: proj.color }} 
                  />

                  <div className="p-5 pl-6">
                    {/* TOP: STATUS + ACTIONS */}
                    <div className="mb-5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={cn("h-1.5 w-1.5 rounded-full", st.dot)} />
                        <span className="font-mono text-[9px] tracking-[0.14em] text-bone-300 uppercase">
                          {st.label}
                        </span>
                      </div>

                      {/* TRASH BUTTON */}
                      {user?.id === proj.owner_id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setProjectToDelete(proj);
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-ink-400 opacity-0 transition-all duration-200 hover:bg-red-500/10 hover:text-red-400 group-hover:opacity-100"
                          title="Mover para Lixeira"
                        >
                          <Icon name="trash" className="h-3 w-3" strokeWidth={1.8} />
                        </button>
                      )}
                    </div>

                    {/* PROJECT ICON + NAME */}
                    <div className="mb-5 flex items-start gap-3.5">
                      <div 
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-transform duration-500 group-hover:scale-105"
                        style={{ backgroundColor: `${proj.color}12`, color: proj.color }}
                      >
                        <Icon name={proj.status === 'completed' ? 'check' : 'layers'} className="h-4 w-4" strokeWidth={1.8} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-display text-[16px] font-bold leading-tight text-bone-100 transition-colors group-hover:text-white">
                          {proj.name}
                        </h3>
                        <span className="mt-1 block font-mono text-[9px] text-bone-300">{proj.lastUpdate}</span>
                      </div>
                    </div>

                    {/* TASKS */}
                    <div className="mb-4 flex items-center gap-2 font-mono text-[10px] text-bone-300">
                      <Icon name="check" className="h-3 w-3 text-ink-400" strokeWidth={1.8} />
                      <span>{proj.completedTasks}/{proj.tasksCount} tarefas</span>
                    </div>

                    {/* PROGRESS BAR */}
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="font-mono text-[8px] tracking-[0.16em] text-ink-400 uppercase">Progresso</span>
                        <span className="font-mono text-[10px] font-bold tabular-nums text-bone-300">{proj.progress}%</span>
                      </div>
                      <div className="h-1 w-full overflow-hidden rounded-full bg-ink-800/60">
                        <div 
                          className="h-full rounded-full transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)]"
                          style={{ 
                            width: mounted ? `${proj.progress}%` : '0%', 
                            backgroundColor: proj.color,
                            transitionDelay: `${200 + i * 80}ms`
                          }} 
                        />
                      </div>
                    </div>
                  </div>

                  {/* HOVER GLOW */}
                  <div 
                    className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition-opacity duration-500 group-hover:opacity-[0.07]"
                    style={{ background: `radial-gradient(ellipse at top left, ${proj.color}, transparent 70%)` }}
                  />
                </article>
              );
            })}
            
            {/* CREATE NEW CARD */}
            {filter !== "completed" && (
              <article 
                onClick={() => setShowModal(true)}
                className="group flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-ink-800/50 bg-transparent px-6 py-10 text-center transition-all duration-300 hover:border-signal-400/40 hover:bg-signal-400/[0.03]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-ink-800/40 text-bone-300 transition-all duration-300 group-hover:bg-signal-400/15 group-hover:text-signal-400 group-hover:scale-110">
                  <Icon name="plus" className="h-5 w-5" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="font-display text-[14px] font-bold text-bone-400 transition-colors group-hover:text-signal-400">Novo Projeto</div>
                  <div className="mt-1 font-mono text-[9px] tracking-[0.14em] text-ink-400 uppercase">Comece do zero</div>
                </div>
              </article>
            )}
          </div>
        )}
      </Reveal>

      {/* MODAL NOVO PROJETO */}
      {showModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/85 p-4 backdrop-blur-md"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="relative w-full max-w-[440px] overflow-hidden rounded-2xl border border-ink-700/50 bg-ink-900 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.9)]">
            {/* MODAL HEADER */}
            <div className="border-b border-ink-800/60 bg-ink-900/80 px-6 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal-400/10">
                    <Icon name="plus" className="h-3.5 w-3.5 text-signal-400" strokeWidth={2} />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold text-bone-50">Novo Projeto</h2>
                    <p className="font-mono text-[9px] tracking-[0.14em] text-bone-300 uppercase">Configuração base</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowModal(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-bone-300 transition-colors hover:bg-ink-800 hover:text-bone-200"
                >
                  <Icon name="close" className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            {/* MODAL BODY */}
            <form onSubmit={handleCreate} className="p-6">
              <div className="mb-6">
                <label className="mb-2 block font-mono text-[10px] tracking-[0.14em] text-ink-300 uppercase">
                  Nome do Projeto
                </label>
                <input 
                  type="text" 
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Ex: Série sobre Investimentos"
                  autoFocus
                  className="w-full rounded-lg border border-ink-800/60 bg-ink-950/50 px-4 py-3 text-[14px] text-bone-100 placeholder:text-ink-400 transition-colors focus:border-signal-400/60 focus:outline-none focus:ring-1 focus:ring-signal-400/20"
                  required
                />
              </div>

              <div className="mb-8">
                <label className="mb-3 block font-mono text-[10px] tracking-[0.14em] text-ink-300 uppercase">
                  Cor de Destaque
                </label>
                <div className="flex gap-2.5">
                  {PALETTE.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewProjectColor(c)}
                      className={cn(
                        "relative flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200",
                        newProjectColor === c 
                          ? "scale-110 ring-2 ring-bone-300/60 ring-offset-2 ring-offset-ink-900" 
                          : "hover:scale-110"
                      )}
                      style={{ backgroundColor: c }}
                    >
                      {newProjectColor === c && (
                        <Icon name="check" className="h-3 w-3 text-ink-950" strokeWidth={3} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* MODAL PREVIEW */}
              {newProjectName.trim() && (
                <div className="mb-6 overflow-hidden rounded-lg border border-ink-800/40 bg-ink-950/30">
                  <div className="flex items-center gap-3 p-3">
                    <div 
                      className="h-1.5 w-1.5 rounded-full" 
                      style={{ backgroundColor: newProjectColor }} 
                    />
                    <span className="font-mono text-[9px] tracking-[0.12em] text-bone-300 uppercase">Preview</span>
                  </div>
                  <div className="flex items-center gap-3 border-t border-ink-800/30 px-3 py-3">
                    <div 
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                      style={{ backgroundColor: `${newProjectColor}15`, color: newProjectColor }}
                    >
                      <Icon name="layers" className="h-3.5 w-3.5" />
                    </div>
                    <span className="truncate font-display text-[14px] font-bold text-bone-200">{newProjectName}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg px-4 py-2.5 font-mono text-[10px] font-bold tracking-[0.12em] text-ink-300 uppercase transition-colors hover:text-bone-200"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={!newProjectName.trim()}
                  className="rounded-lg bg-signal-400 px-6 py-2.5 font-mono text-[10px] font-bold tracking-[0.12em] text-ink-950 uppercase shadow-[0_6px_20px_-8px_rgba(242,179,61,0.6)] transition-all duration-200 disabled:opacity-40 disabled:shadow-none hover:bg-signal-300 hover:shadow-[0_8px_25px_-8px_rgba(242,179,61,0.7)]"
                >
                  Criar Projeto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EXCLUIR PROJETO */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div 
            className="w-full max-w-md overflow-hidden rounded-2xl border border-red-500/20 bg-ink-950 shadow-[0_32px_64px_-12px_rgba(239,68,68,0.15)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                <Icon name="trash" className="h-6 w-6" strokeWidth={1.5} />
              </div>
              <h2 className="mb-2 font-display text-2xl font-bold text-bone-50">Excluir Projeto</h2>
              <p className="text-[13px] leading-relaxed text-bone-300">
                Tem certeza que deseja excluir <strong className="text-bone-100">{projectToDelete.name}</strong>? 
                Ele será movido para a <strong className="text-red-400">Lixeira (no menu Sistema)</strong> e você poderá restaurá-lo depois se quiser.
              </p>
            </div>
            
            <div className="flex gap-3 border-t border-ink-800/50 bg-ink-900/30 p-5">
              <button 
                onClick={() => setProjectToDelete(null)}
                className="flex-1 rounded-lg border border-ink-800 bg-transparent px-4 py-3 font-mono text-[10px] font-bold tracking-[0.12em] text-bone-300 uppercase transition-colors hover:bg-ink-800 hover:text-bone-50"
              >
                Cancelar
              </button>
              <button 
                onClick={async () => {
                  if (supabase) {
                    await supabase.from("studioos_projects").update({ status: "trashed" }).eq("id", projectToDelete.id);
                  }
                  setProjectToDelete(null);
                }}
                className="flex-1 rounded-lg bg-red-500/10 px-4 py-3 font-mono text-[10px] font-bold tracking-[0.12em] text-red-500 uppercase transition-colors hover:bg-red-500 hover:text-white"
              >
                Mover p/ Lixeira
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
