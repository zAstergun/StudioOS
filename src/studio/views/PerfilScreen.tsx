import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Cropper from "react-easy-crop";
import { Panel, Reveal, Icon, Button, Input, Label, Select } from "../components/ui";
import { VipBadge } from "../components/VipBadge";
import { useAuth, supabase } from "../auth";
import { computeProjectStatus } from "./ProjetosScreen";
import { cn } from "../utils/cn";

const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<File | null> => {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (error) => reject(error);
    img.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(null);
        return;
      }
      resolve(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }));
    }, 'image/jpeg');
  });
};

export default function PerfilScreen({
  onGo,
  viewedHandle,
  onClearViewedHandle,
}: {
  onGo?: (id: string, extra?: string) => void;
  viewedHandle?: string | null;
  onClearViewedHandle?: () => void;
}) {
  const { user, updateProfile, updateEmail, updateAvatar, deleteAccount, updatePassword, linkIdentity, unlinkIdentity, getIdentities } = useAuth();
  
  const cleanViewedHandle = viewedHandle ? viewedHandle.trim().replace(/^@/, '').toLowerCase() : null;
  const myChannelClean = (user?.channel || "").trim().replace(/^@/, '').toLowerCase();
  const isViewingOther = Boolean(cleanViewedHandle && cleanViewedHandle !== myChannelClean);
  const isViewingOwnPublicPreview = Boolean(cleanViewedHandle && cleanViewedHandle === myChannelClean);
  const isPublicView = isViewingOther || isViewingOwnPublicPreview;

  // Estados para visualização de outro perfil
  const [targetProfile, setTargetProfile] = useState<any>(null);
  const [targetProjects, setTargetProjects] = useState<any[]>([]);
  const [targetLoading, setTargetLoading] = useState(false);
  const [targetNotFound, setTargetNotFound] = useState(false);

  // Estados de curtidas
  const [likesCount, setLikesCount] = useState<number>(0);
  const [hasLiked, setHasLiked] = useState<boolean>(false);
  const [likingLoading, setLikingLoading] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const [tab, setTab] = useState<"geral" | "seguranca" | "preferencias" | "atividade">("geral");
  const [name, setName] = useState(user?.name || "");
  const [channel, setChannel] = useState(user?.channel || "");
  const [email, setEmail] = useState(user?.email || "");
  const [saving, setSaving] = useState(false);

  const DEFAULT_BIO = "Criador de conteúdo usando o StudioOS. Transformando ideias cruas em projetos publicados com o auxílio de ferramentas conectadas e com número e critério em cada etapa.";
  const [bio, setBio] = useState(user?.bio || DEFAULT_BIO);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  const [website, setWebsite] = useState("aster.studio");
  const [youtube, setYoutube] = useState("youtube.com/@aster");
  const [instagram, setInstagram] = useState("instagram.com/aster");
  const [tiktok, setTiktok] = useState("tiktok.com/@aster");
  const [discord, setDiscord] = useState("discord.gg/aster");
  const [savingLinks, setSavingLinks] = useState(false);

  const [cardVisibility, setCardVisibility] = useState({
    stats: true,
    projects: true,
    video: true,
    achievements: true,
    comments: true,
  });

  // Modo de edição do perfil
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [draftName, setDraftName] = useState(name);
  const [draftChannel, setDraftChannel] = useState(channel ? channel.replace(/^@/, '') : "");
  const [draftBio, setDraftBio] = useState(bio);
  const [draftWebsite, setDraftWebsite] = useState(website);
  const [draftYoutube, setDraftYoutube] = useState(youtube);
  const [draftInstagram, setDraftInstagram] = useState(instagram);
  const [draftTiktok, setDraftTiktok] = useState(tiktok);
  const [draftDiscord, setDraftDiscord] = useState(discord);
  const [draftCardVisibility, setDraftCardVisibility] = useState({ ...cardVisibility });
  const [copiedLink, setCopiedLink] = useState(false);

  // Busca perfil de outro criador quando necessário
  useEffect(() => {
    if (!isViewingOther || !cleanViewedHandle || !supabase) {
      setTargetProfile(null);
      setTargetProjects([]);
      setTargetNotFound(false);
      return;
    }
    const client = supabase;
    setTargetLoading(true);
    setTargetNotFound(false);

    const fetchTargetProfile = async () => {
      try {
        const { data: prof, error: profErr } = await client
          .from("profiles")
          .select("*")
          .ilike("channel", cleanViewedHandle)
          .maybeSingle();

        if (profErr || !prof) {
          setTargetNotFound(true);
          setTargetLoading(false);
          return;
        }
        setTargetProfile(prof);

        const { data: projs } = await client
          .from("studioos_projects")
          .select("id, name, status, progress, color, external_link, studioos_tasks(status)")
          .eq("owner_id", prof.id)
          .order("created_at", { ascending: false });

        if (projs) {
          const statusMap: Record<string, string> = {
            active: "Em andamento",
            planning: "Planejamento",
            completed: "Concluído",
            archived: "Arquivado",
            trashed: "Lixeira"
          };
          const mapped = projs
            .filter((p: any) => p.status === "active" || p.status === "planning" || p.status === "Em andamento")
            .map((p: any) => {
              const tasks = p.studioos_tasks || [];
              const totalTasks = tasks.length;
              const doneTasks = tasks.filter((t: any) => t.status === "done").length;
              const calculatedProgress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : (p.progress || 0);
              return {
                id: p.id,
                name: p.name,
                status: statusMap[p.status] || p.status,
                statusCode: p.status,
                progress: calculatedProgress,
                color: p.color || "#6E93F5",
                external_link: p.external_link
              };
            });
          setTargetProjects(mapped);
        }
        setTargetLoading(false);
      } catch {
        setTargetNotFound(true);
        setTargetLoading(false);
      }
    };

    fetchTargetProfile();
  }, [cleanViewedHandle, isViewingOther]);

  // Sincroniza informações de curtidas do perfil ativo
  const currentProfileId = isViewingOther ? targetProfile?.id : user?.id;

  useEffect(() => {
    if (!currentProfileId || !supabase) return;
    const client = supabase;
    const localLiked = typeof localStorage !== 'undefined' && localStorage.getItem(`studioos.liked.${currentProfileId}`) === "true";

    const fetchLikes = async () => {
      let res = await client.rpc("studioos_get_profile_likes_info", { p_target_id: currentProfileId });
      if (res.error) {
        res = await client.rpc("get_profile_likes_info", { p_target_id: currentProfileId });
      }
      if (!res.error && res.data) {
        setLikesCount(Number(res.data.likes_count) || 0);
        setHasLiked(Boolean(res.data.liked) || localLiked);
      } else if (isViewingOther && targetProfile?.stats?.likes_count !== undefined) {
        setLikesCount(Number(targetProfile.stats.likes_count) || 0);
        setHasLiked(localLiked);
      }
    };
    fetchLikes();
  }, [currentProfileId, isViewingOther, targetProfile]);

  const handleToggleLike = async () => {
    if (!currentProfileId || !supabase || likingLoading) return;
    
    // 1. Somente quem tem uma conta pode curtir o perfil de outra pessoa
    const isRealUser = user && user.provider !== "demo";
    if (!isRealUser) {
      setShowLoginPrompt(true);
      return;
    }

    if (user.is_temporary) {
      alert("Contas de teste não podem curtir perfis. Crie uma conta definitiva para interagir.");
      return;
    }

    // 2. Não pode curtir o próprio perfil
    if (user.id === currentProfileId) {
      alert("Você não pode curtir seu próprio perfil.");
      return;
    }

    setLikingLoading(true);
    const nextLiked = !hasLiked;
    const nextCount = Math.max(0, likesCount + (nextLiked ? 1 : -1));

    // Atualização otimista na interface
    setHasLiked(nextLiked);
    setLikesCount(nextCount);
    try {
      localStorage.setItem(`studioos.liked.${currentProfileId}`, nextLiked ? "true" : "false");
    } catch {}

    try {
      let res = await supabase.rpc("studioos_toggle_profile_like", {
        p_target_id: currentProfileId,
      });
      if (res.error) {
        res = await supabase.rpc("toggle_profile_like", {
          p_target_id: currentProfileId,
        });
      }
      if (!res.error && res.data) {
        setHasLiked(Boolean(res.data.liked));
        setLikesCount(Number(res.data.likes_count) || 0);
      } else if (res.error) {
        // Se a API recusar (ex: sem conta ou erro), reverte o estado otimista
        setHasLiked(!nextLiked);
        setLikesCount(likesCount);
        alert(res.error.message || "Não foi possível registrar a curtida.");
      }
    } catch (err) {
      console.error("Erro ao curtir perfil:", err);
      setHasLiked(!nextLiked);
      setLikesCount(likesCount);
    } finally {
      setLikingLoading(false);
    }
  };

  // Estados e lógica de comentários do perfil
  const [comments, setComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [commentToDelete, setCommentToDelete] = useState<any | null>(null);
  const [isDeletingComment, setIsDeletingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    if (!currentProfileId || !supabase) return;
    setCommentsLoading(true);
    setCommentError(null);
    try {
      let { data, error } = await supabase.rpc("studioos_get_profile_comments_v2", {
        p_profile_id: currentProfileId,
      });
      if (error) {
        const fallback = await supabase.rpc("studioos_get_profile_comments", {
          p_profile_id: currentProfileId,
        });
        if (!fallback.error) {
          data = fallback.data;
          error = null;
        }
      }
      if (!error && Array.isArray(data)) {
        setComments(data);
      } else {
        const { data: raw, error: rawErr } = await supabase
          .from("studioos_profile_comments")
          .select("id, profile_id, author_id, content, created_at, profiles:author_id(full_name, channel, avatar_url, is_vip)")
          .eq("profile_id", currentProfileId)
          .order("created_at", { ascending: false });
        if (!rawErr && raw) {
          setComments(raw.map((r: any) => ({
            id: r.id,
            profile_id: r.profile_id,
            author_id: r.author_id,
            content: r.content,
            created_at: r.created_at,
            author_name: r.profiles?.full_name || "Criador",
            author_channel: r.profiles?.channel || "usuario",
            author_avatar: r.profiles?.avatar_url || null,
            author_is_vip: Boolean(r.profiles?.is_vip),
          })));
        }
      }
    } catch {
      // ignore
    } finally {
      setCommentsLoading(false);
    }
  }, [currentProfileId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Real-time listener para novos comentários e exclusões
  useEffect(() => {
    if (!currentProfileId || !supabase) return;
    const client = supabase;
    const channel = client
      .channel(`profile_comments_${currentProfileId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "studioos_profile_comments",
          filter: `profile_id=eq.${currentProfileId}`,
        },
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [currentProfileId, fetchComments]);

  const handlePostComment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user || user.provider === "demo") {
      alert("Apenas usuários autenticados com conta podem comentar nos perfis do StudioOS.");
      onGo?.("login");
      return;
    }
    if (user.is_temporary) {
      alert("Contas de teste não podem comentar em perfis. Crie uma conta definitiva para interagir.");
      return;
    }
    if (!currentProfileId || !supabase) return;

    const trimmed = commentText.trim();
    if (!trimmed) return;
    if (trimmed.length > 500) {
      alert("O comentário deve ter no máximo 500 caracteres.");
      return;
    }

    setPostingComment(true);
    setCommentError(null);

    try {
      const { error } = await supabase
        .from("studioos_profile_comments")
        .insert({
          profile_id: currentProfileId,
          author_id: user.id,
          content: trimmed,
        });

      if (error) {
        setCommentError(error.message || "Erro ao publicar comentário.");
      } else {
        setCommentText("");
        fetchComments();
      }
    } catch (err: any) {
      setCommentError(err?.message || "Erro inesperado ao comentar.");
    } finally {
      setPostingComment(false);
    }
  };

  const handleDeleteComment = (comment: any) => {
    setCommentToDelete(comment);
  };

  const confirmDeleteComment = async () => {
    if (!commentToDelete || !user || !supabase) return;

    setIsDeletingComment(true);
    setDeletingCommentId(commentToDelete.id);
    try {
      const { error } = await supabase
        .from("studioos_profile_comments")
        .delete()
        .eq("id", commentToDelete.id);

      if (error) {
        alert(error.message || "Não foi possível excluir o comentário.");
      } else {
        setComments((prev) => prev.filter((c) => c.id !== commentToDelete.id));
        setCommentToDelete(null);
      }
    } catch {
      alert("Erro ao excluir comentário.");
    } finally {
      setIsDeletingComment(false);
      setDeletingCommentId(null);
    }
  };

  // Fecha modal de exclusão ao apertar Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && commentToDelete && !isDeletingComment) {
        setCommentToDelete(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [commentToDelete, isDeletingComment]);

  const handleToggleCommentsVisibility = async () => {
    if (isViewingOther || !user || !supabase) return;
    const currentVal = cardVisibility.comments !== false;
    const nextVal = !currentVal;
    const nextVis = { ...cardVisibility, comments: nextVal };
    setCardVisibility(nextVis);
    setDraftCardVisibility(nextVis);
    try {
      localStorage.setItem(`studioos.cardVis.${user.id}`, JSON.stringify(nextVis));
      await supabase.from("profiles").update({ card_visibility: nextVis }).eq("id", user.id);
    } catch (err) {
      console.error("Erro ao alternar visibilidade dos comentários:", err);
    }
  };

  const nameInputRef = useRef<HTMLInputElement>(null);
  const channelInputRef = useRef<HTMLInputElement>(null);
  const bioInputRef = useRef<HTMLTextAreaElement>(null);

  const handleSaveLinks = () => {
    setSavingLinks(true);
    localStorage.setItem("studioos.onboarding.hasPrefs", "true");
    setHasPrefs(true);
    setTimeout(() => setSavingLinks(false), 800);
  };
  const [pass, setPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newPassConf, setNewPassConf] = useState("");
  const [passSaving, setPassSaving] = useState(false);
  const [identities, setIdentities] = useState<any[]>([]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal crop
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  // Modal deletion state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);


  const [readWiki, setReadWiki] = useState(false);
  const [hasProject, setHasProject] = useState(false);
  const [hasPrefs, setHasPrefs] = useState(false);
  const [hideOnboarding, setHideOnboarding] = useState(false);

  const [ongoingProjects, setOngoingProjects] = useState<any[]>([]);
  const [completedProjectsCount, setCompletedProjectsCount] = useState<number>(0);

  useEffect(() => {
    if (user && supabase) {
      const fetchProjects = async () => {
        const { data, error } = await supabase!
          .from("studioos_projects")
          .select("id, name, status, progress, color, owner_id, external_link, studioos_project_members(user_id), studioos_tasks(status)")
          .in("status", ["active", "planning"])
          .order("created_at", { ascending: false })
          .limit(10);
          
        if (!error && data) {
          const statusMap: Record<string, string> = {
            active: "Em andamento",
            planning: "Planejamento",
            completed: "Concluído"
          };
          const mappedOngoing = data
            .map((d: any) => {
              const tasks = d.studioos_tasks || [];
              const totalTasks = tasks.length;
              const doneTasks = tasks.filter((t: any) => t.status === "done").length;
              const calculatedProgress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : (d.progress || 0);
              const derivedStatus = computeProjectStatus(tasks, d.status);
              
              return {
                id: d.id,
                name: d.name,
                status: statusMap[derivedStatus] || derivedStatus,
                statusCode: derivedStatus,
                progress: calculatedProgress,
                color: d.color || "#6E93F5",
                external_link: d.external_link
              };
            })
            .filter((p: any) => p.statusCode !== "completed");

          setOngoingProjects(mappedOngoing);
        }

        const { count: compCount } = await supabase!
          .from("studioos_projects")
          .select("id", { count: "exact", head: true })
          .eq("owner_id", user.id)
          .eq("status", "completed");
        if (typeof compCount === "number") {
          setCompletedProjectsCount(compCount);
        }
      };
      fetchProjects();

      const fetchVideoProjects = async () => {
        const { data, error } = await supabase!
          .from("studioos_projects")
          .select("id, name, status, progress, color, external_link")
          .not("external_link", "is", null)
          .order("created_at", { ascending: false });
          
        if (!error && data) {
          const statusMap: Record<string, string> = {
            active: "Em andamento",
            planning: "Planejamento",
            completed: "Concluído",
            archived: "Arquivado",
            trashed: "Lixeira"
          };
          setVideoProjects(data.filter(d => d.external_link && d.external_link.trim() !== "").map(d => ({
            ...d,
            status: statusMap[d.status] || d.status
          })));
        }
      };
      fetchVideoProjects();

      const channel = supabase!.channel('perfil_projects_live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'studioos_projects' }, () => {
          fetchProjects();
          fetchVideoProjects();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'studioos_tasks' }, () => {
          fetchProjects();
        })
        .subscribe();

      return () => {
        supabase!.removeChannel(channel);
      };
    }
  }, [user]);

  const [jokerTitle, setJokerTitle] = useState("Vídeo em Destaque");
  const [jokerProject, setJokerProject] = useState("");
  const [isEditingJoker, setIsEditingJoker] = useState(false);
  const [isSelectingProject, setIsSelectingProject] = useState(false);
  const [editingLink, setEditingLink] = useState(false);
  const [tempLink, setTempLink] = useState("");
  const [videoProjects, setVideoProjects] = useState<any[]>([]);
  const [isPlayingJokerVideo, setIsPlayingJokerVideo] = useState(false);
  const jokerVideoRef = useRef<HTMLDivElement>(null);

  const getEmbedUrl = (url?: string) => {
    if (!url) return null;
    try {
      const trimmed = url.trim();
      
      // Youtube
      const ytMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
      if (ytMatch && ytMatch[1]) {
        return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=0&rel=0`;
      }

      // Vimeo
      const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/);
      if (vimeoMatch && vimeoMatch[1]) {
        return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
      }

      // TikTok
      const tiktokMatch = trimmed.match(/tiktok\.com\/.*video\/(\d+)/);
      if (tiktokMatch && tiktokMatch[1]) {
        return `https://www.tiktok.com/embed/v2/${tiktokMatch[1]}`;
      }

      // Instagram
      if (trimmed.includes("instagram.com/")) {
        const path = trimmed.split("instagram.com/")[1].split("?")[0].replace(/\/$/, "");
        if (path.startsWith("p/") || path.startsWith("reel/")) {
          return `https://www.instagram.com/${path}/embed`;
        }
      }

      // MP4 Direct
      if (trimmed.endsWith(".mp4") || trimmed.endsWith(".webm")) {
        return trimmed;
      }

    } catch (e) {
      return null;
    }
    return null;
  };

  const handleSaveLink = async (projectId: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('studioos_projects').update({ external_link: tempLink }).eq('id', projectId);
    if (!error) {
      setOngoingProjects(prev => prev.map(p => p.id === projectId ? { ...p, external_link: tempLink } : p));
    }
    setEditingLink(false);
  };

  useEffect(() => {
    if (user) {
      setReadWiki(localStorage.getItem(`studioos.onboarding.readWiki.${user.id}`) === "true");
      setHasProject(localStorage.getItem(`studioos.onboarding.hasProject.${user.id}`) === "true");
      setHasPrefs(localStorage.getItem(`studioos.onboarding.hasPrefs.${user.id}`) === "true");
      setHideOnboarding(localStorage.getItem(`studioos.onboarding.hidden.${user.id}`) === "true");

      const savedTitle = localStorage.getItem(`studioos.showcaseTitle.${user.id}`);
      if (savedTitle) setJokerTitle(savedTitle);

      const savedProject = localStorage.getItem(`studioos.jokerProject.${user.id}`);
      if (savedProject) setJokerProject(savedProject);
    }
  }, [user]);

  useEffect(() => {
    if (user && mounted) {
      localStorage.setItem(`studioos.showcaseTitle.${user.id}`, jokerTitle);
      localStorage.setItem(`studioos.jokerProject.${user.id}`, jokerProject);
    }
  }, [jokerTitle, jokerProject, user, mounted]);

  const [userStats, setUserStats] = useState<Record<string, any>>({});
  const [historyTick, setHistoryTick] = useState(0);

  useEffect(() => {
    const onHistUpdate = () => setHistoryTick(t => t + 1);
    window.addEventListener("studioos:history", onHistUpdate);
    window.addEventListener("storage", onHistUpdate);
    return () => {
      window.removeEventListener("studioos:history", onHistUpdate);
      window.removeEventListener("storage", onHistUpdate);
    };
  }, []);

  const accountMetrics = useMemo(() => {
    // 1. Ideias reais
    let ideas: any[] = [];
    try {
      const raw = localStorage.getItem("studioos.ideas.v1");
      if (raw) ideas = JSON.parse(raw);
    } catch {}
    const ideasCount = ideas.length;

    // 2. Projetos reais do usuário
    const projectsCount = ongoingProjects.length;

    // 3. Histórico de execuções de ferramentas
    const historyEntries: {
      id: string;
      tool: string;
      toolName: string;
      timestamp: number;
      score?: number;
    }[] = [];

    const seenIds = new Set<string>();

    try {
      const rawHist = localStorage.getItem("studioos.history.v1");
      if (rawHist) {
        const parsed = JSON.parse(rawHist);
        if (Array.isArray(parsed)) {
          parsed.forEach(item => {
            if (item && item.id && !seenIds.has(item.id)) {
              seenIds.add(item.id);
              let score: number | undefined;
              if (typeof item.score === "number" && !isNaN(item.score)) {
                score = item.score <= 10 ? item.score : (item.score <= 50 ? (item.score / 50) * 10 : (item.score / 100) * 10);
              } else if (item.tag && typeof item.tag === "string") {
                const match100 = item.tag.match(/([\d.]+)\s*\/\s*100/);
                if (match100) {
                  const raw = parseFloat(match100[1]);
                  if (!isNaN(raw)) score = (raw / 100) * 10;
                } else {
                  const match50 = item.tag.match(/([\d.]+)\s*\/\s*50/);
                  if (match50) {
                    const raw = parseFloat(match50[1]);
                    if (!isNaN(raw)) score = (raw / 50) * 10;
                  } else {
                    const match10 = item.tag.match(/([\d.]+)\s*\/\s*10(?!\d)/);
                    if (match10) {
                      const raw = parseFloat(match10[1]);
                      if (!isNaN(raw)) score = Math.min(10, Math.max(0, raw));
                    }
                  }
                }
              }
              historyEntries.push({
                id: item.id,
                tool: (item.tool || "tool").toLowerCase(),
                toolName: item.toolName || item.tool || "Ferramenta",
                timestamp: Number(item.createdAt) || Date.now(),
                score
              });
            }
          });
        }
      }
    } catch {}

    try {
      const rawAi = localStorage.getItem("ai_history");
      if (rawAi) {
        const parsed = JSON.parse(rawAi);
        if (Array.isArray(parsed)) {
          parsed.forEach(item => {
            const key = item.id || item.date || JSON.stringify(item.prompt || "");
            if (item && !seenIds.has(key)) {
              seenIds.add(key);
              let toolKey = "hooks";
              let toolName = "Gerador de Hooks";
              if (item.tool && item.tool !== "Configurações") {
                toolKey = item.tool.toLowerCase();
                toolName = item.tool;
              } else if (item.prompt && item.prompt.toLowerCase().includes("hook")) {
                toolKey = "hooks";
                toolName = "Gerador de Hooks";
              }
              historyEntries.push({
                id: item.id || `h.${Date.now()}`,
                tool: toolKey,
                toolName: toolName,
                timestamp: item.date ? new Date(item.date).getTime() : (Number(item.id) || Date.now())
              });
            }
          });
        }
      }
    } catch {}

    const totalRuns = historyEntries.length;

    // 4. Mapeamento de ferramentas mais usadas
    const toolNameMap: Record<string, string> = {
      rank: "Rank de Ideia",
      hooks: "Gerador de Hooks",
      hook: "Gerador de Hooks",
      briefing: "Briefing Thumbnail",
      thumb: "Briefing Thumbnail",
      thumbnail: "Briefing Thumbnail",
      roteiro: "Roteiro & Gravação",
      receita: "Receita Viral",
      score: "Score do Post",
      humanizador: "Humanizador",
      mentor: "Mentor IA",
      titulos: "Gerador de Títulos",
      membros: "Área de Membros",
      painel: "Painel de Criação"
    };

    const toolCounts: Record<string, { name: string; runs: number }> = {};

    historyEntries.forEach(entry => {
      const key = entry.tool;
      const displayName = toolNameMap[key] || entry.toolName || key;
      if (!toolCounts[key]) {
        toolCounts[key] = { name: displayName, runs: 0 };
      }
      toolCounts[key].runs += 1;
    });

    Object.entries(userStats).forEach(([k, v]) => {
      if (k.startsWith("tool_")) {
        const toolKey = k.replace("tool_", "");
        const runs = Number(v) || 0;
        const displayName = toolNameMap[toolKey] || toolKey;
        if (!toolCounts[toolKey]) {
          toolCounts[toolKey] = { name: displayName, runs: runs };
        } else {
          toolCounts[toolKey].runs = Math.max(toolCounts[toolKey].runs, runs);
        }
      }
    });

    const toolsList = Object.entries(toolCounts)
      .map(([key, data]) => ({ id: key, name: data.name, runs: data.runs }))
      .filter(t => t.runs > 0)
      .sort((a, b) => b.runs - a.runs)
      .slice(0, 5);

    const maxToolRuns = toolsList.length > 0 ? Math.max(...toolsList.map(t => t.runs), 1) : 1;

    // 5. Carga por dia da semana (0=DOM, 1=SEG, ..., 6=SÁB)
    const dowCounts = [0, 0, 0, 0, 0, 0, 0];
    historyEntries.forEach(entry => {
      const dow = new Date(entry.timestamp).getDay();
      dowCounts[dow] += 1;
    });
    ideas.forEach(idea => {
      if (idea.ts) {
        const dow = new Date(idea.ts).getDay();
        dowCounts[dow] += 1;
      }
    });
    for (let d = 0; d < 7; d++) {
      const cloudDow = Number(userStats[`dow_${d}`] || 0);
      dowCounts[d] = Math.max(dowCounts[d], cloudDow);
    }
    const maxDow = Math.max(...dowCounts, 0);

    // 6. Linha do tempo real dos últimos 56 dias
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const DAY_MS = 86400000;
    const days56 = Array(56).fill(0);

    const registerTimestamp = (ts: number) => {
      const diff = Math.floor((todayStart + DAY_MS - ts) / DAY_MS);
      if (diff >= 0 && diff < 56) {
        const idx = 55 - diff;
        days56[idx] += 1;
      }
    };

    historyEntries.forEach(e => registerTimestamp(e.timestamp));
    ideas.forEach(i => i.ts && registerTimestamp(i.ts));

    const maxDayActions = Math.max(...days56, 0);
    const activeDaysCount = days56.filter(c => c > 0).length;
    const total56Actions = days56.reduce((a, b) => a + b, 0);

    const peakMinutes = maxDayActions * 15;
    const avgMinutesPerActiveDay = activeDaysCount > 0 ? Math.round((total56Actions * 15) / activeDaysCount) : 0;

    const startDateStr = new Date(todayStart - 55 * DAY_MS).toLocaleDateString("pt-BR");
    const endDateStr = now.toLocaleDateString("pt-BR");

    // 7. Horas em estúdio
    const studioMinutes = (projectsCount * 25) + (totalRuns * 15) + (ideasCount * 5);
    const studioHoursFormatted = `${Math.floor(studioMinutes / 60)}h`;
    const studioMinutesRemaining = studioMinutes % 60;
    const studioMinutesSuffix = ` ${studioMinutesRemaining}m`;

    // 8. Sequência atual real
    let streak = 0;
    let checkIdx = 55;
    if (days56[55] === 0 && days56[54] > 0) {
      checkIdx = 54;
    }
    while (checkIdx >= 0 && days56[checkIdx] > 0) {
      streak++;
      checkIdx--;
    }
    if (streak === 0 && (totalRuns > 0 || ideasCount > 0 || projectsCount > 0)) {
      streak = Number(userStats['streak']) || 1;
    }

    // 9. Nota média (escala de 0.0 a 5.0 estrelas)
    const scoredRuns = historyEntries.filter(e => typeof e.score === "number" && !isNaN(e.score));
    let avgRatingStr = "-";
    let avgRatingNum = 0;
    if (scoredRuns.length > 0) {
      const avg10 = scoredRuns.reduce((a, b) => a + (b.score || 0), 0) / scoredRuns.length;
      avgRatingNum = Math.min(5, Math.max(0, Math.round((avg10 / 2) * 10) / 10));
      avgRatingStr = `${avgRatingNum.toFixed(1)}/5`;
    } else if (userStats.avg_rating && typeof userStats.avg_rating === "string") {
      const match = userStats.avg_rating.match(/([\d.]+)\/5/);
      if (match) {
        const val = parseFloat(match[1]);
        if (!isNaN(val)) {
          const corrected = val > 5 ? Math.min(5, Math.round((val / 10) * 10) / 10) : val;
          avgRatingNum = corrected;
          avgRatingStr = `${corrected.toFixed(1)}/5`;
        }
      }
    }

    // 10. Dia mais ativo
    let bestDowIdx = 0;
    let bestDowVal = -1;
    for (let i = 0; i < 7; i++) {
      if (dowCounts[i] > bestDowVal) {
        bestDowVal = dowCounts[i];
        bestDowIdx = i;
      }
    }
    const dowNames = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
    const bestDowName = dowNames[bestDowIdx];

    return {
      ideasCount,
      projectsCount,
      totalRuns,
      toolsList,
      maxToolRuns,
      dowCounts,
      maxDow,
      days56,
      maxDayActions,
      activeDaysCount,
      peakMinutes,
      avgMinutesPerActiveDay,
      startDateStr,
      endDateStr,
      studioMinutes,
      studioHoursFormatted,
      studioMinutesSuffix,
      streak,
      avgRatingStr,
      avgRatingNum,
      bestDowName,
      completedProjectsCount,
      hasActivity: totalRuns > 0 || ideasCount > 0 || projectsCount > 0
    };
  }, [ongoingProjects, userStats, historyTick]);

  const effectiveMetrics = useMemo(() => {
    if (isViewingOther && targetProfile) {
      const stats = targetProfile.stats || {};
      const projs = targetProjects;
      const projectsCount = projs.length || Number(stats.projetos) || 0;
      const ideasCount = Number(stats.ideias_ranqueadas) || 0;
      const streak = Number(stats.streak) || 1;
      const studioMinutes = Number(stats.studio_minutes) || (projectsCount * 25 + ideasCount * 5);
      const studioHoursFormatted = `${Math.floor(studioMinutes / 60)}h`;
      const studioMinutesRemaining = studioMinutes % 60;
      const studioMinutesSuffix = ` ${studioMinutesRemaining}m`;
      const dowCounts = Array.isArray(stats.dow_totals) && stats.dow_totals.length === 7 ? stats.dow_totals : [0,0,0,0,0,0,0];
      const maxDow = Math.max(...dowCounts, 0);
      const days56 = Array.isArray(stats.days_56) && stats.days_56.length === 56 ? stats.days_56 : Array(56).fill(0);
      const maxDayActions = Math.max(...days56, 0);
      const activeDaysCount = days56.filter((c: number) => c > 0).length;
      const total56Actions = days56.reduce((a: number, b: number) => a + b, 0);
      const peakMinutes = maxDayActions * 15;
      const avgMinutesPerActiveDay = activeDaysCount > 0 ? Math.round((total56Actions * 15) / activeDaysCount) : 0;
      const toolsList = Array.isArray(stats.tool_breakdown) ? stats.tool_breakdown : [];
      const maxToolRuns = toolsList.length > 0 ? Math.max(...toolsList.map((t: any) => t.runs || 0), 1) : 1;
      
      let avgRatingStr = stats.avg_rating || "3.6/5";
      let avgRatingNum = 3.6;
      if (typeof avgRatingStr === "string") {
        const m = avgRatingStr.match(/([\d.]+)\/5/);
        if (m) {
          const val = parseFloat(m[1]);
          if (!isNaN(val)) {
            avgRatingNum = val > 5 ? Math.min(5, Math.round((val / 10) * 10) / 10) : val;
            avgRatingStr = `${avgRatingNum.toFixed(1)}/5`;
          }
        }
      }

      return {
        ideasCount,
        projectsCount,
        totalRuns: Number(stats.total_runs) || 0,
        toolsList,
        maxToolRuns,
        dowCounts,
        maxDow,
        days56,
        maxDayActions,
        activeDaysCount,
        peakMinutes,
        avgMinutesPerActiveDay,
        startDateStr: accountMetrics.startDateStr,
        endDateStr: accountMetrics.endDateStr,
        studioMinutes,
        studioHoursFormatted,
        studioMinutesSuffix,
        streak,
        avgRatingStr,
        avgRatingNum,
        bestDowName: stats.best_dow || "domingo",
        hasActivity: projectsCount > 0 || ideasCount > 0
      };
    }
    return accountMetrics;
  }, [isViewingOther, targetProfile, targetProjects, accountMetrics]);

  const metrics = effectiveMetrics;

  const displayedCardVis = isViewingOther 
    ? (targetProfile?.card_visibility || { stats: true, projects: true, video: true, achievements: true, comments: true }) 
    : cardVisibility;
  const displayedName = isViewingOther ? (targetProfile?.full_name || `@${cleanViewedHandle}`) : (name || "Usuário");
  const displayedChannel = isViewingOther ? `@${cleanViewedHandle}` : (channel ? (channel.startsWith('@') ? channel : `@${channel}`) : "@usuario");
  const displayedAvatar = isViewingOther ? targetProfile?.avatar_url : user?.avatarUrl;
  const displayedBio = isViewingOther ? (targetProfile?.bio || DEFAULT_BIO) : (bio || DEFAULT_BIO);
  const displayedLinks = isViewingOther ? (targetProfile?.links || {}) : {
    website, youtube, instagram, tiktok, discord
  };
  const effectiveOngoingProjects = isViewingOther ? targetProjects : ongoingProjects;

  // Sincroniza estatísticas reais no Supabase
  useEffect(() => {
    if (user && supabase && accountMetrics && !isViewingOther) {
      const payload = {
        total_runs: accountMetrics.totalRuns,
        ideias_ranqueadas: accountMetrics.ideasCount,
        projetos: accountMetrics.projectsCount,
        projetos_concluidos: accountMetrics.completedProjectsCount,
        streak: accountMetrics.streak,
        studio_minutes: accountMetrics.studioMinutes,
        dow_totals: accountMetrics.dowCounts,
        days_56: accountMetrics.days56,
        tool_breakdown: accountMetrics.toolsList,
        avg_rating: accountMetrics.avgRatingStr,
        best_dow: accountMetrics.bestDowName,
        likes_count: likesCount,
        curtidas_recebidas: likesCount
      };
      supabase.from('profiles').update({ stats: payload }).eq('id', user.id).then();
    }
  }, [user, accountMetrics, isViewingOther, likesCount]);

  // Carrega e calcula posição do perfil no Ranking Global de Criadores (Top 10)
  const [userRank, setUserRank] = useState<number | null>(null);

  useEffect(() => {
    if (!currentProfileId) return;

    let isSubscribed = true;

    const fetchRank = async () => {
      try {
        if (!supabase) return;

        let list: any[] = [];
        const { data, error } = await supabase.rpc("studioos_get_creators_ranking");
        if (!error && Array.isArray(data) && data.length > 0) {
          list = data;
        } else {
          const { data: profs } = await supabase
            .from("profiles")
            .select("id, full_name, channel, stats");
          if (profs && Array.isArray(profs)) {
            list = profs.map((p: any) => {
              const stats = p.stats || {};
              return {
                id: p.id,
                likes_count: Number(stats.likes_count ?? stats.curtidas_recebidas) || 0,
                completed_projects: Number(stats.projetos_concluidos) || 0,
                ideias_ranqueadas: Number(stats.ideias_ranqueadas) || 0,
                total_runs: Number(stats.total_runs) || 0,
                streak: Number(stats.streak) || 0,
              };
            });
          }
        }

        if (list.length > 0) {
          // Atualiza dados locais para o criador logado
          const scored = list.map((item) => {
            let likes = Number(item.likes_count) || 0;
            let completed = Number(item.completed_projects) || 0;
            let ideas = Number(item.ideias_ranqueadas) || 0;
            let runs = Number(item.total_runs) || 0;
            let streak = Number(item.streak) || 0;

            if (!isViewingOther && user?.id && item.id === user.id) {
              likes = Math.max(likes, likesCount);
              completed = Math.max(completed, accountMetrics.completedProjectsCount);
              ideas = Math.max(ideas, accountMetrics.ideasCount);
              runs = Math.max(runs, accountMetrics.totalRuns);
              streak = Math.max(streak, accountMetrics.streak);
            }

            const score = likes * 15 + completed * 25 + ideas * 6 + runs * 2 + streak * 4;
            return { id: item.id, score };
          });

          scored.sort((a, b) => b.score - a.score);

          const idx = scored.findIndex((c) => c.id === currentProfileId);
          if (isSubscribed) {
            if (idx >= 0 && idx < 10) {
              setUserRank(idx + 1);
            } else {
              setUserRank(null);
            }
          }
        }
      } catch (err) {
        console.error("Erro ao carregar ranking do perfil:", err);
      }
    };

    fetchRank();

    return () => {
      isSubscribed = false;
    };
  }, [
    currentProfileId,
    isViewingOther,
    user?.id,
    likesCount,
    accountMetrics.completedProjectsCount,
    accountMetrics.ideasCount,
    accountMetrics.totalRuns,
    accountMetrics.streak,
  ]);

  const renderRankingBadge = (rank: number | null) => {
    if (!rank || rank < 1 || rank > 10) return null;

    if (rank === 1) {
      return (
        <button
          type="button"
          onClick={() => onGo?.("ranking")}
          title="#1 no Ranking Global do StudioOS. Clique para abrir a tabela de criadores."
          className="group relative inline-flex items-center gap-1.5 rounded-full border border-[#F2B33D] bg-gradient-to-r from-[#2c1d06] via-[#4a300a] to-[#2c1d06] px-2.5 py-0.5 text-[10.5px] font-black uppercase tracking-[0.14em] text-[#FFDF79] shadow-[0_0_20px_rgba(242,179,61,0.5),inset_0_1px_1px_rgba(255,255,255,0.4)] ring-1 ring-[#F2B33D]/60 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_28px_rgba(242,179,61,0.75)] cursor-pointer overflow-hidden shrink-0"
        >
          <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-sweep" />
          <Icon name="crown" className="h-3.5 w-3.5 text-[#FFDF79] drop-shadow-[0_0_6px_rgba(242,179,61,0.9)] animate-pulse" />
          <span className="bg-gradient-to-r from-[#FFF5D0] via-[#FFDF79] to-[#F2B33D] bg-clip-text text-transparent font-display font-black">
            #1 TOP CRIADOR
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-[#FFF5D0] shadow-[0_0_6px_#FFDF79] shrink-0" />
        </button>
      );
    }

    if (rank === 2) {
      return (
        <button
          type="button"
          onClick={() => onGo?.("ranking")}
          title="#2 no Ranking Global do StudioOS. Clique para abrir a tabela de criadores."
          className="group relative inline-flex items-center gap-1.5 rounded-full border border-[#A7C8FF] bg-gradient-to-r from-[#0d1624] via-[#1a2b47] to-[#0d1624] px-2.5 py-0.5 text-[10.5px] font-extrabold uppercase tracking-[0.13em] text-[#E0EDFF] shadow-[0_0_18px_rgba(167,200,255,0.4),inset_0_1px_1px_rgba(255,255,255,0.4)] ring-1 ring-[#A7C8FF]/50 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_25px_rgba(167,200,255,0.65)] cursor-pointer overflow-hidden shrink-0"
        >
          <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent animate-sweep" />
          <Icon name="trophy" className="h-3.5 w-3.5 text-[#CFE2FF] drop-shadow-[0_0_6px_rgba(167,200,255,0.85)]" />
          <span className="bg-gradient-to-r from-white via-[#E0EDFF] to-[#A7C8FF] bg-clip-text text-transparent font-display font-extrabold">
            #2 RANKING
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-[#CFE2FF] shadow-[0_0_5px_#A7C8FF] shrink-0" />
        </button>
      );
    }

    if (rank === 3) {
      return (
        <button
          type="button"
          onClick={() => onGo?.("ranking")}
          title="#3 no Ranking Global do StudioOS. Clique para abrir a tabela de criadores."
          className="group relative inline-flex items-center gap-1.5 rounded-full border border-[#F28C38] bg-gradient-to-r from-[#241308] via-[#3d1c0a] to-[#241308] px-2.5 py-0.5 text-[10.5px] font-extrabold uppercase tracking-[0.13em] text-[#FFB677] shadow-[0_0_16px_rgba(242,140,56,0.35),inset_0_1px_1px_rgba(255,255,255,0.3)] ring-1 ring-[#F28C38]/45 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_22px_rgba(242,140,56,0.6)] cursor-pointer overflow-hidden shrink-0"
        >
          <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent animate-sweep" />
          <Icon name="medal" className="h-3.5 w-3.5 text-[#FFB677] drop-shadow-[0_0_5px_rgba(242,140,56,0.8)]" />
          <span className="bg-gradient-to-r from-[#FFE5CF] via-[#FFB677] to-[#F28C38] bg-clip-text text-transparent font-display font-extrabold">
            #3 RANKING
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-[#FFB677] shadow-[0_0_5px_#F28C38] shrink-0" />
        </button>
      );
    }

    if (rank <= 5) {
      return (
        <button
          type="button"
          onClick={() => onGo?.("ranking")}
          title={`#${rank} no Ranking Global do StudioOS (Top 5). Clique para abrir a tabela de criadores.`}
          className="group relative inline-flex items-center gap-1.5 rounded-full border border-[#A855F7]/70 bg-gradient-to-r from-[#170c26] via-[#24133b] to-[#170c26] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#E9D5FF] shadow-[0_0_14px_rgba(168,85,247,0.3)] ring-1 ring-[#A855F7]/30 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_18px_rgba(168,85,247,0.5)] cursor-pointer shrink-0"
        >
          <Icon name="flame" className="h-3 w-3 text-[#D8B4FE] drop-shadow-[0_0_4px_rgba(168,85,247,0.7)]" />
          <span className="font-mono font-bold tracking-[0.12em]">
            #{rank} TOP 5
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-[#D8B4FE] shadow-[0_0_4px_#A855F7] shrink-0" />
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={() => onGo?.("ranking")}
        title={`#${rank} no Ranking Global do StudioOS (Top 10). Clique para abrir a tabela de criadores.`}
        className="group relative inline-flex items-center gap-1.5 rounded-full border border-[#2FD4A0]/60 bg-gradient-to-r from-[#0a1a15] via-[#102922] to-[#0a1a15] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.11em] text-[#A7F3D0] shadow-[0_0_12px_rgba(47,212,160,0.25)] ring-1 ring-[#2FD4A0]/25 transition-all duration-300 hover:scale-105 hover:shadow-[0_0_16px_rgba(47,212,160,0.45)] cursor-pointer shrink-0"
      >
        <Icon name="award" className="h-3 w-3 text-[#2FD4A0] drop-shadow-[0_0_4px_rgba(47,212,160,0.6)]" />
        <span className="font-mono font-bold tracking-[0.11em]">
          #{rank} TOP 10
        </span>
        <span className="h-1.5 w-1.5 rounded-full bg-[#2FD4A0] shadow-[0_0_4px_#2FD4A0] shrink-0" />
      </button>
    );
  };

  const [sessions, setSessions] = useState([
    { id: 1, name: "Chrome no Windows", location: "São Paulo, BR • Sessão Ativa", current: true, time: "Atual" },
  ]);
  
  useEffect(() => {
    if (user && supabase) {
      supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }: { data: any }) => {
        if (data) {
          if (data.stats) setUserStats(data.stats);
          if (data.full_name) setName(data.full_name);
          if (data.channel) setChannel(data.channel);
          if (data.bio) setBio(data.bio);
          if (data.links) {
            if (data.links.website !== undefined) setWebsite(data.links.website);
            if (data.links.youtube !== undefined) setYoutube(data.links.youtube);
            if (data.links.instagram !== undefined) setInstagram(data.links.instagram);
            if (data.links.tiktok !== undefined) setTiktok(data.links.tiktok);
            if (data.links.discord !== undefined) setDiscord(data.links.discord);
          }
          if (data.card_visibility) {
            setCardVisibility(prev => ({ ...prev, ...data.card_visibility }));
          }
          if (data.featured_video) {
            if (data.featured_video.title) setJokerTitle(data.featured_video.title);
            if (data.featured_video.id) setJokerProject(data.featured_video.id);
          }
        }
      });
    } else if (user) {
      // Fallback local storage
      const savedBio = localStorage.getItem(`studioos.bio.${user.id}`);
      if (savedBio) setBio(savedBio);
      const savedLinks = localStorage.getItem(`studioos.links.${user.id}`);
      if (savedLinks) {
        try {
          const l = JSON.parse(savedLinks);
          if (l.website !== undefined) setWebsite(l.website);
          if (l.youtube !== undefined) setYoutube(l.youtube);
          if (l.instagram !== undefined) setInstagram(l.instagram);
          if (l.tiktok !== undefined) setTiktok(l.tiktok);
          if (l.discord !== undefined) setDiscord(l.discord);
        } catch {}
      }
      const savedVis = localStorage.getItem(`studioos.cardVis.${user.id}`);
      if (savedVis) {
        try {
          setCardVisibility(prev => ({ ...prev, ...JSON.parse(savedVis) }));
        } catch {}
      }
    }
  }, [user]);

  const startEditingProfile = (field?: "name" | "channel" | "bio") => {
    setTab("geral");
    setDraftName(name || "");
    setDraftChannel(channel ? channel.replace(/^@/, '') : "");
    setDraftBio(bio || "");
    setDraftWebsite(website || "");
    setDraftYoutube(youtube || "");
    setDraftInstagram(instagram || "");
    setDraftTiktok(tiktok || "");
    setDraftDiscord(discord || "");
    setDraftCardVisibility({ ...cardVisibility });
    setIsEditingProfile(true);

    if (field) {
      setTimeout(() => {
        if (field === "name") nameInputRef.current?.focus();
        if (field === "channel") channelInputRef.current?.focus();
        if (field === "bio") bioInputRef.current?.focus();
      }, 50);
    }
  };

  const cancelEditingProfile = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    // Restaura rascunhos para os valores atuais salvos
    setDraftName(name || "");
    setDraftChannel(channel ? channel.replace(/^@/, '') : "");
    setDraftBio(bio || "");
    setDraftWebsite(website || "");
    setDraftYoutube(youtube || "");
    setDraftInstagram(instagram || "");
    setDraftTiktok(tiktok || "");
    setDraftDiscord(discord || "");
    setDraftCardVisibility({ ...cardVisibility });
    setIsEditingProfile(false);
  };

  const handleOpenPublicProfile = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isEditingProfile) return;
    if (!channel) {
      alert("Você ainda está com o @usuario padrão visual. Defina seu @ de usuário e salve seu perfil para ativar sua página pública!");
      startEditingProfile("channel");
      return;
    }
    const cleanHandle = channel.replace(/^@/, '');
    if (onGo) {
      onGo("perfil", cleanHandle);
    } else {
      window.location.assign(`/perfil/${cleanHandle}`);
    }
  };

  const handleBackToMyProfile = () => {
    if (onClearViewedHandle) {
      onClearViewedHandle();
    } else if (onGo) {
      onGo("perfil");
    } else {
      window.location.assign("/?view=perfil");
    }
  };

  const handleCopyProfileLink = async () => {
    const handleToCopy = isViewingOther ? cleanViewedHandle : (channel ? channel.replace(/^@/, '') : "");
    if (!handleToCopy) {
      alert("Você ainda está com o @usuario padrão visual. Defina seu @ de usuário e salve seu perfil para ativar e copiar seu link!");
      startEditingProfile("channel");
      return;
    }
    const cleanHandle = handleToCopy.replace(/^@/, '');
    const profileUrl = `${window.location.origin}/perfil/${cleanHandle}`;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(profileUrl);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = profileUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (err) {
      console.error("Erro ao copiar link:", err);
      alert(`Seu link é: ${profileUrl}`);
    }
  };

  const saveProfileChanges = async () => {
    const cleanHandle = draftChannel.trim().replace(/^@/, '').toLowerCase();
    const currentClean = (channel || "").trim().replace(/^@/, '').toLowerCase();

    if (currentClean && cleanHandle !== currentClean && !user?.email_confirmed_at) {
      alert("Você só pode alterar seu nome de usuário (@) após verificar o seu e-mail. Verifique a caixa de entrada da sua conta para liberar a alteração.");
      return;
    }
    
    if (cleanHandle && !/^[a-z0-9_.-]+$/.test(cleanHandle)) {
      alert("O nome de usuário (@) só pode conter letras minúsculas, números, sublinhados (_), hífens (-) e pontos (.).");
      return;
    }

    setSaving(true);
    const extraPayload = {
      bio: draftBio.trim(),
      links: {
        website: draftWebsite.trim(),
        youtube: draftYoutube.trim(),
        instagram: draftInstagram.trim(),
        tiktok: draftTiktok.trim(),
        discord: draftDiscord.trim(),
      },
      card_visibility: draftCardVisibility,
      featured_video: {
        id: jokerProject,
        title: jokerTitle
      }
    };

    const res = await updateProfile(draftName.trim() || "Criador", cleanHandle, extraPayload);
    setSaving(false);

    if (!res.ok) {
      alert(res.error);
      return;
    }

    setName(draftName.trim() || "Criador");
    setChannel(cleanHandle);
    setBio(draftBio.trim());
    setWebsite(draftWebsite.trim());
    setYoutube(draftYoutube.trim());
    setInstagram(draftInstagram.trim());
    setTiktok(draftTiktok.trim());
    setDiscord(draftDiscord.trim());
    setCardVisibility({ ...draftCardVisibility });
    setIsEditingProfile(false);

    if (user) {
      localStorage.setItem(`studioos.onboarding.hasPrefs.${user.id}`, "true");
      setHasPrefs(true);
      localStorage.setItem(`studioos.bio.${user.id}`, draftBio.trim());
      localStorage.setItem(`studioos.links.${user.id}`, JSON.stringify(extraPayload.links));
      localStorage.setItem(`studioos.cardVis.${user.id}`, JSON.stringify(draftCardVisibility));
    }
  };

  const handleSaveEmail = async () => {
    setSaving(true);
    if (email !== user?.email) {
      const res = await updateEmail(email);
      if (!res.ok) alert(res.error);
      else alert(res.message);
    }
    setSaving(false);
  };

  const handleSavePassword = async () => {
    if (!newPass || newPass !== newPassConf) return alert("As senhas não coincidem ou estão vazias.");
    if (newPass.length < 8) return alert("A nova senha deve ter no mínimo 8 caracteres.");
    setPassSaving(true);
    const res = await updatePassword(newPass);
    if (!res.ok) alert(res.error);
    else {
      alert("Senha atualizada com sucesso!");
      setPass("");
      setNewPass("");
      setNewPassConf("");
    }
    setPassSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const isGif = file.type === "image/gif" || file.name.toLowerCase().endsWith(".gif");

      if (isGif && !user?.is_vip) {
        alert("Apenas membros VIP podem usar GIFs na foto de perfil. Torne-se VIP na Aster Account para desbloquear avatares animados!");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      if (isGif && user?.is_vip) {
        // GIF animado: canvas crop destruiria os quadros de animação do GIF. Enviamos o GIF original preservando a animação completa!
        setUploadingAvatar(true);
        try {
          const res = await updateAvatar(file);
          if (!res.ok) {
            alert(res.error);
          }
        } catch (err: any) {
          alert("Erro ao enviar GIF: " + (err?.message || "falha no upload"));
        } finally {
          setUploadingAvatar(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
        return;
      }

      const reader = new FileReader();
      reader.addEventListener('load', () => setCropImage(reader.result?.toString() || null));
      reader.readAsDataURL(file);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveCrop = async () => {
    if (!cropImage || !croppedAreaPixels) return;
    setUploadingAvatar(true);
    try {
      const croppedFile = await getCroppedImg(cropImage, croppedAreaPixels);
      if (croppedFile) {
        const res = await updateAvatar(croppedFile);
        if (!res.ok) alert(res.error);
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao cortar a imagem");
    } finally {
      setUploadingAvatar(false);
      setCropImage(null);
    }
  };

  const handleDeleteAccount = () => {
    setShowDeleteModal(true);
    setDeleteConfirmText("");
  };

  const confirmDeleteAccount = async () => {
    if (deleteConfirmText !== "Quero excluir minha conta") return;
    setIsDeleting(true);
    const res = await deleteAccount();
    setIsDeleting(false);
    if (!res.ok) alert(res.error);
    else setShowDeleteModal(false);
  };

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setChannel(user.channel || "");
      setEmail(user.email || "");
      // Forçando o mock para você visualizar o design:
      setIdentities([
        {
          identity_id: "mock-google-123",
          provider: "google",
          identity_data: { email: "teste.criador@gmail.com" }
        },
        {
          identity_id: "mock-discord-456",
          provider: "discord",
          identity_data: { preferred_username: "criador_demo" }
        }
      ]);
    }
  }, [user]);

  const handleLink = async (provider: "google" | "discord") => {
    const res = await linkIdentity(provider);
    if (!res.ok) alert(res.error);
  };

  const handleUnlink = async (identity_id: string) => {
    const res = await unlinkIdentity(identity_id);
    if (!res.ok) alert(res.error);
    else {
      alert(res.message);
      getIdentities().then(r => {
        if (r.ok) setIdentities(r.data);
      });
    }
  };

  const tabs = isPublicView
    ? ([{ id: "geral", label: "Geral", icon: "user" }] as const)
    : ([
        { id: "geral", label: "Geral", icon: "user" },
        { id: "seguranca", label: "Segurança", icon: "lock" },
        { id: "preferencias", label: "Preferências", icon: "dial" },
      ] as const);

  const scrollTo = (id: string, targetTab: "geral" | "seguranca" | "preferencias" | "atividade") => {
    if (tab !== targetTab) {
      setTab(targetTab);
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const onboardingItems = [
    { label: "Configurar seu perfil", done: !!(name && channel && user?.avatarUrl), action: () => startEditingProfile() },
    { label: "Ler a Wiki do estúdio", done: readWiki, action: () => { localStorage.setItem("studioos.onboarding.readWiki", "true"); setReadWiki(true); if (onGo) onGo("wiki"); } },
    { label: "Conectar conta do Discord", done: identities.some(i => i.provider === "discord"), action: () => scrollTo("panel-sso", "seguranca") },
    { label: "Adicionar seu primeiro projeto", done: hasProject, action: () => { localStorage.setItem("studioos.onboarding.hasProject", "true"); setHasProject(true); alert("Ainda não implementado: ir para Projetos"); } },
    { label: "Personalizar suas preferências", done: hasPrefs, action: () => setTab("preferencias") },
  ];

  const completedCount = onboardingItems.filter(i => i.done).length;
  const progressPercent = Math.round((completedCount / 5) * 100);
  const strokeDashoffset = 238.7 - (238.7 * (completedCount / 5));
  const remainingItems = 5 - completedCount;

  const renderCardVisibilityBanner = (cardKey: "stats" | "projects" | "video" | "achievements" | "comments", cardLabel: string) => {
    if (isViewingOther) return null;
    const isVisible = isEditingProfile ? draftCardVisibility[cardKey] : cardVisibility[cardKey];

    if (isEditingProfile) {
      return (
        <div className={`px-3.5 sm:px-4 py-2.5 border-b transition-all ${
          isVisible 
            ? 'bg-[#2FD4A0]/10 border-[#2FD4A0]/30 text-[#2FD4A0]' 
            : 'bg-[#18181b]/95 border-[#232327] text-[#8c8c94]'
        }`}>
          <div className="flex flex-col gap-1.5">
            {/* Linha superior: Status e Toggle Switch Compacto */}
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <Icon name={isVisible ? "eye" : "eyeOff"} className="h-3.5 w-3.5 shrink-0" />
                <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider truncate">
                  {isVisible ? "Visível no Perfil Público" : "Oculto no Perfil Público"}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isVisible}
                aria-label={isVisible ? "Tornar bloco oculto no perfil público" : "Tornar bloco visível no perfil público"}
                title={isVisible ? "Visível publicamente (clique para ocultar)" : "Oculto (clique para tornar público)"}
                onClick={() => setDraftCardVisibility(prev => ({ ...prev, [cardKey]: !prev[cardKey] }))}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-all duration-200 ease-in-out focus:outline-none hover:opacity-90 active:scale-95 ${
                  isVisible
                    ? 'bg-[#2FD4A0] shadow-[0_0_10px_rgba(47,212,160,0.35)]'
                    : 'bg-[#222226] border border-[#38383e] hover:border-[#4b4b53]'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full shadow-sm transition-transform duration-200 ease-in-out ${
                    isVisible
                      ? 'translate-x-[16px] bg-[#0c0c0e]'
                      : 'translate-x-0 bg-[#8c8c94]'
                  }`}
                />
              </button>
            </div>

            {/* Linha inferior: Identificador do Bloco e Descrição com espaço total */}
            <div className="flex items-center gap-2 flex-wrap pl-5">
              <span className="text-[9px] px-1.5 py-0.5 rounded border font-mono opacity-80 uppercase tracking-widest bg-black/40 border-current shrink-0 whitespace-nowrap">
                {cardLabel}
              </span>
              <p className="text-[10.5px] text-bone-400 leading-normal">
                {isVisible 
                  ? "Quem acessar o seu link verá este bloco." 
                  : "Apenas você vê este bloco. Visitantes não terão acesso."}
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (!isVisible) {
      return (
        <div className="flex items-center gap-2 px-4 py-2 bg-[#18181b]/80 border-b border-[#232327] text-[#8c8c94] text-[10.5px] font-mono">
          <Icon name="eyeOff" className="h-3.5 w-3.5 text-signal-400/70" />
          <span>Oculto do perfil público · Apenas você tem visão deste bloco</span>
        </div>
      );
    }

    return null;
  };

  const activeStatsObj = isViewingOther ? (targetProfile?.stats || {}) : userStats;

  const achievements = [
    { id: "community_liked", icon: "heart", label: "Estúdio Reconhecido", desc: "Recebeu curtidas da comunidade do StudioOS.", tone: "text-[#F2604C]", bg: "bg-[#F2604C]/10", hex: "#F2604C", unlocked: likesCount >= 1 },
    { id: "seq21", icon: "spark", label: "Sequência de 21 dias", desc: "Acessou o painel por 21 dias seguidos.", tone: "text-[#F2B33D]", bg: "bg-[#F2B33D]/10", hex: "#F2B33D", unlocked: metrics.streak >= 21 },
    { id: "ideias200", icon: "target", label: "200 ideias ranqueadas", desc: "Mais de 200 ideias processadas no painel.", tone: "text-[#2FD4A0]", bg: "bg-[#2FD4A0]/10", hex: "#2FD4A0", unlocked: metrics.ideasCount >= 200 },
    { id: "top4", icon: "star", label: "Top 4% do canal", desc: "Seu desempenho superou 96% dos criadores.", tone: "text-[#6E93F5]", bg: "bg-[#6E93F5]/10", hex: "#6E93F5", unlocked: Number(activeStatsObj['top4']) === 1 },
    { id: "verified", icon: "check", label: "Conta verificada", desc: "Identidade confirmada com sucesso.", tone: "text-[#F2604C]", bg: "bg-[#F2604C]/10", hex: "#F2604C", unlocked: isViewingOther ? Number(activeStatsObj['verified']) === 1 : (!!user?.email_confirmed_at || Number(activeStatsObj['verified']) === 1) },
    { id: "onboarding", icon: "layers", label: "Primeiros Passos", desc: "Completou todas as tarefas de onboarding.", tone: "text-[#2FD4A0]", bg: "bg-[#2FD4A0]/10", hex: "#2FD4A0", unlocked: !isViewingOther && completedCount === onboardingItems.length },
    { id: "viral", icon: "bolt", label: "Post Viral", desc: "Atingiu 100k visualizações em um único post.", tone: "text-[#F2B33D]", bg: "bg-[#F2B33D]/10", hex: "#F2B33D", unlocked: Number(activeStatsObj['viral']) === 1 },
    { id: "thumb", icon: "frame", label: "Mestre das Thumbnails", desc: "Aprovou 50 thumbnails no painel.", tone: "text-[#6E93F5]", bg: "bg-[#6E93F5]/10", hex: "#6E93F5", unlocked: Number(activeStatsObj['thumb_approved']) >= 50 },
    { id: "roteiro", icon: "book", label: "Roteirista Nato", desc: "Criou seu primeiro roteiro completo.", tone: "text-[#F2604C]", bg: "bg-[#F2604C]/10", hex: "#F2604C", unlocked: metrics.toolsList.some((t: any) => t.id && t.id.includes("roteiro")) || Number(activeStatsObj['producoes']) >= 1 },
    { id: "strategy", icon: "brain", label: "Mente Brilhante", desc: "Definiu o planejamento do trimestre.", tone: "text-[#2FD4A0]", bg: "bg-[#2FD4A0]/10", hex: "#2FD4A0", unlocked: Number(activeStatsObj['strategy_defined']) === 1 },
    { id: "collec", icon: "stack", label: "Colecionador", desc: "Salvou 500 referências no banco de ideias.", tone: "text-[#F2B33D]", bg: "bg-[#F2B33D]/10", hex: "#F2B33D", unlocked: metrics.ideasCount >= 500 },
    { id: "eng", icon: "eye", label: "Atenção Total", desc: "Manteve 60% de retenção no YouTube.", tone: "text-[#6E93F5]", bg: "bg-[#6E93F5]/10", hex: "#6E93F5", unlocked: Number(activeStatsObj['high_retention']) === 1 },
    { id: "vet", icon: "clock", label: "Veterano", desc: "Completou 1 ano de estúdio.", tone: "text-[#F2604C]", bg: "bg-[#F2604C]/10", hex: "#F2604C", unlocked: Number(activeStatsObj['veteran']) === 1 },
  ];
  
  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const [showAchievModal, setShowAchievModal] = useState(false);

  useEffect(() => {
    if (completedCount === onboardingItems.length && !hideOnboarding) {
      const t = setTimeout(() => {
        setHideOnboarding(true);
        if (user) {
          localStorage.setItem(`studioos.onboarding.hidden.${user.id}`, "true");
        }
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [completedCount, hideOnboarding, user, onboardingItems.length]);

  if (isViewingOther && targetLoading) {
    return (
      <div className="mx-auto w-full pt-4 max-w-6xl space-y-6 animate-pulse">
        <div className="h-40 rounded-2xl bg-[#0c0c0e] border border-[#232327]" />
        <div className="h-96 rounded-2xl bg-[#0c0c0e] border border-[#232327]" />
      </div>
    );
  }

  if (isViewingOther && targetNotFound) {
    return (
      <div className="mx-auto w-full pt-8 max-w-2xl text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#232327] bg-[#0c0c0e] text-bone-400">
          <Icon name="search" className="h-8 w-8 text-signal-400" />
        </div>
        <h2 className="font-display text-xl font-bold text-bone-50">Criador não encontrado</h2>
        <p className="mt-2 text-sm text-bone-400">
          Não encontramos nenhum criador cadastrado com o @{cleanViewedHandle}.
        </p>
        <button
          type="button"
          onClick={handleBackToMyProfile}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-signal-400 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-ink-950 hover:bg-signal-300 cursor-pointer"
        >
          <Icon name="arrow-left" className="h-3.5 w-3.5" /> Voltar ao meu perfil
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full pt-4">
      {/* BANNER DE VISUALIZAÇÃO PÚBLICA / OUTRO PERFIL */}
      {isPublicView && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-signal-400/30 bg-signal-400/10 px-4 py-3 text-signal-400 backdrop-blur-sm shadow-[0_0_20px_rgba(242,179,61,0.08)]">
          <div className="flex items-center gap-2.5 text-xs font-medium">
            <span className="h-2 w-2 rounded-full bg-signal-400 animate-pulse" />
            <span>
              {isViewingOther 
                ? `Visualizando perfil público de @${cleanViewedHandle}` 
                : "Modo de visualização pública do seu próprio perfil"}
            </span>
          </div>
          <button
            type="button"
            onClick={handleBackToMyProfile}
            className="flex items-center gap-1.5 rounded-lg border border-signal-400/40 bg-ink-950/80 px-3 py-1.5 text-xs font-semibold text-signal-400 hover:bg-signal-400 hover:text-ink-950 transition-all cursor-pointer shadow-sm"
          >
            <Icon name="arrow-left" className="h-3.5 w-3.5" />
            <span>Voltar ao meu perfil</span>
          </button>
        </div>
      )}

      {/* HEADER */}
      <Reveal className="mb-10 flex flex-col md:flex-row md:items-start gap-6 sm:gap-8">
        {/* Avatar */}
        <div className="relative group shrink-0 self-start">
          <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-signal-400 bg-ink-900 shadow-[0_12px_30px_rgba(0,0,0,0.5)] sm:h-28 sm:w-28 md:h-[120px] md:w-[120px]">
            <Icon name="user" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-10 text-ink-500" />
            {displayedAvatar ? (
              <img src={displayedAvatar} alt="Avatar" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(displayedName || "User")}&background=random`} alt="Avatar" className="absolute inset-0 h-full w-full object-cover" />
            )}
            {uploadingAvatar && (
              <div className="absolute inset-0 bg-ink-950/50 flex items-center justify-center">
                <Icon name="spark" className="h-6 w-6 animate-pulse text-signal-400" />
              </div>
            )}
          </div>
          {(isViewingOther ? Boolean(targetProfile?.is_vip) : Boolean(user?.is_vip)) && (
            <VipBadge size="lg" className="top-0 right-0 sm:top-1 sm:right-1" />
          )}
          {!isPublicView && (
            <>
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleAvatarUpload} />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar} className="absolute -bottom-1 -right-1 rounded-full border border-ink-600 bg-ink-800 p-2 text-bone-300 transition-colors hover:bg-signal-400 hover:text-ink-950 disabled:opacity-50 cursor-pointer shadow-lg" aria-label="Alterar foto">
                <Icon name="frame" className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>

        {/* Informações */}
        <div className="min-w-0 flex-1 w-full pt-1">
          {!isEditingProfile ? (
            <>
              {/* Header Top Row: Identity on Left, Action Buttons on Right */}
              <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4 mb-3">
                {/* Identidade */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div 
                      onClick={() => !isPublicView && startEditingProfile("name")} 
                      className={`group/name relative flex items-center gap-2 select-none rounded-lg py-0.5 px-1.5 -ml-1.5 transition-all ${
                        !isPublicView ? "cursor-pointer hover:bg-white/[0.04]" : ""
                      }`}
                      title={!isPublicView ? "Clique para editar seu nome de exibição" : undefined}
                    >
                      <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-bone-50">
                        {displayedName}
                      </h1>
                      {!isPublicView && (
                        <Icon name="type" className="h-3.5 w-3.5 opacity-0 group-hover/name:opacity-60 text-signal-400 transition-opacity" />
                      )}
                    </div>

                    {renderRankingBadge(userRank)}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <div 
                      onClick={() => !isPublicView && startEditingProfile("channel")} 
                      className={`group/channel relative flex items-center gap-1.5 select-none rounded-lg py-0.5 px-2 -ml-2 transition-all ${
                        !isPublicView ? "cursor-pointer hover:bg-signal-400/10 border border-transparent hover:border-signal-400/30" : ""
                      }`}
                      title={!isPublicView ? "Clique para editar seu nome de usuário (@)" : undefined}
                    >
                      <span className="font-mono text-[13px] text-signal-400 font-medium">
                        {displayedChannel}
                      </span>
                      {!channel && !isViewingOther && (
                        <span className="text-[9px] font-mono uppercase tracking-wider text-ink-400 bg-ink-800/80 px-1.5 py-0.5 rounded border border-ink-700">
                          padrão
                        </span>
                      )}
                      {!isPublicView && (
                        <Icon name="type" className="h-3 w-3 opacity-0 group-hover/channel:opacity-80 text-signal-400 transition-opacity" />
                      )}
                    </div>

                    <span className="flex items-center gap-1.5 text-[11px] font-mono tracking-widest uppercase text-ink-400">
                      <Icon name="clock" className="h-3 w-3" /> Membro desde {new Date().getFullYear()}
                    </span>
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 shrink-0 w-full xl:w-auto">
                  {isViewingOther ? (
                    <>
                      {/* Botão de Curtir Perfil */}
                      <button
                        type="button"
                        onClick={handleToggleLike}
                        disabled={likingLoading}
                        title={
                          user?.is_temporary
                            ? "Contas de teste não podem curtir perfis"
                            : hasLiked
                            ? "Descurtir perfil"
                            : "Curtir este perfil"
                        }
                        className={`col-span-2 sm:col-span-1 flex items-center justify-center gap-2 rounded-lg border px-4 py-2 sm:py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-all cursor-pointer ${
                          hasLiked
                            ? "border-red-500/70 bg-red-500/15 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.25)] hover:bg-red-500/20"
                            : "border-ink-700 bg-ink-900/60 text-bone-300 hover:border-red-500/50 hover:text-red-400 hover:bg-ink-800/80"
                        }`}
                      >
                        <Icon 
                          name="heart" 
                          className={`h-4 w-4 transition-transform group-hover:scale-110 ${hasLiked ? "text-red-500 fill-red-500" : "text-bone-400"}`} 
                        />
                        <span>{hasLiked ? "Curtido" : "Curtir perfil"}</span>
                        <span className={`ml-0.5 rounded-full px-2 py-0.5 text-[10px] font-mono tabular-nums ${
                          hasLiked ? "bg-red-500/25 text-red-200" : "bg-ink-800 text-bone-400 border border-ink-700"
                        }`}>
                          {likesCount}
                        </span>
                      </button>
                    </>
                  ) : isViewingOwnPublicPreview ? (
                    <>
                      <Button
                        variant="solid"
                        onClick={handleBackToMyProfile}
                        className="col-span-2 sm:col-span-1 justify-center text-[11px] font-semibold uppercase tracking-[0.12em] px-3.5 py-2 sm:px-4 sm:py-2.5 shadow-[0_0_20px_rgba(242,179,61,0.25)] hover:shadow-[0_0_25px_rgba(242,179,61,0.4)]"
                      >
                        <Icon name="arrow-left" className="h-3.5 w-3.5" /> Voltar ao Meu Perfil
                      </Button>
                      <button
                        type="button"
                        onClick={handleCopyProfileLink}
                        aria-label="Copiar link do perfil"
                        title={copiedLink ? "Link copiado para a área de transferência!" : "Copiar link do perfil para compartilhar"}
                        className={`flex items-center justify-center gap-2 rounded-lg border px-3.5 py-2 sm:py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-all cursor-pointer ${
                          copiedLink
                            ? "border-[#2FD4A0]/60 bg-[#2FD4A0]/15 text-[#2FD4A0] shadow-[0_0_15px_rgba(47,212,160,0.25)]"
                            : "border-ink-700 bg-ink-900/50 text-bone-300 hover:border-signal-400/60 hover:text-bone-50 hover:bg-ink-800/60"
                        }`}
                      >
                        <Icon name={copiedLink ? "check" : "copy"} className="h-3.5 w-3.5" />
                        <span>{copiedLink ? "Copiado!" : "Copiar link"}</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <Button 
                        variant="solid" 
                        onClick={() => startEditingProfile()} 
                        className="col-span-2 sm:col-span-1 justify-center text-[11px] font-semibold uppercase tracking-[0.12em] px-3.5 py-2 sm:px-4 sm:py-2.5 shadow-[0_0_20px_rgba(242,179,61,0.25)] hover:shadow-[0_0_25px_rgba(242,179,61,0.4)]"
                      >
                        <Icon name="type" className="h-3.5 w-3.5" /> Editar perfil
                      </Button>
                      <button 
                        type="button"
                        onClick={handleOpenPublicProfile}
                        className={`flex items-center justify-center gap-2 rounded-lg border border-ink-700 bg-ink-900/50 px-3.5 py-2 sm:px-4 sm:py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-bone-300 transition-colors cursor-pointer ${channel ? 'hover:border-signal-400/60 hover:text-bone-50 hover:bg-ink-800/60' : 'opacity-60 hover:border-signal-400/50 hover:text-signal-400'}`}
                      >
                        <Icon name="eye" className="h-3.5 w-3.5" /> Ver público
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyProfileLink}
                        aria-label="Copiar link do perfil"
                        title={copiedLink ? "Link copiado para a área de transferência!" : "Copiar link do perfil para compartilhar"}
                        className={`flex items-center justify-center gap-2 rounded-lg border px-3.5 py-2 sm:py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-all cursor-pointer ${
                          copiedLink
                            ? "border-[#2FD4A0]/60 bg-[#2FD4A0]/15 text-[#2FD4A0] shadow-[0_0_15px_rgba(47,212,160,0.25)]"
                            : "border-ink-700 bg-ink-900/50 text-bone-300 hover:border-signal-400/60 hover:text-bone-50 hover:bg-ink-800/60"
                        }`}
                      >
                        <Icon name={copiedLink ? "check" : "copy"} className="h-3.5 w-3.5" />
                        <span>{copiedLink ? "Copiado!" : "Copiar link"}</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Bio */}
              <div 
                onClick={() => !isPublicView && startEditingProfile("bio")} 
                className={`group/bio mt-1.5 max-w-3xl rounded-lg p-2 -ml-2 transition-all border border-transparent ${
                  !isPublicView ? "cursor-pointer hover:bg-white/[0.03] hover:border-ink-800" : ""
                }`}
                title={!isPublicView ? "Clique para editar a bio" : undefined}
              >
                <p className="text-[13.5px] leading-relaxed text-bone-400 group-hover/bio:text-bone-200 transition-colors flex items-start gap-2">
                  <span className="flex-1">{displayedBio}</span>
                  {!isPublicView && (
                    <Icon name="type" className="h-3.5 w-3.5 shrink-0 opacity-0 group-hover/bio:opacity-60 text-signal-400 transition-opacity mt-0.5" />
                  )}
                </p>
              </div>

              {/* Estatísticas (agora com largura total desobstruída e contagem de curtidas) */}
              <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-2.5">
                {[
                  [metrics.projectsCount.toString(), metrics.projectsCount === 1 ? "projeto" : "projetos"],
                  [metrics.ideasCount.toString(), "ideias ranqueadas"],
                  [metrics.avgRatingStr, "nota média"],
                  [likesCount.toString(), likesCount === 1 ? "curtida recebida" : "curtidas recebidas"],
                ].map(([v, l]) => (
                  <div key={l} className="flex items-baseline gap-2">
                    <span className="font-display text-[16px] font-bold text-bone-50 tabular-nums">{v}</span>
                    <span className="text-[10px] font-mono tracking-widest text-ink-400 uppercase">{l}</span>
                  </div>
                ))}
              </div>

              {/* Links do Perfil */}
              {(displayedLinks.website || displayedLinks.instagram || displayedLinks.tiktok || displayedLinks.youtube || displayedLinks.discord) ? (
                <div className="mt-4 flex flex-wrap items-center gap-2.5">
                  {displayedLinks.website && (
                    <a href={displayedLinks.website.startsWith('http') ? displayedLinks.website : `https://${displayedLinks.website}`} target="_blank" rel="noreferrer" className="group flex items-center gap-2 rounded-full border border-[#232327] bg-[#101012] px-3.5 py-1.5 text-[12px] font-medium text-[#a8a8b0] transition-all hover:border-[#F2B33D]/50 hover:bg-[#F2B33D]/5 hover:text-[#F2B33D] hover:shadow-[0_0_12px_rgba(242,179,61,0.15)]">
                      <Icon name="globe" className="h-3.5 w-3.5 text-[#8c8c94] transition-colors group-hover:text-[#F2B33D]" />
                      {displayedLinks.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                    </a>
                  )}
                  {displayedLinks.youtube && (
                    <a href={displayedLinks.youtube.startsWith('http') ? displayedLinks.youtube : `https://${displayedLinks.youtube}`} target="_blank" rel="noreferrer" className="group flex items-center gap-2 rounded-full border border-[#232327] bg-[#101012] px-3.5 py-1.5 text-[12px] font-medium text-[#a8a8b0] transition-all hover:border-[#FF0000]/50 hover:bg-[#FF0000]/5 hover:text-[#FF0000] hover:shadow-[0_0_12px_rgba(255,0,0,0.15)]">
                      <Icon name="youtube" className="h-3.5 w-3.5 text-[#8c8c94] transition-colors group-hover:text-[#FF0000]" />
                      YouTube
                    </a>
                  )}
                  {displayedLinks.instagram && (
                    <a href={displayedLinks.instagram.startsWith('http') ? displayedLinks.instagram : `https://${displayedLinks.instagram}`} target="_blank" rel="noreferrer" className="group flex items-center gap-2 rounded-full border border-[#232327] bg-[#101012] px-3.5 py-1.5 text-[12px] font-medium text-[#a8a8b0] transition-all hover:border-[#E1306C]/50 hover:bg-[#E1306C]/5 hover:text-[#E1306C] hover:shadow-[0_0_12px_rgba(225,48,108,0.15)]">
                      <Icon name="instagram" className="h-3.5 w-3.5 text-[#8c8c94] transition-colors group-hover:text-[#E1306C]" />
                      Instagram
                    </a>
                  )}
                  {displayedLinks.tiktok && (
                    <a href={displayedLinks.tiktok.startsWith('http') ? displayedLinks.tiktok : `https://${displayedLinks.tiktok}`} target="_blank" rel="noreferrer" className="group flex items-center gap-2 rounded-full border border-[#232327] bg-[#101012] px-3.5 py-1.5 text-[12px] font-medium text-[#a8a8b0] transition-all hover:border-[#00f2fe]/50 hover:bg-[#00f2fe]/5 hover:text-[#00f2fe] hover:shadow-[0_0_12px_rgba(0,242,254,0.15)]">
                      <Icon name="tiktok" className="h-3.5 w-3.5 text-[#8c8c94] transition-colors group-hover:text-[#00f2fe]" />
                      TikTok
                    </a>
                  )}
                  {displayedLinks.discord && (
                    <a href={displayedLinks.discord.startsWith('http') ? displayedLinks.discord : `https://${displayedLinks.discord}`} target="_blank" rel="noreferrer" className="group flex items-center gap-2 rounded-full border border-[#232327] bg-[#101012] px-3.5 py-1.5 text-[12px] font-medium text-[#a8a8b0] transition-all hover:border-[#5865F2]/50 hover:bg-[#5865F2]/5 hover:text-[#5865F2] hover:shadow-[0_0_12px_rgba(88,101,242,0.15)]">
                      <Icon name="discord" className="h-3.5 w-3.5 text-[#8c8c94] transition-colors group-hover:text-[#5865F2]" />
                      Discord
                    </a>
                  )}
                </div>
              ) : !isPublicView ? (
                <div className="mt-4">
                  <button 
                    onClick={() => startEditingProfile()} 
                    className="flex items-center gap-1.5 text-[12px] text-bone-400 hover:text-signal-400 transition-colors font-mono cursor-pointer"
                  >
                    <Icon name="plus" className="h-3 w-3" /> Adicionar links ao perfil
                  </button>
                </div>
              ) : null}
            </>
          ) : (
            /* EDIÇÃO ATIVA DO PERFIL */
            <div className="space-y-4 anim-fade w-full">
              {/* Top Bar no Modo Edição */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-[#232327]">
                <div>
                  <h3 className="font-display text-lg font-bold text-white tracking-tight">Editar Perfil</h3>
                  <p className="text-[12px] text-ink-400 font-mono mt-0.5">Altere suas informações e gerencie a visibilidade dos cards públicos</p>
                </div>
                <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
                  <Button 
                    variant="solid" 
                    onClick={saveProfileChanges} 
                    disabled={saving}
                    className="justify-center text-[11px] font-bold uppercase tracking-[0.12em] px-4 py-2.5 bg-signal-400 hover:bg-signal-300 text-ink-950 shadow-[0_0_15px_rgba(242,179,61,0.3)]"
                  >
                    <Icon name="check" className="h-3.5 w-3.5 stroke-[3]" /> {saving ? "Salvando..." : "Salvar Perfil"}
                  </Button>
                  <Button 
                    variant="outline" 
                    type="button"
                    onClick={cancelEditingProfile} 
                    disabled={saving}
                    className="justify-center text-[11px] font-semibold uppercase tracking-[0.12em] px-3.5 py-2.5 border-ink-700 bg-ink-900/60 text-bone-300 hover:text-white cursor-pointer"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-widest text-ink-400 block mb-1.5">
                    Nome de Exibição
                  </label>
                  <Input 
                    ref={nameInputRef}
                    value={draftName} 
                    onChange={e => setDraftName(e.target.value)} 
                    placeholder="Seu Nome" 
                    maxLength={50} 
                    className="bg-[#101012] border-[#232327] text-white focus:border-signal-400 font-display text-lg font-bold w-full" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase tracking-widest text-ink-400 block mb-1.5">
                    Nome de Usuário (@ único)
                  </label>
                  <div className={`flex items-center rounded-lg border bg-[#101012] px-3 py-2 transition-all ${
                    Boolean(channel && !user?.email_confirmed_at)
                      ? "border-amber-500/30 opacity-75 cursor-not-allowed"
                      : "border-[#232327] focus-within:border-signal-400 focus-within:shadow-[0_0_12px_rgba(242,179,61,0.2)]"
                  }`}>
                    <span className="font-mono text-sm font-bold text-signal-400 select-none mr-1">@</span>
                    <input 
                      ref={channelInputRef}
                      type="text"
                      disabled={Boolean(channel && !user?.email_confirmed_at)}
                      value={draftChannel}
                      onChange={e => setDraftChannel(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                      placeholder="usuario"
                      maxLength={30}
                      className={`bg-transparent font-mono text-sm text-signal-400 focus:outline-none placeholder:text-signal-400/35 w-full ${
                        Boolean(channel && !user?.email_confirmed_at) ? "cursor-not-allowed" : ""
                      }`}
                    />
                  </div>
                  {Boolean(channel && !user?.email_confirmed_at) ? (
                    <span className="text-[11px] text-amber-400/90 font-mono mt-1.5 flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded">
                      <span>🔒</span>
                      <span>Confirme seu e-mail na sua caixa de entrada para poder alterar seu @usuario.</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-ink-400 font-mono mt-1 block">
                      {draftChannel ? `Link público: /perfil/${draftChannel}` : "Padrão visual: @usuario (salve para criar seu link real)"}
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase tracking-widest text-ink-400 block mb-1.5">
                  Bio do Perfil
                </label>
                <div className="relative">
                  <textarea
                    ref={bioInputRef}
                    value={draftBio}
                    onChange={e => setDraftBio(e.target.value)}
                    placeholder="Conte quem você é e seus conteúdos..."
                    maxLength={280}
                    rows={3}
                    className="w-full rounded-xl border border-[#232327] bg-[#101012] p-3 text-[13.5px] leading-relaxed text-bone-200 placeholder:text-bone-600 focus:border-signal-400 focus:outline-none focus:shadow-[0_0_15px_rgba(242,179,61,0.15)] transition-all resize-none"
                  />
                  <div className="flex justify-between items-center mt-1 px-1 text-[11px] font-mono text-ink-400">
                    <span>Aparecerá para quem visitar o seu link público</span>
                    <span className={draftBio.length >= 260 ? "text-signal-400 font-bold" : ""}>{draftBio.length}/280</span>
                  </div>
                </div>
              </div>

              {/* Editor de Links */}
              <div className="rounded-xl border border-[#232327] bg-[#0c0c0e] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Icon name="link" className="h-4 w-4 text-signal-400" />
                  <span className="font-display text-[13px] font-bold text-white tracking-tight">Links do Perfil (Redes Sociais & Portfólio)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-wider text-[#8c8c94] flex items-center gap-1.5 mb-1">
                      <Icon name="globe" className="h-3 w-3 text-[#F2B33D]" /> Website / Portfólio
                    </label>
                    <Input 
                      value={draftWebsite} 
                      onChange={e => setDraftWebsite(e.target.value)} 
                      placeholder="ex: meusite.com"
                      className="bg-[#101012] border-[#232327] text-white text-[12px] h-9 focus:border-signal-400"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-wider text-[#8c8c94] flex items-center gap-1.5 mb-1">
                      <Icon name="youtube" className="h-3 w-3 text-[#FF0000]" /> YouTube
                    </label>
                    <Input 
                      value={draftYoutube} 
                      onChange={e => setDraftYoutube(e.target.value)} 
                      placeholder="youtube.com/@seucanal"
                      className="bg-[#101012] border-[#232327] text-white text-[12px] h-9 focus:border-[#FF0000]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-wider text-[#8c8c94] flex items-center gap-1.5 mb-1">
                      <Icon name="instagram" className="h-3 w-3 text-[#E1306C]" /> Instagram
                    </label>
                    <Input 
                      value={draftInstagram} 
                      onChange={e => setDraftInstagram(e.target.value)} 
                      placeholder="instagram.com/usuario"
                      className="bg-[#101012] border-[#232327] text-white text-[12px] h-9 focus:border-[#E1306C]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono uppercase tracking-wider text-[#8c8c94] flex items-center gap-1.5 mb-1">
                      <Icon name="tiktok" className="h-3 w-3 text-[#00f2fe]" /> TikTok
                    </label>
                    <Input 
                      value={draftTiktok} 
                      onChange={e => setDraftTiktok(e.target.value)} 
                      placeholder="tiktok.com/@usuario"
                      className="bg-[#101012] border-[#232327] text-white text-[12px] h-9 focus:border-[#00f2fe]"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-[#8c8c94] flex items-center gap-1.5 mb-1">
                      <Icon name="discord" className="h-3 w-3 text-[#5865F2]" /> Comunidade no Discord
                    </label>
                    <Input 
                      value={draftDiscord} 
                      onChange={e => setDraftDiscord(e.target.value)} 
                      placeholder="discord.gg/comunidade"
                      className="bg-[#101012] border-[#232327] text-white text-[12px] h-9 focus:border-[#5865F2]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Reveal>

      {/* Banner de Modo de Edição Ativo */}
      {isEditingProfile && (
        <div className="mb-8 rounded-2xl border border-signal-400/30 bg-gradient-to-r from-signal-400/10 via-[#101012] to-[#0c0c0e] p-5 backdrop-blur-md shadow-[0_10px_30px_-10px_rgba(242,179,61,0.2)] anim-fade">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-signal-400/20 border border-signal-400/40 flex items-center justify-center text-signal-400 shrink-0">
                <Icon name="type" className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-display text-[16px] font-bold text-white tracking-tight">Modo de Edição de Perfil Ativo</h4>
                <p className="text-[12.5px] text-bone-400 mt-0.5 leading-relaxed">
                  Personalize seu nome, seu @ de usuário único, sua bio e links no formulário acima. Abaixo em cada card, use os botões para definir quais blocos visitantes poderão ver.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
              <Button 
                variant="outline" 
                onClick={cancelEditingProfile} 
                disabled={saving} 
                className="border-[#232327] bg-[#101012] text-bone-300 hover:text-white hover:bg-[#18181b] text-[12px] px-4 py-2.5 font-semibold"
              >
                Cancelar
              </Button>
              <Button 
                variant="solid" 
                onClick={saveProfileChanges} 
                disabled={saving} 
                className="text-[12px] font-bold uppercase tracking-wider px-5 py-2.5 bg-signal-400 text-ink-950 hover:bg-signal-300 shadow-[0_0_20px_rgba(242,179,61,0.35)]"
              >
                {saving ? "Salvando..." : "Salvar Perfil"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TABS */}
      <div className="mb-8 flex gap-1 border-b border-ink-800 pb-px overflow-x-auto scrollbar-hide">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-[13px] font-semibold transition-colors ${
              tab === t.id
                ? "border-signal-400 text-bone-50"
                : "border-transparent text-bone-400 hover:text-bone-200"
            }`}
          >
            <Icon name={t.icon} className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      {tab === "geral" && (
        <Reveal className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Coluna Esquerda: Estatísticas de Uso */}
          <div className="flex flex-col gap-6">
            {(!isViewingOther || displayedCardVis.stats !== false) && (
              <Panel className="p-0 overflow-hidden border-[#232327] bg-[#0c0c0e]">
                {renderCardVisibilityBanner("stats", "Monitor de uso")}
                
                {/* Header: Monitor de uso */}
                <div className="flex items-center gap-3 border-b border-[#232327] px-4 py-3">
                  <span className="flex gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-[#F2604C]" />
                    <span className="h-2 w-2 rounded-full bg-[#F2B33D]" />
                    <span className="h-2 w-2 rounded-full bg-[#2FD4A0]" />
                  </span>
                  <span className="flex-1 text-center font-mono text-[10px] uppercase tracking-widest text-[#9a9aa2]">
                    Monitor de uso · 12 semanas
                  </span>
                  <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-[#2FD4A0]">
                    <Icon name="wave" className="h-3 w-3" strokeWidth={2.4} /> Ao vivo
                  </span>
                </div>
                
                {/* Gráfico de Barras */}
                <div className="px-4 pb-5 pt-4">
                  <div className="flex h-[104px] items-end gap-[3px]">
                    {metrics.days56.map((count: number, i: number) => {
                      const hasRun = count > 0;
                      const intensity = metrics.maxDayActions > 0 ? count / metrics.maxDayActions : 0;
                      const color = hasRun 
                        ? (intensity > 0.7 ? "#F2604C" : intensity > 0.35 ? "#F2B33D" : "#2FD4A0") 
                        : "#1c1c20";
                      const h = hasRun ? Math.max(18, Math.round(intensity * 100)) : 6;
                      
                      return (
                        <div 
                          key={i} 
                          title={`Dia ${i + 1}: ${count} ${count === 1 ? 'ação' : 'ações'}`}
                          className="flex-1 rounded-full hover:opacity-100 transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                          style={{ 
                            height: mounted ? `${h}%` : '4%', 
                            background: color,
                            opacity: mounted ? (hasRun ? 0.95 : 0.4) : 0,
                            transitionDelay: `${i * 10}ms`
                          }}
                        />
                      );
                    })}
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-[#8c8c94]">
                    <span>{metrics.startDateStr}</span>
                    <span>
                      {metrics.hasActivity
                        ? `pico ${metrics.peakMinutes} min · média ${metrics.avgMinutesPerActiveDay} min/dia ativo`
                        : "sem atividade recente registrada"}
                    </span>
                    <span>{metrics.endDateStr}</span>
                  </div>
                </div>

                {/* Carga por dia da semana */}
                <div className="mx-4 rounded-xl border border-[#232327] bg-[#0d0d0f] p-3.5">
                  <div className="mb-3 text-[10px] font-mono uppercase tracking-widest text-[#8c8c94]">Carga por dia da semana</div>
                  <div className="space-y-[7px]">
                    {["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"].map((label, i) => {
                      const count = metrics.dowCounts[i];
                      const filled = metrics.maxDow > 0 && count > 0 
                        ? Math.max(1, Math.round((count / metrics.maxDow) * 18)) 
                        : 0;
                      const mins = count * 15;
                      const timeLabel = count === 0 
                        ? "0m" 
                        : (mins >= 60 
                            ? `${Math.floor(mins / 60)}h${String(mins % 60).padStart(2, "0")}` 
                            : `${mins}m`);
                      return (
                        <div key={label} className="flex items-center gap-3">
                          <span className="w-7 font-mono text-[10px] uppercase tracking-widest text-[#8c8c94]">{label}</span>
                          <div className="flex flex-1 gap-[3px]">
                            {Array.from({ length: 18 }).map((_, c) => {
                              const on = c < filled;
                              const t = c / 18;
                              const color = on ? (t > 0.65 ? "#F2604C" : t > 0.45 ? "#F2B33D" : "#2FD4A0") : "#1c1c20";
                              return (
                                <span
                                  key={c}
                                  className="h-[9px] flex-1 rounded-[2px] transition-all duration-500 ease-out"
                                  style={{ 
                                    background: color, 
                                    opacity: mounted ? (on ? 0.92 : 0.4) : 0,
                                    transform: mounted ? "scaleY(1)" : "scaleY(0)",
                                    transitionDelay: `${i * 40 + c * 20}ms`
                                  }}
                                />
                              );
                            })}
                          </div>
                          <span className="w-14 text-right font-mono text-[11px] text-[#b6b6be] tabular-nums">
                            {timeLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2x2 Grid */}
                <div className="mt-4 grid grid-cols-1 gap-px border-t border-[#232327] bg-[#232327] sm:grid-cols-2">
                  {[
                    { 
                      label: "USO DE FERRAMENTAS", 
                      value: metrics.totalRuns.toString(), 
                      vcolor: "#2FD4A0", 
                      delta: metrics.totalRuns > 0 ? `+${metrics.totalRuns}` : "-", 
                      dtone: "#2FD4A0", 
                      hint: metrics.totalRuns === 1 ? "1 EXECUÇÃO REGISTRADA" : `${metrics.totalRuns} EXECUÇÕES REGISTRADAS` 
                    },
                    { 
                      label: "HORAS EM ESTÚDIO", 
                      value: metrics.studioHoursFormatted, 
                      suffix: metrics.studioMinutesSuffix, 
                      vcolor: "#2FD4A0", 
                      delta: metrics.studioMinutes > 0 ? `${Math.round((metrics.studioMinutes / (40 * 60)) * 100)}%` : "-", 
                      dtone: "#2FD4A0", 
                      hint: "META MENSAL: 40H" 
                    },
                    { 
                      label: "IDEIAS RANQUEADAS", 
                      value: metrics.ideasCount.toString(), 
                      vcolor: "#F2604C", 
                      delta: metrics.ideasCount > 0 ? `+${metrics.ideasCount}` : "-", 
                      dtone: "#F2604C", 
                      hint: "BANCO DE IDEIAS DO ESTÚDIO" 
                    },
                    { 
                      label: "SEQUÊNCIA ATUAL", 
                      value: metrics.streak.toString(), 
                      suffix: metrics.streak === 1 ? " dia" : " dias", 
                      vcolor: "#F2B33D", 
                      delta: `+${metrics.streak}`, 
                      dtone: "#F2B33D", 
                      hint: `RECORDE: ${metrics.streak} ${metrics.streak === 1 ? 'DIA' : 'DIAS'}` 
                    }
                  ].map((m, i) => (
                    <div 
                      key={m.label} 
                      className="bg-[#101012] px-4 py-4 transition-all duration-700 ease-out"
                      style={{
                        opacity: mounted ? 1 : 0,
                        transform: mounted ? "translateY(0)" : "translateY(12px)",
                        transitionDelay: `${300 + i * 100}ms`
                      }}
                    >
                      <div className="text-[10px] font-mono uppercase tracking-widest text-[#8c8c94]">{m.label}</div>
                      <div className="mt-2.5 flex items-end justify-between gap-2">
                        <div className="font-display text-[30px] font-medium leading-none tabular-nums" style={{ color: m.vcolor }}>
                          {m.value}<span className="text-[17px] opacity-90">{m.suffix || ""}</span>
                        </div>
                        <span className="rounded-md px-1.5 py-0.5 font-mono text-[11px] tabular-nums" style={{ color: m.dtone, background: `${m.dtone}1a` }}>
                          {m.delta}
                        </span>
                      </div>
                      <div className="mt-2 truncate text-[10px] font-mono uppercase tracking-widest text-[#8c8c94]">{m.hint}</div>
                    </div>
                  ))}
                </div>

                {/* Ferramentas */}
                <div className="border-t border-[#232327] bg-[#0c0c0e] px-4 py-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Icon name="dial" className="h-3 w-3 text-[#F2B33D]" />
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[#9a9aa2]">Ferramentas mais usadas</span>
                    <span className="h-px flex-1 bg-[#232327]" />
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[#9a9aa2] tabular-nums">
                      {metrics.totalRuns} {metrics.totalRuns === 1 ? "EXECUÇÃO" : "EXECUÇÕES"}
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {metrics.toolsList.length > 0 ? (
                      metrics.toolsList.map((t: any, i: number) => {
                        const share = Math.round((t.runs / metrics.maxToolRuns) * 100);
                        const color = i === 0 ? "#F2604C" : i === 1 ? "#F2B33D" : "#2FD4A0";
                        return (
                          <div key={t.id} className="flex items-center gap-3">
                            <span className="w-5 font-mono text-[11px] text-[#7f7f88] tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                            <span className="w-[150px] shrink-0 truncate text-[12.5px] text-[#d3d3d8]">{t.name}</span>
                            <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-[#1c1c20]">
                              <div 
                                className="h-full rounded-full transition-all duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)]" 
                                style={{ width: mounted ? `${Math.max(share, 8)}%` : '0%', background: color, transitionDelay: `${i * 120 + 400}ms` }} 
                              />
                            </div>
                            <span className="w-12 text-right font-mono text-[11px] text-[#b6b6be] tabular-nums">{t.runs}×</span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-[12px] text-[#8c8c94] py-1 font-mono">
                        Nenhuma ferramenta utilizada ainda.
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="border-t border-[#232327] bg-[#0c0c0e] px-4 py-3">
                  <p className="text-[12px] leading-relaxed text-[#8c8c94]">
                    {metrics.hasActivity ? (
                      <>
                        Histórico sincronizado em tempo real. Dia com maior atividade: <strong className="text-bone-200 capitalize">{metrics.bestDowName}</strong>, totalizando <strong className="text-bone-200">{metrics.studioHoursFormatted}{metrics.studioMinutesSuffix}</strong> dedicados à criação.
                      </>
                    ) : (
                      <>
                        O monitor de estúdio é sincronizado em tempo real com o uso da conta. Conforme ferramentas forem executadas e projetos planejados, as métricas aparecerão aqui automaticamente.
                      </>
                    )}
                  </p>
                </div>

              </Panel>
            )}

            {/* Card de Comentários da Comunidade */}
            {(!isViewingOther || displayedCardVis.comments !== false) && (
              <Panel className="p-0 overflow-hidden border-[#232327] bg-[#0c0c0e]">
                {renderCardVisibilityBanner("comments", "Mural de Comentários")}
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#232327] px-4 py-3.5 bg-[#0a0a0c]">
                  <div className="flex items-center gap-3">
                    <span className="h-3.5 w-1 rounded-full bg-[#6E93F5]" />
                    <div className="flex items-center gap-2">
                      <Icon name="message" className="h-4 w-4 text-[#6E93F5]" />
                      <h3 className="font-display text-[15px] font-bold text-white tracking-tight">
                        Mural de Comentários
                      </h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {!isViewingOther && !isEditingProfile && (
                      <button
                        onClick={handleToggleCommentsVisibility}
                        className={cn(
                          "flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-[9.5px] transition-colors",
                          cardVisibility.comments !== false
                            ? "border-[#232327] bg-[#101012] text-[#8c8c94] hover:text-bone-200"
                            : "border-signal-500/40 bg-signal-500/10 text-signal-400"
                        )}
                        title={cardVisibility.comments !== false ? "Clique para ocultar este mural do perfil público" : "Clique para tornar este mural visível no perfil público"}
                      >
                        <Icon name={cardVisibility.comments !== false ? "eye" : "eyeOff"} className="h-3 w-3" />
                        <span>{cardVisibility.comments !== false ? "Visível" : "Oculto"}</span>
                      </button>
                    )}
                    <span className="font-mono text-[10px] text-[#8c8c94] tracking-[0.15em] tabular-nums">
                      {comments.length} {comments.length === 1 ? "comentário" : "comentários"}
                    </span>
                  </div>
                </div>

              <div className="p-5 space-y-5">
                {/* Formulário para novo comentário */}
                {user?.is_temporary ? (
                  <div className="flex flex-col gap-3 rounded-lg border border-signal-400/30 bg-signal-400/[0.05] p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal-400/10 text-signal-400">
                        <Icon name="spark" className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-bone-200">
                          Conta teste em modo demonstração
                        </p>
                        <p className="text-[11px] text-[#8c8c94]">
                          Contas de teste de 24h não podem comentar ou curtir perfis. Crie uma conta definitiva para interagir no mural.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => onGo?.("login")}
                      className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-signal-400/40 bg-signal-400/10 px-3.5 py-1.5 font-mono text-[11px] font-bold text-signal-400 hover:bg-signal-400 hover:text-ink-950 transition-all cursor-pointer"
                    >
                      <span>Criar conta definitiva</span>
                      <Icon name="arrow" className="h-3 w-3" />
                    </button>
                  </div>
                ) : user && user.provider !== "demo" ? (
                  <form onSubmit={handlePostComment} className="space-y-3">
                    <div className="flex gap-3">
                      {/* Avatar do autor logado */}
                      <div className="shrink-0 relative">
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={user.name || "Você"}
                            className="h-8 w-8 rounded-full object-cover ring-1 ring-ink-700"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-800 font-display text-xs font-bold text-bone-200 ring-1 ring-ink-700">
                            {(user.name || "U").charAt(0).toUpperCase()}
                          </div>
                        )}
                        {user.is_vip && <VipBadge size="xs" />}
                      </div>

                      {/* Campo de texto */}
                      <div className="flex-1">
                        <textarea
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder={
                            isViewingOther
                              ? `Deixe uma mensagem ou feedback para @${cleanViewedHandle}…`
                              : "Deixe um recado no seu mural de criador…"
                          }
                          rows={2}
                          maxLength={500}
                          className="w-full resize-none rounded-lg border border-[#232327] bg-[#101012] p-3 text-xs text-bone-100 placeholder-[#52525b] focus:border-[#6E93F5]/60 focus:outline-none transition-colors"
                        />
                        <div className="mt-1.5 flex items-center justify-between">
                          <span className="font-mono text-[9px] text-[#52525b]">
                            {commentText.length}/500 caracteres
                          </span>
                          <button
                            type="submit"
                            disabled={postingComment || !commentText.trim()}
                            className="inline-flex items-center gap-1.5 rounded-md bg-[#6E93F5] px-3 py-1.5 font-mono text-[11px] font-bold text-ink-950 transition-all hover:bg-[#86A5F7] disabled:opacity-40 disabled:hover:bg-[#6E93F5]"
                          >
                            {postingComment ? (
                              <>
                                <Icon name="refresh" className="h-3 w-3 animate-spin" />
                                <span>Enviando…</span>
                              </>
                            ) : (
                              <>
                                <Icon name="send" className="h-3 w-3" />
                                <span>Comentar</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                    {commentError && (
                      <p className="font-mono text-[11px] text-signal-400">{commentError}</p>
                    )}
                  </form>
                ) : (
                  /* Bloqueio amigável para visitantes sem login */
                  <div className="flex flex-col gap-3 rounded-lg border border-[#232327] bg-[#101012]/80 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#6E93F5]/10 text-[#6E93F5]">
                        <Icon name="lock" className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-bone-200">
                          Apenas usuários com conta podem comentar
                        </p>
                        <p className="text-[11px] text-[#8c8c94]">
                          Faça login para interagir e deixar seu recado no perfil.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => onGo?.("login")}
                      className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-[#6E93F5]/40 bg-[#6E93F5]/10 px-3.5 py-1.5 font-mono text-[11px] font-bold text-[#6E93F5] hover:bg-[#6E93F5] hover:text-ink-950 transition-all"
                    >
                      <span>Entrar com conta</span>
                      <Icon name="arrow" className="h-3 w-3" />
                    </button>
                  </div>
                )}

                {/* Divisor */}
                <div className="h-px w-full bg-[#1c1c20]" />

                {/* Lista de Comentários */}
                <div className="space-y-3.5">
                  {commentsLoading && comments.length === 0 ? (
                    <div className="flex items-center justify-center py-6 font-mono text-xs text-[#8c8c94]">
                      <Icon name="refresh" className="mr-2 h-3.5 w-3.5 animate-spin text-[#6E93F5]" />
                      Carregando comentários…
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#18181b] text-[#52525b]">
                        <Icon name="message" className="h-5 w-5" />
                      </div>
                      <p className="mt-2.5 text-xs font-medium text-bone-300">
                        Nenhum comentário por aqui ainda
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#52525b]">
                        {isViewingOther
                          ? `Seja o primeiro a deixar uma mensagem para @${cleanViewedHandle}!`
                          : "Seu mural está vazio. Usuários que visitarem seu perfil poderão comentar aqui."}
                      </p>
                    </div>
                  ) : (
                    comments.map((c) => {
                      const isAuthor = user?.id === c.author_id;
                      const isProfileOwner = Boolean(user?.id && user.id === currentProfileId);
                      const canDelete = isAuthor || isProfileOwner;
                      const isTargetOwner = c.author_id === currentProfileId;

                      return (
                        <div
                          key={c.id}
                          className="group relative flex gap-3 rounded-xl border border-transparent bg-[#101012]/60 p-3.5 transition-colors hover:border-[#232327] hover:bg-[#101012]"
                        >
                          {/* Avatar do autor */}
                          <button
                            onClick={() => onGo?.("perfil", c.author_channel)}
                            className="relative shrink-0 focus:outline-none"
                          >
                            {c.author_avatar ? (
                              <img
                                src={c.author_avatar}
                                alt={c.author_name}
                                className="h-8 w-8 rounded-full object-cover ring-1 ring-ink-700"
                              />
                            ) : (
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-800 font-display text-xs font-bold text-bone-200 ring-1 ring-ink-700">
                                {(c.author_name || "U").charAt(0).toUpperCase()}
                              </div>
                            )}
                            {c.author_is_vip && <VipBadge size="xs" />}
                          </button>

                          {/* Conteúdo */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                  onClick={() => onGo?.("perfil", c.author_channel)}
                                  className="text-xs font-bold text-bone-100 hover:text-[#6E93F5] transition-colors"
                                >
                                  {c.author_name}
                                </button>
                                <button
                                  onClick={() => onGo?.("perfil", c.author_channel)}
                                  className="font-mono text-[10.5px] text-[#71717a] hover:text-bone-300 transition-colors"
                                >
                                  @{c.author_channel}
                                </button>
                                {isTargetOwner && (
                                  <span className="rounded bg-[#F2B33D]/10 px-1.5 py-0.2 font-mono text-[8.5px] font-bold text-[#F2B33D] uppercase border border-[#F2B33D]/20">
                                    Dono do Perfil
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[9.5px] text-[#52525b]">
                                  {new Date(c.created_at).toLocaleDateString("pt-BR", {
                                    day: "2-digit",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>

                                {/* Botão de Excluir */}
                                {canDelete && (
                                  <button
                                    onClick={() => handleDeleteComment(c)}
                                    disabled={deletingCommentId === c.id}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-[#71717a] hover:text-signal-400 transition-all rounded hover:bg-signal-500/10"
                                    title={
                                      isProfileOwner && !isAuthor
                                        ? "Excluir comentário (Você é o dono do perfil)"
                                        : "Excluir meu comentário"
                                    }
                                  >
                                    {deletingCommentId === c.id ? (
                                      <Icon name="refresh" className="h-3 w-3 animate-spin text-signal-400" />
                                    ) : (
                                      <Icon name="trash" className="h-3 w-3" />
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>

                            <p className="mt-1.5 text-xs leading-relaxed text-[#d3d3d8] whitespace-pre-wrap break-words">
                              {c.content}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </Panel>
          )}
          </div>

          {/* Coluna Direita: Caderno & Conquistas */}
          <aside className="space-y-6">
            {/* Projetos em Andamento */}
            {(!isViewingOther || displayedCardVis.projects !== false) && (
              <Panel className="p-0 overflow-hidden border-[#232327] bg-[#0c0c0e]">
                {renderCardVisibilityBanner("projects", "Projetos em Andamento")}
                <div className="flex items-center gap-3 border-b border-[#232327] px-4 py-3.5 bg-[#0a0a0c]">
                  <span className="h-3.5 w-1 rounded-full bg-[#2FD4A0]" />
                  <h3 className="flex-1 font-display text-[15px] font-bold text-white tracking-tight">Projetos em Andamento</h3>
                  <span className="font-mono text-[10px] text-[#8c8c94] tracking-[0.15em] tabular-nums">{effectiveOngoingProjects.length}</span>
                </div>
                <div className="p-5 space-y-4">
                  {effectiveOngoingProjects.map((proj) => (
                    <div key={proj.id} className="group">
                      <div className="flex justify-between items-center mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-medium text-[#d3d3d8]">{proj.name}</span>
                          {proj.external_link && (
                            <a href={proj.external_link} target="_blank" rel="noopener noreferrer" className="text-[#8c8c94] hover:text-[#6E93F5] transition-colors" title="Acessar link">
                              <Icon name="link" className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono font-bold text-bone-100 tabular-nums">{proj.progress}%</span>
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-ink-900 border border-[#232327] text-[#8c8c94] uppercase tracking-wider">{proj.status}</span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-[#1c1c20] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: mounted ? `${Math.max(proj.progress, 4)}%` : '0%', backgroundColor: proj.color }} />
                      </div>
                    </div>
                  ))}
                  {effectiveOngoingProjects.length === 0 && (
                    <div className="text-[12px] text-[#8c8c94] text-center py-2 font-mono">Nenhum projeto em andamento.</div>
                  )}
                </div>
              </Panel>
            )}

            {/* Card Coringa */}
            {(!isViewingOther || displayedCardVis.video !== false) && (
              <Panel className="p-0 overflow-hidden border-[#232327] bg-[#0c0c0e]">
                {renderCardVisibilityBanner("video", "Vídeo em Destaque")}
                <div className="flex items-center gap-3 border-b border-[#232327] px-4 py-3.5 bg-[#0a0a0c]">
                  <span className="h-3.5 w-1 rounded-full bg-[#6E93F5]" />
                  {isEditingJoker && !isViewingOther ? (
                    <input
                      type="text"
                      value={jokerTitle}
                      onChange={(e) => setJokerTitle(e.target.value)}
                      className="flex-1 bg-transparent text-[15px] font-display font-bold text-white focus:outline-none"
                      autoFocus
                      onBlur={() => setIsEditingJoker(false)}
                      onKeyDown={(e) => e.key === 'Enter' && setIsEditingJoker(false)}
                    />
                  ) : (
                    <h3 className={`flex-1 font-display text-[15px] font-bold text-white tracking-tight ${!isViewingOther ? 'cursor-pointer hover:text-[#6E93F5] transition-colors' : ''}`} onClick={() => !isViewingOther && setIsEditingJoker(true)}>
                      {(isViewingOther ? (targetProfile?.featured_video?.title || "Vídeo em Destaque") : (jokerTitle || "Clique para definir título"))}
                    </h3>
                  )}
                  {!isViewingOther && (
                    <button onClick={() => setIsEditingJoker(!isEditingJoker)} className="text-[#8c8c94] hover:text-white transition-colors" title="Editar Título">
                      <Icon name="type" className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              <div className="p-5 space-y-4">
                {videoProjects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-2xl border border-dashed border-[#232327] bg-[#0c0c0e]">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 mb-3 border border-white/5">
                      <Icon name="youtube" className="h-5 w-5 text-[#8c8c94]" />
                    </div>
                    <h4 className="text-[13px] font-medium text-white mb-1.5">Nenhum vídeo disponível</h4>
                    <p className="text-[11px] text-[#8c8c94] max-w-[260px] leading-relaxed">
                      Para exibir um vídeo aqui, adicione um link (YouTube, Vimeo, TikTok, ou MP4) nas configurações de algum dos seus projetos.
                    </p>
                  </div>
                ) : !videoProjects.find(p => p.id === jokerProject) || isSelectingProject ? (
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono text-[#8c8c94] uppercase tracking-widest">
                        {videoProjects.find(p => p.id === jokerProject) ? "Alterar Projeto" : "Selecione um projeto"}
                      </span>
                      {videoProjects.find(p => p.id === jokerProject) && (
                        <button onClick={() => setIsSelectingProject(false)} className="text-[10px] font-medium text-[#6E93F5] hover:text-white transition-colors">
                          Cancelar
                        </button>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      {videoProjects.map(p => (
                        <button
                          key={p.id}
                          onClick={() => { setJokerProject(p.id); setIsSelectingProject(false); }}
                          className={`group flex items-center justify-between rounded-xl border p-3 transition-all text-left ${jokerProject === p.id ? 'border-[#6E93F5]/30 bg-[#6E93F5]/10 shadow-[0_0_15px_rgba(110,147,245,0.1)]' : 'border-[#232327] bg-[#101012] hover:border-[#6E93F5]/40 hover:bg-[#101012]/80'}`}
                        >
                           <div className="flex items-center gap-3">
                             <div className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${jokerProject === p.id ? 'bg-[#6E93F5]/20 text-[#6E93F5]' : 'bg-[#232327]/50 text-[#8c8c94] group-hover:text-[#6E93F5]'}`}>
                               <Icon name="layers" className="h-4 w-4" />
                             </div>
                             <div>
                               <div className={`text-[13px] font-medium tracking-tight ${jokerProject === p.id ? 'text-[#6E93F5]' : 'text-[#d3d3d8]'}`}>
                                 {p.name}
                               </div>
                               <div className="text-[10px] font-mono text-[#8c8c94] mt-0.5">{p.status}</div>
                             </div>
                           </div>
                           {jokerProject === p.id && (
                             <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#6E93F5]">
                               <Icon name="check" className="h-3 w-3 text-[#101012]" strokeWidth={4} />
                             </div>
                           )}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-0 rounded-2xl overflow-hidden shadow-2xl relative border border-[#232327]">
                    {(() => {
                           const embedUrl = getEmbedUrl(videoProjects.find(p => p.id === jokerProject)?.external_link);
                           if (!embedUrl) return null;
                           const isNative = embedUrl.endsWith('.mp4') || embedUrl.endsWith('.webm');
                           const isYouTube = embedUrl.includes('youtube.com/embed/');
                           let ytId = null;
                           if (isYouTube) {
                             ytId = embedUrl.split('embed/')[1].split('?')[0];
                           }
                           
                           const finalEmbedUrl = (!isNative && isPlayingJokerVideo) 
                             ? (embedUrl.includes('autoplay=0') ? embedUrl.replace('autoplay=0', 'autoplay=1') : `${embedUrl}${embedUrl.includes('?') ? '&' : '?'}autoplay=1`) 
                             : embedUrl;
                           
                           return (
                             <div 
                               ref={jokerVideoRef}
                               className="group relative w-full aspect-video bg-[#0c0c0e]"
                             >
                               {isNative ? (
                                 <video 
                                   src={finalEmbedUrl} 
                                   className="w-full h-full object-contain"
                                   controls={isPlayingJokerVideo}
                                   autoPlay={isPlayingJokerVideo}
                                 />
                               ) : isYouTube && !isPlayingJokerVideo ? (
                                 <img 
                                   src={`https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`}
                                   onError={(e) => { e.currentTarget.src = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`; }}
                                   alt="Video Thumbnail"
                                   className="w-full h-full object-cover"
                                 />
                               ) : (
                                 <iframe 
                                   src={finalEmbedUrl} 
                                   className={`w-full h-full`}
                                   allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                   allowFullScreen 
                                 />
                               )}
                               
                               {/* Overlay */}
                               <div className={`absolute inset-0 flex flex-col transition-all duration-300 pointer-events-none ${!isPlayingJokerVideo ? 'bg-black/30' : 'bg-transparent'}`}>
                                 {/* Expand Button */}
                                 <div className={`absolute top-3 right-3 flex gap-2 z-20 transition-opacity duration-300 ${!isPlayingJokerVideo ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'}`}>
                                   <button 
                                     onClick={() => {
                                       if (!document.fullscreenElement) {
                                         jokerVideoRef.current?.requestFullscreen();
                                       } else {
                                         document.exitFullscreen();
                                       }
                                     }}
                                     className={`pointer-events-auto flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition-all hover:bg-black/90 hover:text-[#6E93F5] hover:scale-110`}
                                     title="Expandir"
                                   >
                                     <Icon name="maximize" className="h-3.5 w-3.5" />
                                   </button>
                                 </div>
                                 
                                 {/* Center Play Button */}
                                 <div className="flex-1 flex items-center justify-center z-20 pointer-events-none">
                                   {!isPlayingJokerVideo && (
                                     <button 
                                       onClick={() => setIsPlayingJokerVideo(true)} 
                                       className="pointer-events-auto group/play flex h-14 w-14 items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white shadow-[0_0_40px_rgba(0,0,0,0.5)] transition-all hover:scale-110 hover:bg-white/20"
                                     >
                                       <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black transition-transform group-hover/play:scale-105">
                                         <Icon name="play" className="h-5 w-5 ml-0.5" />
                                       </div>
                                     </button>
                                   )}
                                 </div>

                                 {/* Debug url (temporary) */}
                                 <div className="absolute top-2 left-2 text-[8px] text-white/30 bg-black/50 px-1 rounded font-mono truncate max-w-[200px] pointer-events-none opacity-0 group-hover:opacity-100 z-30">
                                   {finalEmbedUrl}
                                 </div>

                                 {/* Gradient & Info Bar at the Bottom */}
                                 <div className={`absolute bottom-0 left-0 right-0 p-3 pt-12 bg-gradient-to-t from-black via-black/80 to-transparent transition-opacity duration-300 pointer-events-none ${!isPlayingJokerVideo ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} z-20`}>
                                    <div className="flex flex-col gap-2 pointer-events-auto">
                                      <div className="flex items-center gap-2">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white backdrop-blur-sm border border-white/10 shadow-lg">
                                          <Icon name="layers" className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <div className="text-[13px] font-bold text-white tracking-tight drop-shadow-md truncate">
                                            {videoProjects.find(p => p.id === jokerProject)?.name}
                                          </div>
                                          <div className="text-[9px] font-mono text-white/70 mt-0.5 uppercase drop-shadow-sm flex items-center gap-1.5">
                                            <span className="h-1.5 w-1.5 rounded-full bg-[#6E93F5]"></span>
                                            {videoProjects.find(p => p.id === jokerProject)?.status}
                                          </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                           {editingLink ? (
                                             <div className="flex items-center gap-1 bg-black/60 p-1 rounded-lg backdrop-blur-md border border-white/10">
                                               <input 
                                                 type="url" 
                                                 value={tempLink}
                                                 onChange={(e) => setTempLink(e.target.value)}
                                                 placeholder="Link"
                                                 className="w-20 rounded-md bg-white/10 px-1.5 py-1 text-[9px] text-white border border-transparent focus:outline-none focus:border-white/30 placeholder:text-white/40"
                                                 autoFocus
                                                 onKeyDown={(e) => e.key === 'Enter' && handleSaveLink(jokerProject)}
                                               />
                                               <button onClick={() => handleSaveLink(jokerProject)} className="px-1.5 py-1 rounded-md bg-[#2FD4A0] text-black text-[9px] font-bold hover:bg-[#2FD4A0]/90 transition-colors">Salvar</button>
                                               <button onClick={() => setEditingLink(false)} className="px-1.5 py-1 rounded-md text-white/70 text-[9px] font-medium hover:text-white hover:bg-white/10 transition-colors">X</button>
                                             </div>
                                           ) : videoProjects.find(p => p.id === jokerProject)?.external_link ? (
                                             <button onClick={() => { setTempLink(videoProjects.find(p => p.id === jokerProject)?.external_link || ""); setEditingLink(true); }} className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/10 text-white backdrop-blur-sm border border-white/10 hover:bg-white/20 hover:scale-105 transition-all shadow-lg" title="Editar link">
                                               <Icon name="type" className="h-3 w-3" />
                                             </button>
                                           ) : (
                                             <button onClick={() => { setTempLink(""); setEditingLink(true); }} className="flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1.5 text-[10px] font-medium text-white backdrop-blur-sm border border-white/10 hover:bg-white/20 hover:scale-105 transition-all shadow-lg">
                                               <Icon name="link" className="h-3 w-3" /> Link
                                             </button>
                                           )}
                                           
                                           <div className="h-3 w-px bg-white/20 mx-0.5"></div>

                                           <button onClick={() => setIsSelectingProject(true)} className="flex items-center justify-center h-7 w-7 rounded-lg bg-white/10 text-white backdrop-blur-sm border border-white/10 hover:bg-white/20 hover:scale-105 transition-all shadow-lg" title="Trocar projeto">
                                             <Icon name="dial" className="h-3 w-3" />
                                           </button>
                                        </div>
                                      </div>
                                    </div>
                                 </div>
                               </div>
                             </div>
                           );
                    })()}
                  </div>
                )}
              </div>
            </Panel>
            )}

            {!hideOnboarding && !isPublicView && (
              <Panel className="p-0 overflow-hidden border-[#232327] bg-[#0c0c0e]">
              <div className="flex items-center gap-3 border-b border-[#232327] px-4 py-3.5 bg-[#0a0a0c]">
                <span className="h-3.5 w-1 rounded-full bg-[#F2B33D]" />
                <h3 className="flex-1 font-display text-[15px] font-bold text-white tracking-tight">Primeiros Passos</h3>
                <span className="font-mono text-[10px] text-[#8c8c94] tracking-[0.15em] tabular-nums">{completedCount} / 5</span>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-5">
                  <div className="relative h-[76px] w-[76px] shrink-0">
                     <svg viewBox="0 0 88 88" className="absolute inset-0 h-full w-full -rotate-90 drop-shadow-[0_0_10px_rgba(242,179,61,0.2)]">
                       <circle cx="44" cy="44" r="38" fill="none" className="stroke-[#1a1a1f]" strokeWidth="7" />
                       <circle cx="44" cy="44" r="38" fill="none" className="stroke-[#F2B33D] transition-all duration-1000 ease-out" strokeWidth="7" strokeLinecap="round" strokeDasharray="238.7" strokeDashoffset={strokeDashoffset} />
                     </svg>
                     <div className="absolute inset-0 flex flex-col items-center justify-center">
                       <div className="flex items-baseline gap-[1px]">
                         <span className="font-display text-[20px] text-white font-bold leading-none tracking-tight">{progressPercent}</span>
                         <span className="text-[10px] text-[#F2B33D] font-bold leading-none">%</span>
                       </div>
                     </div>
                  </div>
                  <div>
                    <p className="text-[12.5px] text-[#8c8c94] leading-relaxed">
                      {remainingItems > 0 
                        ? `Faltam ${remainingItems} ite${remainingItems === 1 ? 'm' : 'ns'} para você concluir o onboarding e desbloquear a sua conquista.`
                        : "Parabéns! Você concluiu todos os passos iniciais e desbloqueou a conquista."}
                    </p>
                  </div>
                </div>

                <div className="mt-7 space-y-4">
                  {onboardingItems.map((item, i) => (
                    <button 
                      key={item.label}
                      onClick={item.action}
                      className="w-full flex items-center gap-3.5 text-left transition-all duration-700 ease-out group" 
                      style={{ opacity: mounted ? 1 : 0, transform: mounted ? "translateX(0)" : "translateX(10px)", transitionDelay: `${i * 100 + 300}ms` }}
                    >
                      <span className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border transition-colors ${
                        item.done ? "border-[#F2B33D]/40 bg-[#F2B33D]/10 text-[#F2B33D] shadow-[0_0_8px_rgba(242,179,61,0.15)]" : "border-[#232327] bg-[#101012] text-[#3f3f46] group-hover:border-[#F2B33D]/30 group-hover:text-[#8c8c94]"
                      }`}>
                        {item.done ? (
                          <Icon name="check" className="h-[9px] w-[9px]" strokeWidth={3.5} />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#232327] transition-colors group-hover:bg-[#F2B33D]/30" />
                        )}
                      </span>
                      <span className={`text-[13px] font-medium tracking-tight transition-colors ${item.done ? "text-[#d3d3d8]" : "text-[#52525b] group-hover:text-[#d3d3d8]"}`}>
                        {item.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </Panel>
            )}

            {(!isViewingOther || displayedCardVis.achievements !== false) && (
              <Panel className="p-0 overflow-hidden border-[#232327] bg-[#0c0c0e]">
                {renderCardVisibilityBanner("achievements", "Conquistas do Estúdio")}
                <div className="flex items-center gap-3 border-b border-[#232327] px-4 py-3.5 bg-[#0a0a0c]">
                  <span className="h-3.5 w-1 rounded-full bg-[#6E93F5]" />
                  <h3 className="flex-1 font-display text-[15px] font-bold text-white tracking-tight">Conquistas do estúdio</h3>
                  <span className="font-mono text-[10px] text-[#8c8c94] tracking-[0.15em] tabular-nums">{unlockedCount} / {achievements.length}</span>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {achievements.slice(0, 4).map((a) => (
                      <div key={a.label} 
                        className={`rounded-2xl border ${a.unlocked ? 'bg-gradient-to-br from-[#101012] to-[#0c0c0e]' : 'bg-[#0c0c0e] border-[#18181b] opacity-50'} p-4 flex flex-col items-start gap-3 transition-colors cursor-default relative overflow-hidden`}
                        style={{ 
                          borderColor: a.unlocked ? `${a.hex}40` : undefined,
                          boxShadow: a.unlocked ? `inset 0 0 20px ${a.hex}05` : undefined
                        }}
                      >
                        <div className={`rounded-md p-1.5 relative z-10 ${a.unlocked ? a.bg : 'bg-[#18181b]'}`}>
                          <Icon name={a.icon} className={`h-3.5 w-3.5 ${a.unlocked ? a.tone : 'text-[#52525b]'}`} />
                        </div>
                        <span className={`text-[12px] font-medium tracking-tight leading-snug relative z-10 ${a.unlocked ? 'text-[#d3d3d8]' : 'text-[#8c8c94]'}`}>{a.label}</span>
                      </div>
                    ))}
                  </div>
                  <Button onClick={() => setShowAchievModal(true)} variant="outline" className="w-full text-[#8c8c94] border-[#232327] bg-[#0c0c0e] hover:bg-[#101012] hover:text-[#d3d3d8]">
                    Ver todas as {achievements.length} conquistas
                  </Button>
                </div>
              </Panel>
            )}
          </aside>
        </Reveal>
      )}

      {tab === "seguranca" && (
        <Reveal className="grid gap-6 md:grid-cols-[1fr_1.3fr]">
          <div className="flex flex-col gap-6">
            <Panel className="p-0 self-start w-full overflow-hidden border-[#232327] bg-[#0c0c0e]">
              <div className="flex items-center gap-3 border-b border-[#232327] px-4 py-3.5 bg-[#0a0a0c]">
                <span className="h-3.5 w-1 rounded-full bg-[#2FD4A0]" />
                <h3 className="flex-1 font-display text-[15px] font-bold text-white tracking-tight">E-mail Vinculado</h3>
              </div>
              <div className="p-5">
                <div className="grid gap-5">
                  <div>
                    <Label hint="Pode ser alterado. Exige confirmação na caixa de entrada.">Endereço de E-mail</Label>
                    <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="bg-[#101012] border-[#232327] text-white focus:border-[#2FD4A0] w-full" />
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <Button disabled={saving} onClick={handleSaveEmail} className="bg-[#101012] text-[#d3d3d8] border border-[#232327] hover:bg-[#232327] shadow-[0_0_15px_rgba(242,179,61,0.1)] transition-shadow hover:shadow-[0_0_20px_rgba(242,179,61,0.2)]">
                    {saving ? "Salvando..." : "Atualizar E-mail"}
                  </Button>
                </div>
              </div>
            </Panel>

            <Panel className="p-0 self-start w-full overflow-hidden border-[#232327] bg-[#0c0c0e]">
              <div className="flex items-center gap-3 border-b border-[#232327] px-4 py-3.5 bg-[#0a0a0c]">
                <span className="h-3.5 w-1 rounded-full bg-[#F2B33D]" />
                <h3 className="flex-1 font-display text-[15px] font-bold text-white tracking-tight">Alterar Senha</h3>
              </div>
              <form onSubmit={e => { e.preventDefault(); handleSavePassword(); }} className="p-5">
                <input type="text" name="username" autoComplete="username" className="hidden" readOnly value={user?.email || "user"} />
                <div className="grid gap-5">
                  <div>
                    <Label>Senha Atual</Label>
                    <Input type="password" autoComplete="current-password" placeholder="••••••••" value={pass} onChange={e => setPass(e.target.value)} className="bg-[#101012] border-[#232327] text-white focus:border-[#2FD4A0] w-full" />
                  </div>
                  <div>
                    <Label hint="Mín. 8 caracteres, com letras e números">Nova Senha</Label>
                    <Input type="password" autoComplete="new-password" placeholder="••••••••" value={newPass} onChange={e => setNewPass(e.target.value)} className="bg-[#101012] border-[#232327] text-white focus:border-[#2FD4A0] w-full" />
                  </div>
                  <div>
                    <Label>Confirmar Nova Senha</Label>
                    <Input type="password" autoComplete="new-password" placeholder="••••••••" value={newPassConf} onChange={e => setNewPassConf(e.target.value)} className="bg-[#101012] border-[#232327] text-white focus:border-[#2FD4A0] w-full" />
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <Button type="submit" disabled={passSaving} className="bg-[#101012] text-[#d3d3d8] border border-[#232327] hover:bg-[#232327] shadow-[0_0_15px_rgba(242,179,61,0.1)] transition-shadow hover:shadow-[0_0_20px_rgba(242,179,61,0.2)]">
                    {passSaving ? "Atualizando..." : "Atualizar Senha"}
                  </Button>
                </div>
              </form>
            </Panel>
          </div>

          <div className="grid gap-6 self-start">
            <Panel id="panel-sso" className="p-0 overflow-hidden border-[#232327] bg-[#0c0c0e]">
              <div className="flex items-center gap-3 border-b border-[#232327] px-4 py-3.5 bg-[#0a0a0c]">
                <span className="h-3.5 w-1 rounded-full bg-[#6E93F5]" />
                <h3 className="flex-1 font-display text-[15px] font-bold text-white tracking-tight">Autenticação (SSO)</h3>
              </div>
              <div className="p-5">
                <div className="grid gap-3">
                  {(["google", "discord"] as const).map(provider => {
                    const connected = identities.find(i => i.provider === provider);
                    let accountInfo = "";
                    if (connected?.identity_data) {
                      const d = connected.identity_data;
                      if (provider === "google") accountInfo = d.email || d.name || "";
                      else if (provider === "discord") accountInfo = d.custom_claims?.global_name || d.preferred_username || d.name || d.email || "";
                    }
                    return (
                      <div key={provider} className="flex items-center justify-between rounded-xl border border-[#232327] bg-[#101012] p-4">
                        <div className="flex items-center gap-3">
                          <Icon name={provider} className={`h-5 w-5 ${provider === 'google' ? 'text-[#F2604C]' : 'text-[#6E93F5]'}`} />
                          <div>
                            <div className="text-[13px] font-semibold text-[#d3d3d8] capitalize tracking-tight">{provider}</div>
                            <div className="text-[11px] text-[#8c8c94] mt-0.5">
                              {connected ? (
                                <span className="flex items-center gap-1.5">
                                  <span className="h-1.5 w-1.5 rounded-full bg-[#2FD4A0]"></span>
                                  Conectado {accountInfo && <span className="opacity-70">({accountInfo})</span>}
                                </span>
                              ) : "Não conectado"}
                            </div>
                          </div>
                        </div>
                        {connected ? (
                          <Button variant="outline" size="sm" onClick={() => handleUnlink(connected.identity_id)} disabled={identities.length <= 1} className="border-[#232327] bg-[#0c0c0e] text-[#8c8c94] hover:bg-[#232327] hover:text-[#d3d3d8]">
                            Desvincular
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => handleLink(provider)} className="border-[#232327] bg-[#0c0c0e] text-[#8c8c94] hover:bg-[#232327] hover:text-[#d3d3d8]">
                            Vincular
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </Panel>

            <Panel className="p-0 overflow-hidden border-[#232327] bg-[#0c0c0e]">
              <div className="flex items-center gap-3 border-b border-[#232327] px-4 py-3.5 bg-[#0a0a0c]">
                <span className="h-3.5 w-1 rounded-full bg-[#2FD4A0]" />
                <h3 className="flex-1 font-display text-[15px] font-bold text-white tracking-tight">Sessões Ativas</h3>
              </div>
              <div className="p-5">
              <p className="mb-4 text-[12px] text-[#8c8c94]">
                Você está logado em {sessions.length} dispositivo{sessions.length !== 1 ? "s" : ""} atualmente.
              </p>
              <div className="mb-5 grid gap-3">
                {sessions.map(s => (
                  <div key={s.id} className={`flex justify-between items-center rounded-xl p-4 text-[12px] border ${s.current ? 'bg-[#101012] border-[#2FD4A0]/30' : 'border-[#232327] bg-[#0c0c0e]'}`}>
                    <div>
                      <div className="font-semibold text-[#d3d3d8] tracking-tight">{s.name}</div>
                      <div className="text-[#8c8c94] mt-0.5">{s.location}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={s.current ? "text-[#2FD4A0] font-medium" : "text-[#8c8c94]"}>{s.time}</span>
                      {!s.current && (
                        <button onClick={() => setSessions(prev => prev.filter(x => x.id !== s.id))} className="text-[#F2604C] hover:text-[#F2604C]/80 transition-colors p-1" title="Encerrar sessão" aria-label="Encerrar sessão">
                          <Icon name="close" className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <Button disabled={sessions.length <= 1} onClick={() => setSessions(prev => prev.filter(x => x.current))} variant="outline" className="w-full text-[#F2604C] border-[#F2604C]/20 bg-[#F2604C]/5 hover:bg-[#F2604C]/10 hover:text-[#F2604C] disabled:opacity-40">
                <Icon name="close" className="h-4 w-4 mr-1" /> Desconectar de outras sessões
              </Button>
              </div>
            </Panel>

            <Panel className="p-0 overflow-hidden border-[#232327] bg-[#0c0c0e]">
              <div className="flex items-center gap-3 border-b border-[#232327] px-4 py-3.5 bg-[#0a0a0c]">
                <span className="h-3.5 w-1 rounded-full bg-[#F2604C]" />
                <h3 className="flex-1 font-display text-[15px] font-bold text-[#F2604C] tracking-tight">Zona de Perigo</h3>
              </div>
              <div className="p-5">
              <p className="mb-5 text-[12px] text-[#8c8c94] leading-relaxed">
                Ao excluir sua conta, você perderá permanentemente o acesso ao sistema, seus dados de perfil e seu histórico. Esta ação é irreversível.
              </p>
              <Button onClick={handleDeleteAccount} className="w-full bg-[#F2604C] text-[#0c0c0e] font-semibold border-none shadow-[0_8px_25px_-5px_rgba(242,96,76,0.4)] hover:bg-[#ff725e] transition-all">
                Excluir Conta Permanentemente
              </Button>
              </div>
            </Panel>
          </div>
        </Reveal>
      )}

      {tab === "preferencias" && (
        <Reveal className="grid gap-6 md:grid-cols-2">
          <Panel className="p-0 self-start w-full overflow-hidden border-[#232327] bg-[#0c0c0e]">
            <div className="flex items-center gap-3 border-b border-[#232327] px-4 py-3.5 bg-[#0a0a0c]">
              <span className="h-3.5 w-1 rounded-full bg-[#6E93F5]" />
              <h3 className="flex-1 font-display text-[15px] font-bold text-white tracking-tight">Notificações</h3>
            </div>
            <div className="p-5">
              <div className="grid gap-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[13px] font-semibold text-[#d3d3d8] tracking-tight">E-mail</div>
                    <div className="text-[11px] text-[#8c8c94] mt-0.5">Receber resumos e alertas na caixa de entrada.</div>
                  </div>
                  <div className="shrink-0 h-6 w-11 rounded-full bg-[#2FD4A0] p-1 transition-colors cursor-pointer flex items-center">
                    <div className="h-4 w-4 translate-x-5 rounded-full bg-[#0c0c0e] shadow-sm transition-transform" />
                  </div>
                </div>
                <div className="h-px bg-[#232327]" />
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[13px] font-semibold text-[#d3d3d8] tracking-tight">Push (Sistema)</div>
                    <div className="text-[11px] text-[#8c8c94] mt-0.5">Notificações em tempo real no painel.</div>
                  </div>
                  <div className="shrink-0 h-6 w-11 rounded-full bg-[#2FD4A0] p-1 transition-colors cursor-pointer flex items-center">
                    <div className="h-4 w-4 translate-x-5 rounded-full bg-[#0c0c0e] shadow-sm transition-transform" />
                  </div>
                </div>
              </div>
            </div>
          </Panel>

          <Panel className="p-0 self-start w-full border-[#232327] bg-[#0c0c0e]">
            <div className="flex items-center gap-3 rounded-t-lg border-b border-[#232327] px-4 py-3.5 bg-[#0a0a0c]">
              <span className="h-3.5 w-1 rounded-full bg-[#8c8c94]" />
              <h3 className="flex-1 font-display text-[15px] font-bold text-white tracking-tight">Sistema</h3>
            </div>
            <div className="p-5">
              <div className="grid gap-5">
                <div>
                  <Label>Idioma da Interface</Label>
                  <Select defaultValue="pt" headerTitle="Idiomas da interface" className="bg-[#101012] border-[#232327] text-white focus:border-[#2FD4A0] w-full">
                    <option value="pt">Português (BR)</option>
                    <option value="en" disabled>English (US) - Em breve</option>
                    <option value="es" disabled>Español - Em breve</option>
                  </Select>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <Button className="bg-[#101012] text-[#d3d3d8] border border-[#232327] hover:bg-[#232327] shadow-[0_0_15px_rgba(242,179,61,0.1)] transition-shadow hover:shadow-[0_0_20px_rgba(242,179,61,0.2)]">Salvar Preferências</Button>
              </div>
            </div>
          </Panel>
        </Reveal>
      )}

      {/* MODAL DE LOGIN NECESSÁRIO PARA CURTIR */}
      {showLoginPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md anim-fade">
          <Reveal className="w-full max-w-md">
            <Panel className="border-[#232327] bg-[#0c0c0e] p-6 shadow-2xl w-full mx-auto relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-[#F2B33D]" />
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20 text-red-500">
                  <Icon name="heart" className="h-5 w-5 fill-red-500" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-white tracking-tight">Conta necessária</h3>
                  <p className="text-[11px] font-mono uppercase tracking-wider text-[#8c8c94]">Aster Account · StudioOS</p>
                </div>
              </div>
              
              <p className="mb-6 text-[13px] text-[#a8a8b0] leading-relaxed">
                Apenas criadores conectados com uma conta ativa podem curtir o perfil de outro criador no StudioOS. Crie sua conta ou faça login para apoiar este estúdio.
              </p>

              <div className="flex items-center justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowLoginPrompt(false)}
                  className="border-[#232327] bg-[#101012] text-[#8c8c94] hover:text-white"
                >
                  Fechar
                </Button>
                <Button 
                  onClick={() => {
                    setShowLoginPrompt(false);
                    if (onGo) onGo("login");
                  }}
                  className="bg-signal-400 text-ink-950 hover:bg-signal-300 font-semibold uppercase text-xs tracking-wider"
                >
                  Fazer Login / Criar Conta
                </Button>
              </div>
            </Panel>
          </Reveal>
        </div>
      )}

      {/* MODAL DE CONQUISTAS */}
      {showAchievModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md anim-fade">
          <Reveal className="w-full max-w-4xl">
            <Panel className="border-[#232327] bg-[#0a0a0c] shadow-2xl w-full mx-auto max-h-[85vh] flex flex-col overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#F2B33D] via-[#2FD4A0] to-[#6E93F5] opacity-80" />
              <div className="flex items-center justify-between border-b border-[#18181b] px-8 py-6 bg-[#0c0c0e]">
                <div className="flex items-center gap-5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#6E93F5]/10 border border-[#6E93F5]/20 text-[#6E93F5] shadow-[0_0_20px_rgba(110,147,245,0.15)]">
                    <Icon name="star" className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-display text-2xl font-bold text-white tracking-tight">Conquistas do estúdio</h3>
                    <p className="text-[14px] text-[#8c8c94] mt-1 font-mono tracking-widest uppercase">{unlockedCount} de {achievements.length} desbloqueadas</p>
                  </div>
                </div>
                <button onClick={() => setShowAchievModal(false)} className="text-[#8c8c94] hover:text-white transition-colors p-2 bg-[#18181b] hover:bg-[#232327] rounded-full">
                  <Icon name="close" className="h-5 w-5" />
                </button>
              </div>
              
              <div className="p-8 overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {achievements.map((a) => (
                    <div 
                      key={a.id} 
                      className={`rounded-2xl border p-6 flex flex-col items-start gap-4 transition-all duration-300 cursor-default relative overflow-hidden ${
                        a.unlocked 
                          ? 'bg-gradient-to-br from-[#101012] to-[#0c0c0e] hover:scale-[1.02]' 
                          : 'bg-[#0a0a0c] border-[#18181b] opacity-40 hover:opacity-60'
                      }`}
                      style={{ 
                        borderColor: a.unlocked ? `${a.hex}40` : undefined,
                        boxShadow: a.unlocked ? `0 8px 30px -10px ${a.hex}25, inset 0 0 20px ${a.hex}05` : undefined
                      }}
                    >
                      {a.unlocked && (
                        <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl opacity-20 pointer-events-none" style={{ backgroundColor: a.hex }} />
                      )}
                      <div className={`rounded-xl p-3 relative z-10 ${a.unlocked ? a.bg : 'bg-[#18181b]'} ${a.unlocked ? `ring-1 ring-[${a.hex}]/20` : ''}`} style={{ boxShadow: a.unlocked ? `0 0 15px ${a.hex}30` : undefined }}>
                        <Icon name={a.icon} className={`h-5 w-5 ${a.unlocked ? a.tone : 'text-[#52525b]'}`} />
                      </div>
                      <div className="relative z-10">
                        <div className={`text-[15px] font-bold tracking-tight mb-1.5 ${a.unlocked ? 'text-white' : 'text-[#8c8c94]'}`}>{a.label}</div>
                        <div className={`text-[12px] leading-relaxed ${a.unlocked ? 'text-[#a8a8b0]' : 'text-[#52525b]'}`}>{a.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          </Reveal>
        </div>
      )}

      {/* MODAL DE EXCLUSÃO DE CONTA */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <Reveal className="w-full max-w-md">
            <Panel className="border-[#232327] bg-[#0c0c0e] p-6 shadow-2xl w-full max-w-sm mx-auto">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#2a1616] text-[#F2604C]">
                  <Icon name="close" className="h-5 w-5" />
                </div>
                <h3 className="font-display text-xl font-bold text-white tracking-tight">Excluir Conta</h3>
              </div>
              
              <div className="mb-6 space-y-4 text-[13px] text-[#8c8c94] leading-relaxed">
                <p>Esta ação é <strong className="text-[#F2604C] font-semibold">permanente e irreversível</strong>.</p>
                <p>Todos os seus projetos, roteiros, histórico e ideias serão apagados para sempre. Seu perfil público será deletado e seu @ ficará livre.</p>
                <p>Para confirmar, digite exatamente <strong className="text-white select-all font-semibold whitespace-nowrap">Quero excluir minha conta</strong> abaixo:</p>
              </div>

              <div className="mb-6">
                <Input 
                  value={deleteConfirmText} 
                  onChange={e => setDeleteConfirmText(e.target.value)} 
                  placeholder="Quero excluir minha conta"
                  className="w-full text-center bg-transparent border border-[#232327] text-white focus:border-[#F2604C]"
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setShowDeleteModal(false)}
                  disabled={isDeleting}
                  className="sm:w-auto border border-[#232327] bg-transparent text-[#8c8c94] hover:bg-[#101012] hover:text-white transition-colors"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={confirmDeleteAccount}
                  disabled={isDeleting || deleteConfirmText !== "Quero excluir minha conta"}
                  className="sm:w-auto bg-[#9A4239] text-[#0c0c0e] font-semibold border-none shadow-[0_8px_20px_-5px_rgba(242,96,76,0.3)] hover:bg-[#b54f44] transition-all disabled:opacity-50"
                >
                  {isDeleting ? "Excluindo..." : "Excluir permanentemente"}
                </Button>
              </div>
            </Panel>
          </Reveal>
        </div>
      )}

      {/* MODAL DE CROP DE IMAGEM */}
      {cropImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <Reveal className="w-full max-w-md flex flex-col">
            <Panel className="p-6 border-[#232327] bg-[#0c0c0e] shadow-2xl">
              <h3 className="mb-5 font-display text-lg font-bold text-white tracking-tight">Ajustar foto de perfil</h3>
              
              <div className="relative h-64 w-full bg-[#101012] border border-[#232327] rounded-xl overflow-hidden mb-6">
                <Cropper
                  image={cropImage}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_, croppedAreaPixels) => setCroppedAreaPixels(croppedAreaPixels)}
                />
              </div>

              <div className="mb-6 px-2">
                <div className="text-[#8c8c94] text-[10px] uppercase tracking-widest font-mono mb-2">Zoom</div>
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full accent-[#F2B33D] mt-2"
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button variant="outline" onClick={() => setCropImage(null)} disabled={uploadingAvatar} className="sm:w-auto border-[#232327] bg-[#101012] text-[#8c8c94] hover:bg-[#232327] hover:text-white">
                  Cancelar
                </Button>
                <Button onClick={handleSaveCrop} disabled={uploadingAvatar} className="sm:w-auto bg-[#F2B33D] text-[#0c0c0e] hover:bg-[#F2B33D]/90 font-semibold disabled:opacity-50 border-none">
                  {uploadingAvatar ? "Salvando..." : "Salvar Foto"}
                </Button>
              </div>
            </Panel>
          </Reveal>
        </div>
      )}

      {/* MODAL DE EXCLUSÃO DE COMENTÁRIO */}
      {commentToDelete && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => {
            if (!isDeletingComment) setCommentToDelete(null);
          }}
        >
          <div 
            className="w-full max-w-md animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <Panel className="border-[#232327] bg-[#0c0c0e] p-6 shadow-2xl w-full mx-auto relative overflow-hidden">
              {/* Linha de acento decorativa vermelha */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#F2604C] to-transparent opacity-80" />

              {/* Cabeçalho */}
              <div className="mb-5 flex items-start gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#2a1616] border border-[#F2604C]/30 text-[#F2604C] shadow-inner">
                  <Icon name="trash" className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg font-bold text-white tracking-tight">
                      Excluir Comentário
                    </h3>
                    {user?.id !== commentToDelete.author_id && (
                      <span className="rounded bg-[#F2604C]/10 border border-[#F2604C]/25 px-2 py-0.5 font-mono text-[9px] font-bold text-[#F2604C] uppercase tracking-wider">
                        Moderação
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-[#8c8c94] leading-relaxed">
                    {user?.id === commentToDelete.author_id
                      ? "Tem certeza de que deseja remover seu comentário deste perfil?"
                      : "Como dono do perfil, você pode moderar e remover mensagens do seu mural."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCommentToDelete(null)}
                  disabled={isDeletingComment}
                  className="text-[#71717a] hover:text-white transition-colors p-1.5 rounded-lg hover:bg-[#18181b]"
                  title="Fechar"
                >
                  <Icon name="close" className="h-4 w-4" />
                </button>
              </div>

              {/* Pré-visualização do Comentário */}
              <div className="mb-5 rounded-xl border border-[#232327] bg-[#101012] p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative shrink-0">
                      {commentToDelete.author_avatar ? (
                        <img
                          src={commentToDelete.author_avatar}
                          alt={commentToDelete.author_name}
                          className="h-6 w-6 rounded-full object-cover ring-1 ring-ink-700"
                        />
                      ) : (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-ink-800 font-display text-[11px] font-bold text-bone-200 ring-1 ring-ink-700">
                          {(commentToDelete.author_name || "U").charAt(0).toUpperCase()}
                        </div>
                      )}
                      {commentToDelete.author_is_vip && <VipBadge size="xs" />}
                    </div>
                    <span className="text-xs font-bold text-bone-100 truncate">
                      {commentToDelete.author_name}
                    </span>
                    <span className="font-mono text-[10.5px] text-[#71717a] truncate">
                      @{commentToDelete.author_channel}
                    </span>
                  </div>

                  <span className="font-mono text-[9.5px] text-[#52525b] shrink-0">
                    {commentToDelete.created_at
                      ? new Date(commentToDelete.created_at).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                        })
                      : ""}
                  </span>
                </div>

                <div className="rounded-lg bg-[#0a0a0c] border border-[#1e1e22] p-3">
                  <p className="text-xs text-[#d3d3d8] leading-relaxed whitespace-pre-wrap break-words italic">
                    "{commentToDelete.content}"
                  </p>
                </div>
              </div>

              {/* Aviso Destrutivo */}
              <div className="mb-6 rounded-lg bg-[#18181c]/70 border border-[#27272c] px-3.5 py-2.5 text-[11.5px] text-[#8c8c94] flex items-center gap-2.5">
                <Icon name="alert" className="h-4 w-4 text-[#F2604C] shrink-0" />
                <span>Esta ação é definitiva e não poderá ser desfeita.</span>
              </div>

              {/* Botões de Ação */}
              <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
                <Button
                  variant="outline"
                  onClick={() => setCommentToDelete(null)}
                  disabled={isDeletingComment}
                  className="sm:w-auto border border-[#232327] bg-[#101012] text-[#8c8c94] hover:bg-[#18181b] hover:text-white transition-colors font-semibold text-xs py-2 px-4"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={confirmDeleteComment}
                  disabled={isDeletingComment}
                  className="sm:w-auto bg-[#F2604C] hover:bg-[#dc4c38] text-white font-semibold border-none shadow-[0_4px_16px_-4px_rgba(242,96,76,0.45)] transition-all text-xs py-2 px-4 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeletingComment ? (
                    <>
                      <Icon name="refresh" className="h-3.5 w-3.5 animate-spin" />
                      <span>Excluindo…</span>
                    </>
                  ) : (
                    <>
                      <Icon name="trash" className="h-3.5 w-3.5" />
                      <span>Excluir permanentemente</span>
                    </>
                  )}
                </Button>
              </div>
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}

