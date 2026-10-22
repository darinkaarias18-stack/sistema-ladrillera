import { createServerClient } from "@/lib/supabase/server"
import { createClient } from "@supabase/supabase-js"
import { redirect } from "next/navigation"
import { Header } from "@/components/layout/header"
import { AuditoriaClient } from "./AuditoriaClient"
import { AuditLogger } from "@/lib/audit-logger"

export default async function AuditoriaPage() {
  const supabase = await createServerClient()
  
  // 1. Verificar autenticación
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login")
  }

  // 2. Usar adminClient para validar estrictamente que el rol sea superadmin
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  const adminClient = createClient(supabaseUrl, serviceKey)

  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  const normalizedRole = (user.user_metadata?.role || profile?.role || "").toLowerCase()
    
  // EXCLUSIVIDAD ABSOLUTA: Solo el SuperAdmin tiene acceso a los logs de auditoría
  if (normalizedRole !== "superadmin") {
    redirect("/")
  }

  // 3. Obtener logs iniciales
  const initialLogs = AuditLogger.getLogs()

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
      <Header title="Logs de Auditoría y Trazabilidad" />
      <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 border border-red-500/20 mb-2">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                Área Exclusiva SuperAdmin
              </div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                Logs de Auditoría y Trazabilidad
              </h1>
              <p className="text-slate-500 mt-1 text-sm">
                Monitoreo forense inmutable de todas las acciones, accesos y eventos de seguridad ejecutados en el ERP.
              </p>
            </div>
          </div>

          <AuditoriaClient initialLogs={initialLogs} currentUserRole={normalizedRole} />
        </div>
      </div>
    </div>
  )
}
