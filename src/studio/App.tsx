import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "./utils/cn";
import { TOOLS, TOOL_BY_ID } from "./data";
import { Console } from "./components/Console";
import { StatusBar } from "./components/StatusBar";
import { Sidebar } from "./components/Sidebar";
import { Home } from "./views/Home";
import { Icon } from "./components/ui";
import { RankIdeia } from "./tools/RankIdeia";
import { Titulos } from "./tools/Titulos";
import { Hooks } from "./tools/Hooks";
import { Roteiro } from "./tools/Roteiro";
import { Thumbnail } from "./tools/Thumbnail";
import { ReceitaViral } from "./tools/ReceitaViral";
import { Humanizador } from "./tools/Humanizador";
import { ScorePost } from "./tools/ScorePost";
import { Mentor } from "./tools/Mentor";
import { Membros } from "./tools/Membros";
import {
  Calibracao,
  Config,
  Wiki,
  calibProgress,
  emptyCalib,
  exampleCalib,
  type Calib,
  type CalibProfile,
} from "./tools/Painel";
import {
  loadCalibProfiles,
  saveCalibProfiles,
  deleteCalibProfile,
  isCalibrated,
} from "./calibration";
import { HistoricoX } from "./views/Historico";
import { useStudioOS } from "./history";
import { useAuth, supabase } from "./auth";
import { AuthScreen } from "./views/AuthScreen";
import PerfilScreen from "./views/PerfilScreen";
import { ProjetosScreen } from "./views/ProjetosScreen";
import { SalvosScreen } from "./views/SalvosScreen";

/* ------------------------------------------------------------- footer */

function Footer({ onGo }: { onGo: (id: string) => void }) {
  const groups = ["Criação", "Publicação", "Estratégia", "Painel"] as const;
  return (
    <footer className="relative mt-8 overflow-hidden border-t border-ink-800 bg-ink-950">
      <div className="pointer-events-none absolute inset-0 grid-lines opacity-30" />
      <div className="relative mx-auto max-w-[1400px] px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)]">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-signal-400 text-ink-950">
                <Icon name="logo" className="h-5 w-5" strokeWidth={1.8} />
              </span>
              <div>
                <div className="font-display text-xl leading-none font-extrabold tracking-[-0.03em] text-bone-50">
                  StudioOS
                </div>
                <div className="mt-1 font-mono text-[9.5px] tracking-[0.2em] text-ink-400 uppercase">
                  studio.asterdev.me
                </div>
              </div>
            </div>
            <p className="mt-5 max-w-sm text-[13.5px] leading-relaxed text-bone-400">
              Sistema operacional do criador: doze ferramentas calibradas no seu canal, do banco de
              ideias ao post publicado. Chave de IA sua, dados seus, tudo local.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                onClick={() => onGo("rank")}
                className="group inline-flex items-center gap-2 rounded-md bg-signal-400 px-4 py-2.5 text-[13px] font-bold text-ink-950 transition-all hover:bg-signal-300"
              >
                Começar pelo rank
                <Icon name="arrow" className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" strokeWidth={2.2} />
              </button>
              <button
                onClick={() => onGo("wiki")}
                className="inline-flex items-center gap-2 rounded-md border border-ink-700 px-4 py-2.5 text-[13px] font-semibold text-bone-300 transition-all hover:border-bone-300/40 hover:text-bone-50"
              >
                Ler a wiki
              </button>
            </div>
          </div>

          <div className="grid gap-6 grid-cols-2 sm:grid-cols-5">
            {groups.map((g) => (
              <div key={g}>
                <div className="mb-3 font-mono text-[9.5px] tracking-[0.2em] text-signal-400 uppercase">
                  {g}
                </div>
                <ul className="space-y-2">
                  {TOOLS.filter((t) => t.group === g).map((t) => (
                    <li key={t.id}>
                      <button
                        onClick={() => onGo(t.id)}
                        className="group flex items-center gap-1.5 text-left text-[12.5px] text-bone-400 transition-colors hover:text-bone-50"
                      >
                        <span className="h-px w-0 bg-signal-400 transition-all duration-300 group-hover:w-3" />
                        {t.name}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div>
              <div className="mb-3 font-mono text-[9.5px] tracking-[0.2em] text-signal-400 uppercase">
                Sistema
              </div>
              <ul className="space-y-2">
                {[
                  ["historico", "Histórico & Lixeira"],
                  ["config", "Provedor de IA"],
                  ["calibracao", "Calibração"],
                ].map(([id, label]) => (
                  <li key={id}>
                    <button
                      onClick={() => onGo(id)}
                      className="group flex items-center gap-1.5 text-left text-[12.5px] text-bone-400 transition-colors hover:text-bone-50"
                    >
                      <span className="h-px w-0 bg-signal-400 transition-all duration-300 group-hover:w-3" />
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* giant wordmark */}
        <div className="mt-14 select-none overflow-hidden">
          <div
            className="font-display text-[clamp(3.4rem,15vw,13rem)] leading-[0.8] font-extrabold tracking-[-0.05em] text-transparent"
            style={{ WebkitTextStroke: "1px rgba(227,220,204,0.14)" }}
          >
            STUDIOOS
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-ink-800 pt-6 sm:flex-row sm:items-center">
          <p className="font-mono text-[10px] tracking-[0.14em] text-ink-400 uppercase">
            © {new Date().getFullYear()} asterdev studio — painel local, sem telemetria
          </p>
          <div className="flex flex-wrap items-center gap-4 sm:ml-auto">
            {[
              ["wiki", "Documentação"],
              ["config", "Provedor de IA"],
              ["calibracao", "Calibração"],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => onGo(id)}
                className="font-mono text-[10px] tracking-[0.14em] text-ink-400 uppercase transition-colors hover:text-signal-400"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------ scroll meter */

function ScrollProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setP(h > 0 ? Math.min(100, (window.scrollY / h) * 100) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[2px]">
      <div
        className="h-full bg-gradient-to-r from-signal-400 via-oxide-400 to-mint-400 shadow-[0_0_12px_rgba(247,183,51,0.7)] transition-[width] duration-150 ease-out"
        style={{ width: `${p}%` }}
      />
    </div>
  );
}

/* ---------------------------------------------------------------- app */

const VALID_VIEWS = new Set([
  "home",
  "login",
  "perfil",
  "projetos",
  "salvos",
  "wiki",
  "historico",
  "lixeira",
  "calibracao",
  "config",
  "rank",
  "titulos",
  "hooks",
  "roteiro",
  "thumbnail",
  "receita",
  "humanizador",
  "score",
  "mentor",
  "membros",
]);

function getInitialProfileHandle(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const params = new URLSearchParams(window.location.search);
    const u = params.get("u") || params.get("user") || params.get("handle");
    if (u) return u.replace(/^@/, "");
    const match = window.location.pathname.match(/\/perfil\/([^/?#]+)/);
    if (match && match[1]) return decodeURIComponent(match[1]).replace(/^@/, "");
  } catch {}
  return null;
}

function getInitialView(): string {
  if (typeof window === "undefined") return "home";
  try {
    const path = window.location.pathname;
    if (path.startsWith("/perfil/") || getInitialProfileHandle()) {
      return "perfil";
    }
    const params = new URLSearchParams(window.location.search);
    const v = params.get("view");
    if (v && VALID_VIEWS.has(v)) {
      return v;
    }
    const stored = localStorage.getItem("studioos_last_view");
    if (stored && VALID_VIEWS.has(stored)) {
      return stored;
    }
  } catch {}
  return "home";
}

export default function App() {
  const auth = useAuth();
  const [view, setView] = useState<string>(getInitialView);
  const [viewedProfileHandle, setViewedProfileHandle] = useState<string | null>(getInitialProfileHandle);
  const [protectedViewAfterLogin, setProtectedViewAfterLogin] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [calibStore, setCalibStore] = useState<{
    profiles: CalibProfile[];
    activeProfileId: string;
    activeCalib: Calib;
  }>(() => loadCalibProfiles(!auth.user));

  const activeProfile = useMemo(() => {
    return (
      calibStore.profiles.find((p) => p.id === calibStore.activeProfileId) ||
      calibStore.profiles[0] || {
        id: "profile_default",
        name: "Canal Principal",
        color: "#F2B33D",
        calib: emptyCalib,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
    );
  }, [calibStore.profiles, calibStore.activeProfileId]);

  const activeCalib = activeProfile.calib;
  const progress = useMemo(() => calibProgress(activeCalib), [activeCalib]);

  useEffect(() => {
    const handleCalibEvent = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom.detail) {
        setCalibStore({
          profiles: custom.detail.profiles,
          activeProfileId: custom.detail.activeProfileId,
          activeCalib: custom.detail.activeCalib,
        });
      } else {
        setCalibStore(loadCalibProfiles(!auth.user));
      }
    };
    window.addEventListener("studioos:calib_changed", handleCalibEvent);
    return () => window.removeEventListener("studioos:calib_changed", handleCalibEvent);
  }, [auth.user]);

  const lastAuthId = useRef(auth.user?.id ?? null);
  const os = useStudioOS();

  useLayoutEffect(() => {
    if (auth.loading) return;
    const nextAuthId = auth.user?.id ?? null;
    if (lastAuthId.current === nextAuthId) return;
    lastAuthId.current = nextAuthId;
    setCalibStore(loadCalibProfiles(!auth.user));
  }, [auth.loading, auth.user?.id]);

  const handleSelectActiveProfile = (id: string) => {
    const nextActive = calibStore.profiles.find((p) => p.id === id);
    if (!nextActive) return;
    saveCalibProfiles(calibStore.profiles, id);
    setCalibStore((prev) => ({
      ...prev,
      activeProfileId: id,
      activeCalib: nextActive.calib,
    }));
  };

  const handleUpdateProfile = (updated: CalibProfile) => {
    const nextProfiles = calibStore.profiles.map((p) => (p.id === updated.id ? updated : p));
    saveCalibProfiles(nextProfiles, calibStore.activeProfileId);
    setCalibStore((prev) => ({
      profiles: nextProfiles,
      activeProfileId: prev.activeProfileId,
      activeCalib: prev.activeProfileId === updated.id ? updated.calib : prev.activeCalib,
    }));
  };

  const handleCreateProfile = (newProfile: CalibProfile) => {
    const nextProfiles = [...calibStore.profiles, newProfile];
    saveCalibProfiles(nextProfiles, newProfile.id);
    setCalibStore({
      profiles: nextProfiles,
      activeProfileId: newProfile.id,
      activeCalib: newProfile.calib,
    });
  };

  const handleDeleteProfile = (idToDelete: string) => {
    const res = deleteCalibProfile(calibStore.profiles, idToDelete, calibStore.activeProfileId);
    setCalibStore(res);
  };

  const handleSetCalib = (newCalib: Calib) => {
    const updatedProfile: CalibProfile = {
      ...activeProfile,
      calib: newCalib,
      updatedAt: Date.now(),
    };
    handleUpdateProfile(updatedProfile);
  };

  useEffect(() => {
    if (view === "login" && auth.user && !auth.recovering) {
      setView(protectedViewAfterLogin ?? "home");
      setProtectedViewAfterLogin(null);
    }
  }, [auth.recovering, auth.user, protectedViewAfterLogin, view]);

  useLayoutEffect(() => {
    if (auth.loading) return;
    const isRealUser = auth.user && auth.user.provider !== "demo";
    const isPublicProfile = view === "perfil" && Boolean(viewedProfileHandle);
    if (!auth.user && (view === "historico" || view === "lixeira" || (view === "perfil" && !isPublicProfile) || view === "salvos" || view === "projetos")) {
      setProtectedViewAfterLogin(view);
      setView("login");
    } else if (!isRealUser && (view === "projetos" || view === "salvos")) {
      setView("home");
    }
  }, [auth.loading, auth.user, view, viewedProfileHandle]);

  useEffect(() => {
    if (auth.loading || !supabase) return;
    const url = new URL(window.location.href);
    const inviteId = url.searchParams.get("invite");
    const role = url.searchParams.get("role") || "editor";
    
    if (inviteId) {
      if (!auth.user) {
        setProtectedViewAfterLogin("projetos");
        setView("login");
      } else {
        supabase.rpc("apply_for_project", { p_project_id: inviteId, p_role: role }).then(({error}: {error: any}) => {
          if (!error) {
            alert("Acesso solicitado com sucesso! Aguarde o dono do projeto aceitar sua solicitação.");
            url.searchParams.delete("invite");
            url.searchParams.delete("role");
            window.history.replaceState({}, document.title, url.toString());
            setView("projetos");
          } else {
            alert("Erro ao solicitar acesso: O projeto não existe ou você já solicitou/possui acesso.");
          }
        });
      }
    }
  }, [auth.loading, auth.user]);

  const go = (id: string, extra?: string) => {
    let nextHandle = viewedProfileHandle;
    if (id === "perfil") {
      nextHandle = extra ? extra.replace(/^@/, "") : null;
      setViewedProfileHandle(nextHandle);
    } else {
      nextHandle = null;
      setViewedProfileHandle(null);
    }

    const isPublicProfile = id === "perfil" && Boolean(nextHandle);

    if (!auth.user && (id === "historico" || id === "lixeira" || (id === "perfil" && !isPublicProfile) || id === "projetos" || id === "salvos")) {
      setProtectedViewAfterLogin(id);
      setView("login");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (id !== "login" && id !== "historico" && id !== "lixeira" && id !== "perfil" && id !== "projetos" && id !== "salvos") {
      setProtectedViewAfterLogin(null);
    }
    setView(id);
    window.scrollTo({ top: 0, behavior: "smooth" });

    try {
      localStorage.setItem("studioos_last_view", id);
      const url = new URL(window.location.href);
      if (id === "home") {
        url.searchParams.delete("view");
        url.searchParams.delete("project");
        url.searchParams.delete("u");
      } else {
        url.searchParams.set("view", id);
        if (id !== "projetos") {
          url.searchParams.delete("project");
        }
        if (id === "perfil" && nextHandle) {
          url.searchParams.set("u", nextHandle);
        } else {
          url.searchParams.delete("u");
        }
      }
      const newUrl = (id === "perfil" && nextHandle)
        ? `/perfil/${nextHandle}`
        : (url.pathname.startsWith("/perfil/") ? "/" + (url.search ? url.search : "") : (url.pathname + (url.search ? url.search : "") + url.hash));
      window.history.pushState({ view: id, u: nextHandle }, "", newUrl);
    } catch {}
  };

  // Synchronize URL and storage if view changes outside `go` (e.g. login redirect or initial mount)
  useEffect(() => {
    try {
      localStorage.setItem("studioos_last_view", view);
      const url = new URL(window.location.href);
      const currentParam = url.searchParams.get("view");
      const expectedParam = view === "home" ? null : view;

      if (currentParam !== expectedParam && !url.pathname.startsWith("/perfil/")) {
        if (expectedParam) {
          url.searchParams.set("view", expectedParam);
        } else {
          url.searchParams.delete("view");
        }
        if (view !== "projetos") {
          url.searchParams.delete("project");
        }
        const newUrl = url.pathname + (url.search ? url.search : "") + url.hash;
        window.history.replaceState({ view }, "", newUrl);
      }
    } catch {}
  }, [view]);

  // Handle browser back and forward buttons
  useEffect(() => {
    const handlePopState = () => {
      try {
        const handle = getInitialProfileHandle();
        if (window.location.pathname.startsWith("/perfil/") || handle) {
          setView("perfil");
          setViewedProfileHandle(handle);
          return;
        }
        const params = new URLSearchParams(window.location.search);
        const v = params.get("view") || "home";
        if (VALID_VIEWS.has(v)) {
          setView(v);
        } else {
          setView("home");
        }
        setViewedProfileHandle(params.get("u") || null);
      } catch {}
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const back = () => go("home");
  const tool = TOOL_BY_ID[view];

  useEffect(() => {
    const titles: Record<string, string> = {
      home: "StudioOS — Sistema Operacional do Criador",
      config: "Provedor de IA — StudioOS",
      historico: "Histórico & Lixeira — StudioOS",
      lixeira: "Lixeira — StudioOS",
      perfil: "Meu Perfil — StudioOS",
      projetos: "Meus Projetos — StudioOS",
      salvos: "Itens Salvos — StudioOS",
    };
    document.title = titles[view] ?? `${tool?.name ?? "StudioOS"} — StudioOS`;
  }, [view, tool]);

  if (auth.loading) {
    return (
      <div className="studio-bg flex min-h-screen items-center justify-center" aria-busy="true">
        <p className="font-mono text-xs tracking-[0.16em] text-bone-300 uppercase">Abrindo o StudioOS…</p>
      </div>
    );
  }

  return (
    <div className="studio-bg min-h-screen">
      <ScrollProgress />
      <div className="flex">
        <Sidebar
          active={view}
          viewedProfileHandle={viewedProfileHandle}
          onNavigate={go}
          open={menu}
          onClose={() => setMenu(false)}
          provider={os.config.apiKey ? "IA conectada" : "IA sem chave"}
          hasKey={Boolean(os.config.apiKey)}
          progress={progress}
          historyCount={os.history.length}
          trashCount={os.trash.length}
          authenticated={Boolean(auth.user)}
          profileName={activeProfile.name}
          profileColor={activeProfile.color}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          {view !== "login" && (
            <StatusBar
              onGo={go}
              calibrated={progress >= 100}
              demo={!auth.user}
              userName={auth.user?.name}
              onSignOut={auth.signOut}
              profileName={activeProfile.name}
              profileColor={activeProfile.color}
            />
          )}
          {/* mobile topbar */}
          <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-ink-800 bg-ink-950/90 px-4 py-2.5 backdrop-blur-md lg:hidden">
            <button
              onClick={() => setMenu(true)}
              className="flex h-8 w-8 items-center justify-center rounded border border-ink-700 text-bone-300 transition-colors hover:border-signal-400/50 hover:text-signal-400"
              aria-label="Abrir menu"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M3 6h18M3 12h18M3 18h13" />
              </svg>
            </button>
            <span className="font-display text-[15px] font-extrabold tracking-[-0.02em] text-bone-50">
              {view === "home"
                ? "StudioOS"
                : view === "login"
                  ? "Login"
                : tool?.name ??
                  (view === "historico" || view === "lixeira" ? "Histórico & Lixeira" : "Configuração")}
            </span>
            <button
              onClick={() => go("rank")}
              className="ml-auto rounded border border-signal-400/40 bg-signal-400/10 px-2.5 py-1 font-mono text-[9.5px] tracking-[0.14em] text-signal-400 uppercase"
            >
              ranquear
            </button>
          </div>

          <main className="min-w-0 flex-1">
            {view === "login" ? (
              <div key="login">
                <AuthScreen accessRequired={Boolean(protectedViewAfterLogin)} />
              </div>
            ) : view === "home" ? (
              <>
                <Console
                  onGo={go}
                  demo={!auth.user}
                  stats={{
                    ideias: auth.user ? os.history.filter((h) => h.tool === "rank" || h.tool === "ideia").length : 1284,
                    roteiros: auth.user ? os.history.filter((h) => h.tool === "roteiro").length : 642,
                    posts: auth.user ? os.history.filter((h) => h.tool === "score").length : 3891,
                    humanizados: auth.user ? os.history.filter((h) => h.tool === "humanizador").length : 2176,
                  }}
                />
                <Home onGo={go} progress={progress} niche={activeCalib.niche} />
              </>
            ) : (
              <div
                key={`${auth.user?.id ?? "guest"}:${view}`}
                className={cn(
                  "mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8 lg:py-12",
                  "relative"
                )}
              >
                {view === "rank" && (
                  <RankIdeia
                    onBack={back}
                    onGo={go}
                    niche={activeCalib.niche}
                    calib={activeCalib}
                    profileName={activeProfile.name}
                    profileColor={activeProfile.color}
                  />
                )}
                {view === "titulos" && (
                  <Titulos
                    onBack={back}
                    onGo={go}
                    calib={activeCalib}
                    profileName={activeProfile.name}
                    profileColor={activeProfile.color}
                  />
                )}
                {view === "hooks" && (
                  <Hooks
                    onBack={back}
                    onGo={go}
                    calib={activeCalib}
                    profileName={activeProfile.name}
                    profileColor={activeProfile.color}
                  />
                )}
                {view === "roteiro" && (
                  <Roteiro
                    onBack={back}
                    onGo={go}
                    calib={activeCalib}
                    profileName={activeProfile.name}
                    profileColor={activeProfile.color}
                  />
                )}
                {view === "thumbnail" && (
                  <Thumbnail
                    onBack={back}
                    onGo={go}
                    calib={activeCalib}
                    profileName={activeProfile.name}
                    profileColor={activeProfile.color}
                  />
                )}
                {view === "receita" && (
                  <ReceitaViral
                    onBack={back}
                    onGo={go}
                    calib={activeCalib}
                    profileName={activeProfile.name}
                    profileColor={activeProfile.color}
                  />
                )}
                {view === "humanizador" && (
                  <Humanizador
                    onBack={back}
                    onGo={go}
                    calib={activeCalib}
                    profileName={activeProfile.name}
                    profileColor={activeProfile.color}
                  />
                )}
                {view === "score" && (
                  <ScorePost
                    onBack={back}
                    onGo={go}
                    calib={activeCalib}
                    profileName={activeProfile.name}
                    profileColor={activeProfile.color}
                  />
                )}
                {view === "mentor" && (
                  <Mentor
                    onBack={back}
                    onGo={go}
                    niche={activeCalib.niche}
                    calib={activeCalib}
                    profileName={activeProfile.name}
                    profileColor={activeProfile.color}
                  />
                )}
                {view === "membros" && (
                  <Membros
                    onBack={back}
                    onGo={go}
                    calib={activeCalib}
                    profileName={activeProfile.name}
                    profileColor={activeProfile.color}
                  />
                )}
                {view === "perfil" && (
                  <PerfilScreen
                    onGo={go}
                    viewedHandle={viewedProfileHandle}
                    onClearViewedHandle={() => {
                      setViewedProfileHandle(null);
                      go("perfil");
                    }}
                  />
                )}
                {view === "projetos" && <ProjetosScreen onGo={go} />}
                {view === "salvos" && <SalvosScreen onGo={go} />}
                {view === "wiki" && <Wiki onBack={back} onGo={go} />}
                {view === "historico" && <HistoricoX onBack={back} onGo={go} />}
                {view === "lixeira" && <HistoricoX onBack={back} onGo={go} initialTab="lixeira" />}
                {view === "calibracao" && (
                  <Calibracao
                    onBack={back}
                    calib={activeCalib}
                    setCalib={handleSetCalib}
                    profiles={calibStore.profiles}
                    activeProfileId={calibStore.activeProfileId}
                    onSelectActiveProfile={handleSelectActiveProfile}
                    onUpdateProfile={handleUpdateProfile}
                    onCreateProfile={handleCreateProfile}
                    onDeleteProfile={handleDeleteProfile}
                  />
                )}
            {view === "config" && (
              <Config
                onBack={back}
                initialConfig={os.config}
                onKeyChange={os.setApiKey}
                onSettingsChange={os.setAISettings}
                onGo={go}
              />
            )}
                <div className="mt-10">
                  <ToolNav view={view} onGo={go} />
                </div>
              </div>
            )}

            <Footer onGo={go} />
          </main>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------- prev/next nav */

function ToolNav({ view, onGo }: { view: string; onGo: (id: string) => void }) {
  const idx = TOOLS.findIndex((t) => t.id === view);
  if (idx === -1) {
    return (
      <div className="flex justify-center border-t border-ink-800 pt-6">
        <button
          onClick={() => onGo("home")}
          className="group inline-flex items-center gap-2 font-mono text-[10.5px] tracking-[0.18em] text-ink-400 uppercase transition-colors hover:text-signal-400"
        >
          <Icon name="arrow" className="h-3.5 w-3.5 rotate-180 transition-transform group-hover:-translate-x-1" strokeWidth={2} />
          voltar à visão geral
        </button>
      </div>
    );
  }
  const prev = TOOLS[(idx - 1 + TOOLS.length) % TOOLS.length];
  const next = TOOLS[(idx + 1) % TOOLS.length];
  return (
    <div className="grid gap-3 border-t border-ink-800 pt-6 sm:grid-cols-2">
      <button
        onClick={() => onGo(prev.id)}
        className="group flex items-center gap-3 rounded-lg border border-ink-800 bg-ink-900/50 p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-ink-600"
      >
        <Icon name="arrow" className="h-4 w-4 rotate-180 text-ink-500 transition-all group-hover:-translate-x-1 group-hover:text-signal-400" strokeWidth={2} />
        <span className="min-w-0">
          <span className="block font-mono text-[9px] tracking-[0.16em] text-ink-500 uppercase">anterior</span>
          <span className="block truncate font-display text-[14px] font-bold text-bone-200">{prev.name}</span>
        </span>
      </button>
      <button
        onClick={() => onGo(next.id)}
        className="group flex items-center justify-end gap-3 rounded-lg border border-ink-800 bg-ink-900/50 p-4 text-right transition-all duration-300 hover:-translate-y-0.5 hover:border-ink-600"
      >
        <span className="min-w-0">
          <span className="block font-mono text-[9px] tracking-[0.16em] text-ink-500 uppercase">próxima</span>
          <span className="block truncate font-display text-[14px] font-bold text-bone-200">{next.name}</span>
        </span>
        <Icon name="arrow" className="h-4 w-4 text-ink-500 transition-all group-hover:translate-x-1 group-hover:text-signal-400" strokeWidth={2} />
      </button>
    </div>
  );
}
