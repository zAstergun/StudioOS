import { useState, useEffect } from "react";
import { Icon } from "./ui";
import { cn } from "../utils/cn";
import { supabase, useAuth } from "../auth";

export interface SaveItemProps {
  title: string;
  url?: string;
  type: string;
  metadata?: any;
}

interface SaveToSalvosModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: SaveItemProps | null;
  onSaveSuccess?: (savedItem: any) => void;
}

export function SaveToSalvosModal({ isOpen, onClose, item, onSaveSuccess }: SaveToSalvosModalProps) {
  const { user } = useAuth();
  const [categories, setCategories] = useState<{ id: string; name: string; color: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user && supabase) {
      setLoading(true);
      supabase
        .from("studioos_saved_categories")
        .select("*")
        .order("created_at", { ascending: true })
        .then(({ data }) => {
          if (data) setCategories(data);
          setLoading(false);
        });
    }
  }, [isOpen, user]);

  if (!isOpen || !item) return null;

  const handleSaveToCategory = async (categoryId: string) => {
    if (!user || !supabase) return;
    setSavingId(categoryId);

    const targetMetaId = item.metadata?.id !== undefined ? String(item.metadata.id) : null;

    // Prevent duplicates across all categories
    const { data: existing } = await supabase
      .from("studioos_saved_items")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", item.type);

    const isDuplicate = existing?.find(e => {
      let m = e.metadata;
      if (typeof m === "string") {
        try { m = JSON.parse(m); } catch {}
      }
      const existingMetaId = m?.id !== undefined ? String(m.id) : null;
      if (existingMetaId && targetMetaId) {
        return existingMetaId === targetMetaId;
      }
      return item.title && e.title === item.title;
    });

    if (isDuplicate) {
      if (isDuplicate.category_id !== categoryId) {
        const { data: updated } = await supabase
          .from("studioos_saved_items")
          .update({ category_id: categoryId })
          .eq("id", isDuplicate.id)
          .select()
          .single();

        if (onSaveSuccess) onSaveSuccess(updated || { ...isDuplicate, category_id: categoryId });
      } else {
        if (onSaveSuccess) onSaveSuccess(isDuplicate);
      }
      setSavingId(null);
      onClose();
      return;
    }

    const { data, error } = await supabase.from("studioos_saved_items").insert([{
      user_id: user.id,
      category_id: categoryId,
      title: item.title,
      url: item.url || null,
      type: item.type,
      metadata: item.metadata || null
    }]).select().single();

    setSavingId(null);
    if (error) {
      alert("Erro ao salvar: " + error.message);
    } else {
      if (onSaveSuccess && data) {
        onSaveSuccess(data);
      }
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/85 p-4 backdrop-blur-md"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-[440px] overflow-hidden rounded-2xl border border-ink-700/50 bg-ink-900 shadow-[0_40px_100px_-30px_rgba(0,0,0,0.9)]">
        <div className="border-b border-ink-800/60 bg-ink-900/80 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal-400/10">
                <Icon name="bookmark" className="h-3.5 w-3.5 text-signal-400" strokeWidth={2} />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-bone-50">Salvar em...</h2>
                <p className="font-mono text-[9px] tracking-[0.14em] text-bone-300 uppercase truncate max-w-[200px]">
                  {item.title}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-bone-300 transition-colors hover:bg-ink-800 hover:text-bone-200"
            >
              <Icon name="close" className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-ink-300">
              <Icon name="refresh" className="h-5 w-5 animate-spin" />
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-8 text-ink-400 text-sm">
              Você ainda não tem nenhuma guia criada em Salvos.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleSaveToCategory(cat.id)}
                  disabled={savingId !== null}
                  className="flex items-center justify-between rounded-lg border border-ink-800/60 bg-ink-950/50 px-4 py-3 text-left transition-all hover:bg-ink-800/60 hover:border-signal-400/30 disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.color || "#6E93F5" }} />
                    <span className="font-mono text-xs font-bold uppercase tracking-widest text-bone-100">
                      {cat.name}
                    </span>
                  </div>
                  {savingId === cat.id ? (
                    <Icon name="refresh" className="h-4 w-4 text-signal-400 animate-spin" />
                  ) : (
                    <Icon name="plus" className="h-4 w-4 text-ink-300" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
