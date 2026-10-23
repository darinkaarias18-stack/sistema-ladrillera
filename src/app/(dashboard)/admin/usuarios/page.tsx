import { createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"
import { redirect } from "next/navigation"
import { UsersClient } from "./UsersClient"

import { Header } from "@/components/layout/header"

import { store } from "@/lib/store"

export default async function UsuariosPage() {
  const supabase = await createServerClient()
  
  // 1. Verify access
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login")
  }

  // Usar el admin client para saltarse el RLS por si la política de lectura está bloqueando
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  const adminClient = createClient(supabaseUrl, serviceKey)

  // Usually you check role in middleware or layout, but we do it here too
  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()
  const isMaster = user.email?.toLowerCase() === "darinka.arias18@gmail.com"
  const normalizedRole = isMaster
    ? "superadmin"
    : (user.user_metadata?.role || profile?.role || "").toLowerCase()
    
  if (normalizedRole !== "admin" && normalizedRole !== "superadmin") {
    // Si no es admin ni superadmin, redirigir inmediatamente al dashboard principal
    redirect("/")
  }

  // 2. Fetch profiles and auth users using admin client to retrieve custom roles from user_metadata
  const [{ data: profiles, error }, { data: authUsers }] = await Promise.all([
    adminClient
      .from("profiles")
      .select("id, full_name, position, role, email, created_at")
      .order("created_at", { ascending: false }),
    adminClient.auth.admin.listUsers()
  ]);

  if (error) {
    console.error("Error fetching profiles:", error)
  }

  const authUserMap = new Map((authUsers?.users || []).map(u => [u.id, u]));

  const mergedProfiles = (profiles || []).map(p => {
    const authUser = authUserMap.get(p.id);
    const metaRole = authUser?.user_metadata?.role;
    const metaAllowedModules = authUser?.user_metadata?.allowed_modules;
    return {
      ...p,
      role: (metaRole || p.role) as any,
      full_name: authUser?.user_metadata?.full_name || p.full_name,
      position: authUser?.user_metadata?.position || p.position,
      email: authUser?.email || p.email,
      allowed_modules: metaAllowedModules || [],
    };
  });

  const employees = store.getEmployees().filter(e => e.active);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
      <Header title="Gestión de Usuarios" />
      <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Gestión de Usuarios</h1>
          <p className="text-slate-500 mt-1">Administra los accesos y roles del personal en el sistema.</p>
        </div>
      </div>
      
      <UsersClient initialProfiles={mergedProfiles || []} currentUserRole={normalizedRole || ""} employees={employees} />
        </div>
      </div>
    </div>
  )
}
