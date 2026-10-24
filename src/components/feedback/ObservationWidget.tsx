"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  MessageSquarePlus,
  X,
  Send,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FileEdit,
  Sparkles,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import {
  ObservationsManager,
  ObservationCategory,
  ObservationPriority,
} from "@/lib/observations-manager";
import { store } from "@/lib/store";
import { UserRole } from "@/types/database.types";

const MODULE_NAMES: Record<string, string> = {
  "/": "Dashboard General",
  "/produccion": "Producción - Vaciados",
  "/produccion/hornos": "Producción - Hornos",
  "/produccion/patio-entregas": "Patio de Entregas",
  "/produccion/catalogo": "Catálogo de Productos",
  "/inventario": "Inventario de Ladrillos",
  "/ventas/clientes": "Ventas - Clientes",
  "/ventas/pedidos": "Ventas - Pedidos",
  "/entregas": "Entregas y Despacho",
  "/caja": "Libro de Compra y Venta (Caja)",
  "/reportes": "Reportes y Estadísticas",
  "/empleados": "Personal - Nómina",
  "/empleados/asistencia": "Personal - Asistencia",
  "/planillas": "Personal - Planillas",
  "/empleados/finiquito": "Personal - Finiquito",
  "/admin/usuarios": "Gestión de Usuarios",
  "/admin/auditoria": "Logs de Auditoría",
  "/admin/observaciones": "Panel de Observaciones",
};

export function ObservationWidget() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form fields
  const [category, setCategory] = useState<ObservationCategory>("sugerencia");
  const [priority, setPriority] = useState<ObservationPriority>("media");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [customRoute, setCustomRoute] = useState("");

  // User state
  const [userName, setUserName] = useState("Usuario");
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState<UserRole>("superadmin");

  useEffect(() => {
    setCustomRoute(pathname);
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("erp_current_user");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed.name) setUserName(parsed.name);
          if (parsed.email) setUserEmail(parsed.email);
          if (parsed.role) setUserRole(parsed.role);
        } catch {}
      } else {
        setUserRole(store.getCurrentRole());
      }
    }
  }, [pathname, isOpen]);

  const currentModuleName =
    MODULE_NAMES[customRoute] || customRoute || "Pantalla Actual";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    ObservationsManager.add({
      user_id: userEmail || "usr-anon",
      user_name: userName || "Usuario de Prueba",
      user_email: userEmail || "cliente@empresa.com",
      user_role: userRole,
      route: customRoute || pathname,
      category,
      priority,
      title: title.trim(),
      description: description.trim(),
    });

    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setIsOpen(false);
      setTitle("");
      setDescription("");
      setCategory("sugerencia");
      setPriority("media");
    }, 2200);
  };

  const isSuperAdmin = userRole === "superadmin";

  return (
    <>
      {/* Botón Flotante en la esquina inferior derecha */}
      <div className="fixed bottom-5 right-5 z-40 print:hidden">
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center space-x-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white px-4 py-2.5 rounded-full shadow-lg shadow-orange-950/30 hover:shadow-xl hover:shadow-orange-900/40 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer border border-orange-400/30"
          title="Anotar sugerencias, dudas u observaciones sobre el sistema"
          aria-label="Dejar observación sobre el sistema"
        >
          <div className="relative">
            <MessageSquarePlus className="w-5 h-5 text-white" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white rounded-full animate-ping opacity-75"></span>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full"></span>
          </div>
          <span className="text-xs font-bold tracking-wide">
            Dejar Observación
          </span>
        </button>
      </div>

      {/* Modal de Feedback */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200 print:hidden">
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden my-6 transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera del Modal */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-orange-600/30 border border-orange-500/40 flex items-center justify-center text-orange-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white leading-tight">
                    Anotar Observación o Mejora
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Tus notas nos permiten ajustar el sistema a la medida de tu planta.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
                title="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido del Formulario */}
            {submitted ? (
              <div className="p-8 text-center space-y-3 animate-in zoom-in-95 duration-200">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-bold text-slate-900">
                  ¡Observación Registrada!
                </h4>
                <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                  Muchas gracias. Tu nota ha sido guardada en el sistema para que
                  el equipo de desarrollo y administración la revise y aplique los
                  ajustes solicitados.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {/* Módulo / Pantalla detectada */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="font-bold text-slate-700">Módulo actual:</span>
                    <span className="bg-orange-100 text-orange-800 px-2.5 py-0.5 rounded-md font-semibold text-[11px] border border-orange-200">
                      {currentModuleName}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {customRoute}
                  </span>
                </div>

                {/* Categoría y Prioridad */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tipo de Observación *
                    </label>
                    <select
                      value={category}
                      onChange={(e) =>
                        setCategory(e.target.value as ObservationCategory)
                      }
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    >
                      <option value="sugerencia">💡 Sugerencia o Mejora</option>
                      <option value="error">⚠️ Ajuste o Error</option>
                      <option value="cambio_datos">🧱 Cambio de Datos / Precios</option>
                      <option value="duda">❓ Duda o Pregunta</option>
                      <option value="general">📝 Comentario General</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Prioridad *
                    </label>
                    <select
                      value={priority}
                      onChange={(e) =>
                        setPriority(e.target.value as ObservationPriority)
                      }
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    >
                      <option value="baja">🟢 Baja (Detalle cosmético)</option>
                      <option value="media">🟡 Media (Mejora deseada)</option>
                      <option value="alta">🟠 Alta (Importante para operar)</option>
                      <option value="urgente">🔴 Urgente (Bloqueante)</option>
                    </select>
                  </div>
                </div>

                {/* Título */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Título o Resumen Breve *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ej. Falta opción de descuento en pedidos"
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                {/* Detalle */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Detalle de tu Observación *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe con claridad lo que te gustaría cambiar, agregar o corregir en esta pantalla..."
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none resize-none"
                  />
                </div>

                {/* Pie con autor y acciones */}
                <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="text-slate-500 text-[11px]">
                    Registrando como:{" "}
                    <strong className="text-slate-700">{userName}</strong>{" "}
                    <span className="text-slate-400">({userRole})</span>
                  </div>

                  <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="px-3.5 py-1.5 text-slate-600 hover:text-slate-800 text-xs font-semibold rounded-lg hover:bg-slate-100 transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center space-x-1.5 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition shadow-sm cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Guardar Observación</span>
                    </button>
                  </div>
                </div>

                {/* Acceso directo solo visible para SuperAdmin */}
                {isSuperAdmin && (
                  <div className="mt-3 pt-3 border-t border-dashed border-slate-200 flex items-center justify-between text-xs bg-purple-50/70 p-2.5 rounded-xl border-purple-200/60">
                    <div className="flex items-center space-x-1.5 text-purple-800 font-semibold text-[11px]">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                      <span>Acceso exclusivo SuperAdmin:</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        router.push("/admin/observaciones");
                      }}
                      className="inline-flex items-center space-x-1 text-purple-700 hover:text-purple-900 font-bold text-[11px] hover:underline cursor-pointer"
                    >
                      <span>Ver y Exportar Observaciones</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
