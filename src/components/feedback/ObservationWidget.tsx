"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  MessageSquarePlus,
  X,
  Send,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  HelpCircle,
  FileEdit,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Tag,
  MapPin,
  Layers,
  ChevronRight,
  Maximize2,
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

interface CategoryOption {
  id: ObservationCategory;
  label: string;
  icon: typeof Lightbulb;
  description: string;
  color: string;
  activeBg: string;
  activeBorder: string;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    id: "sugerencia",
    label: "Sugerencia",
    icon: Lightbulb,
    description: "Idea para nueva función o mejora visual",
    color: "text-amber-600",
    activeBg: "bg-amber-50/80",
    activeBorder: "border-amber-400 ring-2 ring-amber-400/20",
  },
  {
    id: "error",
    label: "Ajuste / Error",
    icon: AlertTriangle,
    description: "Algo no calcula o no funciona como esperas",
    color: "text-rose-600",
    activeBg: "bg-rose-50/80",
    activeBorder: "border-rose-400 ring-2 ring-rose-400/20",
  },
  {
    id: "cambio_datos",
    label: "Datos o Precios",
    icon: Layers,
    description: "Ajustar valores, nombres, tarifas o catálogo",
    color: "text-orange-600",
    activeBg: "bg-orange-50/80",
    activeBorder: "border-orange-400 ring-2 ring-orange-400/20",
  },
  {
    id: "duda",
    label: "Duda / Pregunta",
    icon: HelpCircle,
    description: "¿Cómo realizar una acción en el sistema?",
    color: "text-sky-600",
    activeBg: "bg-sky-50/80",
    activeBorder: "border-sky-400 ring-2 ring-sky-400/20",
  },
  {
    id: "general",
    label: "Comentario General",
    icon: FileEdit,
    description: "Notas o comentarios sobre la operación",
    color: "text-slate-600",
    activeBg: "bg-slate-100",
    activeBorder: "border-slate-400 ring-2 ring-slate-400/20",
  },
];

interface PriorityOption {
  id: ObservationPriority;
  label: string;
  badge: string;
  dotColor: string;
}

const PRIORITY_OPTIONS: PriorityOption[] = [
  {
    id: "baja",
    label: "Baja",
    badge: "Detalle estético o menor",
    dotColor: "bg-emerald-500",
  },
  {
    id: "media",
    label: "Media",
    badge: "Mejora deseada",
    dotColor: "bg-amber-500",
  },
  {
    id: "alta",
    label: "Alta",
    badge: "Importante para el trabajo",
    dotColor: "bg-orange-500",
  },
  {
    id: "urgente",
    label: "Urgente",
    badge: "Bloqueante",
    dotColor: "bg-rose-500",
  },
];

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
  const [isEnabledForUsers, setIsEnabledForUsers] = useState(true);

  useEffect(() => {
    setIsEnabledForUsers(ObservationsManager.isWidgetEnabledForUsers());
    const onConfigChange = () => {
      setIsEnabledForUsers(ObservationsManager.isWidgetEnabledForUsers());
    };
    window.addEventListener("erp_observations_config_changed", onConfigChange);
    return () =>
      window.removeEventListener("erp_observations_config_changed", onConfigChange);
  }, []);

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

  // Cerrar con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const currentModuleName =
    MODULE_NAMES[customRoute] || customRoute || "Pantalla Actual";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    ObservationsManager.add({
      user_id: userEmail || "usr-anon",
      user_name: userName || "Usuario de Planta",
      user_email: userEmail || "cliente@empresa.com",
      user_role: userRole,
      route: customRoute || pathname,
      category,
      priority,
      title: title.trim(),
      description: description.trim(),
    });

    setSubmitted(true);
  };

  const handleResetForm = () => {
    setSubmitted(false);
    setTitle("");
    setDescription("");
    setCategory("sugerencia");
    setPriority("media");
  };

  const handleClose = () => {
    setIsOpen(false);
    if (submitted) {
      setTimeout(() => {
        handleResetForm();
      }, 300);
    }
  };

  const isSuperAdmin = userRole === "superadmin";
  const wordsCount = description.trim() ? description.trim().split(/\s+/).length : 0;

  // Si el widget está desactivado por el SuperAdmin, no mostrar el botón al Admin ni a otros usuarios
  if (!isEnabledForUsers && !isSuperAdmin) {
    return null;
  }

  return (
    <>
      {/* Botón Flotante en la esquina inferior derecha */}
      <div className="fixed bottom-5 right-5 z-40 print:hidden">
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center space-x-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white px-4 py-2.5 rounded-full shadow-xl shadow-orange-950/25 hover:shadow-2xl hover:shadow-orange-900/35 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer border border-orange-400/40"
          title="Abrir panel lateral para anotar observaciones o sugerencias"
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

      {/* Panel Lateral Desplegable desde la Derecha (Slide-over Drawer) */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden print:hidden">
          {/* Fondo Oscuro Semi-transparente (Backdrop) */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Contenedor del Drawer pegado al borde derecho */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
            <div
              className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col h-full border-l border-slate-200 animate-drawer-right"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Cabecera del Panel Lateral */}
              <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 text-white px-6 py-5 border-b border-slate-800 flex items-center justify-between shrink-0 shadow-sm">
                <div className="flex items-center space-x-3.5">
                  <div className="w-11 h-11 rounded-xl bg-orange-600/30 border border-orange-500/40 flex items-center justify-center text-orange-400 shrink-0 shadow-inner">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h2 className="font-bold text-lg text-white leading-tight">
                        Panel de Observaciones & Sugerencias
                      </h2>
                      <span className="bg-orange-500/20 border border-orange-500/40 text-orange-300 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Ampliado
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Espacio completo para detallar cualquier ajuste, cambio de precio o idea.
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="hidden sm:inline-block text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2 py-1 rounded border border-slate-700">
                    Esc
                  </span>
                  <button
                    onClick={handleClose}
                    className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition cursor-pointer"
                    title="Cerrar panel lateral"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Módulo / Pantalla Detectada (Barra de Contexto) */}
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex items-center space-x-2 text-xs">
                  <MapPin className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                  <span className="font-semibold text-slate-600">Pantalla actual:</span>
                  <span className="bg-orange-100 text-orange-900 px-2.5 py-0.5 rounded-md font-bold text-xs border border-orange-200">
                    {currentModuleName}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                  {customRoute}
                </div>
              </div>

              {/* Contenido Scrollable con todo el espacio para redactar */}
              {submitted ? (
                <div className="flex-1 overflow-y-auto p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-sm">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">
                    ¡Observación Registrada con Éxito!
                  </h3>
                  <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                    Muchas gracias. Tu nota ha sido guardada en el sistema. El equipo de administración y desarrollo podrá revisarla y aplicar los ajustes que solicitaste.
                  </p>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 w-full max-w-md text-left text-xs space-y-1.5 mt-4">
                    <div>
                      <span className="text-slate-500">Título:</span>{" "}
                      <strong className="text-slate-800">{title}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Módulo:</span>{" "}
                      <span className="font-medium text-slate-700">{currentModuleName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Registrado por:</span>{" "}
                      <span className="font-medium text-slate-700">{userName} ({userRole})</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 pt-6">
                    <button
                      onClick={handleResetForm}
                      className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Anotar otra observación
                    </button>
                    <button
                      onClick={handleClose}
                      className="px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                    >
                      Listo, Cerrar
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Selector de Tipo de Observación (Tarjetas Interactivas) */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                        1. Tipo de Observación *
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {CATEGORY_OPTIONS.map((cat) => {
                          const Icon = cat.icon;
                          const isSelected = category === cat.id;
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => setCategory(cat.id)}
                              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                                isSelected
                                  ? `${cat.activeBg} ${cat.activeBorder}`
                                  : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
                              }`}
                            >
                              <div className="flex items-center justify-between w-full mb-1">
                                <Icon className={`w-4 h-4 ${cat.color}`} />
                                {isSelected && (
                                  <span className="w-2 h-2 rounded-full bg-orange-600"></span>
                                )}
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-800 leading-tight">
                                  {cat.label}
                                </div>
                                <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                                  {cat.description}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Selector de Prioridad */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                        2. Nivel de Urgencia / Prioridad *
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {PRIORITY_OPTIONS.map((p) => {
                          const isSelected = priority === p.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setPriority(p.id)}
                              className={`px-3 py-2 rounded-xl border text-left transition-all cursor-pointer flex items-center space-x-2 ${
                                isSelected
                                  ? "bg-slate-900 border-slate-900 text-white shadow-sm ring-2 ring-slate-900/10"
                                  : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                              }`}
                            >
                              <span className={`w-2.5 h-2.5 rounded-full ${p.dotColor}`}></span>
                              <div>
                                <div className="text-xs font-bold leading-none">
                                  {p.label}
                                </div>
                                <div
                                  className={`text-[9px] mt-0.5 leading-none ${
                                    isSelected ? "text-slate-300" : "text-slate-400"
                                  }`}
                                >
                                  {p.badge}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Título o Resumen */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                          3. Título o Resumen Breve *
                        </label>
                        <span className="text-[11px] text-slate-400">
                          Sé conciso y claro
                        </span>
                      </div>
                      <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Ej. Modificar precio unitario del Ladrillo 6 Huecos / Agregar filtro por chofer"
                        className="w-full text-sm bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-none transition shadow-xs font-medium text-slate-800"
                      />
                    </div>

                    {/* Detalle Ampliado (Gran Textarea) */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                          4. Detalle Completo de la Observación *
                        </label>
                        <span className="text-[11px] text-slate-400">
                          {wordsCount} palabras · {description.length} caracteres
                        </span>
                      </div>
                      <div className="relative">
                        <textarea
                          required
                          rows={10}
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder={`Escribe aquí con todo el detalle que necesites. Por ejemplo:\n• ¿Qué operación o registro estabas llenando?\n• ¿Qué datos te gustaría que cambien (nombres, montos, columnas)?\n• ¿Cómo debería funcionar el flujo de trabajo según la planta?`}
                          className="w-full text-sm leading-relaxed bg-white border border-slate-300 rounded-xl p-4 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-none transition shadow-xs resize-y min-h-[220px] max-h-[460px] text-slate-800 font-normal"
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1.5">
                        💡 <strong>Tip:</strong> Puedes incluir listas, ejemplos de cálculos, o instrucciones paso a paso. La ventana ampliada guarda el texto completo sin límites.
                      </p>
                    </div>

                    {/* Acceso exclusivo SuperAdmin */}
                    {isSuperAdmin && (
                      <div className="p-4 rounded-xl bg-purple-50/80 border border-purple-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700 shrink-0">
                            <ShieldCheck className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-purple-900">
                              Panel de Control SuperAdmin
                            </div>
                            <div className="text-[11px] text-purple-700">
                              Revisa todas las notas del cliente y descárgalas en Excel.
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsOpen(false);
                            router.push("/admin/observaciones");
                          }}
                          className="inline-flex items-center space-x-1.5 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
                        >
                          <span>Ver y Exportar</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Pie de Acciones Pegado al Fondo (Sticky Footer) */}
                  <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
                    <div className="text-xs text-slate-500">
                      Registrando como:{" "}
                      <strong className="text-slate-800">{userName}</strong>{" "}
                      <span className="text-slate-400">({userRole})</span>
                    </div>

                    <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        onClick={handleClose}
                        className="px-4 py-2.5 text-slate-600 hover:text-slate-900 text-xs font-bold rounded-xl hover:bg-slate-200/70 transition cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="inline-flex items-center space-x-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-md shadow-orange-950/20 cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                        <span>Guardar Observación</span>
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
