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
  
  const [showTaskModal, setShowTaskModal] = useState<Task["status"] | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const [showShareModal, setShowShareModal] = useState(false);
  const [shareChannel, setShareChannel] = useState("");
  const [shareRole, setShareRole] = useState<"editor" | "viewer">("editor");
  const [copied, setCopied] = useState(false);

  const [applications, setApplications] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [newNoteContent, setNewNoteContent] = useState("");

  useEffect(() => {
    setMounted(true);
    if (!user || !project.id) return;

    const fetchTasks = async () => {
      if (!supabase) return;
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

    const fetchApps = async () => {
      if (!supabase || project.owner_id !== user.id) return;
      const { data } = await supabase.rpc("get_project_applications", { p_project_id: project.id });
      if (data) setApplications(data);
    };

    const fetchNotes = async () => {
      if (!supabase) return;
      const { data } = await supabase.from('project_notes').select('*').eq('project_id', project.id).order('created_at', { ascending: false });
      if (data) setNotes(data);
    };

    fetchTasks();
    fetchApps();
    fetchNotes();

    if (!supabase) return;

    const channelTasks = supabase.channel(`tasks_${project.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `project_id=eq.${project.id}` }, fetchTasks)
      .subscribe();

    const channelApps = supabase.channel(`apps_${project.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_applications', filter: `project_id=eq.${project.id}` }, fetchApps)
      .subscribe();

    const channelNotes = supabase.channel(`notes_${project.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_notes', filter: `project_id=eq.${project.id}` }, fetchNotes)
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
      status: showTaskModal,
      assignee_id: user.id
    };

    setTasks([...tasks, { ...newTask, status: newTask.status as any }]);
    setShowTaskModal(null);
    setNewTaskTitle("");
    if (supabase) {
      await supabase.from("tasks").insert([newTask]);
    }
  };

  const handleAcceptApplication = async (appId: string) => {
    if (!supabase) return;
    await supabase.rpc('accept_application', { p_application_id: appId });
  };

  const handleSaveNote = async () => {
    if (!newNoteContent.trim() || !supabase || !user) return;
    const { error } = await supabase.from('project_notes').insert({
      project_id: project.id,
      author_id: user.id,
      content: newNoteContent.trim()
    });
    if (error) {
      alert("Erro ao salvar nota: " + error.message);
      return;
    }
    setNewNoteContent("");
  };

  const handleDeleteProject = async () => {
    if (!supabase || project.owner_id !== user?.id) return;
    if (project.status === "trashed") {
      const confirm = window.confirm("Tem certeza que deseja excluir este projeto PERMANENTEMENTE? Isso não pode ser desfeito.");
      if (!confirm) return;
      await supabase.from("projects").delete().eq("id", project.id);
      onBack();
    } else {
      await supabase.from("projects").update({ status: "trashed" }).eq("id", project.id);
      onBack();
    }
  };

  const handleRestoreProject = async () => {
    if (!supabase || project.owner_id !== user?.id) return;
    await supabase.from("projects").update({ status: "planning" }).eq("id", project.id);
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
            {user?.id === project.owner_id && project.status === "trashed" && (
              <>
                <button 
                  onClick={handleRestoreProject}
                  className="relative flex h-10 items-center justify-center rounded border border-ink-800 bg-ink-900/50 px-4 font-mono text-[11px] font-bold tracking-[0.1em] text-bone-200 uppercase transition-colors hover:border-ink-600 hover:text-white"
                >
                  <Icon name="arrow" className="mr-2 h-3.5 w-3.5 text-ink-400 rotate-180" />
                  Restaurar
                </button>
                <button 
                  onClick={handleDeleteProject}
                  className="relative flex h-10 items-center justify-center rounded border border-red-500/30 bg-red-500/10 px-4 font-mono text-[11px] font-bold tracking-[0.1em] text-red-400 uppercase transition-colors hover:bg-red-500/20 hover:text-red-300"
                >
                  <Icon name="trash" className="mr-2 h-3.5 w-3.5" />
                  Excluir Definitivamente
                </button>
              </>
            )}
            {user?.id === project.owner_id && project.status !== "trashed" && (
              <>
                <button 
                  onClick={handleDeleteProject}
                  className="relative flex h-10 w-10 items-center justify-center rounded border border-ink-800 bg-ink-900/50 text-ink-400 transition-colors hover:border-red-500/50 hover:text-red-400"
                  title="Mover para Lixeira"
                >
                  <Icon name="trash" className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => setShowShareModal(true)}
                  className="relative flex h-10 items-center justify-center rounded border border-ink-800 bg-ink-900/50 px-4 font-mono text-[11px] font-bold tracking-[0.1em] text-bone-200 uppercase transition-colors hover:border-ink-600 hover:text-white"
                >
                  {applications.length > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-signal-400 text-[8px] font-bold text-ink-950">
                      {applications.length}
                    </span>
                  )}
                  <Icon name="user" className="mr-2 h-3.5 w-3.5 text-ink-400" />
                  Compartilhar
                </button>
              </>
            )}
            {project.status !== "trashed" && (
              <button 
                onClick={() => setShowTaskModal("todo")}
                className="group flex h-10 items-center justify-center gap-2 rounded bg-signal-400 px-5 font-mono text-[11px] font-bold tracking-[0.1em] text-ink-950 uppercase transition-transform hover:-translate-y-0.5"
              >
                <Icon name="plus" className="h-3.5 w-3.5 transition-transform group-hover:rotate-90" strokeWidth={2.5} />
                Nova Tarefa
              </button>
            )}
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
                  onClick={() => setShowTaskModal(col.id as any)}
                  className="flex h-[52px] items-center justify-center rounded-lg border border-dashed border-ink-800 text-ink-500 transition-colors hover:border-signal-400/50 hover:bg-signal-400/5 hover:text-signal-400"
                >
                  <Icon name="plus" className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </Reveal>

      {/* EXTRAS: SALVOS & NOTAS */}
      <div className="grid gap-6 mt-10 md:grid-cols-2">
        {/* SAVED ITEMS PLACEHOLDER */}
        <Reveal delay={300} className="rounded-xl border border-ink-800 bg-ink-900/40 p-6 flex flex-col">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-bone-200">
              Itens Salvos
            </h3>
            <span className="rounded bg-signal-400/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase text-signal-400">Em breve</span>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-ink-800 bg-ink-950/50 min-h-[160px]">
            <Icon name="bookmark" className="mb-2 h-6 w-6 text-ink-600" />
            <p className="font-mono text-[10px] uppercase text-ink-500">Nenhum item salvo ainda</p>
          </div>
        </Reveal>

        {/* PROJECT NOTES */}
        <Reveal delay={400} className="rounded-xl border border-ink-800 bg-ink-900/40 p-6">
          <h3 className="mb-4 font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-bone-200">
            Bloco de Notas
          </h3>
          <div className="flex flex-col gap-4">
            <textarea
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="Escreva algo importante sobre este projeto..."
              className="min-h-[100px] w-full resize-none rounded-lg border border-ink-800 bg-ink-950 p-3 text-sm text-bone-200 placeholder:text-ink-600 focus:border-signal-400 focus:outline-none"
            />
            <div className="flex justify-end">
              <button
                onClick={handleSaveNote}
                disabled={!newNoteContent.trim()}
                className="rounded bg-signal-400 px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-ink-950 transition-colors hover:bg-signal-300 disabled:opacity-50"
              >
                Salvar Nota
              </button>
            </div>
            
            {notes.length > 0 && (
              <div className="mt-2 space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {notes.map(note => (
                  <div key={note.id} className="rounded-lg border border-ink-800 bg-ink-950/50 p-4">
                    <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-bone-300">{note.content}</p>
                    <p className="mt-3 text-right font-mono text-[9px] text-ink-500">
                      {new Date(note.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Reveal>
      </div>

      {/* MODAL NOVA TAREFA */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 p-4 backdrop-blur-sm transition-all">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-ink-800 bg-ink-900 p-6 shadow-2xl">
            <button 
              onClick={() => { setShowTaskModal(null); setNewTaskTitle(""); }}
              className="absolute right-4 top-4 text-ink-500 hover:text-bone-200 transition-colors"
            >
              <Icon name="close" className="h-5 w-5" />
            </button>
            <div className="mb-6">
              <h2 className="font-display text-2xl font-bold text-white">Nova Tarefa</h2>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink-400">
                Adicionando em: <strong className="text-signal-400">
                  {showTaskModal === 'todo' ? 'A Fazer' : showTaskModal === 'in_progress' ? 'Em Andamento' : 'Concluído'}
                </strong>
              </p>
            </div>
            
            <form onSubmit={handleCreateTask} className="space-y-6">
              <div>
                <label className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-ink-300">
                  Título da Tarefa
                </label>
                <input 
                  type="text" 
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Ex: Roteirizar o vídeo"
                  autoFocus
                  className="w-full rounded-lg border border-ink-800 bg-ink-950 px-4 py-3 text-sm text-bone-100 placeholder:text-ink-600 focus:border-signal-400 focus:outline-none focus:ring-1 focus:ring-signal-400/50"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-ink-800">
                <button 
                  type="button"
                  onClick={() => { setShowTaskModal(null); setNewTaskTitle(""); }}
                  className="rounded px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-ink-400 transition-colors hover:text-bone-200"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={!newTaskTitle.trim()}
                  className="rounded bg-signal-400 px-5 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-ink-950 transition-colors disabled:opacity-50 hover:bg-signal-300"
                >
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL COMPARTILHAR */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/80 p-4 backdrop-blur-sm transition-all">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-ink-800 bg-ink-900 p-6 shadow-2xl">
            <button 
              onClick={() => { setShowShareModal(false); setShareChannel(""); }}
              className="absolute right-4 top-4 text-ink-500 hover:text-bone-200 transition-colors"
            >
              <Icon name="close" className="h-5 w-5" />
            </button>
            <div className="mb-6">
              <h2 className="font-display text-2xl font-bold text-white">Compartilhar Projeto</h2>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink-400">
                Convide alguém para este projeto
              </p>
            </div>
            
            {!user?.channel ? (
              <div className="rounded-xl border border-signal-400/30 bg-signal-400/5 p-5 text-center">
                <Icon name="target" className="mx-auto mb-3 h-6 w-6 text-signal-400" />
                <h3 className="mb-2 font-mono text-[11px] font-bold uppercase tracking-wider text-signal-400">
                  Nome de usuário ausente
                </h3>
                <p className="font-sans text-[12px] leading-relaxed text-ink-300">
                  Para poder compartilhar projetos, você precisa configurar um <strong className="text-bone-200">@usuario</strong> no seu perfil primeiro.
                </p>
              </div>
            ) : (
              <>
                <form onSubmit={handleSubmitShare} className="space-y-6">
                  <div>
                    <label className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-ink-300">
                      @canal do usuário
                    </label>
                    <input 
                      type="text" 
                      value={shareChannel}
                      onChange={(e) => setShareChannel(e.target.value)}
                      placeholder="@usuarioteste"
                      autoFocus
                      className="w-full rounded-lg border border-ink-800 bg-ink-950 px-4 py-3 text-sm text-bone-100 placeholder:text-ink-600 focus:border-signal-400 focus:outline-none focus:ring-1 focus:ring-signal-400/50"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-3 block font-mono text-[10px] uppercase tracking-wider text-ink-300">
                      Nível de Permissão
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setShareRole("editor")}
                        className={cn(
                          "group relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border p-5 transition-all duration-300",
                          shareRole === "editor" 
                            ? "border-signal-400 bg-signal-400/10 text-signal-400 shadow-[0_0_30px_-10px_rgba(242,179,61,0.2)]" 
                            : "border-ink-800 bg-ink-900/30 text-ink-500 hover:border-ink-600 hover:bg-ink-900/80 hover:text-ink-300"
                        )}
                      >
                        {shareRole === "editor" && <div className="absolute inset-0 bg-gradient-to-b from-signal-400/10 to-transparent opacity-50" />}
                        <Icon 
                          name="edit" 
                          className={cn("h-6 w-6 transition-transform duration-500", shareRole === "editor" ? "scale-110 text-signal-400" : "scale-100 group-hover:scale-110")} 
                          strokeWidth={shareRole === "editor" ? 2 : 1.5} 
                        />
                        <div className="text-center relative z-10">
                          <div className="font-mono text-[11px] font-bold uppercase tracking-[0.15em]">Editor</div>
                          <div className="mt-1.5 font-sans text-[11px] text-ink-400 leading-tight">Pode criar, alterar<br/>e deletar tarefas</div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShareRole("viewer")}
                        className={cn(
                          "group relative flex flex-col items-center justify-center gap-3 overflow-hidden rounded-xl border p-5 transition-all duration-300",
                          shareRole === "viewer" 
                            ? "border-bone-300 bg-bone-300/10 text-bone-200 shadow-[0_0_30px_-10px_rgba(255,255,255,0.1)]" 
                            : "border-ink-800 bg-ink-900/30 text-ink-500 hover:border-ink-600 hover:bg-ink-900/80 hover:text-ink-300"
                        )}
                      >
                        {shareRole === "viewer" && <div className="absolute inset-0 bg-gradient-to-b from-bone-300/5 to-transparent opacity-50" />}
                        <Icon 
                          name="eye" 
                          className={cn("h-6 w-6 transition-transform duration-500", shareRole === "viewer" ? "scale-110 text-bone-200" : "scale-100 group-hover:scale-110")} 
                          strokeWidth={shareRole === "viewer" ? 2 : 1.5} 
                        />
                        <div className="text-center relative z-10">
                          <div className="font-mono text-[11px] font-bold uppercase tracking-[0.15em]">Visualizador</div>
                          <div className="mt-1.5 font-sans text-[11px] text-ink-400 leading-tight">Acesso somente<br/>leitura ao painel</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button 
                      type="button"
                      onClick={() => { setShowShareModal(false); setShareChannel(""); }}
                      className="rounded px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-ink-400 transition-colors hover:text-bone-200"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      disabled={!shareChannel.trim()}
                      className="rounded bg-signal-400 px-5 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-ink-950 transition-colors disabled:opacity-50 hover:bg-signal-300"
                    >
                      Convidar
                    </button>
                  </div>
                </form>

                <div className="mt-6 pt-6 border-t border-ink-800">
                  <label className="mb-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-ink-300">
                    <span>Ou compartilhe via link</span>
                    <span className={cn("transition-opacity duration-300", copied ? "opacity-100 text-signal-400" : "opacity-0 text-transparent")}>Copiado!</span>
                  </label>
                  <div className="relative group">
                    <input 
                      readOnly
                      value={`${window.location.origin}/?invite=${project.id}&role=${shareRole}`}
                      className={cn(
                        "w-full rounded-lg bg-ink-950/50 px-4 py-3 pr-12 text-[11px] font-mono border transition-colors outline-none",
                        copied ? "border-signal-400/50 text-signal-400" : "border-ink-800 text-ink-400 focus:border-ink-600"
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
                        "absolute right-2 top-1/2 -translate-y-1/2 flex h-[26px] w-[26px] items-center justify-center rounded transition-all duration-300",
                        copied 
                          ? "bg-signal-400 text-ink-950 scale-110 shadow-[0_0_15px_-3px_rgba(242,179,61,0.4)]" 
                          : "bg-ink-900 text-ink-400 hover:text-bone-200 hover:bg-ink-800 hover:scale-105"
                      )}
                      title="Copiar link"
                    >
                      <Icon name={copied ? "check" : "copy"} className="h-3.5 w-3.5" strokeWidth={copied ? 2.5 : 1.5} />
                    </button>
                  </div>
                </div>
              </>
            )}

            {applications.length > 0 && user?.channel && (
              <div className="mt-6 pt-6 border-t border-ink-800">
                <h3 className="mb-4 font-mono text-[10px] uppercase tracking-wider text-signal-400">
                  Aplicações Pendentes ({applications.length})
                </h3>
                <div className="space-y-3">
                  {applications.map(app => (
                    <div key={app.id} className="flex items-center justify-between rounded-lg border border-ink-800 bg-ink-950/50 p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-800 text-xs font-bold text-ink-300 overflow-hidden">
                          {app.avatar_url ? <img src={app.avatar_url} className="h-full w-full object-cover" /> : app.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <div className="font-sans text-[13px] font-medium text-bone-200">{app.name}</div>
                          <div className="font-mono text-[10px] text-ink-500">
                            solicitou acesso de <span className="text-signal-400">{app.role}</span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleAcceptApplication(app.id)}
                        className="rounded bg-signal-400 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-ink-950 hover:bg-signal-300"
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
      )}
    </div>
  );
}
