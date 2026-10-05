"use client";

import { Calendar, User, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { store } from "@/lib/store";
import { UserRole } from "@/types/database.types";
import { createClient } from "@/lib/supabase/client";

const ROLE_NAMES: Record<UserRole, { label: string; bg: string }> = {
  superadmin: { label: "SuperAdmin", bg: "bg-purple-100 text-purple-800 border-purple-300" },
  admin: { label: "Admin", bg: "bg-blue-100 text-blue-800 border-blue-300" },
  produccion: { label: "Producción", bg: "bg-amber-100 text-amber-800 border-amber-300" },
  ventas: { label: "Ventas", bg: "bg-emerald-100 text-emerald-800 border-emerald-300" },
};

export function Header({ title }: { title: string }) {
  const [role, setRole] = useState<UserRole>("superadmin");
  const [userName, setUserName] = useState("Cargando...");
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  useEffect(() => {
    setRole(store.getCurrentRole());

    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", user.id)
          .single();
        
        if (data?.full_name) {
          setUserName(data.full_name);
          // Opcional: Podrías actualizar el rol real del usuario aquí también si no quieres usar el simulador
          // setRole(data.role); 
        } else {
          setUserName(user.email || "Usuario Sistema");
        }
      }
    };
    
    fetchUser();
  }, []);

  const todayStr = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const roleInfo = ROLE_NAMES[role] || ROLE_NAMES.superadmin;

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs print:hidden">
      <div>
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h2>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-1.5 text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span className="capitalize">{todayStr}</span>
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
