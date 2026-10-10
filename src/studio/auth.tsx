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
  bio?: string;
  links?: Record<string, string>;
  card_visibility?: {
    stats?: boolean;
    projects?: boolean;
    video?: boolean;
    achievements?: boolean;
  };
  provider: "email" | "google" | "discord" | "demo";
  createdAt: string;
  email_confirmed_at?: string;
  is_temporary?: boolean;
  expires_at?: string;
  is_vip?: boolean;
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
  signUp: (input: { email?: string; password: string; name: string; channel?: string }) => Promise<Result>;
  signInWithOAuth: (provider: OAuthProvider) => Promise<Result>;
  signInWithTestAccount: () => Promise<Result>;
  sendMagicLink: (email: string) => Promise<Result>;
  resetPassword: (email: string) => Promise<Result>;
  updatePassword: (password: string) => Promise<Result>;
  updateProfile: (
    name: string,
    channel: string,
    extra?: {
      bio?: string;
      links?: Record<string, string>;
      card_visibility?: {
        stats?: boolean;
        projects?: boolean;
        video?: boolean;
        achievements?: boolean;
      };
      featured_video?: any;
    }
  ) => Promise<Result>;
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
  email_confirmed_at?: string;
  app_metadata?: { provider?: string; is_vip?: boolean; [key: string]: unknown };
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
    bio: (meta.bio as string) || undefined,
    links: (meta.links as Record<string, string>) || undefined,
    card_visibility: (meta.card_visibility as any) || undefined,
    provider,
    createdAt: u.created_at,
    email_confirmed_at: u.email_confirmed_at,
    is_temporary: Boolean(meta.is_temporary),
    expires_at: (meta.expires_at as string) || undefined,
    is_vip: Boolean(meta.is_vip || u.app_metadata?.is_vip),
  };
}

/* -------------------------------------------------------- demo store */

type DemoRecord = { email: string; password: string; name: string; channel?: string; createdAt: string; is_temporary?: boolean; expires_at?: string; is_vip?: boolean };

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
    is_temporary: r.is_temporary,
    expires_at: r.expires_at,
    is_vip: Boolean(r.is_vip),
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
        if (raw) {
          const parsed = JSON.parse(raw) as StudioUser;
          if (parsed.is_temporary && parsed.expires_at && new Date(parsed.expires_at).getTime() < Date.now()) {
            localStorage.removeItem(DEMO_KEY);
            setUser(null);
          } else {
            setUser(parsed);
          }
        }
      } catch {
        /* ignore */
      }
      setLoading(false);
      return;
    }

    const client = supabase;

    const syncUserWithProfile = async (baseUser: StudioUser | null): Promise<StudioUser | null> => {
      if (!baseUser) return null;
      try {
        const { data: prof } = await client
          .from("profiles")
          .select("is_vip, avatar_url, channel, full_name")
          .eq("id", baseUser.id)
          .maybeSingle();
        if (prof) {
          return {
            ...baseUser,
            is_vip: typeof prof.is_vip === "boolean" ? prof.is_vip : baseUser.is_vip,
            avatarUrl: prof.avatar_url || baseUser.avatarUrl,
            channel: prof.channel || baseUser.channel,
            name: prof.full_name || baseUser.name,
          };
        }
      } catch {
        // ignore
      }
      return baseUser;
    };

    client.auth.getSession().then(async ({ data }) => {
      let u = data.session?.user ? mapUser(data.session.user as SbUser) : null;
      if (u) {
        u = await syncUserWithProfile(u);
      }
      if (u?.is_temporary && u.expires_at && new Date(u.expires_at).getTime() < Date.now()) {
        client.auth.signOut();
        setUser(null);
      } else {
        setUser(u);
      }
      setLoading(false);
    });

    const { data } = client.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
      let u = session?.user ? mapUser(session.user as SbUser) : null;
      if (u) {
        u = await syncUserWithProfile(u);
      }
      if (u?.is_temporary && u.expires_at && new Date(u.expires_at).getTime() < Date.now()) {
        client.auth.signOut();
        setUser(null);
      } else {
        setUser(u);
      }
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
      const cleanChannel = channel ? channel.replace(/^@/, "").trim().toLowerCase() : "";
      const isUsernameOnly = !email || !email.trim();
      const targetEmail = isUsernameOnly
        ? `${cleanChannel}@user.asterdev.me`
        : email.trim();

      if (!cleanChannel && isUsernameOnly) {
        return { ok: false, error: "Informe seu e-mail ou seu nome de usuário." };
      }

      if (!supabase) {
        await wait(800);
        const users = demoUsers();
        if (users.some((u) => u.email.toLowerCase() === targetEmail.toLowerCase() || (cleanChannel && (u.channel || "").replace(/^@/, "").toLowerCase() === cleanChannel)))
          return { ok: false, error: "Já existe uma conta com esse e-mail ou nome de usuário. Tente entrar." };
        const rec: DemoRecord = { 
          email: targetEmail, 
          password, 
          name, 
          channel: cleanChannel ? `@${cleanChannel}` : undefined, 
          createdAt: new Date().toISOString() 
        };
        localStorage.setItem(DEMO_USERS, JSON.stringify([...users, rec]));
        const u = demoUserFrom(rec);
        localStorage.setItem(DEMO_KEY, JSON.stringify(u));
        setUser(u);
        return { ok: true };
      }
      const { data, error } = await supabase.auth.signUp({
        email: targetEmail,
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: { 
            full_name: name, 
            channel: cleanChannel ? `@${cleanChannel}` : null,
            registered_with_username: isUsernameOnly
          },
        },
      });
      if (error) return { ok: false, error: translate(error.message) };
      // Supabase devolve um usuário sem identities quando o e-mail já existe (proteção anti-enumeração)
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0)
        return { ok: false, error: "Já existe uma conta com esse e-mail ou usuário. Tente entrar." };

      if (isUsernameOnly && !data.session) {
        const loginRes = await supabase.auth.signInWithPassword({
          email: targetEmail,
          password
        });
        if (loginRes.error) return { ok: false, error: translate(loginRes.error.message) };
        return { ok: true };
      }

      if (!data.session)
        return {
          ok: true,
          needsConfirmation: true,
          message: `Enviamos um link de confirmação para ${targetEmail}.`,
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

  const signInWithTestAccount = useCallback<AuthCtx["signInWithTestAccount"]>(async () => {
    const randSuffix = Math.random().toString(36).substring(2, 6) + Date.now().toString(36).slice(-4);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const tempEmail = `teste_${randSuffix}@temp.asterdev.me`;
    const tempName = `Conta Teste #${randSuffix.slice(0, 5)}`;
    const tempChannel = `@teste_${randSuffix}`;

    if (!supabase) {
      await wait(500);
      const u: StudioUser = {
        id: `demo-temp-${randSuffix}`,
        email: tempEmail,
        name: tempName,
        channel: tempChannel,
        provider: "demo",
        createdAt: new Date().toISOString(),
        is_temporary: true,
        expires_at: expiresAt,
      };
      localStorage.setItem(DEMO_KEY, JSON.stringify(u));
      setUser(u);
      return { ok: true };
    }

    const tempPassword = `Test#${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36)}!`;

    const { data, error } = await supabase.auth.signUp({
      email: tempEmail,
      password: tempPassword,
      options: {
        data: {
          full_name: tempName,
          channel: tempChannel,
          is_temporary: true,
          expires_at: expiresAt,
        },
      },
    });

    if (error) return { ok: false, error: translate(error.message) };

    if (!data.session) {
      const loginRes = await supabase.auth.signInWithPassword({
        email: tempEmail,
        password: tempPassword,
      });
      if (loginRes.error) return { ok: false, error: translate(loginRes.error.message) };
    }

    return { ok: true };
  }, []);

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

  const updateProfile = useCallback<AuthCtx["updateProfile"]>(async (name, channel, extra) => {
    const cleanChannel = channel ? channel.replace(/^@/, "").trim() : "";
    if (!supabase) {
      await wait(600);
      const raw = localStorage.getItem(DEMO_KEY);
      if (raw) {
        const u = JSON.parse(raw) as StudioUser;
        u.name = name;
        u.channel = cleanChannel || undefined;
        if (extra?.bio !== undefined) u.bio = extra.bio;
        if (extra?.links !== undefined) u.links = extra.links;
        if (extra?.card_visibility !== undefined) u.card_visibility = extra.card_visibility;
        localStorage.setItem(DEMO_KEY, JSON.stringify(u));
        setUser(u);
      }
      return { ok: true, message: "Perfil atualizado com sucesso." };
    }

    if (!user) return { ok: false, error: "Não autenticado." };

    const currentChannel = (user.channel || "").replace(/^@/, "").toLowerCase().trim();
    const newChannel = cleanChannel.toLowerCase().trim();
    if (currentChannel && newChannel !== currentChannel && !user.email_confirmed_at) {
      return {
        ok: false,
        error: "Você só pode alterar seu nome de usuário após confirmar o seu e-mail.",
      };
    }

    const upsertData: Record<string, any> = {
      id: user.id,
      full_name: name,
      channel: cleanChannel || null,
      avatar_url: user.avatarUrl || null,
      updated_at: new Date().toISOString(),
    };
    if (extra?.bio !== undefined) upsertData.bio = extra.bio;
    if (extra?.links !== undefined) upsertData.links = extra.links;
    if (extra?.card_visibility !== undefined) upsertData.card_visibility = extra.card_visibility;
    if (extra?.featured_video !== undefined) upsertData.featured_video = extra.featured_video;

    // Atualiza primeiro no DB para checar restrição de unicidade do @
    const { error: dbError } = await supabase
      .from("profiles")
      .upsert(upsertData);

    if (dbError) {
      // 23505 é o código do Postgres para violação de UNIQUE constraint
      if (dbError.code === "23505" || dbError.message.includes("unique")) {
        return { ok: false, error: "Este @ de usuário já está em uso por outro criador. Escolha outro." };
      }
      return { ok: false, error: translate(dbError.message) };
    }

    const authMeta: Record<string, any> = {
      full_name: name,
      channel: cleanChannel || null,
    };
    if (extra?.bio !== undefined) authMeta.bio = extra.bio;
    if (extra?.links !== undefined) authMeta.links = extra.links;
    if (extra?.card_visibility !== undefined) authMeta.card_visibility = extra.card_visibility;

    const { data, error } = await supabase.auth.updateUser({
      data: authMeta,
    });
    
    if (error) return { ok: false, error: translate(error.message) };
    if (data.user) {
      setUser(mapUser(data.user as SbUser));
    }
    return { ok: true, message: "Perfil atualizado com sucesso." };
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
    if (!user) return { ok: false, error: "Não autenticado." };

    const isGif = file.type === "image/gif" || file.name.toLowerCase().endsWith(".gif");
    if (isGif && !user.is_vip) {
      return {
        ok: false,
        error: "Apenas membros VIP podem usar GIFs na foto de perfil. Torne-se VIP para desbloquear avatares animados!",
      };
    }

    if (!supabase) {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      setUser((prev) => (prev ? { ...prev, avatarUrl: dataUrl } : null));
      return { ok: true, message: "Foto atualizada!" };
    }
    
    const fileExt = file.name.split('.').pop() || (isGif ? "gif" : "jpg");
    const fileName = `${user.id}-${Math.random()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, file, { 
        upsert: true,
        contentType: isGif ? "image/gif" : undefined
      });
      
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
      signInWithTestAccount,
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
    [user, loading, demo, recovering, signIn, signUp, signInWithOAuth, signInWithTestAccount, sendMagicLink, resetPassword, updatePassword, updateProfile, updateEmail, updateAvatar, signOut, deleteAccount, linkIdentity, unlinkIdentity, getIdentities]
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
