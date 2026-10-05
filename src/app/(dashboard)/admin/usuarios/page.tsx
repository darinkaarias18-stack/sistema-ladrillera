import { createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"
import { redirect } from "next/navigation"
import { UsersClient } from "./UsersClient"

import { Header } from "@/components/layout/header"

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
  const normalizedRole = profile?.role?.toLowerCase()
    
  if (normalizedRole !== "admin" && normalizedRole !== "superadmin") {
    // If not admin, maybe redirect to a not-authorized page or dashboard
    // For now we just redirect to dashboard
    redirect("/")
  }

  // 2. Fetch profiles using admin client to bypass RLS restrictions on reading all profiles
  const { data: profiles, error } = await adminClient
    .from("profiles")
    .select("id, full_name, position, role, email, created_at")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching profiles:", error)
  }

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
      
      <UsersClient initialProfiles={profiles || []} currentUserRole={normalizedRole || ""} />
        </div>
      </div>
    </div>
  )
}
