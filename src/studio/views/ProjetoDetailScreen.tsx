import { useState, useEffect } from "react";
import { Icon, Panel, Reveal } from "../components/ui";
import { cn } from "../utils/cn";

import { type Project } from "./ProjetosScreen";

import { useAuth, supabase } from "../auth";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "done";
  assignee?: string;
  project_id: string;
}

const COL_CONFIG: Record<string, { label: string; icon: string; accent: string; dotColor: string }> = {
  todo:        { label: "A Fazer",       icon: "target",  accent: "text-bone-400",    dotColor: "bg-bone-400"    },
  in_progress: { label: "Em Andamento",  icon: "bolt",    accent: "text-signal-400",  dotColor: "bg-signal-400"  },
  done:        { label: "Concluído",     icon: "check",   accent: "text-emerald-400", dotColor: "bg-emerald-400" },
};

export function ProjetoDetailScreen({ project, onBack }: { project: Project, onBack: () => void }) {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  
  const [showTaskModal, setShowTaskModal] = useState<Task["status"] | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [viewTaskModal, setViewTaskModal] = useState<Task | null>(null);
  const [isEditingTaskDesc, setIsEditingTaskDesc] = useState(false);
  const [editTaskDescContent, setEditTaskDescContent] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteForeverModal, setShowDeleteForeverModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  const [showShareModal, setShowShareModal] = useState(false);
  const [shareChannel, setShareChannel] = useState("");
  const [shareRole, setShareRole] = useState<"editor" | "viewer">("editor");
  const [copied, setCopied] = useState(false);

  const [applications, setApplications] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editNoteContent, setEditNoteContent] = useState("");

  useEffect(() => {
    setMounted(true);
    if (!user || !project.id) return;

    const fetchTasks = async () => {
      if (!supabase) return;
      const { data, error } = await supabase
        .from("studioos_tasks")
        .select("*")
        .eq("project_id", project.id)
        .order("created_at", { ascending: true });

      if (!error && data) {
        setTasks(data.map(d => ({
          id: d.id,
          title: d.title,
          description: d.description,
          status: d.status as any,
          project_id: d.project_id
        })));
      }
    };

    const fetchApps = async () => {
      if (!supabase || project.owner_id !== user.id) return;
      const { data } = await supabase.rpc("get_project_applications", { p_project_id: project.id });
      if (data) setApplications(data);
    };

    const fetchNotes = async () => {
      if (!supabase) return;
      const { data } = await supabase.from('studioos_project_notes').select('*').eq('project_id', project.id).order('created_at', { ascending: false });
      if (data && data.length > 0) {
        const authorIds = Array.from(new Set(data.map(d => d.author_id)));
        const { data: profiles } = await supabase.from('profiles').select('id, full_name, channel, avatar_url').in('id', authorIds);
        
        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        setNotes(data.map(d => ({ ...d, profile: profileMap.get(d.author_id) })));
      } else {
        setNotes([]);
      }
    };

    fetchTasks();
    fetchApps();
    fetchNotes();

    if (!supabase) return;

    const channelTasks = supabase.channel(`tasks_${project.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'studioos_tasks', filter: `project_id=eq.${project.id}` }, fetchTasks)
      .subscribe();

    const channelApps = supabase.channel(`apps_${project.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'studioos_project_applications', filter: `project_id=eq.${project.id}` }, fetchApps)
      .subscribe();

    const channelNotes = supabase.channel(`notes_${project.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'studioos_project_notes', filter: `project_id=eq.${project.id}` }, fetchNotes)
      .subscribe();

    return () => {
      supabase!.removeChannel(channelTasks);
      supabase!.removeChannel(channelApps);
      supabase!.removeChannel(channelNotes);
    };
  }, [user, project.id, project.owner_id]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !showTaskModal || !newTaskTitle.trim()) return;

    const newTask = {
      id: `t${Date.now()}`,
      project_id: project.id,
      title: newTaskTitle.trim(),
      description: newTaskDescription.trim() || undefined,
      status: showTaskModal,
      assignee_id: user.id
    };

    setTasks([...tasks, { ...newTask, status: newTask.status as any }]);
    setShowTaskModal(null);
    setNewTaskTitle("");
    setNewTaskDescription("");
    if (supabase) {
      await supabase.from("studioos_tasks").insert([newTask]);
    }
  };

  const handleDeleteTask = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    setTaskToDelete(task);
  };

  const confirmDeleteTask = async () => {
    if (!supabase || !taskToDelete) return;
    
    const taskId = taskToDelete.id;
    setTaskToDelete(null);
    setTasks(prev => prev.filter(t => t.id !== taskId));
    await supabase.from("studioos_tasks").delete().eq("id", taskId);
  };

  const handleDropTask = async (taskId: string, newStatus: Task["status"]) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === newStatus) return;

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

    if (supabase) {
      await supabase.from("studioos_tasks").update({ status: newStatus }).eq("id", taskId);
    }
  };

  const handleUpdateTaskDesc = async (taskId: string) => {
    if (!supabase) return;
    const desc = editTaskDescContent.trim() || undefined;
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, description: desc } : t));
    setViewTaskModal(prev => prev ? { ...prev, description: desc } : null);
    setIsEditingTaskDesc(false);
    await supabase.from("studioos_tasks").update({ description: desc || null }).eq("id", taskId);
  };

  const handleAcceptApplication = async (appId: string) => {
    if (!supabase) return;
    await supabase.rpc('accept_application', { p_application_id: appId });
  };

  const handleSaveNote = async () => {
    if (!newNoteContent.trim() || !supabase || !user) return;
    const { data, error } = await supabase.from('studioos_project_notes').insert({
      project_id: project.id,
      author_id: user.id,
      content: newNoteContent.trim()
    }).select().single();
    if (error) {
      alert("Erro ao salvar nota: " + error.message);
      return;
    }
    if (data) {
      const { data: profile } = await supabase.from('profiles').select('id, full_name, channel, avatar_url').eq('id', user.id).single();
      setNotes(prev => [{ ...data, profile }, ...prev]);
    }
    setNewNoteContent("");
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!supabase) return;
    setNotes(prev => prev.filter(n => n.id !== noteId));
    await supabase.from('studioos_project_notes').delete().eq('id', noteId);
  };

  const handleUpdateNote = async (noteId: string) => {
    if (!supabase || !editNoteContent.trim()) return;
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, content: editNoteContent.trim() } : n));
    setEditingNote(null);
    await supabase.from('studioos_project_notes').update({ content: editNoteContent.trim() }).eq('id', noteId);
  };

  const handleDeleteProject = async () => {
    if (!supabase || project.owner_id !== user?.id) return;
    if (project.status === "trashed") {
      setShowDeleteForeverModal(true);
    } else {
      setShowDeleteModal(true);
    }
  };

  const handleRestoreProject = async () => {
    if (!supabase || project.owner_id !== user?.id) return;
    await supabase.from("studioos_projects").update({ status: "planning" }).eq("id", project.id);
    onBack();
  };

  const handleSubmitShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareChannel.trim() || !supabase) return;
    
    const { data, error } = await supabase.rpc("add_member_by_channel", {
      p_project_id: project.id,
      p_channel: shareChannel.trim(),
      p_role: shareRole
    });

    if (error || !data) {
      alert("Não foi possível convidar este canal. Verifique se o arroba está correto e se o usuário já fez login no StudioOS.");
    } else {
      alert("Usuário adicionado com sucesso ao projeto!");
      setShowShareModal(false);
      setShareChannel("");
      setShareRole("editor");
    }
  };

  const columns = [
    { id: "todo", label: "A Fazer" },
    { id: "in_progress", label: "Em Andamento" },
    { id: "done", label: "Concluído" },
  ];

  const todoCount = tasks.filter(t => t.status === "todo").length;
  const inProgressCount = tasks.filter(t => t.status === "in_progress").length;
  const doneCount = tasks.filter(t => t.status === "done").length;
  const totalTasks = tasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : project.progress;

  return (
    <div className="mx-auto w-full pt-4">
      {/* HEADER */}
      <Reveal className="mb-8">
        {/* BACK */}
        <button 
          onClick={onBack}
          className="group mb-5 flex items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-bone-300 uppercase transition-colors hover:text-signal-400"
        >
          <Icon name="arrow" className="h-3 w-3 rotate-180 transition-transform group-hover:-translate-x-1" strokeWidth={2} />
          Voltar para Projetos
        </button>

        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          {/* LEFT: Project identity */}
          <div className="flex items-start gap-4">
            <div 
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${project.color}12`, color: project.color }}
            >
              <Icon name={project.status === 'completed' ? 'check' : 'layers'} className="h-5 w-5" strokeWidth={1.6} />
            </div>
            <div>
              <div className="mb-1.5 flex items-center gap-2.5">
                <span className={cn(
                  "flex items-center gap-1.5 rounded px-2 py-0.5 font-mono text-[9px] tracking-[0.12em] uppercase",
                  project.status === 'active' ? "bg-emerald-400/10 text-emerald-400" :
                  project.status === 'planning' ? "bg-signal-400/10 text-signal-400" :
                  project.status === 'trashed' ? "bg-red-400/10 text-red-400" :
                  "bg-ink-800 text-ink-300"
                )}>
                  <span className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    project.status === 'active' ? "bg-emerald-400" :
                    project.status === 'planning' ? "bg-signal-400" :
                    project.status === 'trashed' ? "bg-red-400" :
                    "bg-ink-500"
                  )} />
                  {project.status === 'active' ? 'Ativo' : project.status === 'planning' ? 'Planejamento' : project.status === 'trashed' ? 'Na Lixeira' : 'Concluído'}
                </span>
                <span className="font-mono text-[9px] text-ink-400">·</span>
                <span className="font-mono text-[9px] text-bone-300">{project.lastUpdate}</span>
              </div>
              <h1 className="font-display text-[2rem] leading-[1] font-extrabold tracking-[-0.02em] text-bone-50 sm:text-[2.4rem]">
                {project.name}
              </h1>
            </div>
          </div>

          {/* RIGHT: Actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {user?.id === project.owner_id && project.status === "trashed" && (
              <>
                <button 
                  onClick={handleRestoreProject}
                  className="flex h-9 items-center gap-2 rounded-lg border border-ink-700/50 bg-ink-900/40 px-4 font-mono text-[10px] font-bold tracking-[0.1em] text-bone-300 uppercase transition-all hover:border-ink-600 hover:text-white"
                >
                  <Icon name="restore" className="h-3.5 w-3.5 text-ink-300" />
                  Restaurar
                </button>
                <button 
                  onClick={handleDeleteProject}
                  className="flex h-9 items-center gap-2 rounded-lg border border-red-500/25 bg-red-500/8 px-4 font-mono text-[10px] font-bold tracking-[0.1em] text-red-400 uppercase transition-all hover:bg-red-500/15 hover:text-red-300"
                >
                  <Icon name="trash" className="h-3.5 w-3.5" />
                  Excluir
                </button>
              </>
            )}
            {user?.id === project.owner_id && project.status !== "trashed" && (
              <>
                <button 
                  onClick={handleDeleteProject}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-800/50 text-bone-300 transition-all hover:border-red-500/40 hover:bg-red-500/8 hover:text-red-400"
                  title="Mover para Lixeira"
                >
                  <Icon name="trash" className="h-3.5 w-3.5" />
                </button>
                <button 
                  onClick={() => setShowShareModal(true)}
                  className="relative flex h-9 items-center gap-2 rounded-lg border border-ink-800/50 bg-ink-900/30 px-4 font-mono text-[10px] font-bold tracking-[0.1em] text-bone-300 uppercase transition-all hover:border-ink-600 hover:text-white"
                >
                  {applications.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-signal-400 text-[8px] font-bold text-ink-950 shadow-[0_0_8px_rgba(242,179,61,0.5)]">
                      {applications.length}
                    </span>
                  )}
                  <Icon name="user" className="h-3.5 w-3.5 text-ink-300" />
                  Compartilhar
                </button>
              </>
            )}
            {project.status !== "trashed" && (
              <button 
                onClick={() => setShowTaskModal("todo")}
                className="group flex h-9 items-center gap-2 rounded-lg bg-signal-400 px-5 font-mono text-[10px] font-bold tracking-[0.1em] text-ink-950 uppercase shadow-[0_6px_20px_-8px_rgba(242,179,61,0.5)] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-8px_rgba(242,179,61,0.6)]"
              >
                <Icon name="plus" className="h-3 w-3 transition-transform group-hover:rotate-90" strokeWidth={2.5} />
                Nova Tarefa
              </button>
            )}
          </div>
        </div>
      </Reveal>

      {/* PROGRESS + STATS BAR */}
      <Reveal delay={80} className="mb-8">
        <div className="overflow-hidden rounded-xl border border-ink-800/40 bg-ink-900/25">
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-8">
            {/* Progress bar */}
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-[9px] tracking-[0.16em] text-bone-300 uppercase">Progresso Geral</span>
                <span className="font-display text-[18px] font-extrabold tabular-nums text-bone-100">{progressPercent}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-ink-800/50">
                <div 
                  className="h-full rounded-full transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)]"
                  style={{ 
                    width: mounted ? `${progressPercent}%` : '0%', 
                    backgroundColor: project.color,
                  }} 
                />
              </div>
            </div>

            {/* Mini stats */}
            <div className="flex gap-6 shrink-0">
              {[
                { label: "A Fazer", value: todoCount, color: "text-bone-400" },
                { label: "Andamento", value: inProgressCount, color: "text-signal-400" },
                { label: "Concluídas", value: doneCount, color: "text-emerald-400" },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <div className={cn("font-display text-[22px] font-extrabold leading-none tabular-nums", s.color)}>
                    {s.value}
                  </div>
                  <div className="mt-1 font-mono text-[8px] tracking-[0.14em] text-ink-400 uppercase">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Reveal>

      {/* KANBAN BOARD */}
      <Reveal delay={160} className="mb-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {columns.map((col) => {
            const colTasks = tasks.filter(t => t.status === col.id);
            const cfg = COL_CONFIG[col.id];
            return (
              <div key={col.id} className="flex flex-col overflow-hidden rounded-xl border border-ink-800/40 bg-ink-900/20">
                {/* COLUMN HEADER */}
                <div className="flex items-center justify-between border-b border-ink-800/30 px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dotColor)} />
                    <h3 className="font-mono text-[10px] font-bold tracking-[0.14em] text-bone-300 uppercase">
                      {col.label}
                    </h3>
                  </div>
                  <span className={cn(
                    "flex h-5 min-w-[20px] items-center justify-center rounded px-1.5 font-mono text-[10px] font-bold tabular-nums",
                    colTasks.length > 0 ? "bg-ink-800/60 text-bone-400" : "text-ink-400"
                  )}>
                    {colTasks.length}
                  </span>
                </div>
                
                {/* TASKS */}
                <div 
                  className="flex flex-1 flex-col gap-2 p-3 min-h-[150px]"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const taskId = e.dataTransfer.getData("text/plain");
                    if (taskId) handleDropTask(taskId, col.id as any);
                  }}
                >
                  {colTasks.map(task => (
                    <article 
                      key={task.id} 
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", task.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onClick={() => setViewTaskModal(task)}
                      className="group relative cursor-pointer overflow-hidden rounded-lg border border-ink-800/30 bg-ink-950/40 p-3.5 transition-all duration-200 hover:border-signal-400/50 hover:bg-signal-400/[0.02] hover:shadow-[0_0_20px_-5px_rgba(242,179,61,0.15)]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 flex-1 text-[13px] font-medium leading-snug text-bone-200">
                          {task.title}
                        </p>
                        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button 
                            onClick={(e) => handleDeleteTask(task, e)}
                            className="shrink-0 rounded p-1 text-ink-400 transition-colors hover:bg-red-500/20 hover:text-red-400"
                            title="Excluir tarefa"
                          >
                            <Icon name="trash" className="h-3 w-3" strokeWidth={1.8} />
                          </button>
                        </div>
                      </div>
                      {task.assignee && (
                        <div className="mt-2.5 flex items-center gap-2">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-ink-800/60 text-[9px] font-bold text-ink-300">
                            {task.assignee.charAt(0)}
                          </div>
                          <span className="font-mono text-[9px] text-bone-300">{task.assignee}</span>
                        </div>
                      )}
                    </article>
                  ))}

                  {/* ADD TASK BUTTON */}
                  <button 
                    onClick={() => setShowTaskModal(col.id as any)}
                    className="group flex h-10 items-center justify-center gap-2 rounded-lg border border-dashed border-ink-800/40 text-ink-400 transition-all duration-200 hover:border-signal-400/30 hover:bg-signal-400/[0.03] hover:text-signal-400 mt-1"
                  >
                    <Icon name="plus" className="h-3.5 w-3.5" strokeWidth={1.5} />
                    <span className="font-mono text-[9px] tracking-[0.1em] uppercase opacity-70 group-hover:opacity-100 transition-opacity">Adicionar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Reveal>

      {/* NOTES & EXTRAS */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* SAVED ITEMS */}
        <Reveal delay={240}>
          <div className="overflow-hidden rounded-xl border border-ink-800/40 bg-ink-900/20">
            <div className="flex items-center justify-between border-b border-ink-800/30 px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <Icon name="bookmark" className="h-3.5 w-3.5 text-bone-300" strokeWidth={1.8} />
                <h3 className="font-mono text-[10px] font-bold tracking-[0.14em] text-bone-300 uppercase">
                  Itens Salvos
                </h3>
              </div>
              <span className="rounded bg-signal-400/10 px-2 py-0.5 font-mono text-[8px] font-bold tracking-[0.1em] text-signal-400 uppercase">Em breve</span>
            </div>
            <div className="flex min-h-[140px] flex-col items-center justify-center gap-2 px-6 py-10">
              <Icon name="bookmark" className="h-5 w-5 text-ink-700" strokeWidth={1.2} />
              <p className="font-mono text-[9px] tracking-[0.1em] text-ink-400 uppercase">Nenhum item salvo</p>
            </div>
          </div>
        </Reveal>

        {/* NOTES */}
        <Reveal delay={300}>
          <div className="overflow-hidden rounded-xl border border-ink-800/40 bg-ink-900/20">
            <div className="flex items-center gap-2.5 border-b border-ink-800/30 px-5 py-3.5">
              <Icon name="edit" className="h-3.5 w-3.5 text-bone-300" strokeWidth={1.8} />
              <h3 className="font-mono text-[10px] font-bold tracking-[0.14em] text-bone-300 uppercase">
                Bloco de Notas
              </h3>
            </div>
            <div className="p-5">
              <textarea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Escreva algo importante sobre este projeto..."
                className="min-h-[80px] w-full resize-none rounded-lg border border-ink-800/40 bg-ink-950/30 p-3 text-[13px] leading-relaxed text-bone-200 placeholder:text-ink-400 transition-colors focus:border-signal-400/40 focus:outline-none"
              />
              <div className="mt-3 flex justify-end">
                <button
                  onClick={handleSaveNote}
                  disabled={!newNoteContent.trim()}
                  className="rounded-lg bg-signal-400 px-4 py-2 font-mono text-[9px] font-bold tracking-[0.12em] text-ink-950 uppercase shadow-[0_4px_14px_-6px_rgba(242,179,61,0.5)] transition-all hover:bg-signal-300 disabled:opacity-40 disabled:shadow-none"
                >
                  Salvar Nota
                </button>
              </div>
              
              {notes.length > 0 && (
                <div className="mt-4 max-h-[260px] space-y-2 overflow-y-auto pr-1">
                  {notes.map(note => (
                    <div key={note.id} className="group relative rounded-lg border border-ink-800/30 bg-ink-950/20 p-3.5 transition-colors hover:border-ink-700/50">
                      {editingNote === note.id ? (
                        <div className="flex flex-col gap-2">
                          <textarea
                            value={editNoteContent}
                            onChange={(e) => setEditNoteContent(e.target.value)}
                            className="w-full resize-none rounded bg-ink-900/50 p-2 text-[12.5px] leading-relaxed text-bone-300 focus:outline-none"
                            rows={3}
                          />
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => setEditingNote(null)}
                              className="rounded px-2 py-1 font-mono text-[9px] uppercase text-ink-400 hover:text-bone-300"
                            >
                              Cancelar
                            </button>
                            <button 
                              onClick={() => handleUpdateNote(note.id)}
                              className="rounded bg-signal-400/10 px-2 py-1 font-mono text-[9px] font-bold uppercase text-signal-400 hover:bg-signal-400/20"
                            >
                              Salvar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="absolute right-2 top-2 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100 z-10">
                            {user?.id === note.author_id && (
                              <button 
                                onClick={() => { setEditingNote(note.id); setEditNoteContent(note.content); }}
                                className="flex h-6 w-6 items-center justify-center rounded-md bg-signal-400/20 text-signal-400 shadow-[0_2px_8px_-2px_rgba(242,179,61,0.3)] backdrop-blur-md transition-all hover:bg-signal-400 hover:text-ink-950"
                                title="Editar"
                              >
                                <Icon name="edit" className="h-3 w-3" />
                              </button>
                            )}
                            {(user?.id === note.author_id || user?.id === project.owner_id) && (
                              <button 
                                onClick={() => handleDeleteNote(note.id)}
                                className="flex h-6 w-6 items-center justify-center rounded-md bg-red-500/20 text-red-400 shadow-[0_2px_8px_-2px_rgba(239,68,68,0.3)] backdrop-blur-md transition-all hover:bg-red-500 hover:text-white"
                                title="Excluir"
                              >
                                <Icon name="trash" className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                          
                          <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-bone-300 relative z-0">{note.content}</p>
                          <div className="mt-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {(note.profile?.avatar_url || (note.author_id === user?.id ? user?.avatarUrl : null)) ? (
                                <img src={note.profile?.avatar_url || user?.avatarUrl} alt={note.profile?.full_name || 'Usuário'} className="h-5 w-5 rounded-full object-cover" />
                              ) : (
                                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-signal-400 text-[9px] font-bold text-ink-950 uppercase">
                                  {note.profile?.full_name?.charAt(0) || note.profile?.channel?.charAt(0) || user?.name?.charAt(0) || '?'}
                                </div>
                              )}
                              <span className="font-mono text-[9px] text-bone-400">
                                {note.profile?.channel?.startsWith('@') ? note.profile.channel : `@${note.profile?.channel || 'usuario'}`}
                              </span>
                            </div>
                            <p className="font-mono text-[8.5px] text-ink-500">
                              {new Date(note.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Reveal>
      </div>

      {/* MODAL NOVA TAREFA */}
      {showTaskModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/85 p-4 backdrop-blur-md"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowTaskModal(null); setNewTaskTitle(""); } }}
        >
          <div className="relative w-full max-w-[420px] overflow-hidden rounded-2xl border border-ink-700/50 bg-ink-900 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.9)]">
            <div className="border-b border-ink-800/60 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-lg font-bold text-bone-50">Nova Tarefa</h2>
                  <p className="mt-0.5 font-mono text-[9px] tracking-[0.12em] text-bone-300 uppercase">
                    Em: <span className="text-signal-400">
                      {COL_CONFIG[showTaskModal].label}
                    </span>
                  </p>
                </div>
                <button 
                  onClick={() => { setShowTaskModal(null); setNewTaskTitle(""); setNewTaskDescription(""); }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-bone-300 transition-colors hover:bg-ink-800 hover:text-bone-200"
                >
                  <Icon name="close" className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleCreateTask} className="p-6">
              <div className="mb-6">
                <label className="mb-2 block font-mono text-[10px] tracking-[0.14em] text-ink-300 uppercase">
                  Título da Tarefa
                </label>
                <input 
                  type="text" 
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Ex: Roteirizar o vídeo"
                  autoFocus
                  className="w-full rounded-lg border border-ink-800/60 bg-ink-950/50 px-4 py-3 text-[14px] text-bone-100 placeholder:text-ink-400 transition-colors focus:border-signal-400/60 focus:outline-none focus:ring-1 focus:ring-signal-400/20"
                  required
                />
              </div>

              <div className="mb-6">
                <label className="mb-2 block font-mono text-[10px] tracking-[0.14em] text-ink-300 uppercase">
                  Descrição (Opcional)
                </label>
                <textarea 
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  placeholder="Detalhes adicionais..."
                  rows={3}
                  className="w-full resize-none rounded-lg border border-ink-800/60 bg-ink-950/50 px-4 py-3 text-[13px] text-bone-100 placeholder:text-ink-400 transition-colors focus:border-signal-400/60 focus:outline-none focus:ring-1 focus:ring-signal-400/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => { setShowTaskModal(null); setNewTaskTitle(""); setNewTaskDescription(""); }}
                  className="rounded-lg px-4 py-2.5 font-mono text-[10px] font-bold tracking-[0.12em] text-ink-300 uppercase transition-colors hover:text-bone-200"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={!newTaskTitle.trim()}
                  className="rounded-lg bg-signal-400 px-6 py-2.5 font-mono text-[10px] font-bold tracking-[0.12em] text-ink-950 uppercase shadow-[0_6px_20px_-8px_rgba(242,179,61,0.6)] transition-all disabled:opacity-40 disabled:shadow-none hover:bg-signal-300"
                >
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DETALHES DA TAREFA */}
      {viewTaskModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/85 p-4 backdrop-blur-md"
          onClick={(e) => { 
            if (e.target === e.currentTarget) {
              setViewTaskModal(null);
              setIsEditingTaskDesc(false);
            }
          }}
        >
          <div className="relative w-full max-w-[420px] overflow-hidden rounded-xl border border-ink-800/40 bg-ink-900 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.9)]">
            <div className="flex items-center justify-between border-b border-ink-800/30 px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <Icon name={COL_CONFIG[viewTaskModal.status].icon as any} className="h-3.5 w-3.5 text-bone-300" strokeWidth={1.8} />
                <h3 className="font-mono text-[10px] font-bold tracking-[0.14em] text-bone-300 uppercase">
                  Detalhes da Tarefa
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn(
                  "rounded bg-ink-800/40 px-2 py-0.5 font-mono text-[8px] font-bold tracking-[0.1em] uppercase",
                  COL_CONFIG[viewTaskModal.status].accent
                )}>
                  {COL_CONFIG[viewTaskModal.status].label}
                </span>
                <button 
                  onClick={() => {
                    setViewTaskModal(null);
                    setIsEditingTaskDesc(false);
                  }}
                  className="text-ink-400 transition-colors hover:text-bone-200"
                >
                  <Icon name="close" className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="mb-5">
                <h3 className="mb-2 font-mono text-[10px] tracking-[0.14em] text-ink-300 uppercase">
                  Título
                </h3>
                <p className="text-[15px] font-medium leading-snug text-bone-50">
                  {viewTaskModal.title}
                </p>
              </div>
              <div>
                <h3 className="mb-2 font-mono text-[10px] tracking-[0.14em] text-ink-300 uppercase">
                  Descrição
                </h3>
                {isEditingTaskDesc ? (
                  <div className="animate-in fade-in zoom-in-95 duration-200">
                    <textarea
                      value={editTaskDescContent}
                      onChange={(e) => setEditTaskDescContent(e.target.value)}
                      className="w-full min-h-[100px] resize-none rounded-lg border border-signal-400/50 bg-ink-950/50 p-4 text-[13px] leading-relaxed text-bone-100 placeholder:text-ink-500 focus:outline-none"
                      placeholder="Adicione uma descrição para a tarefa..."
                      autoFocus
                    />
                    <div className="mt-2 flex items-center justify-end gap-2">
                      <button
                        onClick={() => setIsEditingTaskDesc(false)}
                        className="rounded px-3 py-1.5 font-mono text-[9px] font-bold uppercase text-ink-400 transition-colors hover:text-bone-200"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleUpdateTaskDesc(viewTaskModal.id)}
                        className="rounded bg-signal-400/10 px-3 py-1.5 font-mono text-[9px] font-bold uppercase text-signal-400 transition-colors hover:bg-signal-400/20"
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={() => {
                      setEditTaskDescContent(viewTaskModal.description || "");
                      setIsEditingTaskDesc(true);
                    }}
                    className="group relative cursor-pointer rounded-lg border border-ink-800/60 bg-ink-950/50 p-4 min-h-[80px] transition-colors hover:border-signal-400/30 hover:bg-signal-400/[0.02]"
                  >
                    <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-bone-200">
                      {viewTaskModal.description || <span className="italic text-ink-500">Adicionar descrição...</span>}
                    </p>
                    <div className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100">
                      <Icon name="pencil" className="h-3.5 w-3.5 text-signal-400/70" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL COMPARTILHAR */}
      {showShareModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/85 p-4 backdrop-blur-md"
          onClick={(e) => { if (e.target === e.currentTarget) { setShowShareModal(false); setShareChannel(""); } }}
        >
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-ink-700/50 bg-ink-900 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.9)]">
            <div className="border-b border-ink-800/60 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-lg font-bold text-bone-50">Compartilhar Projeto</h2>
                  <p className="mt-0.5 font-mono text-[9px] tracking-[0.12em] text-bone-300 uppercase">Convide alguém para colaborar</p>
                </div>
                <button 
                  onClick={() => { setShowShareModal(false); setShareChannel(""); }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-bone-300 transition-colors hover:bg-ink-800 hover:text-bone-200"
                >
                  <Icon name="close" className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {!user?.channel ? (
                <div className="rounded-xl border border-signal-400/20 bg-signal-400/[0.04] p-5 text-center">
                  <Icon name="target" className="mx-auto mb-3 h-6 w-6 text-signal-400/70" strokeWidth={1.5} />
                  <h3 className="mb-1.5 font-mono text-[10px] font-bold tracking-[0.14em] text-signal-400 uppercase">
                    Nome de usuário ausente
                  </h3>
                  <p className="text-[12px] leading-relaxed text-ink-300">
                    Configure um <strong className="text-bone-300">@usuario</strong> no seu perfil para compartilhar projetos.
                  </p>
                </div>
              ) : (
                <>
                  <form onSubmit={handleSubmitShare} className="space-y-5">
                    <div>
                      <label className="mb-2 block font-mono text-[10px] tracking-[0.14em] text-ink-300 uppercase">
                        @canal do usuário
                      </label>
                      <input 
                        type="text" 
                        value={shareChannel}
                        onChange={(e) => setShareChannel(e.target.value)}
                        placeholder="@usuarioteste"
                        autoFocus
                        className="w-full rounded-lg border border-ink-800/60 bg-ink-950/50 px-4 py-3 text-[14px] text-bone-100 placeholder:text-ink-400 transition-colors focus:border-signal-400/60 focus:outline-none focus:ring-1 focus:ring-signal-400/20"
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-3 block font-mono text-[10px] tracking-[0.14em] text-ink-300 uppercase">
                        Nível de Permissão
                      </label>
                      <div className="grid grid-cols-2 gap-2.5">
                        {[
                          { id: "editor" as const, icon: "edit", label: "Editor", desc: "Criar, alterar e deletar" },
                          { id: "viewer" as const, icon: "eye", label: "Visualizador", desc: "Somente leitura" },
                        ].map(r => (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => setShareRole(r.id)}
                            className={cn(
                              "group relative flex flex-col items-center gap-2.5 overflow-hidden rounded-xl border p-4 transition-all duration-300",
                              shareRole === r.id 
                                ? "border-signal-400/50 bg-signal-400/8 text-signal-400" 
                                : "border-ink-800/50 bg-ink-900/20 text-bone-300 hover:border-ink-700 hover:text-ink-300"
                            )}
                          >
                            <Icon 
                              name={r.icon} 
                              className={cn("h-5 w-5 transition-transform", shareRole === r.id && "scale-110")} 
                              strokeWidth={shareRole === r.id ? 2 : 1.5} 
                            />
                            <div className="text-center">
                              <div className="font-mono text-[10px] font-bold tracking-[0.12em] uppercase">{r.label}</div>
                              <div className="mt-1 text-[10px] text-bone-300 leading-snug">{r.desc}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-1">
                      <button 
                        type="button"
                        onClick={() => { setShowShareModal(false); setShareChannel(""); }}
                        className="rounded-lg px-4 py-2.5 font-mono text-[10px] font-bold tracking-[0.12em] text-ink-300 uppercase transition-colors hover:text-bone-200"
                      >
                        Cancelar
                      </button>
                      <button 
                        type="submit"
                        disabled={!shareChannel.trim()}
                        className="rounded-lg bg-signal-400 px-6 py-2.5 font-mono text-[10px] font-bold tracking-[0.12em] text-ink-950 uppercase shadow-[0_6px_20px_-8px_rgba(242,179,61,0.6)] transition-all disabled:opacity-40 disabled:shadow-none hover:bg-signal-300"
                      >
                        Convidar
                      </button>
                    </div>
                  </form>

                  {/* SHARE LINK */}
                  <div className="mt-5 border-t border-ink-800/40 pt-5">
                    <label className="mb-2.5 flex items-center justify-between font-mono text-[9px] tracking-[0.14em] text-bone-300 uppercase">
                      <span>Ou compartilhe via link</span>
                      <span className={cn("transition-all duration-300", copied ? "text-signal-400 opacity-100" : "opacity-0")}>Copiado!</span>
                    </label>
                    <div className="relative">
                      <input 
                        readOnly
                        value={`${window.location.origin}/?invite=${project.id}&role=${shareRole}`}
                        className={cn(
                          "w-full rounded-lg bg-ink-950/30 px-4 py-2.5 pr-11 font-mono text-[11px] border transition-colors outline-none",
                          copied ? "border-signal-400/40 text-signal-400" : "border-ink-800/40 text-bone-300"
                        )}
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/?invite=${project.id}&role=${shareRole}`);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                        className={cn(
                          "absolute right-1.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-md transition-all",
                          copied 
                            ? "bg-signal-400 text-ink-950 scale-105" 
                            : "bg-ink-800/50 text-bone-300 hover:text-bone-200"
                        )}
                        title="Copiar link"
                      >
                        <Icon name={copied ? "check" : "copy"} className="h-3 w-3" strokeWidth={copied ? 2.5 : 1.5} />
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* PENDING APPLICATIONS */}
              {applications.length > 0 && user?.channel && (
                <div className="mt-5 border-t border-ink-800/40 pt-5">
                  <h3 className="mb-3 font-mono text-[9px] tracking-[0.14em] text-signal-400 uppercase">
                    Aplicações Pendentes ({applications.length})
                  </h3>
                  <div className="space-y-2">
                    {applications.map(app => (
                      <div key={app.id} className="flex items-center justify-between rounded-lg border border-ink-800/40 bg-ink-950/20 p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-800/60 text-[10px] font-bold text-ink-300 overflow-hidden">
                            {app.avatar_url ? <img src={app.avatar_url} className="h-full w-full object-cover" /> : app.name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <div className="text-[12px] font-medium text-bone-200">{app.name}</div>
                            <div className="font-mono text-[9px] text-bone-300">
                              quer acesso de <span className="text-signal-400">{app.role}</span>
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleAcceptApplication(app.id)}
                          className="rounded-md bg-signal-400 px-3 py-1.5 font-mono text-[9px] font-bold tracking-[0.1em] text-ink-950 uppercase hover:bg-signal-300"
                        >
                          Aceitar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL EXCLUIR PROJETO (IR PARA LIXEIRA) */}
      {showDeleteModal && (
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
                Tem certeza que deseja excluir <strong className="text-bone-100">{project.name}</strong>? 
                Ele será movido para a <strong className="text-red-400">Lixeira (no menu Histórico)</strong> e você poderá restaurá-lo depois se quiser.
              </p>
            </div>
            
            <div className="flex gap-3 border-t border-ink-800/50 bg-ink-900/30 p-5">
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 rounded-lg border border-ink-800 bg-transparent px-4 py-3 font-mono text-[10px] font-bold tracking-[0.12em] text-bone-300 uppercase transition-colors hover:bg-ink-800 hover:text-bone-50"
              >
                Cancelar
              </button>
              <button 
                onClick={async () => {
                  if (supabase) {
                    await supabase.from("studioos_projects").update({ status: "trashed" }).eq("id", project.id);
                  }
                  setShowDeleteModal(false);
                  onBack();
                }}
                className="flex-1 rounded-lg bg-red-500/10 px-4 py-3 font-mono text-[10px] font-bold tracking-[0.12em] text-red-500 uppercase transition-colors hover:bg-red-500 hover:text-white"
              >
                Mover p/ Lixeira
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EXCLUIR TAREFA */}
      {taskToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div 
            className="w-full max-w-md overflow-hidden rounded-2xl border border-red-500/20 bg-ink-950 shadow-[0_32px_64px_-12px_rgba(239,68,68,0.15)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-500">
                <Icon name="trash" className="h-6 w-6" strokeWidth={1.5} />
              </div>
              <h2 className="mb-2 font-display text-2xl font-bold text-bone-50">Excluir Tarefa</h2>
              <p className="text-[13px] leading-relaxed text-bone-300">
                Tem certeza que deseja excluir a tarefa <strong className="text-bone-100">{taskToDelete.title}</strong>? 
                Isso não pode ser desfeito.
              </p>
            </div>
            
            <div className="flex gap-3 border-t border-ink-800/50 bg-ink-900/30 p-5">
              <button 
                onClick={() => setTaskToDelete(null)}
                className="flex-1 rounded-lg border border-ink-800 bg-transparent px-4 py-3 font-mono text-[10px] font-bold tracking-[0.12em] text-bone-300 uppercase transition-colors hover:bg-ink-800 hover:text-bone-50"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDeleteTask}
                className="flex-1 rounded-lg bg-red-500/10 px-4 py-3 font-mono text-[10px] font-bold tracking-[0.12em] text-red-500 uppercase transition-colors hover:bg-red-500 hover:text-white"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EXCLUIR PERMANENTE */}
      {showDeleteForeverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div 
            className="w-full max-w-md overflow-hidden rounded-2xl border border-red-500/40 bg-ink-950 shadow-[0_32px_64px_-12px_rgba(239,68,68,0.25)]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20 text-red-500">
                <Icon name="close" className="h-6 w-6" strokeWidth={2} />
              </div>
              <h2 className="mb-2 font-display text-2xl font-bold text-red-400">Excluir Permanentemente</h2>
              <p className="text-[13px] leading-relaxed text-bone-300">
                Tem certeza que deseja excluir <strong className="text-bone-100">{project.name}</strong> em definitivo? 
                Isso apagará todas as tarefas, notas e arquivos. <strong className="text-red-400">Isso não pode ser desfeito.</strong>
              </p>
            </div>
            
            <div className="flex gap-3 border-t border-ink-800/50 bg-ink-900/30 p-5">
              <button 
                onClick={() => setShowDeleteForeverModal(false)}
                className="flex-1 rounded-lg border border-ink-800 bg-transparent px-4 py-3 font-mono text-[10px] font-bold tracking-[0.12em] text-bone-300 uppercase transition-colors hover:bg-ink-800 hover:text-bone-50"
              >
                Cancelar
              </button>
              <button 
                onClick={async () => {
                  if (supabase) {
                    await supabase.from("studioos_projects").delete().eq("id", project.id);
                  }
                  setShowDeleteForeverModal(false);
                  onBack();
                }}
                className="flex-1 rounded-lg bg-red-600 px-4 py-3 font-mono text-[10px] font-bold tracking-[0.12em] text-white uppercase transition-colors hover:bg-red-700"
              >
                Excluir de vez
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
