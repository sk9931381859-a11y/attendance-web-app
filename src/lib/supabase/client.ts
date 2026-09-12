import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!rawUrl || !rawAnonKey) {
    throw new Error(
      "Missing Env Vars: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be defined."
    );
  }

  // Sanitize URL to avoid PGRST125 path errors: trim slashes and remove trailing /rest/v1 if inadvertently configured
  const supabaseUrl = rawUrl.replace(/\/+$/, "").replace(/\/rest\/v1\/?$/, "");
  const supabaseAnonKey = rawAnonKey;

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
