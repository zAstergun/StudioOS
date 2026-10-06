import { createServerClient } from "@supabase/ssr";
import type { AstroCookies } from "astro";

export const createSupabaseClient = (cookies: AstroCookies) => {
  return createServerClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookies.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookies.set(name, value, {
                ...options,
                path: '/',
                secure: true,
                httpOnly: true,
                sameSite: 'lax',
                domain: import.meta.env.DEV ? undefined : '.asterdev.me',
              });
            });
          } catch (error) {
            // Ignorado intencionalmente em ambiente de servidor Astro
          }
        },
      },
    }
  );
};
