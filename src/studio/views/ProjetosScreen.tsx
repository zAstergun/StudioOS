import { useState, useEffect } from "react";
import { Icon, Panel, Reveal, SectionHead } from "../components/ui";
import { cn } from "../utils/cn";

import { ProjetoDetailScreen } from "./ProjetoDetailScreen";
import { useAuth, supabase } from "../auth";

export interface Project {
  id: string;
  name: string;
  status: "active" | "planning" | "completed" | "archived";
  progress: number;
  lastUpdate: string;
  tasksCount: number;
  completedTasks: number;
  color: string;
  owner_id?: string;
}

export function ProjetosScreen({ onGo }: { onGo: (id: string) => void }) {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectColor, setNewProjectColor] = useState("#F2604C");

  useEffect(() => {
    setMounted(true);
    if (!user) return;

    const fetchProjects = async () => {
      if (!supabase) return;
      const { data, error } = await supabase
        .from("projects")
        .select("*")
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
          owner_id: d.owner_id
        })));
      }
    };

    fetchProjects();

    if (!supabase) return;

    const channel = supabase.channel('projects_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, fetchProjects)
      .subscribe();

    return () => {
      supabase!.removeChannel(channel);
    };
  }, [user]);

  if (selectedProject) {
    return <ProjetoDetailScreen project={selectedProject} onBack={() => setSelectedProject(null)} />;
  }

  const filtered = projects.filter(p => {
    if (filter === "active") return p.status === "active" || p.status === "planning";
    if (filter === "completed") return p.status === "completed";
    return true;
  });

  const activeCount = projects.filter(p => p.status === "active" || p.status === "planning").length;

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
      const { error } = await supabase.from("projects").insert([newProject]);
      if (error) {
        console.error("Erro ao criar projeto:", error);
        alert("Erro ao criar projeto: " + error.message);
      }
    }
  };

  return (
    <div className="mx-auto w-full pt-4">
      {/* HEADER */}
      <Reveal className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded bg-signal-400/10 text-signal-400">
              <Icon name="layers" className="h-4 w-4" strokeWidth={2} />
            </span>
            <span className="font-mono text-[10px] tracking-[0.2em] text-signal-400 uppercase">
              Workspace
            </span>
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Meus Projetos
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-400">
            Gerencie o escopo, roteiros e andamento das suas próximas produções. 
            Você possui <strong className="text-bone-200 font-medium">{activeCount} projetos ativos</strong> no momento.
          </p>
        </div>
        
        <div className="flex gap-2 shrink-0">
          <button 
            onClick={() => setShowModal(true)}
            className="group flex h-10 items-center justify-center gap-2 rounded bg-signal-400 px-5 font-mono text-[11px] font-bold tracking-[0.1em] text-ink-950 uppercase transition-transform hover:-translate-y-0.5"
          >
            <Icon name="plus" className="h-3.5 w-3.5 transition-transform group-hover:rotate-90" strokeWidth={2.5} />
            Novo Projeto
          </button>
        </div>
      </Reveal>

      {/* TABS */}
      <Reveal delay={100} className="mb-6 flex border-b border-ink-800">
        {[
          { id: "all", label: "Todos os Projetos" },
          { id: "active", label: "Em Andamento" },
          { id: "completed", label: "Concluídos" }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id as any)}
            className={cn(
              "relative px-4 pb-3 font-mono text-[10px] tracking-[0.15em] uppercase transition-colors",
              filter === t.id ? "text-bone-50" : "text-ink-500 hover:text-ink-300"
            )}
          >
            {t.label}
            {filter === t.id && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-signal-400" />
            )}
          </button>
        ))}
      </Reveal>

      {/* GRID DE PROJETOS */}
      <Reveal delay={200}>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((proj, i) => (
            <Panel 
              key={proj.id} 
              onClick={() => setSelectedProject(proj)}
              className="group relative cursor-pointer overflow-hidden border border-ink-800 bg-ink-900/40 p-5 transition-all duration-500 hover:-translate-y-1 hover:border-ink-600 hover:bg-ink-900/80 hover:shadow-xl"
            >
              {/* TOP BAR */}
              <div className="mb-6 flex items-start justify-between">
                <div 
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${proj.color}15`, color: proj.color }}
                >
                  <Icon name={proj.status === 'completed' ? 'check' : 'layers'} className="h-4 w-4" />
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className={cn(
                    "rounded px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider",
                    proj.status === 'active' ? "bg-signal-400/10 text-signal-400" :
                    proj.status === 'planning' ? "bg-bone-400/10 text-bone-400" :
                    "bg-ink-800 text-ink-400"
                  )}>
                    {proj.status === 'active' ? 'Ativo' : proj.status === 'planning' ? 'Planejamento' : 'Concluído'}
                  </span>
                  <span className="font-mono text-[9px] text-ink-500">{proj.lastUpdate}</span>
                </div>
              </div>

              {/* INFO */}
              <div>
                <h3 className="font-display text-[17px] font-bold text-bone-100 group-hover:text-white transition-colors">
                  {proj.name}
                </h3>
                <div className="mt-3 flex items-center gap-4">
                  <div className="flex items-center gap-1.5 font-mono text-[10px] text-ink-400">
                    <Icon name="check" className="h-3 w-3" />
                    <span>{proj.completedTasks}/{proj.tasksCount} tarefas</span>
                  </div>
                </div>
              </div>

              {/* PROGRESS BAR */}
              <div className="mt-6">
                <div className="mb-2 flex justify-between font-mono text-[9px] uppercase tracking-wider">
                  <span className="text-ink-500">Progresso</span>
                  <span className="text-bone-300">{proj.progress}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-950">
                  <div 
                    className="h-full rounded-full transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)]"
                    style={{ 
                      width: mounted ? `${proj.progress}%` : '0%', 
                      backgroundColor: proj.color,
                      transitionDelay: `${300 + i * 100}ms`
                    }} 
                  />
                </div>
              </div>

              {/* HOVER GLOW */}
              <div 
                className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition-opacity duration-500 group-hover:opacity-10"
                style={{ background: `radial-gradient(circle at top right, ${proj.color}, transparent 60%)` }}
              />
            </Panel>
          ))}
          
          {/* CARD DE CRIAR NOVO (SE MOSTRAR ATIVOS) */}
          {filter !== "completed" && (
            <Panel 
              onClick={() => setShowModal(true)}
              className="group relative flex cursor-pointer flex-col items-center justify-center gap-4 border border-dashed border-ink-800 bg-transparent p-6 text-center transition-all duration-300 hover:border-signal-400/50 hover:bg-signal-400/5"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink-900 text-ink-500 transition-colors group-hover:bg-signal-400/20 group-hover:text-signal-400">
                <Icon name="plus" className="h-5 w-5" />
              </div>
              <div>
                <div className="font-display text-[15px] font-bold text-bone-300 transition-colors group-hover:text-signal-400">Criar Novo Projeto</div>
                <div className="mt-1 font-mono text-[10px] tracking-[0.1em] text-ink-500 uppercase">Comece do zero</div>
              </div>
            </Panel>
          )}
        </div>
      </Reveal>

      {/* MODAL NOVO PROJETO */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 p-4 backdrop-blur-sm transition-all">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-ink-800 bg-ink-900 p-6 shadow-2xl">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute right-4 top-4 text-ink-500 hover:text-bone-200 transition-colors"
            >
              <Icon name="close" className="h-5 w-5" />
            </button>
            <div className="mb-6">
              <h2 className="font-display text-2xl font-bold text-white">Novo Projeto</h2>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink-400">
                Configure os detalhes base do seu projeto
              </p>
            </div>
            
            <form onSubmit={handleCreate} className="space-y-6">
              <div>
                <label className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-ink-300">
                  Nome do Projeto
                </label>
                <input 
                  type="text" 
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Ex: Série sobre Investimentos"
                  autoFocus
                  className="w-full rounded-lg border border-ink-800 bg-ink-950 px-4 py-3 text-sm text-bone-100 placeholder:text-ink-600 focus:border-signal-400 focus:outline-none focus:ring-1 focus:ring-signal-400/50"
                  required
                />
              </div>

              <div>
                <label className="mb-3 block font-mono text-[10px] uppercase tracking-wider text-ink-300">
                  Cor de Destaque
                </label>
                <div className="flex gap-3">
                  {["#F2604C", "#F2B33D", "#2FD4A0", "#6E93F5", "#D946EF", "#A855F7"].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewProjectColor(c)}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full transition-transform hover:scale-110",
                        newProjectColor === c ? "ring-2 ring-bone-200 ring-offset-2 ring-offset-ink-900" : ""
                      )}
                      style={{ backgroundColor: c }}
                    >
                      {newProjectColor === c && <Icon name="check" className="h-4 w-4 text-ink-950" strokeWidth={3} />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-ink-800">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-ink-400 transition-colors hover:text-bone-200"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={!newProjectName.trim()}
                  className="rounded bg-signal-400 px-5 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-ink-950 transition-colors disabled:opacity-50 hover:bg-signal-300"
                >
                  Criar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
