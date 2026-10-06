import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Configure no arquivo `.env` (ou nas variáveis de ambiente da hospedagem):
 *
 *   PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
 *   PUBLIC_SUPABASE_ANON_KEY=sua-chave-publica
 *
 * Enquanto as variáveis não existirem, o painel roda em "modo demo":
 * a sessão é simulada localmente para você conseguir navegar no app.
 */
const url = import.meta.env.PUBLIC_SUPABASE_URL?.trim();
const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY?.trim();

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "studioos.auth",
      },
    })
  : null;
