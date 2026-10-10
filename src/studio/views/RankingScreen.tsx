import { useState, useEffect, useMemo, useCallback } from "react";
import { Icon, Panel, Reveal, Button, Input } from "../components/ui";
import { useAuth, supabase } from "../auth";
import { cn } from "../utils/cn";

export interface CreatorRankItem {
  id: string;
  full_name: string;
  channel: string;
  avatar_url: string | null;
  bio: string | null;
  likes_count: number;
  completed_projects: number;
  total_projects: number;
  ideias_ranqueadas: number;
  total_runs: number;
  streak: number;
  created_at?: string;
}

type SortTab = "global" | "likes" | "projects" | "ideas";

// Fallback inicial enriquecido para garantir interface viva mesmo se offline
const FALLBACK_CREATORS: CreatorRankItem[] = [
  {
    id: "e6790a1d-e66a-4541-ae21-682254a87a49",
    full_name: "Diruen",
    channel: "dirwen",
    avatar_url: "https://yofvcyarznuvqntgslep.supabase.co/storage/v1/object/public/avatars/e6790a1d-e66a-4541-ae21-682254a87a49-0.7857135771586806.jpg",
    bio: "Criador audiovisual & estrategista de canais no StudioOS.",
    likes_count: 12,
    completed_projects: 4,
    total_projects: 6,
    ideias_ranqueadas: 28,
    total_runs: 45,
    streak: 8,
  },
  {
    id: "3fc81e66-3040-4cb7-9ed3-e4680c61a11c",
    full_name: "Aster Test",
    channel: "astertest",
    avatar_url: "https://yofvcyarznuvqntgslep.supabase.co/storage/v1/object/public/avatars/3fc81e66-3040-4cb7-9ed3-e4680c61a11c-0.4603541136560517.jpg",
    bio: "Testando fluxos de produção, retenção e roteiros neurais.",
    likes_count: 8,
    completed_projects: 3,
    total_projects: 4,
    ideias_ranqueadas: 19,
    total_runs: 32,
    streak: 5,
  },
  {
    id: "1c697110-ce0d-498b-88cb-5e1597676d57",
    full_name: "Rato Ratulho",
    channel: "ratoratulho",
    avatar_url: null,
    bio: "Explorando novos formatos e calibrações de nicho.",
    likes_count: 5,
    completed_projects: 2,
    total_projects: 3,
    ideias_ranqueadas: 14,
    total_runs: 18,
    streak: 3,
  },
];

export function RankingScreen({ onGo }: { onGo: (id: string, extra?: string) => void }) {
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creators, setCreators] = useState<CreatorRankItem[]>([]);
  const [activeTab, setActiveTab] = useState<SortTab>("global");
  const [search, setSearch] = useState("");
  const [userLikedMap, setUserLikedMap] = useState<Record<string, boolean>>({});
  const [likingId, setLikingId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Busca criadores e dados do ranking
  const fetchRanking = useCallback(async () => {
    setLoading(true);
    if (!supabase) {
      setCreators(FALLBACK_CREATORS);
      setLoading(false);
      return;
    }

    try {
      // 1. Tenta chamar a RPC oficial studioos_get_creators_ranking
      const { data, error } = await supabase.rpc("studioos_get_creators_ranking");
      if (!error && Array.isArray(data) && data.length > 0) {
        const parsed: CreatorRankItem[] = data.map((d: any) => ({
          id: d.id,
          full_name: d.full_name || "Criador StudioOS",
          channel: (d.channel || "").replace(/^@/, ""),
          avatar_url: d.avatar_url || null,
          bio: d.bio || null,
          likes_count: Number(d.likes_count) || 0,
          completed_projects: Number(d.completed_projects) || 0,
          total_projects: Number(d.total_projects) || 0,
          ideias_ranqueadas: Number(d.ideias_ranqueadas) || 0,
          total_runs: Number(d.total_runs) || 0,
          streak: Number(d.streak) || 0,
          created_at: d.created_at,
        }));
        setCreators(parsed);
      } else {
        // 2. Fallback direto consultando profiles
        const { data: profs, error: profsErr } = await supabase
          .from("profiles")
          .select("id, full_name, channel, avatar_url, bio, stats, created_at")
          .order("created_at", { ascending: false });

        if (!profsErr && profs && profs.length > 0) {
          const mapped: CreatorRankItem[] = profs.map((p: any) => {
            const stats = p.stats || {};
            return {
              id: p.id,
              full_name: p.full_name || "Criador StudioOS",
              channel: (p.channel || "").replace(/^@/, ""),
              avatar_url: p.avatar_url || null,
              bio: p.bio || null,
              likes_count: Number(stats.likes_count ?? stats.curtidas_recebidas) || 0,
              completed_projects: Number(stats.projetos_concluidos) || 0,
              total_projects: Number(stats.projetos) || 0,
              ideias_ranqueadas: Number(stats.ideias_ranqueadas) || 0,
              total_runs: Number(stats.total_runs) || 0,
              streak: Number(stats.streak) || 0,
              created_at: p.created_at,
            };
          });
          setCreators(mapped);
        } else {
          setCreators(FALLBACK_CREATORS);
        }
      }

      // Consulta curtidas dadas pelo usuário logado para pintar os corações
      if (user?.id) {
        const { data: myLikes } = await supabase
          .from("studioos_profile_likes")
          .select("target_user_id")
          .eq("liker_user_id", user.id);

        if (myLikes) {
          const map: Record<string, boolean> = {};
          myLikes.forEach((l: any) => {
            map[l.target_user_id] = true;
          });
          setUserLikedMap(map);
        }
      }
    } catch {
      setCreators(FALLBACK_CREATORS);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchRanking();
  }, [fetchRanking]);

  // Curtir ou descurtir perfil diretamente do ranking
  const handleToggleLike = async (creator: CreatorRankItem) => {
    if (!user || user.provider === "demo") {
      alert("Apenas criadores autenticados com conta podem curtir perfis no StudioOS.");
      onGo("login");
      return;
    }

    if (creator.id === user.id) {
      alert("Você não pode curtir o seu próprio perfil.");
      return;
    }

    if (likingId || !supabase) return;
    setLikingId(creator.id);

    const currentlyLiked = Boolean(userLikedMap[creator.id]);
    const nextLiked = !currentlyLiked;
    const diff = nextLiked ? 1 : -1;

    // Atualização otimista
    setUserLikedMap((prev) => ({ ...prev, [creator.id]: nextLiked }));
    setCreators((prev) =>
      prev.map((c) =>
        c.id === creator.id ? { ...c, likes_count: Math.max(0, c.likes_count + diff) } : c
      )
    );

    try {
      const res = await supabase.rpc("studioos_toggle_profile_like", {
        p_target_id: creator.id,
      });

      if (res.error) {
        // Reverte otimismo
        setUserLikedMap((prev) => ({ ...prev, [creator.id]: currentlyLiked }));
        setCreators((prev) =>
          prev.map((c) =>
            c.id === creator.id ? { ...c, likes_count: Math.max(0, c.likes_count - diff) } : c
          )
        );
        alert(res.error.message || "Erro ao registrar curtida.");
      } else if (res.data) {
        setUserLikedMap((prev) => ({ ...prev, [creator.id]: Boolean(res.data.liked) }));
        setCreators((prev) =>
          prev.map((c) =>
            c.id === creator.id ? { ...c, likes_count: Number(res.data.likes_count) || 0 } : c
          )
        );
      }
    } catch {
      setUserLikedMap((prev) => ({ ...prev, [creator.id]: currentlyLiked }));
    } finally {
      setLikingId(null);
    }
  };

  // Cálculo de Score Global StudioOS
  const calculateScore = useCallback((item: CreatorRankItem) => {
    // Ponderação calculada:
    // - Curtidas no Perfil (Reputação social): peso 15
    // - Projetos Concluídos (Execução e entrega): peso 25
    // - Ideias Ranqueadas (Potencial e ideação ativa): peso 6
    // - Uso de Ferramentas (Horas/execuções no estúdio): peso 2
    // - Streak / Consistência: peso 4
    const score =
      item.likes_count * 15 +
      item.completed_projects * 25 +
      item.ideias_ranqueadas * 6 +
      item.total_runs * 2 +
      item.streak * 4;
    return score;
  }, []);

  // Ordenação de acordo com a aba selecionada
  const sortedCreators = useMemo(() => {
    let list = [...creators];

    // Filtro por texto de pesquisa
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.full_name.toLowerCase().includes(q) ||
          c.channel.toLowerCase().includes(q) ||
          (c.bio && c.bio.toLowerCase().includes(q))
      );
    }

    switch (activeTab) {
      case "likes":
        return list.sort((a, b) => b.likes_count - a.likes_count || b.completed_projects - a.completed_projects);
      case "projects":
        return list.sort((a, b) => b.completed_projects - a.completed_projects || b.likes_count - a.likes_count);
      case "ideas":
        return list.sort((a, b) => b.ideias_ranqueadas - a.ideias_ranqueadas || b.likes_count - a.likes_count);
      case "global":
      default:
        return list.sort((a, b) => calculateScore(b) - calculateScore(a));
    }
  }, [creators, search, activeTab, calculateScore]);

  // Identificação da posição do usuário autenticado
  const currentUserIndex = useMemo(() => {
    if (!user?.id) return -1;
    return sortedCreators.findIndex((c) => c.id === user.id);
  }, [sortedCreators, user?.id]);

  const top3 = sortedCreators.slice(0, 3);
  const remainingList = sortedCreators.slice(3);

  return (
    <div className="relative mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      {/* Background radial glow */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-[480px] w-full max-w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-b from-signal-500/10 via-amber-500/5 to-transparent blur-[120px]" />

      {/* Header */}
      <Reveal>
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-signal-500/30 bg-signal-500/10 px-3 py-1 font-mono text-[10.5px] font-semibold tracking-[0.2em] text-signal-400 uppercase">
              <Icon name="trophy" className="h-3.5 w-3.5 text-signal-400" />
              Classificação Geral do StudioOS
            </div>
            <h1 className="mt-3.5 font-display text-[clamp(2rem,5vw,3.2rem)] font-extrabold tracking-[-0.03em] text-bone-50">
              Ranking de Criadores
            </h1>
            <p className="mt-2.5 max-w-2xl text-[14.5px] leading-relaxed text-bone-400">
              Acompanhe os criadores que estão liderando a comunidade em reputação, entrega de projetos
              finalizados e ideação contínua no estúdio.
            </p>
          </div>

          {/* Quick Stats Summary */}
          <div className="flex items-center gap-3">
            <button
              onClick={fetchRanking}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-ink-800 bg-ink-900/80 px-3.5 py-2.5 font-mono text-[11px] font-medium tracking-[0.14em] text-bone-300 uppercase transition-all hover:border-ink-700 hover:text-bone-50 active:scale-95 disabled:opacity-50"
              title="Atualizar dados do ranking"
            >
              <Icon name="refresh" className={cn("h-3.5 w-3.5", loading && "animate-spin text-signal-400")} />
              Atualizar
            </button>
            {user && (
              <button
                onClick={() => onGo("perfil")}
                className="inline-flex items-center gap-2 rounded-lg border border-signal-400/40 bg-signal-400/10 px-4 py-2.5 font-mono text-[11px] font-bold tracking-[0.14em] text-signal-400 uppercase transition-all hover:bg-signal-400 hover:text-ink-950"
              >
                <Icon name="user" className="h-3.5 w-3.5" />
                Meu Perfil
              </button>
            )}
          </div>
        </div>
      </Reveal>

      {/* Card da posição do próprio criador logado */}
      {user && currentUserIndex !== -1 && (
        <Reveal delay={100}>
          <div className="mt-8 overflow-hidden rounded-xl border border-signal-500/30 bg-gradient-to-r from-ink-950 via-signal-950/20 to-ink-950 p-5 shadow-[0_0_30px_rgba(242,96,76,0.08)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-signal-400/50 bg-signal-500/20 font-display text-xl font-black text-signal-300">
                  #{currentUserIndex + 1}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-[17px] font-bold text-bone-50">
                      Você está na {currentUserIndex + 1}ª posição
                    </span>
                    <span className="rounded bg-signal-500/20 px-2 py-0.5 font-mono text-[10px] font-semibold text-signal-300 uppercase">
                      Seu Perfil
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-bone-400">
                    Continue ranqueando ideias e concluindo projetos para subir rumo ao Top 3!
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 border-t border-ink-800/80 pt-3 sm:border-t-0 sm:pt-0">
                <div className="text-right">
                  <div className="font-mono text-[9px] tracking-wider text-ink-400 uppercase">Suas Curtidas</div>
                  <div className="font-display text-lg font-bold text-signal-400">
                    {sortedCreators[currentUserIndex]?.likes_count || 0}
                  </div>
                </div>
                <div className="h-7 w-px bg-ink-800" />
                <div className="text-right">
                  <div className="font-mono text-[9px] tracking-wider text-ink-400 uppercase">Concluídos</div>
                  <div className="font-display text-lg font-bold text-mint-400">
                    {sortedCreators[currentUserIndex]?.completed_projects || 0}
                  </div>
                </div>
                <div className="h-7 w-px bg-ink-800" />
                <div className="text-right">
                  <div className="font-mono text-[9px] tracking-wider text-ink-400 uppercase">Ideias</div>
                  <div className="font-display text-lg font-bold text-sun-400">
                    {sortedCreators[currentUserIndex]?.ideias_ranqueadas || 0}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      )}

      {/* Tabs de Filtro e Ordenação + Busca */}
      <div className="mt-8 flex flex-col gap-4 border-b border-ink-800 pb-5 lg:flex-row lg:items-center lg:justify-between">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-ink-800 bg-ink-950/70 p-1">
          {[
            { id: "global", label: "Score Global", icon: "trophy", hint: "Equilíbrio geral" },
            { id: "likes", label: "Mais Curtidos", icon: "heart", hint: "Por curtidas no perfil" },
            { id: "projects", label: "Projetos Concluídos", icon: "check", hint: "Por entregas finalizadas" },
            { id: "ideas", label: "Ideias Ranqueadas", icon: "target", hint: "Por ideação no estúdio" },
          ].map((t) => {
            const isTabActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as SortTab)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3.5 py-2 text-xs font-semibold transition-all",
                  isTabActive
                    ? "bg-signal-500 text-ink-950 shadow-md"
                    : "text-bone-400 hover:bg-ink-900 hover:text-bone-100"
                )}
              >
                <Icon name={t.icon} className={cn("h-3.5 w-3.5", isTabActive ? "text-ink-950" : "text-ink-400")} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Input de Busca */}
        <div className="relative min-w-[260px]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por criador ou @canal…"
            className="w-full rounded-lg border border-ink-800 bg-ink-900/90 px-3.5 py-2 pl-9 text-xs text-bone-100 placeholder-ink-500 transition-colors focus:border-signal-400/50 focus:outline-none"
          />
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-ink-400 hover:text-bone-200"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* PÓDIO DOS 3 PRIMEIROS COLOCADOS */}
      {!search && top3.length > 0 && (
        <div className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <div className="font-mono text-[10.5px] font-semibold tracking-[0.2em] text-ink-400 uppercase">
              Destaques do Pódio · Top 3
            </div>
            <div className="font-mono text-[10.5px] text-ink-500">
              Ordenado por: <span className="font-bold text-bone-200">
                {activeTab === "global" ? "Score Global" : activeTab === "likes" ? "Curtidas" : activeTab === "projects" ? "Projetos Concluídos" : "Ideias Ranqueadas"}
              </span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {top3.map((creator, idx) => {
              const isGold = idx === 0;
              const isSilver = idx === 1;
              const isBronze = idx === 2;
              const isSelf = user?.id === creator.id;
              const hasLiked = Boolean(userLikedMap[creator.id]);

              return (
                <div
                  key={creator.id}
                  className={cn(
                    "group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-6 transition-all duration-300",
                    isGold
                      ? "border-amber-400/60 bg-gradient-to-b from-amber-950/20 via-ink-950 to-ink-950 shadow-[0_0_35px_rgba(242,179,61,0.12)] lg:-translate-y-1"
                      : isSilver
                        ? "border-bone-300/40 bg-gradient-to-b from-bone-500/10 via-ink-950 to-ink-950 shadow-[0_0_25px_rgba(227,220,204,0.06)]"
                        : "border-signal-500/40 bg-gradient-to-b from-signal-950/20 via-ink-950 to-ink-950 shadow-[0_0_25px_rgba(242,96,76,0.06)]"
                  )}
                >
                  {/* Glowing background accent */}
                  <div
                    className={cn(
                      "pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-2xl opacity-30",
                      isGold ? "bg-amber-400" : isSilver ? "bg-bone-200" : "bg-signal-500"
                    )}
                  />

                  <div>
                    {/* Position Badge & Crown */}
                    <div className="flex items-center justify-between">
                      <div
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[11px] font-black tracking-wider uppercase",
                          isGold
                            ? "bg-amber-400/20 text-amber-300 border border-amber-400/40"
                            : isSilver
                              ? "bg-bone-200/20 text-bone-200 border border-bone-300/40"
                              : "bg-signal-500/20 text-signal-300 border border-signal-500/40"
                        )}
                      >
                        {isGold && <Icon name="crown" className="h-3.5 w-3.5 text-amber-300" />}
                        {isSilver && <Icon name="medal" className="h-3.5 w-3.5 text-bone-200" />}
                        {isBronze && <Icon name="award" className="h-3.5 w-3.5 text-signal-300" />}
                        {idx + 1}º Lugar
                      </div>

                      {isSelf && (
                        <span className="rounded bg-signal-400/10 px-2 py-0.5 font-mono text-[9.5px] font-bold text-signal-400 uppercase">
                          Você
                        </span>
                      )}
                    </div>

                    {/* Creator Identity */}
                    <div className="mt-5 flex items-center gap-3.5">
                      <div className="relative">
                        {creator.avatar_url ? (
                          <img
                            src={creator.avatar_url}
                            alt={creator.full_name}
                            className={cn(
                              "h-14 w-14 rounded-full object-cover ring-2",
                              isGold ? "ring-amber-400" : isSilver ? "ring-bone-300" : "ring-signal-500"
                            )}
                          />
                        ) : (
                          <div
                            className={cn(
                              "flex h-14 w-14 items-center justify-center rounded-full font-display text-lg font-bold ring-2",
                              isGold
                                ? "bg-amber-950/80 text-amber-300 ring-amber-400"
                                : isSilver
                                  ? "bg-ink-800 text-bone-200 ring-bone-300"
                                  : "bg-signal-950/80 text-signal-300 ring-signal-500"
                            )}
                          >
                            {creator.full_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {isGold && (
                          <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-ink-950 shadow-md">
                            <Icon name="star" className="h-3 w-3" />
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <button
                          onClick={() => onGo("perfil", creator.channel)}
                          className="block truncate text-left font-display text-[17px] font-bold text-bone-50 transition-colors hover:text-signal-300"
                        >
                          {creator.full_name}
                        </button>
                        <button
                          onClick={() => onGo("perfil", creator.channel)}
                          className="font-mono text-xs text-ink-400 transition-colors hover:text-bone-300"
                        >
                          @{creator.channel}
                        </button>
                      </div>
                    </div>

                    {/* Bio */}
                    {creator.bio && (
                      <p className="mt-3.5 line-clamp-2 text-xs leading-relaxed text-bone-400">
                        {creator.bio}
                      </p>
                    )}

                    {/* Destaque Principal da Métrica Ativa */}
                    <div className="mt-5 rounded-xl border border-ink-800/80 bg-ink-950/60 p-3">
                      <div className="flex items-end justify-between">
                        <div>
                          <div className="font-mono text-[9px] tracking-widest text-ink-400 uppercase">
                            {activeTab === "global"
                              ? "SCORE GLOBAL"
                              : activeTab === "likes"
                                ? "CURTIDAS NO PERFIL"
                                : activeTab === "projects"
                                  ? "PROJETOS CONCLUÍDOS"
                                  : "IDEIAS RANQUEADAS"}
                          </div>
                          <div
                            className={cn(
                              "mt-1 font-display text-2xl font-black tabular-nums",
                              isGold ? "text-amber-400" : isSilver ? "text-bone-100" : "text-signal-400"
                            )}
                          >
                            {activeTab === "global"
                              ? calculateScore(creator)
                              : activeTab === "likes"
                                ? creator.likes_count
                                : activeTab === "projects"
                                  ? creator.completed_projects
                                  : creator.ideias_ranqueadas}
                          </div>
                        </div>

                        {/* Botão de curtir rápido no card */}
                        <button
                          onClick={() => handleToggleLike(creator)}
                          disabled={isSelf || likingId === creator.id}
                          className={cn(
                            "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all",
                            hasLiked
                              ? "border-signal-500/50 bg-signal-500/20 text-signal-400"
                              : "border-ink-800 bg-ink-900/60 text-bone-400 hover:border-signal-500/40 hover:text-signal-400",
                            isSelf && "cursor-not-allowed opacity-50"
                          )}
                          title={isSelf ? "Você não pode curtir seu próprio perfil" : hasLiked ? "Descurtir perfil" : "Curtir este criador"}
                        >
                          <Icon
                            name="heart"
                            className={cn("h-3.5 w-3.5 transition-transform group-hover:scale-110", hasLiked && "fill-signal-400 text-signal-400")}
                          />
                          <span className="font-mono tabular-nums">{creator.likes_count}</span>
                        </button>
                      </div>

                      {/* Mini Breakdown das 3 métricas essenciais */}
                      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-ink-800/80 pt-2.5 text-center">
                        <div>
                          <div className="font-mono text-[8.5px] text-ink-500 uppercase">Curtidas</div>
                          <div className="mt-0.5 font-mono text-xs font-bold text-signal-400">{creator.likes_count}</div>
                        </div>
                        <div>
                          <div className="font-mono text-[8.5px] text-ink-500 uppercase">Projetos</div>
                          <div className="mt-0.5 font-mono text-xs font-bold text-mint-400">{creator.completed_projects}</div>
                        </div>
                        <div>
                          <div className="font-mono text-[8.5px] text-ink-500 uppercase">Ideias</div>
                          <div className="mt-0.5 font-mono text-xs font-bold text-sun-400">{creator.ideias_ranqueadas}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ação: Ver perfil completo */}
                  <div className="mt-5">
                    <button
                      onClick={() => onGo("perfil", creator.channel)}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-ink-800 bg-ink-900/90 py-2.5 text-xs font-bold text-bone-200 transition-all hover:border-signal-400/50 hover:bg-signal-400/10 hover:text-signal-300"
                    >
                      <span>Ver Perfil Público</span>
                      <Icon name="arrow" className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TABELA / LISTA COMPLETA DOS CRIADORES */}
      <div className="mt-12">
        <div className="mb-4 flex items-center justify-between">
          <div className="font-mono text-[10.5px] font-semibold tracking-[0.2em] text-ink-400 uppercase">
            {search ? `Resultados da busca (${sortedCreators.length})` : `Classificação Geral (${sortedCreators.length} criadores)`}
          </div>
          <div className="font-mono text-[10px] text-ink-500">
            Atualização em tempo real · StudioOS
          </div>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center rounded-xl border border-ink-800 bg-ink-950/60">
            <div className="flex items-center gap-3 font-mono text-xs text-bone-400">
              <Icon name="refresh" className="h-4 w-4 animate-spin text-signal-400" />
              Carregando classificação dos criadores…
            </div>
          </div>
        ) : sortedCreators.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-ink-800 bg-ink-950/30 p-8 text-center">
            <Icon name="target" className="h-8 w-8 text-ink-500" />
            <p className="mt-3 text-sm font-semibold text-bone-300">Nenhum criador encontrado</p>
            <p className="mt-1 text-xs text-ink-500">Tente buscar por outro termo ou limpe o filtro.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-ink-800 bg-ink-950/90">
            <div className="divide-y divide-ink-800/70">
              {sortedCreators.map((creator, index) => {
                const rankPos = index + 1;
                const isSelf = user?.id === creator.id;
                const hasLiked = Boolean(userLikedMap[creator.id]);

                return (
                  <div
                    key={creator.id}
                    className={cn(
                      "flex flex-col gap-4 p-4 transition-colors hover:bg-ink-900/50 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4",
                      isSelf && "bg-signal-500/[0.04]"
                    )}
                  >
                    {/* Rank Number + Avatar + Identity */}
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      {/* Posição */}
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-md font-mono text-xs font-bold tabular-nums",
                          rankPos === 1
                            ? "bg-amber-400/20 text-amber-300 border border-amber-400/30 font-black"
                            : rankPos === 2
                              ? "bg-bone-200/20 text-bone-200 border border-bone-300/30 font-bold"
                              : rankPos === 3
                                ? "bg-signal-500/20 text-signal-300 border border-signal-500/30 font-bold"
                                : "text-ink-400"
                        )}
                      >
                        {rankPos.toString().padStart(2, "0")}
                      </span>

                      {/* Avatar */}
                      <button
                        onClick={() => onGo("perfil", creator.channel)}
                        className="relative shrink-0 focus:outline-none"
                      >
                        {creator.avatar_url ? (
                          <img
                            src={creator.avatar_url}
                            alt={creator.full_name}
                            className="h-10 w-10 rounded-full object-cover ring-1 ring-ink-700"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-800 font-display text-sm font-bold text-bone-200 ring-1 ring-ink-700">
                            {creator.full_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </button>

                      {/* Nome e handle */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onGo("perfil", creator.channel)}
                            className="truncate text-left text-sm font-bold text-bone-100 hover:text-signal-300 hover:underline"
                          >
                            {creator.full_name}
                          </button>
                          {isSelf && (
                            <span className="rounded bg-signal-400/20 px-1.5 py-0.2 font-mono text-[9px] font-bold text-signal-300 uppercase">
                              Você
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onGo("perfil", creator.channel)}
                            className="font-mono text-xs text-ink-400 hover:text-bone-300"
                          >
                            @{creator.channel}
                          </button>
                          {creator.bio && (
                            <span className="hidden truncate text-xs text-ink-500 md:inline max-w-[280px]">
                              · {creator.bio}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Métricas e Botões */}
                    <div className="flex flex-wrap items-center justify-between gap-4 sm:justify-end">
                      {/* As 3 Métricas */}
                      <div className="flex items-center gap-5 sm:gap-6">
                        {/* 1. Curtidas */}
                        <div className="text-right">
                          <div className="flex items-center justify-end gap-1 font-mono text-[9px] text-ink-400 uppercase">
                            <Icon name="heart" className="h-2.5 w-2.5 text-signal-400" />
                            <span>Curtidas</span>
                          </div>
                          <div className="mt-0.5 font-mono text-xs font-bold text-signal-400 tabular-nums">
                            {creator.likes_count}
                          </div>
                        </div>

                        {/* 2. Projetos Concluídos */}
                        <div className="text-right">
                          <div className="flex items-center justify-end gap-1 font-mono text-[9px] text-ink-400 uppercase">
                            <Icon name="check" className="h-2.5 w-2.5 text-mint-400" />
                            <span>Concluídos</span>
                          </div>
                          <div className="mt-0.5 font-mono text-xs font-bold text-mint-400 tabular-nums">
                            {creator.completed_projects}
                          </div>
                        </div>

                        {/* 3. Ideias Ranqueadas */}
                        <div className="text-right">
                          <div className="flex items-center justify-end gap-1 font-mono text-[9px] text-ink-400 uppercase">
                            <Icon name="target" className="h-2.5 w-2.5 text-sun-400" />
                            <span>Ideias</span>
                          </div>
                          <div className="mt-0.5 font-mono text-xs font-bold text-sun-400 tabular-nums">
                            {creator.ideias_ranqueadas}
                          </div>
                        </div>

                        {/* Score Global */}
                        <div className="hidden text-right lg:block">
                          <div className="font-mono text-[9px] text-ink-400 uppercase">Score Global</div>
                          <div className="mt-0.5 font-mono text-xs font-bold text-bone-200 tabular-nums">
                            {calculateScore(creator)}
                          </div>
                        </div>
                      </div>

                      {/* Botões de Ação */}
                      <div className="flex items-center gap-2">
                        {/* Curtir */}
                        <button
                          onClick={() => handleToggleLike(creator)}
                          disabled={isSelf || likingId === creator.id}
                          className={cn(
                            "flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-semibold transition-all",
                            hasLiked
                              ? "border-signal-500/50 bg-signal-500/20 text-signal-400"
                              : "border-ink-800 bg-ink-900/80 text-bone-400 hover:border-signal-500/40 hover:text-signal-400",
                            isSelf && "cursor-not-allowed opacity-50"
                          )}
                          title={isSelf ? "Seu perfil" : hasLiked ? "Descurtir" : "Curtir"}
                        >
                          <Icon
                            name="heart"
                            className={cn("h-3 w-3", hasLiked && "fill-signal-400 text-signal-400")}
                          />
                          <span className="font-mono text-[11px] tabular-nums">{creator.likes_count}</span>
                        </button>

                        {/* Ver Perfil */}
                        <button
                          onClick={() => onGo("perfil", creator.channel)}
                          className="flex h-8 items-center gap-1.5 rounded-md border border-ink-800 bg-ink-900/80 px-3 font-mono text-[11px] font-semibold text-bone-300 transition-colors hover:border-bone-400 hover:text-bone-50"
                        >
                          <span>Perfil</span>
                          <Icon name="arrow" className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* PAINEL EXPLICATIVO: CRITÉRIOS DE RANQUEAMENTO */}
      <div className="mt-16 rounded-2xl border border-ink-800 bg-ink-950/80 p-6 sm:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xl">
            <div className="font-mono text-[10px] font-bold tracking-[0.2em] text-signal-400 uppercase">
              Metodologia de Medição · StudioOS
            </div>
            <h2 className="mt-2 font-display text-xl font-extrabold text-bone-100 sm:text-2xl">
              Como medimos e ranqueamos os criadores?
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-bone-400">
              O ecossistema StudioOS foi estruturado para valorizar não apenas a popularidade superficial,
              mas o ciclo completo de um criador profissional de conteúdo: da idealização à audiência.
            </p>
          </div>

          <div className="rounded-lg border border-signal-500/20 bg-signal-500/5 px-4 py-3 font-mono text-xs text-signal-300">
            Funil: <span className="font-bold text-bone-50">Ideação</span> → <span className="font-bold text-bone-50">Execução</span> → <span className="font-bold text-bone-50">Reconhecimento</span>
          </div>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {/* Pilar 1 */}
          <div className="rounded-xl border border-ink-800/80 bg-ink-900/50 p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-signal-500/10 text-signal-400">
              <Icon name="heart" className="h-4.5 w-4.5" />
            </div>
            <h3 className="mt-3.5 font-display text-base font-bold text-bone-100">
              1. Curtidas no Perfil
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-bone-400">
              <strong>Mede a autoridade social e reconhecimento da comunidade.</strong> Apenas criadores com conta ativa podem curtir outros perfis, protegendo contra automações.
            </p>
          </div>

          {/* Pilar 2 */}
          <div className="rounded-xl border border-ink-800/80 bg-ink-900/50 p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-mint-400/10 text-mint-400">
              <Icon name="check" className="h-4.5 w-4.5" />
            </div>
            <h3 className="mt-3.5 font-display text-base font-bold text-bone-100">
              2. Projetos Concluídos
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-bone-400">
              <strong>Mede a capacidade de execução e entrega.</strong> Avalia quantos projetos saíram do planejamento, cumpriram todas as etapas de roteiro e gravação, e chegaram ao status de concluído.
            </p>
          </div>

          {/* Pilar 3 */}
          <div className="rounded-xl border border-ink-800/80 bg-ink-900/50 p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sun-400/10 text-sun-400">
              <Icon name="target" className="h-4.5 w-4.5" />
            </div>
            <h3 className="mt-3.5 font-display text-base font-bold text-bone-100">
              3. Ideias Ranqueadas
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-bone-400">
              <strong>Mede a exploração criativa e rigor de validação.</strong> O motor do StudioOS avalia ideias com nota preditiva de 0 a 100 antes de investir horas de produção, garantindo que o canal só produza o melhor.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
export default RankingScreen;
