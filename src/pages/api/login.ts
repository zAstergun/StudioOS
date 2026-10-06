import type { APIRoute } from "astro";
import { createSupabaseClient } from "../../studio/lib/supabase";
import { env as cfEnv } from "cloudflare:workers";

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  const formData = await request.formData();
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();

  if (!email || !password) {
    return new Response("Email e senha obrigatórios", { status: 400 });
  }

  const env = cfEnv || import.meta.env;

  const supabaseUrl = env.PUBLIC_SUPABASE_URL || import.meta.env.PUBLIC_SUPABASE_URL;
  const supabaseKey = env.PUBLIC_SUPABASE_ANON_KEY || import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return new Response("Erro interno de configuração.", { status: 500 });
  }

  const supabase = createSupabaseClient(cookies, supabaseUrl, supabaseKey);

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return new Response(error.message, { status: 401 });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
};
