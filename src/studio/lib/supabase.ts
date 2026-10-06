import { createServerClient } from "@supabase/ssr";
import type { AstroCookies } from "astro";

export const createSupabaseClient = (
  cookies: AstroCookies,
  supabaseUrl: string,
  supabaseKey: string
) => {
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(key) {
        return cookies.get(key)?.value;
      },
      set(key, value, options) {
        try {
          cookies.set(key, value, {
            ...options,
            path: '/',
            secure: true,
            httpOnly: true,
            sameSite: 'lax',
            domain: import.meta.env.DEV ? undefined : '.asterdev.me',
          });
        } catch (error) {
          // Ignorado intencionalmente no ambiente de servidor Astro
        }
      },
      remove(key, options) {
        try {
          cookies.delete(key, {
            ...options,
            path: '/',
            domain: import.meta.env.DEV ? undefined : '.asterdev.me',
          });
        } catch (error) {
          // Ignorado intencionalmente no ambiente de servidor Astro
        }
      },
    },
  });
};
