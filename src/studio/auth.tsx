import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createBrowserClient } from "@supabase/ssr";

const url = import.meta.env.PUBLIC_SUPABASE_URL?.trim();
const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = isSupabaseConfigured
  ? createBrowserClient(url!, anonKey!, {
      cookieOptions: {
        domain: import.meta.env.DEV ? undefined : '.asterdev.me',
        path: '/',
        sameSite: 'lax',
      }
    })
  : null;

export type StudioUser = {
  id: string;
  email: string;
  name: string;
  channel?: string;
  avatarUrl?: string;
  provider: "email" | "google" | "discord" | "demo";
  createdAt: string;
};

export type OAuthProvider = "google" | "discord";

export const OAUTH_LABEL: Record<OAuthProvider, string> = {
  google: "Google",
  discord: "Discord",
};

type Result = { ok: true; message?: string; needsConfirmation?: boolean } | { ok: false; error: string };

type AuthCtx = {
  user: StudioUser | null;
  loading: boolean;
  demo: boolean;
  recovering: boolean;
  signIn: (email: string, password: string) => Promise<Result>;
  signUp: (input: { email: string; password: string; name: string; channel?: string }) => Promise<Result>;
  signInWithOAuth: (provider: OAuthProvider) => Promise<Result>;
  sendMagicLink: (email: string) => Promise<Result>;
  resetPassword: (email: string) => Promise<Result>;
  updatePassword: (password: string) => Promise<Result>;
  updateProfile: (name: string, channel: string) => Promise<Result>;
  updateEmail: (email: string) => Promise<Result>;
  updateAvatar: (file: File) => Promise<Result>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<Result>;
  linkIdentity: (provider: OAuthProvider) => Promise<Result>;
  unlinkIdentity: (identity_id: string) => Promise<Result>;
  getIdentities: () => Promise<{ ok: true; data: any[] } | { ok: false; error: string }>;
};

const Ctx = createContext<AuthCtx | null>(null);

const DEMO_KEY = "studioos.demo.session";
const DEMO_USERS = "studioos.demo.users";

/* -------------------------------------------------------- error copy */

function translate(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar. Verifique a caixa de entrada.";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "Já existe uma conta com esse e-mail. Tente entrar.";
  if (m.includes("password should be at least")) return "A senha precisa ter pelo menos 6 caracteres.";
  if (m.includes("rate limit") || m.includes("too many")) return "Muitas tentativas. Aguarde um minuto e tente de novo.";
  if (m.includes("unable to validate email") || m.includes("invalid email")) return "E-mail inválido.";
  if (m.includes("network") || m.includes("fetch")) return "Falha de conexão. Verifique sua internet.";
  if (m.includes("provider is not enabled"))
    return "Esse provedor de login não está habilitado no Supabase (Authentication → Providers).";
  if (m.includes("oauth")) return "Não foi possível iniciar o login externo. Tente de novo.";
  return msg;
}

/* -------------------------------------------------------- mapping */

type SbUser = {
  id: string;
  email?: string;
  created_at: string;
  app_metadata?: { provider?: string };
  user_metadata?: Record<string, unknown>;
};

function mapUser(u: SbUser): StudioUser {
  const meta = u.user_metadata ?? {};
  const email = u.email ?? "";
  const raw = u.app_metadata?.provider;
  const provider: StudioUser["provider"] =
    raw === "google" ? "google" : raw === "discord" ? "discord" : "email";
  return {
    id: u.id,
    email,
    name:
      (meta.full_name as string) ||
      (meta.name as string) ||
      // Discord manda o handle em user_name / preferred_username
      (meta.custom_claims as { global_name?: string } | undefined)?.global_name ||
      (meta.user_name as string) ||
      (meta.preferred_username as string) ||
      email.split("@")[0] ||
      "Criador",
    channel:
      (meta.channel as string) ||
      (provider === "discord" ? ((meta.user_name as string) ? `@${meta.user_name as string}` : undefined) : undefined),
    avatarUrl: (meta.avatar_url as string) || (meta.picture as string) || undefined,
    provider,
    createdAt: u.created_at,
  };
}

/* -------------------------------------------------------- demo store */

type DemoRecord = { email: string; password: string; name: string; channel?: string; createdAt: string };

function demoUsers(): DemoRecord[] {
  try {
    return JSON.parse(localStorage.getItem(DEMO_USERS) ?? "[]") as DemoRecord[];
  } catch {
    return [];
  }
}

function demoUserFrom(r: DemoRecord, provider: StudioUser["provider"] = "demo"): StudioUser {
  return {
    id: `demo-${btoa(r.email).replace(/=/g, "")}`,
    email: r.email,
    name: r.name,
    channel: r.channel,
    provider,
    createdAt: r.createdAt,
  };
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* -------------------------------------------------------- provider */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StudioUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovering, setRecovering] = useState(false);
  const demo = !isSupabaseConfigured;

  useEffect(() => {
    if (!supabase) {
      try {
        const raw = localStorage.getItem(DEMO_KEY);
        if (raw) setUser(JSON.parse(raw) as StudioUser);
      } catch {
        /* ignore */
      }
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ? mapUser(data.session.user as SbUser) : null);
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
      setUser(session?.user ? mapUser(session.user as SbUser) : null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const redirectTo = typeof window !== "undefined" ? window.location.origin + window.location.pathname : undefined;

  const signIn = useCallback<AuthCtx["signIn"]>(async (identifier, password) => {
    if (!supabase) {
      await wait(650);
      const isEmail = identifier.includes("@") && !identifier.startsWith("@");
      const rec = demoUsers().find((u) => 
        isEmail ? u.email.toLowerCase() === identifier.toLowerCase() : (u.channel || "").toLowerCase() === identifier.replace(/^@/, "").toLowerCase()
      );
      if (!rec || rec.password !== password) return { ok: false, error: "Usuário, e-mail ou senha incorretos." };
      const u = demoUserFrom(rec);
      localStorage.setItem(DEMO_KEY, JSON.stringify(u));
      setUser(u);
      return { ok: true };
    }

    let email = identifier;
    
    // Se não for um e-mail válido (não tem @ no meio), assumimos que é um username
    if (!identifier.includes("@") || identifier.startsWith("@")) {
      const channelStr = identifier.replace(/^@/, "").trim();
      const { data, error } = await supabase.rpc("get_email_by_channel", { p_channel: channelStr });
      
      if (error || !data) {
        return { ok: false, error: "Usuário, e-mail ou senha incorretos." };
      }
      email = data;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: translate(error.message) };
    return { ok: true };
  }, []);

  const signUp = useCallback<AuthCtx["signUp"]>(
    async ({ email, password, name, channel }) => {
      if (!supabase) {
        await wait(800);
        const users = demoUsers();
        if (users.some((u) => u.email.toLowerCase() === email.toLowerCase()))
          return { ok: false, error: "Já existe uma conta com esse e-mail. Tente entrar." };
        const rec: DemoRecord = { email, password, name, channel, createdAt: new Date().toISOString() };
        localStorage.setItem(DEMO_USERS, JSON.stringify([...users, rec]));
        const u = demoUserFrom(rec);
        localStorage.setItem(DEMO_KEY, JSON.stringify(u));
        setUser(u);
        return { ok: true };
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: { full_name: name, channel: channel || null },
        },
      });
      if (error) return { ok: false, error: translate(error.message) };
      // Supabase devolve um usuário sem identities quando o e-mail já existe (proteção anti-enumeração)
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0)
        return { ok: false, error: "Já existe uma conta com esse e-mail. Tente entrar." };
      if (!data.session)
        return {
          ok: true,
          needsConfirmation: true,
          message: `Enviamos um link de confirmação para ${email}.`,
        };
      return { ok: true };
    },
    [redirectTo]
  );

  const signInWithOAuth = useCallback<AuthCtx["signInWithOAuth"]>(
    async (provider) => {
      if (!supabase) {
        await wait(500);
        const u: StudioUser =
          provider === "discord"
            ? {
                id: "demo-discord",
                email: "criador@discord.local",
                name: "Criador Demo",
                channel: "@criador",
                provider: "discord",
                createdAt: new Date().toISOString(),
              }
            : {
                id: "demo-google",
                email: "criador@gmail.com",
                name: "Criador Demo",
                provider: "google",
                createdAt: new Date().toISOString(),
              };
        localStorage.setItem(DEMO_KEY, JSON.stringify(u));
        setUser(u);
        return { ok: true };
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          // Discord: pedimos e-mail para conseguir identificar a conta
          scopes: provider === "discord" ? "identify email" : undefined,
        },
      });
      if (error) return { ok: false, error: translate(error.message) };
      return { ok: true };
    },
    [redirectTo]
  );

  const sendMagicLink = useCallback<AuthCtx["sendMagicLink"]>(
    async (email) => {
      if (!supabase) {
        await wait(600);
        return { ok: true, message: `Modo demo: o link mágico seria enviado para ${email}.` };
      }
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
      });
      if (error) return { ok: false, error: translate(error.message) };
      return { ok: true, message: `Link de acesso enviado para ${email}.` };
    },
    [redirectTo]
  );

  const resetPassword = useCallback<AuthCtx["resetPassword"]>(
    async (email) => {
      if (!supabase) {
        await wait(600);
        return { ok: true, message: `Modo demo: o e-mail de redefinição seria enviado para ${email}.` };
      }
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) return { ok: false, error: translate(error.message) };
      return { ok: true, message: `Se existir uma conta com ${email}, você vai receber o link de redefinição.` };
    },
    [redirectTo]
  );

  const updatePassword = useCallback<AuthCtx["updatePassword"]>(async (password) => {
    if (!supabase) return { ok: true };
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { ok: false, error: translate(error.message) };
    setRecovering(false);
    return { ok: true, message: "Senha atualizada." };
  }, []);

  const updateProfile = useCallback<AuthCtx["updateProfile"]>(async (name, channel) => {
    if (!supabase) {
      await wait(600);
      const raw = localStorage.getItem(DEMO_KEY);
      if (raw) {
        const u = JSON.parse(raw) as StudioUser;
        u.name = name;
        u.channel = channel;
        localStorage.setItem(DEMO_KEY, JSON.stringify(u));
        setUser(u);
      }
      return { ok: true, message: "Perfil atualizado." };
    }

    if (!user) return { ok: false, error: "Não autenticado." };

    // Atualiza primeiro no DB para checar restrição de unicidade do @
    const { error: dbError } = await supabase
      .from("profiles")
      .upsert({ id: user.id, full_name: name, channel: channel || null });

    if (dbError) {
      // 23505 é o código do Postgres para violação de UNIQUE constraint
      if (dbError.code === "23505" || dbError.message.includes("unique")) {
        return { ok: false, error: "Este @ já está em uso por outra pessoa. Escolha outro." };
      }
      return { ok: false, error: translate(dbError.message) };
    }

    const { data, error } = await supabase.auth.updateUser({
      data: { full_name: name, channel: channel || null },
    });
    
    if (error) return { ok: false, error: translate(error.message) };
    if (data.user) {
      setUser(mapUser(data.user as SbUser));
    }
    return { ok: true, message: "Perfil atualizado." };
  }, [user]);

  const updateEmail = useCallback<AuthCtx["updateEmail"]>(async (newEmail) => {
    if (!supabase) {
      await wait(600);
      const raw = localStorage.getItem(DEMO_KEY);
      if (raw) {
        const u = JSON.parse(raw) as StudioUser;
        u.email = newEmail;
        localStorage.setItem(DEMO_KEY, JSON.stringify(u));
        setUser(u);
      }
      return { ok: true, message: "E-mail atualizado." };
    }

    if (!user) return { ok: false, error: "Não autenticado." };

    const { error } = await supabase.auth.updateUser({ email: newEmail });
    
    if (error) return { ok: false, error: translate(error.message) };
    return { ok: true, message: "Enviamos um link de confirmação para o novo e-mail." };
  }, [user]);

  const signOut = useCallback(async () => {
    if (!supabase) {
      localStorage.removeItem(DEMO_KEY);
      setUser(null);
      return;
    }
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const deleteAccount = useCallback<AuthCtx["deleteAccount"]>(async () => {
    if (!supabase) {
      localStorage.removeItem(DEMO_KEY);
      setUser(null);
      return { ok: true, message: "Conta excluída (Modo Demo)." };
    }
    const { error } = await supabase.rpc("delete_user");
    if (error) return { ok: false, error: translate(error.message) };
    
    await signOut();
    return { ok: true, message: "Sua conta foi excluída permanentemente." };
  }, [signOut]);

  const updateAvatar = useCallback<AuthCtx["updateAvatar"]>(async (file) => {
    if (!supabase || !user) return { ok: false, error: "Não autenticado." };
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Math.random()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, file, { upsert: true });
      
    if (uploadError) return { ok: false, error: "Falha ao enviar a imagem." };
    
    const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
    
    const { error: updateError } = await supabase.auth.updateUser({
      data: { avatar_url: data.publicUrl }
    });
    
    // Sincroniza com a tabela pública de perfis
    await supabase.from("profiles").upsert({ id: user.id, avatar_url: data.publicUrl });
    
    if (updateError) return { ok: false, error: translate(updateError.message) };
    
    setUser(prev => prev ? { ...prev, avatarUrl: data.publicUrl } : null);
    return { ok: true, message: "Foto atualizada!" };
  }, [user]);

  const linkIdentity = useCallback<AuthCtx["linkIdentity"]>(async (provider) => {
    if (!supabase) return { ok: false, error: "Disponível apenas com Supabase configurado." };
    const { error } = await supabase.auth.linkIdentity({
      provider,
      options: { redirectTo }
    });
    if (error) return { ok: false, error: translate(error.message) };
    return { ok: true };
  }, [redirectTo]);

  const unlinkIdentity = useCallback<AuthCtx["unlinkIdentity"]>(async (identity_id) => {
    if (!supabase) return { ok: false, error: "Disponível apenas com Supabase configurado." };
    const { error } = await supabase.auth.unlinkIdentity({ identity_id } as any);
    if (error) return { ok: false, error: translate(error.message) };
    return { ok: true, message: "Conta desvinculada com sucesso." };
  }, []);

  const getIdentities = useCallback<AuthCtx["getIdentities"]>(async () => {
    if (!supabase) {
      // Mock preenchido para visualização no modo demo
      return {
        ok: true,
        data: [
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
        ] as any
      };
    }
    const { data, error } = await supabase.auth.getUserIdentities();
    if (error) return { ok: false, error: translate(error.message) };
    return { ok: true, data: data?.identities || [] };
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      loading,
      demo,
      recovering,
      signIn,
      signUp,
      signInWithOAuth,
      sendMagicLink,
      resetPassword,
      updatePassword,
      updateProfile,
      updateEmail,
      updateAvatar,
      signOut,
      deleteAccount,
      linkIdentity,
      unlinkIdentity,
      getIdentities,
    }),
    [user, loading, demo, recovering, signIn, signUp, signInWithOAuth, sendMagicLink, resetPassword, updatePassword, updateProfile, updateEmail, updateAvatar, signOut, deleteAccount, linkIdentity, unlinkIdentity, getIdentities]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}

/** Examples are shown to visitors; signed-in users start with blank input fields. */
export function useExampleMode() {
  const { user } = useAuth();
  return !user;
}
