import { useState, useEffect } from "react";
import { Icon, Panel, Reveal } from "../components/ui";
import { cn } from "../utils/cn";

import { type Project } from "./ProjetosScreen";

import { useAuth, supabase } from "../auth";

interface Task {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done";
  assignee?: string;
  project_id: string;
}

export function ProjetoDetailScreen({ project, onBack }: { project: Project, onBack: () => void }) {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    setMounted(true);
    if (!user || !project.id) return;

    const fetchTasks = async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("project_id", project.id)
        .order("created_at", { ascending: true });

      if (!error && data) {
        setTasks(data.map(d => ({
          id: d.id,
          title: d.title,
          status: d.status as any,
          project_id: d.project_id
        })));
      }
    };

    fetchTasks();

    const channel = supabase.channel(`tasks_${project.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `project_id=eq.${project.id}` }, fetchTasks)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, project.id]);

  const handleAddTask = async (status: Task["status"]) => {
    if (!user) return;
    const title = window.prompt("Nome da nova tarefa:");
    if (!title) return;

    const newTask = {
      id: `t${Date.now()}`,
      project_id: project.id,
      title,
      status,
      assignee_id: user.id
    };

    setTasks([...tasks, { ...newTask, status: newTask.status as any }]);
    await supabase.from("tasks").insert([newTask]);
  };

  const handleShare = async () => {
    const channel = window.prompt("Digite o @canal do usuário que deseja convidar:");
    if (!channel) return;
    
    const { data, error } = await supabase.rpc("add_member_by_channel", {
      p_project_id: project.id,
      p_channel: channel
    });

    if (error || !data) {
      alert("Não foi possível convidar este canal. Verifique se o arroba está correto e se o usuário já fez login no StudioOS.");
    } else {
      alert("Usuário adicionado com sucesso ao projeto!");
    }
  };

  const columns = [
    { id: "todo", label: "A Fazer" },
    { id: "in_progress", label: "Em Andamento" },
    { id: "done", label: "Concluído" },
  ];

  return (
    <div className="mx-auto w-full pt-4">
      {/* HEADER */}
      <Reveal className="mb-10">
        <button 
          onClick={onBack}
          className="group mb-6 flex items-center gap-2 font-mono text-[10px] tracking-[0.15em] text-ink-500 uppercase transition-colors hover:text-signal-400"
        >
          <Icon name="arrow" className="h-3 w-3 rotate-180 transition-transform group-hover:-translate-x-1" strokeWidth={2} />
          Voltar para Projetos
        </button>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex items-center gap-5">
            <div 
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${project.color}15`, color: project.color }}
            >
              <Icon name={project.status === 'completed' ? 'check' : 'layers'} className="h-6 w-6" strokeWidth={1.5} />
            </div>
            <div>
              <div className="mb-2 flex items-center gap-3">
                <span className={cn(
                  "rounded px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider",
                  project.status === 'active' ? "bg-signal-400/10 text-signal-400" :
                  project.status === 'planning' ? "bg-bone-400/10 text-bone-400" :
                  "bg-ink-800 text-ink-400"
                )}>
                  {project.status === 'active' ? 'Ativo' : project.status === 'planning' ? 'Planejamento' : 'Concluído'}
                </span>
                <span className="font-mono text-[10px] text-ink-500">{project.lastUpdate}</span>
              </div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {project.name}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {user?.id === project.owner_id && (
              <button 
                onClick={handleShare}
                className="flex h-10 items-center justify-center rounded border border-ink-800 bg-ink-900/50 px-4 font-mono text-[11px] font-bold tracking-[0.1em] text-bone-200 uppercase transition-colors hover:border-ink-600 hover:text-white"
              >
                <Icon name="user" className="mr-2 h-3.5 w-3.5 text-ink-400" />
                Compartilhar
              </button>
            )}
            <button className="group flex h-10 items-center justify-center gap-2 rounded bg-signal-400 px-5 font-mono text-[11px] font-bold tracking-[0.1em] text-ink-950 uppercase transition-transform hover:-translate-y-0.5">
              <Icon name="plus" className="h-3.5 w-3.5 transition-transform group-hover:rotate-90" strokeWidth={2.5} />
              Nova Tarefa
            </button>
          </div>
        </div>
      </Reveal>

      {/* PROGRESS BAR */}
      <Reveal delay={100} className="mb-10 rounded-xl border border-ink-800 bg-ink-900/40 p-5">
        <div className="mb-3 flex justify-between font-mono text-[10px] uppercase tracking-wider">
          <span className="text-ink-400">Progresso Geral</span>
          <span className="text-bone-200">{project.progress}% Concluído</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-ink-950">
          <div 
            className="h-full rounded-full transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{ 
              width: mounted ? `${project.progress}%` : '0%', 
              backgroundColor: project.color,
            }} 
          />
        </div>
      </Reveal>

      {/* KANBAN BOARD */}
      <Reveal delay={200} className="grid gap-6 sm:grid-cols-3">
        {columns.map((col) => {
          const colTasks = tasks.filter(t => t.status === col.id);
          return (
            <div key={col.id} className="flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-ink-800 pb-3">
                <h3 className="font-mono text-[11px] font-bold tracking-[0.15em] text-ink-300 uppercase">
                  {col.label}
                </h3>
                <span className="flex h-5 w-5 items-center justify-center rounded bg-ink-900 font-mono text-[10px] text-ink-500">
                  {colTasks.length}
                </span>
              </div>
              
              <div className="flex flex-col gap-3">
                {colTasks.map(task => (
                  <Panel 
                    key={task.id} 
                    className="group cursor-pointer border border-ink-800 bg-ink-900/50 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-ink-600 hover:shadow-lg"
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <p className="font-display text-[14px] font-medium text-bone-100 leading-snug">
                        {task.title}
                      </p>
                      <button className="opacity-0 transition-opacity group-hover:opacity-100 text-ink-500 hover:text-signal-400">
                        <Icon name="dial" className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {task.assignee && (
                      <div className="flex items-center gap-2">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-ink-800 text-[9px] font-bold text-ink-300">
                          {task.assignee.charAt(0)}
                        </div>
                        <span className="font-mono text-[9.5px] text-ink-500">{task.assignee}</span>
                      </div>
                    )}
                  </Panel>
                ))}

                <button 
                  onClick={() => handleAddTask(col.id as any)}
                  className="flex h-[52px] items-center justify-center rounded-lg border border-dashed border-ink-800 text-ink-500 transition-colors hover:border-signal-400/50 hover:bg-signal-400/5 hover:text-signal-400"
                >
                  <Icon name="plus" className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </Reveal>
    </div>
  );
}
