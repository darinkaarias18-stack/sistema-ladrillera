"use client";

import { Calendar, User, LogOut, RefreshCw, Database } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { store } from "@/lib/store";
import { UserRole } from "@/types/database.types";
import { createClient } from "@/lib/supabase/client";
import { getCurrentUserSession } from "@/actions/auth";
import { AuditLogger } from "@/lib/audit-logger";
import { supabaseSync, SyncState } from "@/lib/supabase-sync";

const ROLE_NAMES: Record<UserRole, { label: string; bg: string }> = {
  superadmin: { label: "SuperAdmin", bg: "bg-purple-100 text-purple-800 border-purple-300" },
  admin: { label: "Admin", bg: "bg-blue-100 text-blue-800 border-blue-300" },
  cajero: { label: "Cajero/Cajera", bg: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  entrega_recepcion: { label: "Entrega y Recepción", bg: "bg-indigo-100 text-indigo-800 border-indigo-300" },
  ing_produccion: { label: "Ing. de Producción", bg: "bg-amber-100 text-amber-800 border-amber-300" },
  produccion: { label: "Producción", bg: "bg-amber-100 text-amber-800 border-amber-300" },
  ventas: { label: "Ventas", bg: "bg-emerald-100 text-emerald-800 border-emerald-300" },
};

export function Header({ title }: { title: string }) {
  const [mounted, setMounted] = useState(false);
  const [role, setRole] = useState<UserRole>("superadmin");
  const [userName, setUserName] = useState("Cargando...");
  const [syncState, setSyncState] = useState<SyncState>({
    status: "idle",
    pendingCount: 0,
    lastSyncTime: null,
    lastError: null,
    counts: {},
  });
  const router = useRouter();

  const handleLogout = async () => {
    AuditLogger.log({
      action: "LOGIN_SUCCESS",
      severity: "low",
      module: "seguridad",
      description: `Cierre de sesión seguro para ${userName} (${role})`,
    });
    const supabase = createClient();
    await supabase.auth.signOut();
    if (typeof window !== "undefined") {
      localStorage.removeItem("erp_current_user");
    }
    router.push("/login");
    router.refresh();
  };

  useEffect(() => {
    setMounted(true);
    setSyncState(supabaseSync.getState());

    // Suscripción al estado de sincronización en vivo
    const unsubscribe = supabaseSync.subscribe((state) => {
      setSyncState(state);
    });

    const fetchUser = async () => {
      try {
        const session = await getCurrentUserSession();
        if (session && session.user) {
          const finalName = session.user.fullName || session.user.email;
          setUserName(finalName);
          setRole(session.role);
          store.setCurrentRole(session.role);
          if (typeof window !== "undefined") {
            localStorage.setItem(
              "erp_current_user",
              JSON.stringify({
                id: session.user.id,
                name: finalName,
                email: session.user.email,
                role: session.role,
              })
            );
          }
        } else {
          if (typeof window !== "undefined") {
            const cached = localStorage.getItem("erp_current_user");
            if (cached) {
              try {
                const parsed = JSON.parse(cached);
                if (parsed?.name) setUserName(parsed.name);
              } catch {}
            } else {
              setUserName("Usuario Sistema");
            }
          } else {
            setUserName("Usuario Sistema");
          }
          setRole(store.getCurrentRole());
        }
      } catch (err) {
        console.warn("Sesión en servidor no disponible, usando estado local:", err);
        if (typeof window !== "undefined") {
          const cached = localStorage.getItem("erp_current_user");
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              if (parsed?.name) setUserName(parsed.name);
            } catch {}
          } else {
            setUserName("Usuario Sistema");
          }
        } else {
          setUserName("Usuario Sistema");
        }
        setRole(store.getCurrentRole());
      }
    };
    
    fetchUser();

    return () => {
      unsubscribe();
    };
  }, []);

  const todayStr = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const roleInfo = ROLE_NAMES[role] || ROLE_NAMES.superadmin;

  const getSyncBadge = () => {
    if (!mounted) {
      return (
        <div className="flex items-center space-x-1.5 text-xs text-slate-400 bg-slate-50 border border-slate-200/60 px-2.5 py-1 rounded-full select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
          <span className="text-[11px] font-medium text-slate-500">Conectando...</span>
        </div>
      );
    }

    if (syncState.status === "syncing" || syncState.status === "idle") {
      return (
        <div 
          className="flex items-center space-x-1.5 text-xs text-sky-700 bg-sky-50/70 border border-sky-200/60 px-2.5 py-1 rounded-full select-none"
          title="Sincronización automática activa en segundo plano"
        >
          <RefreshCw className="w-3 h-3 text-sky-600 animate-spin" />
          <span className="text-[11px] font-medium text-sky-700">Sincronizando...</span>
        </div>
      );
    }

    if (syncState.status === "synced") {
      return (
        <div 
          className="flex items-center space-x-1.5 text-xs text-slate-600 bg-slate-50 border border-slate-200/70 px-2.5 py-1 rounded-full select-none"
          title="Sincronización automática activa con Supabase"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] font-medium text-slate-600">Sincronizado</span>
        </div>
      );
    }

    if (syncState.status === "offline") {
      return (
        <div 
          className="flex items-center space-x-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full select-none"
          title="Sin conexión a internet. Los datos se guardan localmente y se sincronizarán al reconectar."
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          <span className="text-[11px] font-medium text-amber-800">Modo Local (Offline)</span>
        </div>
      );
    }

    return (
      <div 
        className="flex items-center space-x-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full select-none"
        title="Sincronización automática activa en segundo plano"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        <span className="text-[11px] font-medium text-slate-600">Sincronizado</span>
      </div>
    );
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs print:hidden">
      <div>
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h2>
      </div>

      <div className="flex items-center space-x-3">
        {/* Indicador de Sincronización Automática en Vivo */}
        {getSyncBadge()}

        <div className="flex items-center space-x-1.5 text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 hidden sm:flex">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span suppressHydrationWarning className="capitalize">{todayStr}</span>
        </div>

        <div className="flex items-center space-x-2 border-l border-slate-200 pl-4">
          <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs border border-orange-200">
            <User className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <p className="font-semibold text-slate-700">{userName}</p>
            <span
              className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleInfo.bg}`}
            >
              {roleInfo.label}
            </span>
          </div>
          
          <div className="pl-4 ml-2 border-l border-slate-200 flex items-center">
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-red-600 bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-colors px-3 py-1.5 rounded-lg shadow-sm"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
