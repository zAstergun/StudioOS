import { useState, useEffect } from "react";
import { Icon, Panel, Reveal, Button, VipBadge } from "../components/ui";
import { cn } from "../utils/cn";

import { type Project, computeProjectStatus } from "./ProjetosScreen";
import { useAuth, supabase } from "../auth";
import { useStudioOS } from "../history";
import { TOOLS } from "../data";
import { 
  type ProjectSavedItem, 
  TOOL_GROUP_MAP, 
  TOOL_NAME_MAP, 
  TOOL_ICON_MAP, 
  TOOL_ACCENT_STYLES 
} from "../types/projectSavedItem";
import { prepareToolRestore, formatFriendlySummary } from "../utils/toolStateRestore";

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

const normalizeSavedItems = (raw: any[]): ProjectSavedItem[] => {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, idx) => {
    if (!item) return null;
    const isUrlLink = Boolean(item.url && !item.content && (!item.type || item.type === "link"));
    const type = item.type || (isUrlLink ? "link" : "custom");
    const group = item.group || (isUrlLink ? "Link" : TOOL_GROUP_MAP[type] || "Criação");
    const toolName = item.toolName || (isUrlLink ? "Link Externo" : TOOL_NAME_MAP[type] || "Item");
    return {
      id: item.id || `psi_${idx}_${Date.now()}`,
      title: item.title || "Sem título",
      url: item.url,
      type,
      group,
      toolName,
      summary: item.summary,
      content: item.content,
      tag: item.tag,
      metadata: item.metadata,
      createdAt: item.createdAt || Date.now(),
    };
  }).filter(Boolean) as ProjectSavedItem[];
};

export function ProjetoDetailScreen({ 
  project, 
  onBack,
  onUpdateProject,
  onGo,
}: { 
  project: Project, 
  onBack: () => void,
  onUpdateProject?: (updated: Partial<Project>) => void,
  onGo?: (view: string) => void,
}) {
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

  const os = useStudioOS();
  const [savedItems, setSavedItems] = useState<ProjectSavedItem[]>(() => normalizeSavedItems(project.saved_links || []));
  const [itemsFilter, setItemsFilter] = useState<"todos" | "Criação" | "Publicação" | "Estratégia" | "Link">("todos");
  const [viewingSavedItem, setViewingSavedItem] = useState<ProjectSavedItem | null>(null);
  const [showAddToolModal, setShowAddToolModal] = useState(false);
  const [toolSearch, setToolSearch] = useState("");
  const [toolFilterGroup, setToolFilterGroup] = useState<"todos" | "Criação" | "Publicação" | "Estratégia">("todos");
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);
  const [copiedModalContent, setCopiedModalContent] = useState(false);

  const [showAddLink, setShowAddLink] = useState(false);
  const [newLinkTitle, setNewLinkTitle] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [isEditingExternalLink, setIsEditingExternalLink] = useState(false);
  const [tempExternalLink, setTempExternalLink] = useState("");
  const [localExternalLink, setLocalExternalLink] = useState(project.external_link || "");

  const syncProjectProgress = async (taskList: Task[]) => {
    const total = taskList.length;
    const done = taskList.filter(t => t.status === "done").length;
    const newProg = total > 0 ? Math.round((done / total) * 100) : 0;
    const newStatus = computeProjectStatus(taskList, project.status);

    onUpdateProject?.({
      status: newStatus,
      progress: newProg,
      tasksCount: total,
      completedTasks: done
    });

    if (supabase) {
      await supabase
        .from("studioos_projects")
        .update({ progress: newProg, status: newStatus })
        .eq("id", project.id);
    }
  };

  useEffect(() => {
    setLocalExternalLink(project.external_link || "");
    setTempExternalLink(project.external_link || "");
  }, [project.external_link]);

  useEffect(() => {
    setSavedItems(normalizeSavedItems(project.saved_links || []));
  }, [project.saved_links]);

  useEffect(() => {
    const handleSavedEvent = (e: any) => {
      if (e.detail?.projectId === project.id && e.detail?.savedItem) {
        setSavedItems(prev => {
          if (prev.some(p => p.id === e.detail.savedItem.id)) return prev;
          return [e.detail.savedItem, ...prev];
        });
      }
    };
    window.addEventListener("studioos:project_saved_items", handleSavedEvent);
    return () => window.removeEventListener("studioos:project_saved_items", handleSavedEvent);
  }, [project.id]);

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
        const loadedTasks: Task[] = data.map(d => ({
          id: d.id,
          title: d.title,
          description: d.description,
          status: d.status as any,
          project_id: d.project_id
        }));
        setTasks(loadedTasks);
        syncProjectProgress(loadedTasks);
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
        const { data: profiles } = await supabase.from('profiles').select('id, full_name, channel, avatar_url, is_vip').in('id', authorIds);
        
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

    const nextTasks = [...tasks, { ...newTask, status: newTask.status as any }];
    setTasks(nextTasks);
    syncProjectProgress(nextTasks);

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
    const nextTasks = tasks.filter(t => t.id !== taskId);
    setTasks(nextTasks);
    syncProjectProgress(nextTasks);

    await supabase.from("studioos_tasks").delete().eq("id", taskId);
  };

  const handleDropTask = async (taskId: string, newStatus: Task["status"]) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === newStatus) return;

    const nextTasks = tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
    setTasks(nextTasks);
    syncProjectProgress(nextTasks);

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
      const { data: profile } = await supabase.from('profiles').select('id, full_name, channel, avatar_url, is_vip').eq('id', user.id).single();
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
    window.dispatchEvent(new Event("studioos:history"));
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

  const handleSaveExternalLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    let url = tempExternalLink.trim();
    if (url && !url.startsWith('http')) url = `https://${url}`;
    setLocalExternalLink(url);
    await supabase.from("studioos_projects").update({ external_link: url || null }).eq("id", project.id);
    setIsEditingExternalLink(false);
  };

  const handleSaveItemDirect = async (newItem: ProjectSavedItem) => {
    const updated = [newItem, ...savedItems.filter(s => s.id !== newItem.id)];
    setSavedItems(updated);
    if (supabase) {
      await supabase.from("studioos_projects").update({ saved_links: updated }).eq("id", project.id);
    }
  };

  const handleDeleteSavedItem = async (itemId: string) => {
    const updated = savedItems.filter(item => item.id !== itemId);
    setSavedItems(updated);
    if (viewingSavedItem?.id === itemId) setViewingSavedItem(null);
    if (supabase) {
      await supabase.from("studioos_projects").update({ saved_links: updated }).eq("id", project.id);
    }
  };

  const handleImportHistoryRun = async (run: any) => {
    const toolType = run.tool;
    const group = TOOL_GROUP_MAP[toolType] || "Criação";
    const toolName = run.toolName || TOOL_NAME_MAP[toolType] || "Ferramenta";

    const newItem: ProjectSavedItem = {
      id: `psi_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type: toolType,
      group,
      toolName,
      title: run.title || `${toolName} - ${new Date().toLocaleDateString("pt-BR")}`,
      summary: run.summary,
      content: run.content,
      tag: run.tag,
      createdAt: run.createdAt || Date.now(),
    };

    await handleSaveItemDirect(newItem);
  };

  const handleSaveLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLinkTitle.trim() || !newLinkUrl.trim()) return;
    
    let url = newLinkUrl.trim();
    if (!url.startsWith('http')) url = `https://${url}`;

    const newItem: ProjectSavedItem = {
      id: `psi_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type: "link",
      group: "Link",
      toolName: "Link Externo",
      title: newLinkTitle.trim(),
      url,
      createdAt: Date.now(),
    };

    await handleSaveItemDirect(newItem);
    setShowAddLink(false);
    setNewLinkTitle("");
    setNewLinkUrl("");
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
  const progressPercent = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : (project.progress || 0);
  const currentStatus = computeProjectStatus(tasks, project.status);

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
              <Icon name={currentStatus === 'completed' ? 'check' : 'layers'} className="h-5 w-5" strokeWidth={1.6} />
            </div>
            <div>
              <div className="mb-1.5 flex items-center gap-2.5">
                <span className={cn(
                  "flex items-center gap-1.5 rounded px-2 py-0.5 font-mono text-[9px] tracking-[0.12em] uppercase",
                  currentStatus === 'active' ? "bg-emerald-400/10 text-emerald-400" :
                  currentStatus === 'planning' ? "bg-signal-400/10 text-signal-400" :
                  currentStatus === 'completed' ? "bg-blue-400/10 text-blue-400" :
                  currentStatus === 'trashed' ? "bg-red-400/10 text-red-400" :
                  "bg-ink-800 text-ink-300"
                )}>
                  <span className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    currentStatus === 'active' ? "bg-emerald-400" :
                    currentStatus === 'planning' ? "bg-signal-400" :
                    currentStatus === 'completed' ? "bg-blue-400" :
                    currentStatus === 'trashed' ? "bg-red-400" :
                    "bg-ink-500"
                  )} />
                  {currentStatus === 'active' ? 'Em Andamento' : currentStatus === 'planning' ? 'Planejamento' : currentStatus === 'trashed' ? 'Na Lixeira' : 'Concluído'}
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
              <>
                {isEditingExternalLink ? (
                  <form onSubmit={handleSaveExternalLink} className="flex h-9 items-center gap-1 rounded-lg border border-signal-400/50 bg-ink-900/30 px-2 overflow-hidden w-[200px]">
                    <input 
                      type="url" 
                      value={tempExternalLink}
                      onChange={(e) => setTempExternalLink(e.target.value)}
                      onBlur={async (e) => {
                        if (e.relatedTarget && (e.relatedTarget as HTMLButtonElement).type === 'submit') {
                          return;
                        }
                        if (supabase) {
                          let url = tempExternalLink.trim();
                          if (url && !url.startsWith('http')) url = `https://${url}`;
                          setLocalExternalLink(url);
                          await supabase.from("studioos_projects").update({ external_link: url || null }).eq("id", project.id);
                        }
                        setIsEditingExternalLink(false);
                      }}
                      placeholder="Link do vídeo"
                      className="h-full w-full bg-transparent text-[10px] font-mono text-white focus:outline-none"
                      autoFocus
                    />
                    <button type="submit" onMouseDown={(e) => e.preventDefault()} className="text-signal-400 hover:text-signal-300 px-1">
                      <Icon name="check" className="h-3.5 w-3.5" />
                    </button>
                  </form>
                ) : localExternalLink ? (
                  <div className="flex items-center group relative">
                    <div className="absolute inset-0 -z-10 rounded-lg bg-signal-400/20 blur-md opacity-0 transition-opacity duration-500 group-hover:opacity-100"></div>
                    <a href={localExternalLink} target="_blank" rel="noopener noreferrer" className="flex h-9 items-center gap-2 rounded-l-lg border border-r-0 border-signal-400/40 bg-signal-400/10 px-4 font-mono text-[10px] font-bold tracking-[0.1em] text-signal-400 uppercase transition-all hover:bg-signal-400/20 hover:text-signal-300">
                      <Icon name="play" className="h-3.5 w-3.5 fill-signal-400/20" />
                      Assistir Vídeo
                    </a>
                    <button onClick={() => { setTempExternalLink(localExternalLink); setIsEditingExternalLink(true); }} className="flex h-9 items-center justify-center rounded-r-lg border border-l-0 border-signal-400/40 bg-signal-400/10 px-2.5 text-signal-400/60 transition-all hover:bg-signal-400/20 hover:text-signal-400" title="Editar Link">
                      <Icon name="edit" className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => { setTempExternalLink(""); setIsEditingExternalLink(true); }}
                    className="flex h-9 items-center gap-2 rounded-lg border border-ink-800/50 bg-ink-900/30 px-4 font-mono text-[10px] font-bold tracking-[0.1em] text-bone-300 uppercase transition-all hover:border-ink-600 hover:text-white"
                  >
                    <Icon name="link" className="h-3 w-3 text-ink-300" />
                    Link do Vídeo
                  </button>
                )}
                <button 
                  onClick={() => setShowTaskModal("todo")}
                  className="group flex h-9 items-center gap-2 rounded-lg bg-signal-400 px-5 font-mono text-[10px] font-bold tracking-[0.1em] text-ink-950 uppercase shadow-[0_6px_20px_-8px_rgba(242,179,61,0.5)] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-8px_rgba(242,179,61,0.6)]"
                >
                  <Icon name="plus" className="h-3 w-3 transition-transform group-hover:rotate-90" strokeWidth={2.5} />
                  Nova Tarefa
                </button>
              </>
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
        {/* ITENS SALVOS DO PROJETO */}
        <Reveal delay={240}>
          <div className="overflow-hidden rounded-xl border border-ink-800/40 bg-ink-900/20">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-800/30 px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <Icon name="bookmark" className="h-3.5 w-3.5 text-signal-400" strokeWidth={2} />
                <h3 className="font-mono text-[10px] font-bold tracking-[0.14em] text-bone-200 uppercase">
                  Itens Salvos do Projeto
                </h3>
                <span className="rounded-full bg-signal-400/15 border border-signal-400/30 px-2 py-0.5 font-mono text-[9px] font-bold text-signal-400">
                  {savedItems.length}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowAddToolModal(true)} 
                  className="flex items-center gap-1.5 rounded-lg border border-signal-400/40 bg-signal-400/10 px-2.5 py-1 font-mono text-[9.5px] font-bold tracking-[0.1em] text-signal-400 uppercase hover:bg-signal-400 hover:text-ink-950 transition-all cursor-pointer"
                  title="Salvar ou vincular execuções de Criação, Publicação e Estratégia"
                >
                  <Icon name="plus" className="h-3 w-3" strokeWidth={2.5} />
                  Vincular Ferramenta
                </button>
                <button 
                  onClick={() => setShowAddLink(true)} 
                  className="flex items-center gap-1.5 rounded-lg border border-ink-700 bg-ink-800/60 px-2.5 py-1 font-mono text-[9.5px] tracking-[0.1em] text-bone-300 uppercase hover:bg-ink-700 hover:text-bone-100 transition-colors cursor-pointer"
                >
                  <Icon name="link" className="h-3 w-3" />
                  Link
                </button>
              </div>
            </div>

            {/* Filter Pills */}
            {savedItems.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 border-b border-ink-800/30 px-4 py-2.5 bg-ink-950/20">
                {[
                  { id: "todos", label: "Todos", count: savedItems.length },
                  { id: "Criação", label: "Criação", count: savedItems.filter(i => i.group === "Criação").length },
                  { id: "Publicação", label: "Publicação", count: savedItems.filter(i => i.group === "Publicação").length },
                  { id: "Estratégia", label: "Estratégia", count: savedItems.filter(i => i.group === "Estratégia").length },
                  { id: "Link", label: "Links", count: savedItems.filter(i => i.group === "Link" || i.type === "link").length },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setItemsFilter(tab.id as any)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-[9.5px] tracking-wider uppercase transition-colors cursor-pointer",
                      itemsFilter === tab.id
                        ? "bg-signal-400/15 border border-signal-400/30 text-signal-400 font-bold"
                        : "text-ink-400 hover:text-bone-200 hover:bg-ink-800/50"
                    )}
                  >
                    <span>{tab.label}</span>
                    <span className="opacity-70 tabular-nums">({tab.count})</span>
                  </button>
                ))}
              </div>
            )}

            <div className="flex min-h-[140px] flex-col gap-3 p-4">
              {showAddLink && (
                <form onSubmit={handleSaveLink} className="flex flex-col gap-2 rounded-lg bg-ink-900/50 p-3 border border-ink-800">
                  <input 
                    type="text" 
                    placeholder="Título do link (ex: Roteiro, Figma)" 
                    value={newLinkTitle}
                    onChange={(e) => setNewLinkTitle(e.target.value)}
                    className="w-full rounded bg-ink-950 px-2 py-1.5 text-[11px] text-bone-300 border border-ink-800 focus:outline-none focus:border-signal-400/50"
                    autoFocus
                  />
                  <input 
                    type="url" 
                    placeholder="https://..." 
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    className="w-full rounded bg-ink-950 px-2 py-1.5 text-[11px] text-bone-300 border border-ink-800 focus:outline-none focus:border-signal-400/50"
                  />
                  <div className="flex justify-end gap-2 mt-1">
                    <button type="button" onClick={() => setShowAddLink(false)} className="text-[10px] text-ink-400 hover:text-bone-300 transition-colors cursor-pointer">Cancelar</button>
                    <button type="submit" className="text-[10px] text-signal-400 hover:text-signal-300 font-bold transition-colors cursor-pointer">Salvar</button>
                  </div>
                </form>
              )}

              {savedItems.filter(item => {
                if (itemsFilter === "todos") return true;
                if (itemsFilter === "Link") return item.group === "Link" || item.type === "link";
                return item.group === itemsFilter;
              }).length === 0 && !showAddLink ? (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-800/50 text-ink-600 border border-ink-800">
                    <Icon name="bookmark" className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <p className="font-mono text-[10px] tracking-[0.12em] text-ink-400 uppercase font-medium">
                    {itemsFilter === "todos" ? "Nenhum item salvo no projeto" : `Nenhum item de ${itemsFilter} salvo`}
                  </p>
                  <p className="max-w-xs text-[11px] text-ink-500">
                    Salve avaliações de ideias, roteiros, títulos, receitas virais ou links externos para organizar este projeto.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button 
                      onClick={() => setShowAddToolModal(true)} 
                      className="rounded-lg bg-signal-400/10 border border-signal-400/25 px-3 py-1.5 font-mono text-[9px] font-bold uppercase tracking-wider text-signal-400 hover:bg-signal-400/20 transition-colors cursor-pointer"
                    >
                      + Vincular Ferramenta
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 max-h-[420px] overflow-y-auto pr-1">
                  {savedItems
                    .filter(item => {
                      if (itemsFilter === "todos") return true;
                      if (itemsFilter === "Link") return item.group === "Link" || item.type === "link";
                      return item.group === itemsFilter;
                    })
                    .map((item) => {
                      const icon = TOOL_ICON_MAP[item.type] || "bookmark";
                      const style = TOOL_ACCENT_STYLES[item.type] || TOOL_ACCENT_STYLES.link;
                      const isLink = item.type === "link" && Boolean(item.url);

                      return (
                        <div 
                          key={item.id}
                          onClick={() => {
                            if (isLink && item.url) {
                              window.open(item.url, "_blank", "noopener,noreferrer");
                            } else {
                              setViewingSavedItem(item);
                            }
                          }}
                          className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-ink-800/60 bg-ink-900/35 p-3 transition-all hover:border-signal-400/30 hover:bg-ink-900/60 cursor-pointer"
                        >
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border mt-0.5 sm:mt-0", style.badge)}>
                              <Icon name={icon} className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                                <span className="font-mono text-[8.5px] uppercase tracking-wider font-bold text-signal-400">
                                  {item.group}
                                </span>
                                <span className="font-mono text-[8.5px] uppercase tracking-wider text-ink-500">
                                  • {item.toolName}
                                </span>
                                {item.tag && (
                                  <span className="rounded bg-signal-400/10 border border-signal-400/20 px-1 py-0.2 font-mono text-[8px] font-bold text-signal-300">
                                    {item.tag}
                                  </span>
                                )}
                              </div>
                              <h4 className="text-[12.5px] font-bold text-bone-100 truncate group-hover:text-signal-300 transition-colors">
                                {item.title}
                              </h4>
                              {(item.summary || item.url) && (
                                <p className="text-[10.5px] text-ink-400 line-clamp-1 mt-0.5">
                                  {formatFriendlySummary(item.type, item.summary, item.content) || item.url}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center opacity-80 group-hover:opacity-100 transition-opacity">
                            {!isLink && (
                              <>
                                {onGo && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      prepareToolRestore(item.type, item);
                                      onGo(item.type);
                                    }}
                                    className="rounded p-1.5 text-signal-400 hover:text-signal-300 hover:bg-ink-800 transition-colors cursor-pointer"
                                    title="Abrir ferramenta com estes dados carregados"
                                  >
                                    <Icon name="arrow" className="h-3.5 w-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setViewingSavedItem(item);
                                  }}
                                  className="rounded p-1.5 text-ink-400 hover:text-signal-300 hover:bg-ink-800 transition-colors cursor-pointer"
                                  title="Visualizar conteúdo"
                                >
                                  <Icon name="eye" className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const textToCopy = item.content || item.summary || item.url || item.title;
                                navigator.clipboard.writeText(textToCopy);
                                setCopiedItemId(item.id);
                                setTimeout(() => setCopiedItemId(null), 2000);
                              }}
                              className={cn(
                                "rounded p-1.5 transition-colors cursor-pointer",
                                copiedItemId === item.id ? "text-emerald-400" : "text-ink-400 hover:text-signal-300 hover:bg-ink-800"
                              )}
                              title="Copiar conteúdo"
                            >
                              <Icon name={copiedItemId === item.id ? "check" : "copy"} className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm(`Remover "${item.title}" dos salvos do projeto?`)) {
                                  handleDeleteSavedItem(item.id);
                                }
                              }}
                              className="rounded p-1.5 text-ink-500 hover:text-red-400 hover:bg-ink-800 transition-colors cursor-pointer"
                              title="Remover do projeto"
                            >
                              <Icon name="trash" className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
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
                              <div className="relative shrink-0">
                                {(note.profile?.avatar_url || (note.author_id === user?.id ? user?.avatarUrl : null)) ? (
                                  <img src={note.profile?.avatar_url || user?.avatarUrl} alt={note.profile?.full_name || 'Usuário'} className="h-5 w-5 rounded-full object-cover" />
                                ) : (
                                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-signal-400 text-[9px] font-bold text-ink-950 uppercase">
                                    {note.profile?.full_name?.charAt(0) || note.profile?.channel?.charAt(0) || user?.name?.charAt(0) || '?'}
                                  </div>
                                )}
                                {(note.profile?.is_vip || (note.author_id === user?.id && user?.is_vip)) && (
                                  <VipBadge size="xs" />
                                )}
                              </div>
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
                <p className="break-words text-[15px] font-medium leading-snug text-bone-50">
                  {viewTaskModal.title}
                </p>
              </div>
              <div className="group">
                <div className="mb-2 flex items-center justify-between min-h-[28px]">
                  <h3 className="font-mono text-[10px] tracking-[0.14em] text-ink-300 uppercase">
                    Descrição
                  </h3>
                  {!isEditingTaskDesc && (
                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (viewTaskModal.description) {
                            navigator.clipboard.writeText(viewTaskModal.description);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }
                        }}
                        className="rounded p-1.5 text-ink-400 transition-all hover:bg-ink-800 hover:text-bone-200 active:scale-90"
                        title="Copiar"
                      >
                        <Icon name={copied ? "check" : "copy"} className={copied ? "h-3.5 w-3.5 text-emerald-400" : "h-3.5 w-3.5"} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditTaskDescContent(viewTaskModal.description || "");
                          setIsEditingTaskDesc(true);
                        }}
                        className="rounded p-1.5 text-signal-400/70 transition-all hover:bg-signal-400/10 hover:text-signal-400 active:scale-90" 
                        title="Editar"
                      >
                        <Icon name="edit" className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                {isEditingTaskDesc ? (
                  <div className="flex flex-col outline-none border-none ring-0">
                    <textarea
                      value={editTaskDescContent}
                      onChange={(e) => setEditTaskDescContent(e.target.value)}
                      className="w-full min-h-[120px] resize-none rounded-xl border border-signal-400 bg-ink-950 p-4 text-[13px] leading-relaxed text-bone-100 placeholder:text-ink-500 outline-none ring-4 ring-signal-400/15 shadow-[0_0_30px_-5px_rgba(242,179,61,0.2)] transition-all duration-300 selection:bg-signal-400/20"
                      placeholder="Adicione uma descrição para a tarefa..."
                      autoFocus
                    />
                    <div className="mt-3 flex items-center justify-end gap-2">
                      <button
                        onClick={() => setIsEditingTaskDesc(false)}
                        className="rounded-lg px-4 py-2 font-mono text-[9px] font-bold uppercase text-ink-400 transition-colors hover:bg-ink-800/50 hover:text-bone-200"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => handleUpdateTaskDesc(viewTaskModal.id)}
                        className="rounded-lg bg-signal-400 px-4 py-2 font-mono text-[9px] font-bold uppercase text-ink-950 shadow-[0_4px_14px_-6px_rgba(242,179,61,0.5)] transition-all hover:bg-signal-300 hover:shadow-[0_6px_20px_-6px_rgba(242,179,61,0.6)]"
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
                    className="cursor-pointer rounded-xl border border-ink-800/60 bg-ink-950/50 p-4 min-h-[120px] transition-colors hover:border-signal-400/30 hover:bg-signal-400/[0.02]"
                  >
                    <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-bone-200">
                      {viewTaskModal.description || <span className="italic text-ink-500">Adicionar descrição...</span>}
                    </p>
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
                Ele será movido para a <strong className="text-red-400">Lixeira (em Histórico & Lixeira)</strong> e você poderá restaurá-lo depois se quiser.
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
                  window.dispatchEvent(new Event("studioos:history"));
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
                    await supabase.from("studioos_saved_items").delete().filter("metadata->>id", "eq", String(project.id));
                  }
                  window.dispatchEvent(new Event("studioos:history"));
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

      {/* MODAL VISUALIZAR ITEM SALVO */}
      {viewingSavedItem && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/85 p-4 backdrop-blur-md"
          onClick={(e) => { if (e.target === e.currentTarget) setViewingSavedItem(null); }}
        >
          <div 
            className="relative w-full max-w-[620px] max-h-[85vh] flex flex-col overflow-hidden rounded-2xl border border-ink-700/60 bg-ink-900 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.9)] animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-ink-800/80 px-6 py-4 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border", TOOL_ACCENT_STYLES[viewingSavedItem.type]?.badge || TOOL_ACCENT_STYLES.link.badge)}>
                  <Icon name={TOOL_ICON_MAP[viewingSavedItem.type] || "bookmark"} className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] uppercase tracking-wider font-bold text-signal-400">
                      {viewingSavedItem.group}
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-wider text-ink-400">
                      • {viewingSavedItem.toolName}
                    </span>
                    {viewingSavedItem.tag && (
                      <span className="rounded bg-signal-400/10 border border-signal-400/20 px-1.5 py-0.2 font-mono text-[9px] font-bold text-signal-300">
                        {viewingSavedItem.tag}
                      </span>
                    )}
                  </div>
                  <h3 className="font-display text-base font-bold text-bone-100 truncate">
                    {viewingSavedItem.title}
                  </h3>
                </div>
              </div>
              <button 
                onClick={() => setViewingSavedItem(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-800 hover:text-bone-100 shrink-0 cursor-pointer"
              >
                <Icon name="close" className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {viewingSavedItem.summary && (
                <div className="rounded-lg border border-ink-800/80 bg-ink-950/60 p-3.5">
                  <span className="block font-mono text-[9px] uppercase tracking-wider text-ink-400 mb-1 font-bold">
                    Resumo
                  </span>
                  <p className="text-[12.5px] text-bone-200 leading-relaxed">
                    {formatFriendlySummary(viewingSavedItem.type, viewingSavedItem.summary, viewingSavedItem.content)}
                  </p>
                </div>
              )}

              {viewingSavedItem.content && (
                <div className="rounded-lg border border-ink-800/80 bg-ink-950/80 p-4 font-mono text-[11.5px] leading-relaxed text-bone-300 whitespace-pre-wrap select-text">
                  {viewingSavedItem.content}
                </div>
              )}

              {viewingSavedItem.url && (
                <div className="flex items-center justify-between rounded-lg border border-ink-800 bg-ink-950/50 p-3">
                  <span className="font-mono text-[11px] text-signal-400 truncate mr-3">
                    {viewingSavedItem.url}
                  </span>
                  <a 
                    href={viewingSavedItem.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="flex items-center gap-1 rounded bg-signal-400/15 border border-signal-400/30 px-2.5 py-1 font-mono text-[9.5px] text-signal-400 uppercase hover:bg-signal-400 hover:text-ink-950 transition-all shrink-0"
                  >
                    Acessar Link
                    <Icon name="arrow" className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-ink-800/80 px-6 py-3.5 bg-ink-950/40 shrink-0">
              <span className="font-mono text-[9.5px] text-ink-500 uppercase">
                Salvo em {new Date(viewingSavedItem.createdAt).toLocaleDateString("pt-BR")}
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const text = viewingSavedItem.content || viewingSavedItem.summary || viewingSavedItem.url || viewingSavedItem.title;
                    navigator.clipboard.writeText(text);
                    setCopiedModalContent(true);
                    setTimeout(() => setCopiedModalContent(false), 2000);
                  }}
                  className="font-mono text-[10px] uppercase tracking-wider gap-1.5"
                >
                  <Icon name={copiedModalContent ? "check" : "copy"} className="h-3.5 w-3.5" />
                  {copiedModalContent ? "Copiado!" : "Copiar Tudo"}
                </Button>

                {onGo && viewingSavedItem.type !== "link" && (
                  <Button
                    variant="solid"
                    onClick={() => {
                      prepareToolRestore(viewingSavedItem.type, viewingSavedItem);
                      setViewingSavedItem(null);
                      onGo(viewingSavedItem.type);
                    }}
                    className="font-mono text-[10px] uppercase tracking-wider gap-1.5 shadow-[0_0_15px_rgba(242,179,61,0.25)]"
                  >
                    Abrir Ferramenta
                    <Icon name="arrow" className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL VINCULAR FERRAMENTA */}
      {showAddToolModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/85 p-4 backdrop-blur-md"
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddToolModal(false); }}
        >
          <div 
            className="relative w-full max-w-[680px] max-h-[85vh] flex flex-col overflow-hidden rounded-2xl border border-ink-700/60 bg-ink-900 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.9)] animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-ink-800/80 px-6 py-4 shrink-0">
              <div>
                <h3 className="font-display text-base font-bold text-bone-100">
                  Vincular Ferramenta ao Projeto
                </h3>
                <p className="font-mono text-[10.5px] text-ink-400">
                  Importe execuções do histórico de Criação, Publicação e Estratégia ou acesse a ferramenta
                </p>
              </div>
              <button 
                onClick={() => setShowAddToolModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-800 hover:text-bone-100 shrink-0 cursor-pointer"
              >
                <Icon name="close" className="h-4 w-4" />
              </button>
            </div>

            {/* Filter & Search */}
            <div className="p-5 border-b border-ink-800/60 bg-ink-950/30 space-y-3 shrink-0">
              <input
                type="text"
                placeholder="Buscar execuções no histórico (título, ferramenta, conteúdo)..."
                value={toolSearch}
                onChange={(e) => setToolSearch(e.target.value)}
                className="w-full rounded-lg border border-ink-800 bg-ink-950 px-3.5 py-2 text-[12px] text-bone-100 placeholder:text-ink-500 focus:border-signal-400/50 focus:outline-none"
              />

              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: "todos", label: "Todas Ferramentas" },
                  { id: "Criação", label: "01 Criação" },
                  { id: "Publicação", label: "02 Publicação" },
                  { id: "Estratégia", label: "03 Estratégia" },
                ].map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setToolFilterGroup(g.id as any)}
                    className={cn(
                      "rounded-md px-2.5 py-1 font-mono text-[9.5px] tracking-wider uppercase transition-colors cursor-pointer",
                      toolFilterGroup === g.id
                        ? "bg-signal-400/15 border border-signal-400/30 text-signal-400 font-bold"
                        : "text-ink-400 hover:text-bone-200 hover:bg-ink-800"
                    )}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List of Runs from History */}
            <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
              {(() => {
                const availableTools = ["rank", "titulos", "hooks", "roteiro", "thumbnail", "receita", "humanizador", "score", "mentor", "membros"];
                const runs = os.history.filter((h) => {
                  if (!availableTools.includes(h.tool)) return false;
                  const grp = TOOL_GROUP_MAP[h.tool];
                  if (toolFilterGroup !== "todos" && grp !== toolFilterGroup) return false;
                  if (toolSearch.trim()) {
                    const q = toolSearch.toLowerCase();
                    return (
                      h.title.toLowerCase().includes(q) ||
                      h.toolName.toLowerCase().includes(q) ||
                      (h.summary && h.summary.toLowerCase().includes(q))
                    );
                  }
                  return true;
                });

                if (runs.length === 0) {
                  return (
                    <div className="rounded-xl border border-dashed border-ink-800 p-8 text-center">
                      <Icon name="layers" className="mx-auto h-8 w-8 text-ink-600 mb-2" />
                      <p className="text-[13px] font-semibold text-bone-300">Nenhuma execução encontrada no histórico</p>
                      <p className="text-[11.5px] text-ink-400 mt-1 max-w-sm mx-auto">
                        Abra uma das ferramentas abaixo para gerar conteúdo e ele poderá ser salvo neste projeto com 1 clique.
                      </p>
                    </div>
                  );
                }

                return runs.map((run) => {
                  const grp = TOOL_GROUP_MAP[run.tool] || "Criação";
                  const style = TOOL_ACCENT_STYLES[run.tool] || TOOL_ACCENT_STYLES.link;
                  const isAlreadySaved = savedItems.some(s => s.title === run.title || (s.summary && s.summary === run.summary));

                  return (
                    <div
                      key={run.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-ink-800/70 bg-ink-950/40 p-3.5 transition-all hover:border-ink-700 hover:bg-ink-900/60"
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border mt-0.5", style.badge)}>
                          <Icon name={TOOL_ICON_MAP[run.tool] || "bookmark"} className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-mono text-[9px] font-bold text-signal-400 uppercase">
                              {grp} · {run.toolName}
                            </span>
                            {run.tag && (
                              <span className="rounded bg-signal-400/10 border border-signal-400/20 px-1.5 py-0.2 font-mono text-[8.5px] font-bold text-signal-300">
                                {run.tag}
                              </span>
                            )}
                          </div>
                          <h4 className="text-[13px] font-bold text-bone-100 truncate">
                            {run.title}
                          </h4>
                          {run.summary && (
                            <p className="text-[11px] text-ink-400 line-clamp-1 mt-0.5">
                              {run.summary}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isAlreadySaved ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 font-mono text-[9px] font-bold text-emerald-400 uppercase">
                            <Icon name="check" className="h-3 w-3" />
                            Já Salvo
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              handleImportHistoryRun(run);
                              setShowAddToolModal(false);
                            }}
                            className="flex items-center gap-1.5 rounded-lg border border-signal-400/40 bg-signal-400/10 px-3 py-1.5 font-mono text-[9.5px] font-bold tracking-wider text-signal-400 uppercase hover:bg-signal-400 hover:text-ink-950 transition-all cursor-pointer shadow-sm"
                          >
                            <Icon name="plus" className="h-3 w-3" strokeWidth={2.5} />
                            Vincular ao Projeto
                          </button>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}

              {/* Seção Atalhos para Ferramentas */}
              <div className="pt-4 border-t border-ink-800/80">
                <span className="block font-mono text-[10px] uppercase tracking-wider text-ink-400 mb-2.5 font-bold">
                  Ou crie direto em uma ferramenta:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {TOOLS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setShowAddToolModal(false);
                        onGo?.(t.id);
                      }}
                      className="flex items-center gap-2 rounded-lg border border-ink-800 bg-ink-950/40 p-2.5 text-left transition-all hover:border-signal-400/40 hover:bg-ink-800/50 cursor-pointer group"
                    >
                      <Icon name={t.icon} className="h-3.5 w-3.5 text-signal-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="block truncate text-[11px] font-bold text-bone-200 group-hover:text-signal-300">
                          {t.name}
                        </span>
                        <span className="font-mono text-[8.5px] text-ink-500 uppercase">
                          {t.group}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
