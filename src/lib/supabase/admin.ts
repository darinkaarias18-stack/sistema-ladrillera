import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente administrativo de Supabase para uso EXCLUSIVO en backend (Server Actions / API Routes)
 * después de haber validado sesión y permisos mediante auth-guard.ts.
 */
export function getSupabaseAdminClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (
    !supabaseUrl ||
    !serviceKey ||
    supabaseUrl.includes("dummy-project") ||
    serviceKey.includes("dummy")
  ) {
    return null;
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
