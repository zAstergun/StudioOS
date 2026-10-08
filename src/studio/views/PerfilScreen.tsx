import { useState, useEffect, useRef } from "react";
import Cropper from "react-easy-crop";
import { Panel, Reveal, Icon, Button, Input, Label, Select } from "../components/ui";
import { useAuth, supabase } from "../auth";

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

export default function PerfilScreen({ onGo }: { onGo?: (id: string) => void }) {
  const { user, updateProfile, updateEmail, updateAvatar, deleteAccount, updatePassword, linkIdentity, unlinkIdentity, getIdentities } = useAuth();
  const [tab, setTab] = useState<"geral" | "seguranca" | "preferencias" | "atividade">("geral");
  const [name, setName] = useState(user?.name || "");
  const [channel, setChannel] = useState(user?.channel || "");
  const [email, setEmail] = useState(user?.email || "");
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
    if (user) {
      setReadWiki(localStorage.getItem(`studioos.onboarding.readWiki.${user.id}`) === "true");
      setHasProject(localStorage.getItem(`studioos.onboarding.hasProject.${user.id}`) === "true");
      setHasPrefs(localStorage.getItem(`studioos.onboarding.hasPrefs.${user.id}`) === "true");
    }
  }, [user]);

  const isDemo = user?.email?.includes("teste") || user?.email?.includes("criador@") || false;

  const [userStats, setUserStats] = useState<Record<string, number>>({});
  
  useEffect(() => {
    if (user && supabase) {
      supabase.from('profiles').select('stats').eq('id', user.id).single().then(({ data }: { data: any }) => {
        if (data?.stats) setUserStats(data.stats);
      });
    }
  }, [user]);

  const getStat = (key: string, demoVal: string) => {
    if (userStats[key] !== undefined) return userStats[key].toString();
    return isDemo ? demoVal : "0";
  };

  const showZero = !isDemo && Object.keys(userStats).length === 0;

  const [sessions, setSessions] = useState([
    { id: 1, name: "Chrome no Windows", location: "São Paulo, BR • 192.168.1.1", current: true, time: "Atual" },
    ...(showZero ? [] : [{ id: 2, name: "Safari no iPhone", location: "São Paulo, BR • 10.0.0.5", current: false, time: "Ontem" }])
  ]);

  const handleSavePersonalInfo = async () => {
    setSaving(true);
    const res = await updateProfile(name, channel.replace(/^@/, ""));
    if (!res.ok) alert(res.error);
    else alert(res.message);
    setSaving(false);
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

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => setCropImage(reader.result?.toString() || null));
      reader.readAsDataURL(e.target.files[0]);
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

  const tabs = [
    { id: "geral", label: "Geral", icon: "user" },
    { id: "seguranca", label: "Segurança", icon: "lock" },
    { id: "preferencias", label: "Preferências", icon: "dial" },
  ] as const;

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
    { label: "Configurar seu perfil", done: !!(user?.name && user?.avatarUrl && channel), action: () => scrollTo("panel-perfil", "preferencias") },
    { label: "Ler a Wiki do estúdio", done: readWiki, action: () => { localStorage.setItem("studioos.onboarding.readWiki", "true"); setReadWiki(true); if (onGo) onGo("wiki"); } },
    { label: "Conectar conta do Discord", done: identities.some(i => i.provider === "discord"), action: () => scrollTo("panel-sso", "seguranca") },
    { label: "Adicionar seu primeiro projeto", done: hasProject, action: () => { localStorage.setItem("studioos.onboarding.hasProject", "true"); setHasProject(true); alert("Ainda não implementado: ir para Projetos"); } },
    { label: "Personalizar suas preferências", done: hasPrefs, action: () => scrollTo("panel-links", "preferencias") },
  ];

  const completedCount = onboardingItems.filter(i => i.done).length;
  const progressPercent = Math.round((completedCount / 5) * 100);
  const strokeDashoffset = 238.7 - (238.7 * (completedCount / 5));
  const remainingItems = 5 - completedCount;

  const achievements = [
    { id: "seq21", icon: "spark", label: "Sequência de 21 dias", desc: "Acessou o painel por 21 dias seguidos.", tone: "text-[#F2B33D]", bg: "bg-[#F2B33D]/10", hex: "#F2B33D", unlocked: isDemo || Number(userStats['streak']) >= 21 },
    { id: "ideias200", icon: "target", label: "200 ideias ranqueadas", desc: "Mais de 200 ideias processadas no painel.", tone: "text-[#2FD4A0]", bg: "bg-[#2FD4A0]/10", hex: "#2FD4A0", unlocked: isDemo || Number(userStats['ideias_ranqueadas']) >= 200 },
    { id: "top4", icon: "star", label: "Top 4% do canal", desc: "Seu desempenho superou 96% dos criadores.", tone: "text-[#6E93F5]", bg: "bg-[#6E93F5]/10", hex: "#6E93F5", unlocked: isDemo || Number(userStats['top4']) === 1 },
    { id: "verified", icon: "check", label: "Conta verificada", desc: "Identidade confirmada com sucesso.", tone: "text-[#F2604C]", bg: "bg-[#F2604C]/10", hex: "#F2604C", unlocked: isDemo || !!user?.email_confirmed_at || Number(userStats['verified']) === 1 },
    { id: "onboarding", icon: "layers", label: "Primeiros Passos", desc: "Completou todas as tarefas de onboarding.", tone: "text-[#2FD4A0]", bg: "bg-[#2FD4A0]/10", hex: "#2FD4A0", unlocked: completedCount === onboardingItems.length },
    { id: "viral", icon: "bolt", label: "Post Viral", desc: "Atingiu 100k visualizações em um único post.", tone: "text-[#F2B33D]", bg: "bg-[#F2B33D]/10", hex: "#F2B33D", unlocked: Number(userStats['viral']) === 1 },
    { id: "thumb", icon: "frame", label: "Mestre das Thumbnails", desc: "Aprovou 50 thumbnails no painel.", tone: "text-[#6E93F5]", bg: "bg-[#6E93F5]/10", hex: "#6E93F5", unlocked: Number(userStats['thumb_approved']) >= 50 },
    { id: "roteiro", icon: "book", label: "Roteirista Nato", desc: "Criou seu primeiro roteiro completo.", tone: "text-[#F2604C]", bg: "bg-[#F2604C]/10", hex: "#F2604C", unlocked: Number(userStats['producoes']) >= 1 || Number(userStats['tool_roteiro']) >= 1 },
    { id: "strategy", icon: "brain", label: "Mente Brilhante", desc: "Definiu o planejamento do trimestre.", tone: "text-[#2FD4A0]", bg: "bg-[#2FD4A0]/10", hex: "#2FD4A0", unlocked: Number(userStats['strategy_defined']) === 1 },
    { id: "collec", icon: "stack", label: "Colecionador", desc: "Salvou 500 referências no banco de ideias.", tone: "text-[#F2B33D]", bg: "bg-[#F2B33D]/10", hex: "#F2B33D", unlocked: Number(userStats['references_saved']) >= 500 },
    { id: "eng", icon: "eye", label: "Atenção Total", desc: "Manteve 60% de retenção no YouTube.", tone: "text-[#6E93F5]", bg: "bg-[#6E93F5]/10", hex: "#6E93F5", unlocked: Number(userStats['high_retention']) === 1 },
    { id: "vet", icon: "clock", label: "Veterano", desc: "Completou 1 ano de estúdio.", tone: "text-[#F2604C]", bg: "bg-[#F2604C]/10", hex: "#F2604C", unlocked: Number(userStats['veteran']) === 1 },
  ];
  
  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const [showAchievModal, setShowAchievModal] = useState(false);

  return (
    <div className="mx-auto w-full pt-4">
      {/* HEADER */}
      <Reveal className="mb-10 flex flex-col lg:flex-row lg:items-start gap-8">
        {/* Avatar */}
        <div className="relative group shrink-0 self-start">
          <div className="relative h-28 w-28 overflow-hidden rounded-full border-2 border-signal-400 bg-ink-900 shadow-[0_12px_30px_rgba(0,0,0,0.5)] sm:h-[120px] sm:w-[120px]">
            <Icon name="user" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-10 text-ink-500" />
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="Avatar" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(name || "User")}&background=random`} alt="Avatar" className="absolute inset-0 h-full w-full object-cover" />
            )}
            {uploadingAvatar && (
              <div className="absolute inset-0 bg-ink-950/50 flex items-center justify-center">
                <Icon name="spark" className="h-6 w-6 animate-pulse text-signal-400" />
              </div>
            )}
          </div>
          <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleAvatarUpload} />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar} className="absolute -bottom-2 -right-2 rounded-full border border-ink-600 bg-ink-800 p-2 text-bone-300 transition-colors hover:bg-signal-400 hover:text-ink-950 disabled:opacity-50" aria-label="Alterar foto">
            <Icon name="frame" className="h-4 w-4" />
          </button>
        </div>

        {/* Informações */}
        <div className="min-w-0 flex-1 pt-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-3">
             <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-bone-50 mr-1">
               {name || "Usuário"}
             </h1>
             <span className="font-mono text-[13px] text-signal-400">
               {channel ? (channel.startsWith('@') ? channel : `@${channel}`) : <span className="text-signal-400">@usuario</span>}
             </span>
             <span className="flex items-center gap-1 rounded-full border border-signal-400/35 bg-signal-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.11em] text-signal-400">
                <Icon name="check" className="h-3 w-3" strokeWidth={2.4} /> Verificado
             </span>
             <span className="flex items-center gap-1.5 text-[11px] font-mono tracking-widest uppercase text-ink-400 ml-2">
                <Icon name="clock" className="h-3 w-3" /> Membro desde {new Date().getFullYear()}
             </span>
          </div>

          <p className="mt-2 max-w-[62ch] text-[13.5px] leading-relaxed text-bone-400">
            Criador de conteúdo usando o StudioOS. Transformando ideias cruas em produções publicadas com o auxílio de ferramentas conectadas e com número e critério em cada etapa.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-x-7 gap-y-2">
            {[
              [getStat("producoes", "142"), "produções"],
              [getStat("ideias_ranqueadas", "214"), "ideias ranqueadas"],
              [showZero ? "-" : "4.8/5", "nota média"],
            ].map(([v, l]) => (
              <div key={l} className="flex items-baseline gap-2">
                <span className="font-display text-[16px] font-bold text-bone-50 tabular-nums">{v}</span>
                <span className="text-[10px] font-mono tracking-widest text-ink-400 uppercase">{l}</span>
              </div>
            ))}
          </div>

          {/* Links do Perfil */}
          {(website || instagram || tiktok || youtube || discord) && (
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              {website && (
                <a href={website.startsWith('http') ? website : `https://${website}`} target="_blank" rel="noreferrer" className="group flex items-center gap-2 rounded-full border border-[#232327] bg-[#101012] px-3.5 py-1.5 text-[12px] font-medium text-[#a8a8b0] transition-all hover:border-[#F2B33D]/50 hover:bg-[#F2B33D]/5 hover:text-[#F2B33D] hover:shadow-[0_0_12px_rgba(242,179,61,0.15)]">
                  <Icon name="globe" className="h-3.5 w-3.5 text-[#8c8c94] transition-colors group-hover:text-[#F2B33D]" />
                  {website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </a>
              )}
              {youtube && (
                <a href={youtube.startsWith('http') ? youtube : `https://${youtube}`} target="_blank" rel="noreferrer" className="group flex items-center gap-2 rounded-full border border-[#232327] bg-[#101012] px-3.5 py-1.5 text-[12px] font-medium text-[#a8a8b0] transition-all hover:border-[#FF0000]/50 hover:bg-[#FF0000]/5 hover:text-[#FF0000] hover:shadow-[0_0_12px_rgba(255,0,0,0.15)]">
                  <Icon name="youtube" className="h-3.5 w-3.5 text-[#8c8c94] transition-colors group-hover:text-[#FF0000]" />
                  YouTube
                </a>
              )}
              {instagram && (
                <a href={instagram.startsWith('http') ? instagram : `https://${instagram}`} target="_blank" rel="noreferrer" className="group flex items-center gap-2 rounded-full border border-[#232327] bg-[#101012] px-3.5 py-1.5 text-[12px] font-medium text-[#a8a8b0] transition-all hover:border-[#E1306C]/50 hover:bg-[#E1306C]/5 hover:text-[#E1306C] hover:shadow-[0_0_12px_rgba(225,48,108,0.15)]">
                  <Icon name="instagram" className="h-3.5 w-3.5 text-[#8c8c94] transition-colors group-hover:text-[#E1306C]" />
                  Instagram
                </a>
              )}
              {tiktok && (
                <a href={tiktok.startsWith('http') ? tiktok : `https://${tiktok}`} target="_blank" rel="noreferrer" className="group flex items-center gap-2 rounded-full border border-[#232327] bg-[#101012] px-3.5 py-1.5 text-[12px] font-medium text-[#a8a8b0] transition-all hover:border-[#00f2fe]/50 hover:bg-[#00f2fe]/5 hover:text-[#00f2fe] hover:shadow-[0_0_12px_rgba(0,242,254,0.15)]">
                  <Icon name="tiktok" className="h-3.5 w-3.5 text-[#8c8c94] transition-colors group-hover:text-[#00f2fe]" />
                  TikTok
                </a>
              )}
              {discord && (
                <a href={discord.startsWith('http') ? discord : `https://${discord}`} target="_blank" rel="noreferrer" className="group flex items-center gap-2 rounded-full border border-[#232327] bg-[#101012] px-3.5 py-1.5 text-[12px] font-medium text-[#a8a8b0] transition-all hover:border-[#5865F2]/50 hover:bg-[#5865F2]/5 hover:text-[#5865F2] hover:shadow-[0_0_12px_rgba(88,101,242,0.15)]">
                  <Icon name="discord" className="h-3.5 w-3.5 text-[#8c8c94] transition-colors group-hover:text-[#5865F2]" />
                  Discord
                </a>
              )}
            </div>
          )}
        </div>

        {/* Botões */}
        <div className="flex items-center gap-2 pt-2 shrink-0">
          <Button variant="solid" onClick={() => setTab("preferencias")} className="text-[11px] font-semibold uppercase tracking-[0.12em] px-4 py-2.5">
             <Icon name="type" className="h-3.5 w-3.5" /> Editar perfil
          </Button>
          <a 
            href={channel ? `/perfil/${channel.replace('@', '')}` : '#'} 
            target={channel ? "_blank" : "_self"} 
            rel="noreferrer"
            onClick={(e) => { 
              if (!channel) { 
                e.preventDefault(); 
                setTab("preferencias"); 
                setTimeout(() => {
                  const el = document.getElementById("input-username");
                  if (el) { el.focus(); el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
                }, 100);
              } 
            }}
            className={`flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-900/50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-bone-300 transition-colors ${channel ? 'hover:border-signal-400/60 hover:text-bone-50' : 'opacity-50 cursor-not-allowed'}`}
          >
            <Icon name="eye" className="h-3.5 w-3.5" /> Ver público
          </a>
          <button
            type="button"
            aria-label="Mais opções"
            className="rounded-lg border border-ink-700 bg-ink-900/50 p-2.5 text-ink-400 transition-colors hover:border-ink-600 hover:text-bone-50"
          >
            <span className="flex items-center gap-0.5 justify-center leading-none tracking-[0.1em] text-lg font-bold" style={{ transform: "translateY(-4px)" }}>...</span>
          </button>
        </div>
      </Reveal>

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
            <Panel className="p-0 overflow-hidden border-[#232327] bg-[#0c0c0e]">
              
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
                  {Array.from({ length: 56 }).map((_, i) => {
                    const t = Math.max(0.1, Math.sin(i * 0.3) * 0.5 + Math.random() * 0.5);
                    const color = t > 0.82 ? "#F2604C" : t > 0.58 ? "#F2B33D" : "#2FD4A0";
                    const h = Math.max(9, t * 100);
                    return (
                      <div 
                        key={i} 
                        className="flex-1 rounded-full hover:opacity-100 transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                        style={{ 
                          height: mounted ? `${h}%` : '4%', 
                          background: color,
                          opacity: mounted ? 0.88 : 0,
                          transitionDelay: `${i * 12}ms`
                        }}
                      />
                    );
                  })}
                </div>
                <div className="mt-2.5 flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-[#8c8c94]">
                  <span>12/08/2026</span>
                  <span>pico 171 min · média 102 min/dia</span>
                  <span>06/10/2026</span>
                </div>
              </div>

              {/* Carga por dia da semana */}
              <div className="mx-4 rounded-xl border border-[#232327] bg-[#0d0d0f] p-3.5">
                <div className="mb-3 text-[10px] font-mono uppercase tracking-widest text-[#8c8c94]">Carga por dia da semana</div>
                <div className="space-y-[7px]">
                  {(() => {
                    const baseTotals = [57, 121, 114, 110, 126, 120, 65];
                    const weekTotals = showZero ? [0,0,0,0,0,0,0] : (isDemo ? baseTotals : [0, 1, 2, 3, 4, 5, 6].map(d => Number(userStats[`dow_${d}`] || 0)));
                    const maxWeek = Math.max(...weekTotals, 1);
                    return ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"].map((label, i) => {
                      const filled = Math.round((weekTotals[i] / maxWeek) * 18);
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
                                    opacity: mounted ? (on ? 0.92 : 1) : 0,
                                    transform: mounted ? "scaleY(1)" : "scaleY(0)",
                                    transitionDelay: `${i * 40 + c * 20}ms`
                                  }}
                                />
                              );
                            })}
                          </div>
                          <span className="w-14 text-right font-mono text-[11px] text-[#b6b6be] tabular-nums">
                            {isDemo ? `${Math.floor(weekTotals[i] / 60)}h${String(weekTotals[i] % 60).padStart(2, "0")}` : `${weekTotals[i]}×`}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* 2x2 Grid */}
              <div className="mt-4 grid grid-cols-1 gap-px border-t border-[#232327] bg-[#232327] sm:grid-cols-2">
                {[
                  { label: "USO DE FERRAMENTAS", value: getStat("total_runs", "128"), vcolor: "#2FD4A0", delta: showZero ? "-" : "+12%", dtone: "#2FD4A0", hint: showZero ? "" : "Nº DE VEZES EXECUTADAS" },
                  { label: "HORAS EM ESTÚDIO", value: showZero ? "0h" : "46h", suffix: showZero ? "" : " 20m", vcolor: "#2FD4A0", delta: showZero ? "-" : "+8%", dtone: "#2FD4A0", hint: "META MENSAL: 40H" },
                  { label: "IDEIAS RANQUEADAS", value: getStat("ideias_ranqueadas", "214"), vcolor: "#F2604C", delta: showZero ? "-" : "-3%", dtone: "#F2604C", hint: showZero ? "" : "MÉDIA 6,8 IDEIAS/DIA" },
                  { label: "SEQUÊNCIA ATUAL", value: showZero ? "1" : "12", suffix: showZero ? " dia" : " dias", vcolor: "#F2B33D", delta: showZero ? "-" : "+4", dtone: "#F2B33D", hint: "RECORDE: 21 DIAS" }
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
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#9a9aa2] tabular-nums">{getStat("total_runs", "209")} EXECUÇÕES</span>
                </div>
                <div className="space-y-2.5">
                  {(() => {
                    const demoTools = [
                      { tool: "Rank de Ideia", runs: 71, share: 80, color: "#F2604C" },
                      { tool: "Gerador de Hooks", runs: 54, share: 60, color: "#F2604C" },
                      { tool: "Briefing Thumbnail", runs: 38, share: 45, color: "#F2B33D" },
                      { tool: "Roteiro & Gravação", runs: 29, share: 35, color: "#2FD4A0" },
                      { tool: "Receita Viral", runs: 17, share: 20, color: "#2FD4A0" }
                    ];

                    if (isDemo) return demoTools.map((t, i) => (
                      <div key={t.tool} className="flex items-center gap-3">
                        <span className="w-5 font-mono text-[11px] text-[#7f7f88] tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                        <span className="w-[150px] shrink-0 truncate text-[12.5px] text-[#d3d3d8]">{t.tool}</span>
                        <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-[#1c1c20]">
                          <div className="h-full rounded-full transition-all duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)]" style={{ width: mounted ? `${t.share}%` : '0%', background: t.color, transitionDelay: `${i * 120 + 400}ms` }} />
                        </div>
                        <span className="w-12 text-right font-mono text-[11px] text-[#b6b6be] tabular-nums">{t.runs}×</span>
                      </div>
                    ));

                    if (showZero) return <div className="text-[12px] text-[#8c8c94]">Nenhuma ferramenta utilizada ainda.</div>;

                    const toolNames: Record<string, string> = {
                      rank: "Rank de Ideia",
                      hook: "Gerador de Hooks",
                      briefing: "Briefing Thumbnail",
                      roteiro: "Roteiro & Gravação",
                      receita: "Receita Viral"
                    };

                    const tools = Object.entries(userStats)
                      .filter(([k]) => k.startsWith('tool_'))
                      .map(([k, v]) => ({ 
                        id: k.replace('tool_', ''), 
                        name: toolNames[k.replace('tool_', '')] || k.replace('tool_', ''),
                        runs: Number(v) 
                      }))
                      .sort((a, b) => b.runs - a.runs)
                      .slice(0, 5);

                    if (tools.length === 0) return <div className="text-[12px] text-[#8c8c94]">Nenhuma ferramenta utilizada ainda.</div>;

                    const maxRuns = Math.max(...tools.map(t => t.runs), 1);

                    return tools.map((t, i) => {
                      const share = Math.round((t.runs / maxRuns) * 100);
                      const color = i < 2 ? "#F2604C" : i < 3 ? "#F2B33D" : "#2FD4A0";
                      return (
                        <div key={t.id} className="flex items-center gap-3">
                          <span className="w-5 font-mono text-[11px] text-[#7f7f88] tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                          <span className="w-[150px] shrink-0 truncate text-[12.5px] text-[#d3d3d8] capitalize">{t.name}</span>
                          <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-[#1c1c20]">
                            <div className="h-full rounded-full transition-all duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)]" style={{ width: mounted ? `${share}%` : '0%', background: color, transitionDelay: `${i * 120 + 400}ms` }} />
                          </div>
                          <span className="w-12 text-right font-mono text-[11px] text-[#b6b6be] tabular-nums">{t.runs}×</span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
              
              <div className="border-t border-[#232327] bg-[#0c0c0e] px-4 py-3">
                <p className="text-[12px] leading-relaxed text-[#8c8c94]">
                  Sua carga de estúdio está 8% acima da média de criadores do Studio Pro. O melhor dia para gravar continua sendo terça-feira, entre 9h e 12h.
                </p>
              </div>

            </Panel>
          </div>

          {/* Coluna Direita: Caderno & Conquistas */}
          <aside className="space-y-6">
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

            <Panel className="p-0 overflow-hidden border-[#232327] bg-[#0c0c0e]">
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
              <div className="p-5">
                <div className="grid gap-5">
                  <div>
                    <Label>Senha Atual</Label>
                    <Input type="password" placeholder="••••••••" value={pass} onChange={e => setPass(e.target.value)} className="bg-[#101012] border-[#232327] text-white focus:border-[#2FD4A0] w-full" />
                  </div>
                  <div>
                    <Label hint="Mín. 8 caracteres, com letras e números">Nova Senha</Label>
                    <Input type="password" placeholder="••••••••" value={newPass} onChange={e => setNewPass(e.target.value)} className="bg-[#101012] border-[#232327] text-white focus:border-[#2FD4A0] w-full" />
                  </div>
                  <div>
                    <Label>Confirmar Nova Senha</Label>
                    <Input type="password" placeholder="••••••••" value={newPassConf} onChange={e => setNewPassConf(e.target.value)} className="bg-[#101012] border-[#232327] text-white focus:border-[#2FD4A0] w-full" />
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <Button disabled={passSaving} onClick={handleSavePassword} className="bg-[#101012] text-[#d3d3d8] border border-[#232327] hover:bg-[#232327] shadow-[0_0_15px_rgba(242,179,61,0.1)] transition-shadow hover:shadow-[0_0_20px_rgba(242,179,61,0.2)]">
                    {passSaving ? "Atualizando..." : "Atualizar Senha"}
                  </Button>
                </div>
              </div>
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
          <div className="flex flex-col gap-6">
            <Panel id="panel-perfil" className="p-0 self-start w-full overflow-hidden border-[#232327] bg-[#0c0c0e]">
              <div className="flex items-center gap-3 border-b border-[#232327] px-4 py-3.5 bg-[#0a0a0c]">
                <span className="h-3.5 w-1 rounded-full bg-[#F2B33D]" />
                <h3 className="flex-1 font-display text-[15px] font-bold text-white tracking-tight">Informações Pessoais</h3>
              </div>
              <div className="p-5">
              <div className="grid gap-5">
                <div>
                  <Label>Nome de Exibição</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={50} className="bg-[#101012] border-[#232327] text-white focus:border-[#2FD4A0] w-full" />
                </div>
                <div>
                  <Label hint="Seu @ único na plataforma">Nome de Usuário</Label>
                  <Input id="input-username" value={channel} onChange={(e) => setChannel(e.target.value)} placeholder="@usuario" maxLength={30} className="bg-[#101012] border-[#232327] text-white focus:border-[#2FD4A0] w-full" />
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <Button disabled={saving} onClick={handleSavePersonalInfo} className="bg-[#101012] text-[#d3d3d8] border border-[#232327] hover:bg-[#232327] shadow-[0_0_15px_rgba(242,179,61,0.1)] transition-shadow hover:shadow-[0_0_20px_rgba(242,179,61,0.2)]">
                  {saving ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
              </div>
            </Panel>

            <Panel id="panel-links" className="p-0 self-start w-full overflow-hidden border-[#232327] bg-[#0c0c0e]">
              <div className="flex items-center gap-3 border-b border-[#232327] px-4 py-3.5 bg-[#0a0a0c]">
                <span className="h-3.5 w-1 rounded-full bg-[#2FD4A0]" />
                <h3 className="flex-1 font-display text-[15px] font-bold text-white tracking-tight">Links do Perfil</h3>
              </div>
              <div className="p-5">
              <div className="grid gap-5">
                <div>
                  <Label>Site ou Portfólio</Label>
                  <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="ex: meusite.com" className="bg-[#101012] border-[#232327] text-white focus:border-[#F2B33D] w-full" />
                </div>
                <div>
                  <Label>Canal do YouTube</Label>
                  <Input value={youtube} onChange={(e) => setYoutube(e.target.value)} placeholder="ex: youtube.com/@usuario" className="bg-[#101012] border-[#232327] text-white focus:border-[#F2B33D] w-full" />
                </div>
                <div>
                  <Label>Instagram</Label>
                  <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="ex: instagram.com/usuario" className="bg-[#101012] border-[#232327] text-white focus:border-[#F2B33D] w-full" />
                </div>
                <div>
                  <Label>TikTok</Label>
                  <Input value={tiktok} onChange={(e) => setTiktok(e.target.value)} placeholder="ex: tiktok.com/@usuario" className="bg-[#101012] border-[#232327] text-white focus:border-[#F2B33D] w-full" />
                </div>
                <div>
                  <Label>Comunidade no Discord</Label>
                  <Input value={discord} onChange={(e) => setDiscord(e.target.value)} placeholder="ex: discord.gg/usuario" className="bg-[#101012] border-[#232327] text-white focus:border-[#F2B33D] w-full" />
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <Button disabled={savingLinks} onClick={handleSaveLinks} className="bg-[#101012] text-[#d3d3d8] border border-[#232327] hover:bg-[#232327] shadow-[0_0_15px_rgba(242,179,61,0.1)] transition-shadow hover:shadow-[0_0_20px_rgba(242,179,61,0.2)]">
                  {savingLinks ? "Salvando..." : "Salvar Links"}
                </Button>
              </div>
              </div>
            </Panel>

          </div>

          <div className="flex flex-col gap-6">
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

            <Panel className="p-0 self-start w-full overflow-hidden border-[#232327] bg-[#0c0c0e]">
              <div className="flex items-center gap-3 border-b border-[#232327] px-4 py-3.5 bg-[#0a0a0c]">
                <span className="h-3.5 w-1 rounded-full bg-[#8c8c94]" />
                <h3 className="flex-1 font-display text-[15px] font-bold text-white tracking-tight">Sistema</h3>
              </div>
              <div className="p-5">
              <div className="grid gap-5">
                <div>
                  <Label>Idioma da Interface</Label>
                  <Select defaultValue="pt" className="bg-[#101012] border-[#232327] text-white focus:border-[#2FD4A0] w-full">
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
          </div>
        </Reveal>
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
    </div>
  );
}
