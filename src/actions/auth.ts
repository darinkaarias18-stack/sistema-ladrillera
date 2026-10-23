"use server";

import { createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { UserRole } from "@/types/database.types";
import { getAllModuleHrefs } from "@/lib/modules-config";

export interface UserSessionData {
  user: {
    id: string;
    email: string;
    fullName: string;
    position: string;
  } | null;
  role: UserRole;
  allowedModules: string[];
}

export async function getCurrentUserSession(): Promise<UserSessionData> {
  try {
    const supabaseServer = await createServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabaseServer.auth.getUser();

    if (!user || userError) {
      return {
        user: null,
        role: "cajero",
        allowedModules: [],
      };
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Read profile with admin client to bypass any RLS restriction
    const { data: profile } = await adminClient
      .from("profiles")
      .select("role, full_name, email, position")
      .eq("id", user.id)
      .single();

    // Check role from metadata, database profile, or fallback
    const rawRole = (
      user.user_metadata?.role ||
      profile?.role ||
      "superadmin"
    ).toLowerCase() as UserRole;

    const role: UserRole = rawRole;
    const isSuper = role === "superadmin";

    // SuperAdmin y Admin always have ALL operational modules without restriction
    const allowedModules: string[] = (isSuper || role === "admin")
      ? getAllModuleHrefs()
      : Array.isArray(user.user_metadata?.allowed_modules) && user.user_metadata.allowed_modules.length > 0
      ? user.user_metadata.allowed_modules
      : [];

    const fullName: string =
      user.user_metadata?.full_name ||
      profile?.full_name ||
      user.email ||
      "Usuario";

    const position: string =
      user.user_metadata?.position || profile?.position || "";

    return {
      user: {
        id: user.id,
        email: user.email || "",
        fullName,
        position,
      },
      role,
      allowedModules,
    };
  } catch (error) {
    console.error("Error in getCurrentUserSession:", error);
    return {
      user: null,
      role: "cajero",
      allowedModules: [],
    };
  }
}
