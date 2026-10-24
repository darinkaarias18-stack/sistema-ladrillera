import { createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { Header } from "@/components/layout/header";
import { ObservacionesClient } from "./ObservacionesClient";
import { ObservationsManager } from "@/lib/observations-manager";

export default async function ObservacionesPage() {
  const supabase = await createServerClient();

  // 1. Verificar autenticación
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 2. Validar que el rol sea estrictamente superadmin
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const adminClient = createClient(supabaseUrl, serviceKey);

  const { data: profile } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isMaster = user.email?.toLowerCase() === "darinka.arias18@gmail.com";
  const normalizedRole = isMaster
    ? "superadmin"
    : (user.user_metadata?.role || profile?.role || "").toLowerCase();

  // EXCLUSIVIDAD ABSOLUTA: Solo SuperAdmin puede acceder a la gestión y extracción de observaciones
  if (normalizedRole !== "superadmin") {
    redirect("/");
  }

  const initialObservations = ObservationsManager.getAll();

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
      <Header title="Observaciones del Cliente & Feedback UAT" />
      <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-700 border border-purple-500/20 mb-2">
                <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></span>
                Área Exclusiva Super Administrador
              </div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                Observaciones del Cliente & Feedback
              </h1>
              <p className="text-slate-500 mt-1 text-sm">
                Control centralizado de comentarios, solicitudes de cambio y notas registradas por tu cliente durante el periodo de pruebas.
              </p>
            </div>
          </div>

          <ObservacionesClient initialObservations={initialObservations} />
        </div>
      </div>
    </div>
  );
}
