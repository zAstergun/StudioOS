import { useState, useEffect, useRef } from "react";
import { Icon, Reveal } from "../components/ui";
import { cn } from "../utils/cn";
import { useAuth, supabase } from "../auth";

const PALETTE = ["#F2604C", "#F2B33D", "#2FD4A0", "#6E93F5", "#D946EF", "#A855F7", "#F472B6", "#38BDF8"];

export function SalvosScreen() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<{id: string, name: string, color: string}[]>([]);
  const [activeTab, setActiveTab] = useState<string>("todos");
  const [showModal, setShowModal] = useState(false);
  const [newTabName, setNewTabName] = useState("");
  const [newTabColor, setNewTabColor] = useState(PALETTE[3]); // Default blue

  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editTabName, setEditTabName] = useState("");
  const [editTabColor, setEditTabColor] = useState(PALETTE[3]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch from Supabase
  useEffect(() => {
    if (!user || !supabase) return;
    
    const fetchCategories = async () => {
      const { data, error } = await supabase!
        .from("studioos_saved_categories")
        .select("*")
        .order("created_at", { ascending: true });
        
      if (!error && data) {
        setCategories(data.map(d => ({
          id: d.id,
          name: d.name,
          color: d.color
        })));
      }
    };

    fetchCategories();

    const channel = supabase!.channel('categories_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'studioos_saved_categories', filter: `user_id=eq.${user.id}` }, fetchCategories)
      .subscribe();

    return () => {
      supabase!.removeChannel(channel);
    };
  }, [user]);

  const handleCreateTab = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newTabName.trim() || !user || !supabase) {
      setShowModal(false);
      return;
    }
    
    const newName = newTabName.trim();
    // Optimistic update
    const tempId = `temp_${Date.now()}`;
    setCategories(prev => [...prev, { id: tempId, name: newName, color: newTabColor }]);
    setActiveTab(tempId);
    
    setNewTabName("");
    setNewTabColor(PALETTE[3]);
    setShowModal(false);

    const { data, error } = await supabase!.from("studioos_saved_categories").insert([{
      user_id: user.id,
      name: newName,
      color: newTabColor
    }]).select().single();

    if (error) {
      console.error("Erro ao criar guia:", error);
      alert("Erro ao criar guia: " + error.message);
      // Revert optimistic update
      setCategories(prev => prev.filter(c => c.id !== tempId));
      if (activeTab === tempId) setActiveTab("todos");
    } else if (data) {
      setCategories(prev => prev.map(c => c.id === tempId ? { id: data.id, name: data.name, color: data.color } : c));
      setActiveTab(data.id);
    }
  };

  const handleEditTab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTabId || !editTabName.trim() || !supabase) return;
    
    // Optimistic update
    setCategories(prev => prev.map(c => 
      c.id === editingTabId ? { ...c, name: editTabName.trim(), color: editTabColor } : c
    ));
    
    const idToUpdate = editingTabId;
    setEditingTabId(null);

    const { error } = await supabase!.from("studioos_saved_categories").update({
      name: editTabName.trim(),
      color: editTabColor
    }).eq("id", idToUpdate);

    if (error) {
      console.error("Erro ao editar guia:", error);
      alert("Erro ao editar guia: " + error.message);
      // Revert optimistic update by reloading from server (or simply doing nothing, as real-time will eventually sync, but let's reload)
      const { data } = await supabase!.from("studioos_saved_categories").select("*").order("created_at", { ascending: true });
      if (data) setCategories(data.map(d => ({ id: d.id, name: d.name, color: d.color })));
    }
  };

  const handleDeleteTab = async () => {
    if (!editingTabId || !supabase) return;
    
    const idToDelete = editingTabId;
    // Optimistic update
    setCategories(prev => prev.filter(c => c.id !== idToDelete));
    if (activeTab === idToDelete) {
      setActiveTab("todos");
    }
    setEditingTabId(null);

    const { error } = await supabase!.from("studioos_saved_categories").delete().eq("id", idToDelete);
    if (error) {
      console.error("Erro ao deletar guia:", error);
      alert("Erro ao deletar guia: " + error.message);
      // Revert optimistic update by reloading from server
      const { data } = await supabase!.from("studioos_saved_categories").select("*").order("created_at", { ascending: true });
      if (data) setCategories(data.map(d => ({ id: d.id, name: d.name, color: d.color })));
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
                <Icon name="bookmark" className="h-4 w-4 text-signal-400" strokeWidth={2} />
              </div>
              <span className="font-mono text-[10px] tracking-[0.22em] text-signal-400 uppercase">
                Workspace · Salvos
              </span>
            </div>
            <h1 className="font-display text-[2.6rem] leading-[0.95] font-extrabold tracking-[-0.03em] text-bone-50">
              Itens Salvos
            </h1>
            <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-ink-300">
              Gerencie e acesse todos os seus recursos favoritos categorizados por guias.
            </p>
          </div>
        </div>
      </Reveal>

      {/* TABS / GUIAS */}
      <Reveal delay={80} className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1 rounded-lg border border-ink-800/50 bg-ink-900/20 p-1">
            <button
              onClick={() => setActiveTab("todos")}
              className={cn(
                "flex items-center gap-2 rounded-md px-4 py-2 font-mono text-[10px] tracking-[0.12em] uppercase transition-all duration-200",
                activeTab === "todos" 
                  ? "bg-ink-800/80 text-bone-50 shadow-sm" 
                  : "text-bone-300 hover:text-ink-300 hover:bg-ink-800/40"
              )}
            >
              Todos
            </button>
            
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={cn(
                  "group relative flex items-center gap-2 rounded-md py-2 pl-4 pr-7 font-mono text-[10px] tracking-[0.12em] uppercase transition-all duration-200",
                  activeTab === cat.id 
                    ? "bg-ink-800/80 text-bone-50 shadow-sm" 
                    : "text-bone-300 hover:text-ink-300 hover:bg-ink-800/40"
                )}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cat.color || "#6E93F5" }} />
                {cat.name}
                
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingTabId(cat.id);
                    setEditTabName(cat.name);
                    setEditTabColor(cat.color || PALETTE[3]);
                    setShowDeleteConfirm(false);
                  }}
                  className="absolute right-1.5 flex h-5 w-5 items-center justify-center rounded-sm opacity-0 transition-all hover:bg-ink-700/60 hover:text-bone-50 group-hover:opacity-100"
                >
                  <Icon name="edit" className="h-2.5 w-2.5" />
                </div>
              </button>
            ))}

            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 rounded-md px-3 py-2 font-mono text-[10px] tracking-[0.12em] uppercase transition-all duration-200 text-ink-400 hover:text-bone-300 hover:bg-ink-800/40 ml-1"
            >
              <Icon name="plus" className="h-3 w-3" strokeWidth={2} />
              Nova Guia
            </button>
          </div>
        </div>
      </Reveal>

      {/* EMPTY STATE */}
      <Reveal delay={120}>
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-dashed border-ink-800/60 bg-ink-900/30 p-8 text-center relative overflow-hidden">
          {activeTab !== "todos" && categories.find(c => c.id === activeTab) && (
            <div 
              className="pointer-events-none absolute -inset-px opacity-[0.03] transition-opacity duration-500"
              style={{ background: `radial-gradient(ellipse at center, ${categories.find(c => c.id === activeTab)?.color}, transparent 70%)` }}
            />
          )}
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-800/40 relative z-10">
            <Icon name="bookmark" className="h-6 w-6 text-ink-400" strokeWidth={1.5} />
          </div>
          <h3 className="font-display text-[20px] font-bold text-bone-100 relative z-10">
            {activeTab === "todos" ? "Nenhum item salvo" : `Nenhum item em "${categories.find(c => c.id === activeTab)?.name}"`}
          </h3>
          <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-ink-300 relative z-10">
            Quando você salvar ideias, referências ou roteiros, eles aparecerão aqui classificados por guias.
          </p>
        </div>
      </Reveal>

      {/* MODAL NOVA GUIA */}
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
                    <h2 className="font-display text-lg font-bold text-bone-50">Nova Guia</h2>
                    <p className="font-mono text-[9px] tracking-[0.14em] text-bone-300 uppercase">Categoria de salvos</p>
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
            <form onSubmit={handleCreateTab} className="p-6">
              <div className="mb-6">
                <label className="mb-2 block font-mono text-[10px] tracking-[0.14em] text-ink-300 uppercase">
                  Nome da Guia
                </label>
                <input 
                  type="text" 
                  value={newTabName}
                  onChange={(e) => setNewTabName(e.target.value)}
                  placeholder="Ex: Referências Visuais"
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
                      onClick={() => setNewTabColor(c)}
                      className={cn(
                        "relative flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200",
                        newTabColor === c 
                          ? "scale-110 ring-2 ring-bone-300/60 ring-offset-2 ring-offset-ink-900" 
                          : "hover:scale-110"
                      )}
                      style={{ backgroundColor: c }}
                    >
                      {newTabColor === c && (
                        <Icon name="check" className="h-3 w-3 text-ink-950" strokeWidth={3} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-lg border border-ink-800/60 bg-ink-900 px-4 py-3 font-mono text-[10px] font-bold tracking-[0.14em] text-bone-300 uppercase transition-colors hover:bg-ink-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!newTabName.trim()}
                  className="flex-1 rounded-lg bg-signal-400 px-4 py-3 font-mono text-[10px] font-bold tracking-[0.14em] text-ink-950 uppercase transition-all duration-200 hover:bg-signal-400/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Criar Guia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR GUIA */}
      {editingTabId && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/85 p-4 backdrop-blur-md"
          onClick={(e) => { if (e.target === e.currentTarget) setEditingTabId(null); }}
        >
          <div className="relative w-full max-w-[440px] overflow-hidden rounded-2xl border border-ink-700/50 bg-ink-900 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.9)]">
            <div className="border-b border-ink-800/60 bg-ink-900/80 px-6 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal-400/10">
                    <Icon name="edit" className="h-3.5 w-3.5 text-signal-400" strokeWidth={2} />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold text-bone-50">Editar Guia</h2>
                    <p className="font-mono text-[9px] tracking-[0.14em] text-bone-300 uppercase">Ajustar categoria</p>
                  </div>
                </div>
                <button 
                  onClick={() => setEditingTabId(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-bone-300 transition-colors hover:bg-ink-800 hover:text-bone-200"
                >
                  <Icon name="close" className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            <form onSubmit={handleEditTab} className="p-6">
              {!showDeleteConfirm ? (
                <>
                  <div className="mb-6">
                    <label className="mb-2 block font-mono text-[10px] tracking-[0.14em] text-ink-300 uppercase">
                      Nome da Guia
                    </label>
                    <input 
                      type="text" 
                      value={editTabName}
                      onChange={(e) => setEditTabName(e.target.value)}
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
                          onClick={() => setEditTabColor(c)}
                          className={cn(
                            "relative flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200",
                            editTabColor === c 
                              ? "scale-110 ring-2 ring-bone-300/60 ring-offset-2 ring-offset-ink-900" 
                              : "hover:scale-110"
                          )}
                          style={{ backgroundColor: c }}
                        >
                          {editTabColor === c && (
                            <Icon name="check" className="h-3 w-3 text-ink-950" strokeWidth={3} />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex items-center gap-2 font-mono text-[10px] font-bold tracking-[0.14em] text-red-400 uppercase transition-colors hover:text-red-300"
                    >
                      <Icon name="trash" className="h-3.5 w-3.5" />
                      Remover Guia
                    </button>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setEditingTabId(null)}
                        className="rounded-lg border border-ink-800/60 bg-ink-900 px-4 py-3 font-mono text-[10px] font-bold tracking-[0.14em] text-bone-300 uppercase transition-colors hover:bg-ink-800"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={!editTabName.trim()}
                        className="rounded-lg bg-signal-400 px-4 py-3 font-mono text-[10px] font-bold tracking-[0.14em] text-ink-950 uppercase transition-all duration-200 hover:bg-signal-400/90 disabled:opacity-50"
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-4 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-400/10">
                    <Icon name="trash" className="h-5 w-5 text-red-400" />
                  </div>
                  <h3 className="mb-2 font-display text-[16px] font-bold text-bone-100">Excluir Guia?</h3>
                  <p className="mb-8 text-[13px] leading-relaxed text-ink-300">
                    Tem certeza de que deseja excluir a guia <strong className="text-bone-100">{editTabName}</strong>? Isso não pode ser desfeito.
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 rounded-lg border border-ink-800/60 bg-ink-900 px-4 py-3 font-mono text-[10px] font-bold tracking-[0.14em] text-bone-300 uppercase transition-colors hover:bg-ink-800"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteTab}
                      className="flex-1 rounded-lg bg-red-500 px-4 py-3 font-mono text-[10px] font-bold tracking-[0.14em] text-white uppercase transition-all duration-200 hover:bg-red-600"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
